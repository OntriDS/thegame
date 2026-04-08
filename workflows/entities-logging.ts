// workflows/entities-logging.ts
// Redis List-based lifecycle logs with monthly key partitioning
// Writes: LPUSH (O(1), no read needed)
// Reads: LRANGE (paginated, scoped to one month)
// Edit/Delete: read-modify-write on monthly list (rare operations, ~50 entries)

import { kvLPush, kvLRange, kvSAdd, kvSMembers, kvDel, kvLSet } from '@/data-store/kv';
import { buildLogMonthKey, buildLogMonthsIndexKey, buildLogKey } from '@/data-store/keys';
import type { Sale } from '@/types/entities';
import { EntityType, LogEventType, SaleStatus } from '@/types/enums';
import { getUTCNow } from '@/lib/utils/utc-utils';
import { formatMonthKey } from '@/lib/utils/date-display-utils';

/**
 * Inlined from date-utils (was: saleReferenceDateForItemSoldAndLog).
 * Returns the canonical timestamp for sold-item log rows from a sale.
 * Collected sales use collectedAt; otherwise doneAt → saleDate → now.
 */
function saleReferenceDateForItemSoldAndLog(
  sale: Pick<Sale, 'status' | 'isCollected' | 'collectedAt' | 'doneAt' | 'saleDate'>
): Date {
  const isCollected = sale.status === SaleStatus.COLLECTED || !!sale.isCollected;
  const toValid = (v: unknown): Date | null => {
    if (v == null || v === '') return null;
    const d = v instanceof Date ? v : new Date(v as string);
    return Number.isFinite(d.getTime()) ? d : null;
  };
  if (isCollected) {
    const c = toValid(sale.collectedAt);
    if (c) return c;
  }
  const done = toValid(sale.doneAt);
  if (done) return done;
  const sd = toValid(sale.saleDate);
  if (sd) return sd;
  return getUTCNow();
}
import { kv } from '@/data-store/kv';
import { v4 as uuid } from 'uuid';

// ============================================================================
// Helpers
// ============================================================================

function getCurrentMonthKey(): string {
  const now = getUTCNow();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const yy = String(now.getUTCFullYear()).slice(-2);
  return `${mm}-${yy}`;
}

export function getMonthKeyFromTimestamp(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  if (isNaN(date.getTime())) return getCurrentMonthKey();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const yy = String(date.getUTCFullYear()).slice(-2);
  return `${mm}-${yy}`;
}

/** Sort key for log rows (newest-first lists). */
function logEntryTimestampMs(entry: any): number {
  const ts = entry?.timestamp;
  if (ts == null || ts === '') return 0;
  if (typeof ts === 'number' && Number.isFinite(ts)) return ts;
  const d = new Date(ts);
  if (!isNaN(d.getTime())) return d.getTime();
  const m = String(ts).match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (m) {
    const t = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12, 0, 0, 0);
    return isNaN(t.getTime()) ? 0 : t.getTime();
  }
  return 0;
}

/** Normalize user/API timestamp input to ISO for storage. */
function coerceLogEditTimestamp(value: string): string {
  const s = String(value).trim();
  if (!s) throw new Error('Timestamp cannot be empty');
  const d = new Date(s);
  if (isNaN(d.getTime())) throw new Error(`Invalid timestamp: ${s}`);
  return d.toISOString();
}

/**
 * Write entry to the monthly list that matches `entry.timestamp` (move across months if needed).
 */
async function relocateLogEntryToCorrectMonth(
  entityType: EntityType,
  sourceMonthKey: string,
  entryId: string,
  updatedEntry: any
): Promise<{ monthKey: string }> {
  const targetMonthKey = getMonthKeyFromTimestamp(updatedEntry.timestamp);
  const sourceList = await readMonthlyList(entityType, sourceMonthKey);
  const idx = sourceList.findIndex(e => e.id === entryId);
  if (idx === -1) {
    throw new Error(`Log entry ${entryId} not found in month ${sourceMonthKey}`);
  }

  if (targetMonthKey === sourceMonthKey) {
    sourceList[idx] = updatedEntry;
    await rebuildMonthlyList(entityType, sourceMonthKey, sourceList);
    return { monthKey: sourceMonthKey };
  }

  sourceList.splice(idx, 1);
  await rebuildMonthlyList(entityType, sourceMonthKey, sourceList);

  const targetList = await readMonthlyList(entityType, targetMonthKey);
  const existingIdx = targetList.findIndex(e => e.id === entryId);
  if (existingIdx >= 0) {
    targetList[existingIdx] = updatedEntry;
  } else {
    targetList.push(updatedEntry);
  }
  targetList.sort((a, b) => logEntryTimestampMs(b) - logEntryTimestampMs(a));
  await rebuildMonthlyList(entityType, targetMonthKey, targetList);
  await kvSAdd(buildLogMonthsIndexKey(entityType), targetMonthKey);
  return { monthKey: targetMonthKey };
}

function normalizeLogEntry(entry: any): any {
  if (entry?.id) {
    return entry;
  }
  return { ...entry, id: uuid() };
}

/** Sale CHARGED ↔ COLLECTED are distinct milestones; do not merge rapid flip-flop into one row. */
function isSaleChargedCollectedProgression(entityType: EntityType, lastEntry: any, newEvent: LogEventType): boolean {
  if (entityType !== EntityType.SALE || !lastEntry) return false;
  const a = String(lastEntry.event ?? '').toUpperCase();
  const b = String(newEvent).toUpperCase();
  const saleMilestone = (x: string) => x === 'CHARGED' || x === 'COLLECTED';
  return saleMilestone(a) && saleMilestone(b) && a !== b;
}

function sortMonthsDesc(months: string[]): string[] {
  return [...months].sort((a, b) => {
    const [amStr, ayStr] = a.split('-');
    const [bmStr, byStr] = b.split('-');

    const ay = parseInt(`20${ayStr}`, 10);
    const by = parseInt(`20${byStr}`, 10);
    const am = parseInt(amStr, 10);
    const bm = parseInt(bmStr, 10);

    if (ay !== by) {
      return by - ay;
    }

    return bm - am;
  });
}

/** Parse a raw LRANGE element into a JS object */
function parseEntry(raw: string | any): any {
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return raw; }
  }
  return raw;
}

/** Read full monthly list as parsed objects */
async function readMonthlyList(entityType: EntityType, monthKey: string): Promise<any[]> {
  const listKey = buildLogMonthKey(entityType, monthKey);
  const raw = await kvLRange(listKey, 0, -1);
  return raw.map(parseEntry).map(normalizeLogEntry);
}

/**
 * Rebuild a monthly list (DEL + LPUSH). Used for rare edit/delete ops.
 * If `entries` is empty, the month key is removed — restore from KV backup if that was unintended.
 */
async function rebuildMonthlyList(entityType: EntityType, monthKey: string, entries: any[]): Promise<void> {
  const listKey = buildLogMonthKey(entityType, monthKey);
  await kvDel(listKey);
  if (entries.length > 0) {
    // LPUSH pushes to head, so reverse to maintain original order (newest-first)
    const serialized = entries.map(e => JSON.stringify(e));
    await kvLPush(listKey, ...serialized);
  }
}

// ============================================================================
// Core: Append (O(1) via LPUSH)
// ============================================================================

export async function appendEntityLog(
  entityType: EntityType,
  entityId: string,
  event: LogEventType,
  details: Record<string, any>,
  customTimestamp?: string | Date
): Promise<void> {
  const monthKey = customTimestamp ? getMonthKeyFromTimestamp(customTimestamp) : getCurrentMonthKey();
  const listKey = buildLogMonthKey(entityType, monthKey);

  // 1. Construct the Strict Lean Payload based on EntityType
  // CRITICAL: We NO LONGER spread the full object. We only keep prescribed fields.
  let entry: any = {
    id: uuid(),
    entityId,
    event,
    timestamp: customTimestamp ? (typeof customTimestamp === 'string' ? customTimestamp : customTimestamp.toISOString()) : getUTCNow().toISOString()
  };

  switch (entityType) {
    case EntityType.FINANCIAL:
    case EntityType.SALE:
      entry.name = details.name || 'Unknown';
      entry.type = details.type || 'Unknown';
      entry.station = details.station || 'Unknown';
      entry.cost = details.cost ?? 0;
      entry.revenue = details.revenue ?? 0;
      if (entityType === EntityType.SALE) {
        entry.siteId = details.siteId ?? '';
      }
      break;

    case EntityType.ITEM:
      entry.name = details.name || 'Unknown';
      entry.itemType = details.itemType || 'Unknown';
      entry.subItemType = details.subItemType || 'Unknown';
      entry.soldQuantity = details.soldQuantity ?? details.quantity ?? 1;
      break;

    case EntityType.TASK:
      entry.name = details.name || 'Unknown';
      entry.taskType = details.taskType || details.type || 'Unknown';
      entry.station = details.station || 'Unknown';
      break;

    case EntityType.SITE:
      entry.name = details.name || 'Unknown';
      entry.type = details.type || 'Unknown';
      entry.businessType = details.businessType || details.digitalType || 'Unknown';
      entry.url = details.url || '';
      entry.settlementId = details.settlementId || null;
      break;

    case EntityType.CHARACTER:
      entry.name = details.name || 'Unknown';
      entry.roles = details.roles || [];
      break;

    default:
      // Handles PLAYER or any other unknown entity gracefully
      entry.name = details.name || 'Unknown';
      entry.type = details.type || 'Unknown';
      break;
  }

  // 2. Same entity + same event already in this month → skip (head entry may be another entity; old logic only checked index 0)
  const DEDUPE_SCAN = 400;
  try {
    const headChunk = await kvLRange(listKey, 0, DEDUPE_SCAN - 1);
    for (const raw of headChunk) {
      const e = parseEntry(raw);
      if (e?.entityId === entityId && e.event === event) {
        return;
      }
    }
  } catch (err) {
    console.warn('[appendEntityLog] Error scanning for duplicate event:', err);
  }

  // 3. Fetch the absolute last log entry to check for rapid flip-flop (same entity, different event)
  const lastRaw = await kvLRange(listKey, 0, 0);
  if (lastRaw.length > 0) {
    try {
      const lastEntry = parseEntry(lastRaw[0]);
      if (lastEntry && lastEntry.entityId === entityId) {
        const lastTimestamp = new Date(lastEntry.timestamp).getTime();
        const currentTimestamp = new Date(entry.timestamp).getTime();
        const timeDiffMs = currentTimestamp - lastTimestamp;

        // FILTER: Rapid Flip-Flop. If state changed, but it happened within ~1.5s of the last change,
        // it's likely a UI glitch/rapid clicking. We overwrite the last kept log with this final state.
        // Never collapse SALE charged milestone ↔ COLLECTED into one row.
        if (timeDiffMs < 1500 && !isSaleChargedCollectedProgression(entityType, lastEntry, event)) {
          // Re-use the previous log's ID to preserve the 'time burst' identity
          const flipFlopEntry = {
            ...entry,
            id: lastEntry.id
          };
          await kvLSet(listKey, 0, JSON.stringify(flipFlopEntry));
          return;
        }
      }
    } catch (err) {
      console.warn('[appendEntityLog] Error checking last entry:', err);
      // Continue to append if check fails
    }
  }

  // O(1) write — no read needed!
  await kvLPush(listKey, JSON.stringify(entry));
  // Track this month in the months index
  await kvSAdd(buildLogMonthsIndexKey(entityType), monthKey);
}

// ============================================================================
// Core: Read (LRANGE with pagination)
// ============================================================================

export async function getEntityLogs(
  entityType: EntityType,
  options?: { month?: string; start?: number; count?: number }
): Promise<any[]> {
  const monthKey = options?.month || getCurrentMonthKey();
  const listKey = buildLogMonthKey(entityType, monthKey);
  const start = options?.start ?? 0;
  const stop = options?.count ? start + options.count - 1 : -1;

  const raw = await kvLRange(listKey, start, stop);
  return raw.map(parseEntry).map(normalizeLogEntry);
}

/**
 * If the item lifecycle log month bucket lost SOLD rows (e.g. manual cleanup / empty rebuild),
 * re-append one SOLD row per product line. Call with a sale whose `lines` already match storage
 * (after `ensureSoldItemEntities`), so `line.itemId` is the **sold-item row** (Sold Items tab), not live inventory.
 * Idempotent: skips entityIds that already have any SOLD entry in that month.
 */
export async function ensureItemSoldLogsFromSale(sale: Sale): Promise<void> {
  if (sale.isNotPaid || sale.isNotCharged || sale.status === SaleStatus.CANCELLED) return;

  const ts = saleReferenceDateForItemSoldAndLog(sale);
  const monthKey = getMonthKeyFromTimestamp(ts);

  const list = await readMonthlyList(EntityType.ITEM, monthKey);
  const hasSoldFor = (itemId: string) =>
    list.some(
      e =>
        e.entityId === itemId && String(e.event ?? '').toLowerCase() === 'sold'
    );

  const { getItemById } = await import('@/data-store/datastore');

  for (const line of sale.lines || []) {
    if (line.kind !== 'item' || !('itemId' in line) || !line.itemId) continue;

    const itemId = line.itemId as string;
    if (hasSoldFor(itemId)) continue;

    const item = await getItemById(itemId);
    if (!item) continue;

    await appendEntityLog(
      EntityType.ITEM,
      item.id,
      LogEventType.SOLD,
      {
        name: item.name,
        itemType: item.type,
        subItemType: item.subItemType,
        quantity: (line as { quantity?: number }).quantity
      },
      ts
    );

    list.unshift({ entityId: item.id, event: LogEventType.SOLD });
  }
}

// ============================================================================
// Field Updates (rare — read-modify-write on monthly list)
// ============================================================================

export async function updateEntityLogField(
  entityType: EntityType,
  entityId: string,
  fieldName: string,
  oldValue: any,
  newValue: any
): Promise<void> {
  // Search current month first, then all months
  const months = await getEntityLogMonths(entityType);
  const searchOrder = [getCurrentMonthKey(), ...months.filter(m => m !== getCurrentMonthKey())];

  for (const monthKey of searchOrder) {
    const list = await readMonthlyList(entityType, monthKey);

    // Find CREATED entry first, fallback to most recent entry for this entity
    const createdEntry = list.find(entry =>
      entry.entityId === entityId &&
      entry.event?.toLowerCase() === 'created'
    );

    if (createdEntry) {
      createdEntry[fieldName] = newValue;
      createdEntry.lastUpdated = getUTCNow().toISOString();
      await rebuildMonthlyList(entityType, monthKey, list);
      return;
    }

    // Fallback: find most recent entry for this entity in this month
    for (let i = 0; i < list.length; i++) {
      if (list[i]?.entityId === entityId) {
        list[i][fieldName] = newValue;
        list[i].lastUpdated = getUTCNow().toISOString();
        await rebuildMonthlyList(entityType, monthKey, list);
        return;
      }
    }
  }
}

export async function updateCreatedEntryFields(
  entityType: EntityType,
  entityId: string,
  partial: Record<string, any>
): Promise<void> {
  const months = await getEntityLogMonths(entityType);
  const searchOrder = [getCurrentMonthKey(), ...months.filter(m => m !== getCurrentMonthKey())];

  for (const monthKey of searchOrder) {
    const list = await readMonthlyList(entityType, monthKey);
    const createdEntry = list.find(entry =>
      entry.entityId === entityId &&
      String(entry.event ?? entry.status ?? '').toLowerCase() === 'created'
    );
    if (createdEntry) {
      Object.assign(createdEntry, partial, { lastUpdated: new Date().toISOString() });
      await rebuildMonthlyList(entityType, monthKey, list);
      return;
    }
  }
}

/**
 * Patch lean identity fields (e.g. name, itemType, subItemType) on ALL log entries
 * for a given entity across ALL months and ALL event types (CREATED, SOLD, MOVED, etc.).
 *
 * Use this when an entity's display-identity fields change and every historical
 * log entry must reflect the updated values.
 */
export async function updateEntityLeanFields(
  entityType: EntityType,
  entityId: string,
  partial: Record<string, any>
): Promise<void> {
  const months = await getEntityLogMonths(entityType);
  const allMonths = [getCurrentMonthKey(), ...months.filter(m => m !== getCurrentMonthKey())];

  for (const monthKey of allMonths) {
    const list = await readMonthlyList(entityType, monthKey);
    let changed = false;

    for (const entry of list) {
      if (entry.entityId === entityId) {
        Object.assign(entry, partial, { lastUpdated: new Date().toISOString() });
        changed = true;
      }
    }

    if (changed) {
      await rebuildMonthlyList(entityType, monthKey, list);
    }
  }
}

export async function updateLatestEventFields(
  entityType: EntityType,
  entityId: string,
  eventKind: string,
  partial: Record<string, any>
): Promise<void> {
  const months = await getEntityLogMonths(entityType);
  const searchOrder = [getCurrentMonthKey(), ...months.filter(m => m !== getCurrentMonthKey())];
  const kind = eventKind.toLowerCase();

  for (const monthKey of searchOrder) {
    const list = await readMonthlyList(entityType, monthKey);
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      const ek = String(e?.event ?? e?.status ?? '').toLowerCase();
      if (e?.entityId === entityId && ek === kind) {
        Object.assign(e, partial, { lastUpdated: new Date().toISOString() });
        await rebuildMonthlyList(entityType, monthKey, list);
        return;
      }
    }
  }
}

// ============================================================================
// Bulk Operations
// ============================================================================

export async function appendBulkOperationLog(
  entityType: EntityType,
  operation: 'import' | 'export',
  details: {
    count: number;
    source?: string;
    importMode?: 'add' | 'merge' | 'replace';
    exportFormat?: string;
    extra?: any;
  }
): Promise<void> {
  const monthKey = getCurrentMonthKey();
  const listKey = buildLogMonthKey(entityType, monthKey);

  const event: LogEventType = operation === 'import' ? LogEventType.BULK_IMPORT : LogEventType.BULK_EXPORT;
  const operationId = uuid();

  const entry = {
    id: uuid(),
    event,
    operationId,
    operation,
    count: details.count,
    source: details.source,
    importMode: details.importMode,
    exportFormat: details.exportFormat,
    extra: details.extra,
    timestamp: getUTCNow().toISOString()
  };

  await kvLPush(listKey, JSON.stringify(entry));
  await kvSAdd(buildLogMonthsIndexKey(entityType), monthKey);
}

// ============================================================================
// Player Points Logging
// ============================================================================

export async function appendPlayerPointsLog(
  playerId: string,
  points: { xp: number; rp: number; fp: number; hp: number },
  sourceId: string,
  sourceType: string,
  customTimestamp?: string | Date
): Promise<void> {
  const monthKey = customTimestamp ? getMonthKeyFromTimestamp(customTimestamp) : getCurrentMonthKey();
  const listKey = buildLogMonthKey(EntityType.PLAYER, monthKey);

  const logEntry = {
    id: uuid(),
    event: LogEventType.WIN_POINTS,
    entityId: playerId,
    points: points,
    sourceId: sourceId,
    sourceType: sourceType,
    description: `XP+${points.xp}, RP+${points.rp}, FP+${points.fp}, HP+${points.hp} from ${sourceType}`,
    timestamp: customTimestamp ? (typeof customTimestamp === 'string' ? customTimestamp : customTimestamp.toISOString()) : new Date().toISOString()
  };

  await kvLPush(listKey, JSON.stringify(logEntry));
  await kvSAdd(buildLogMonthsIndexKey(EntityType.PLAYER), monthKey);
}

export async function appendPlayerPointsChangedLog(
  playerId: string,
  totalPoints: { xp: number; rp: number; fp: number; hp: number },
  points: { xp: number; rp: number; fp: number; hp: number },
  customTimestamp?: string | Date
): Promise<void> {
  const monthKey = customTimestamp ? getMonthKeyFromTimestamp(customTimestamp) : getCurrentMonthKey();
  const listKey = buildLogMonthKey(EntityType.PLAYER, monthKey);

  const logEntry = {
    id: uuid(),
    event: LogEventType.POINTS_CHANGED,
    entityId: playerId,
    totalPoints: totalPoints,
    points: points,
    description: `Total points: XP=${points.xp}, RP=${points.rp}, FP=${points.fp}, HP=${points.hp}`,
    timestamp: customTimestamp ? (typeof customTimestamp === 'string' ? customTimestamp : customTimestamp.toISOString()) : new Date().toISOString()
  };

  await kvLPush(listKey, JSON.stringify(logEntry));
  await kvSAdd(buildLogMonthsIndexKey(EntityType.PLAYER), monthKey);
}

export async function upsertPlayerPointsChangedLog(
  playerId: string,
  totalPoints: { xp: number; rp: number; fp: number; hp: number },
  points: { xp: number; rp: number; fp: number; hp: number }
): Promise<void> {
  const monthKey = getCurrentMonthKey();
  const list = await readMonthlyList(EntityType.PLAYER, monthKey);

  // Find the most recent POINTS_CHANGED entry
  let found = false;
  for (let i = 0; i < list.length; i++) {
    const entry = list[i];
    if (entry.entityId === playerId && entry.event === LogEventType.POINTS_CHANGED) {
      entry.totalPoints = totalPoints;
      entry.points = points;
      entry.lastUpdated = getUTCNow().toISOString();
      found = true;
      break;
    }
  }

  if (found) {
    await rebuildMonthlyList(EntityType.PLAYER, monthKey, list);
  } else {
    // No existing entry — append new one
    await appendPlayerPointsChangedLog(playerId, totalPoints, points);
  }
}

export async function appendPlayerPointsUpdateLog(
  playerId: string,
  oldPoints: { xp: number; rp: number; fp: number; hp: number },
  newPoints: { xp: number; rp: number; fp: number; hp: number },
  sourceId: string
): Promise<void> {
  // Search current month first for existing entries to update
  const monthKey = getCurrentMonthKey();
  const months = await getEntityLogMonths(EntityType.PLAYER);
  const searchOrder = [monthKey, ...months.filter(m => m !== monthKey)];

  // 1. Find and update existing "Win Points" entry for this source
  let winPointsUpdated = false;
  for (const month of searchOrder) {
    const list = await readMonthlyList(EntityType.PLAYER, month);
    for (let i = 0; i < list.length; i++) {
      const entry = list[i];
      if (entry.entityId === playerId &&
        entry.event === LogEventType.WIN_POINTS &&
        entry.sourceId === sourceId) {
        entry.points = newPoints;
        entry.description = `XP+${newPoints.xp}, RP+${newPoints.rp}, FP+${newPoints.fp}, HP+${newPoints.hp} from task`;
        entry.lastUpdated = new Date().toISOString();
        winPointsUpdated = true;
        await rebuildMonthlyList(EntityType.PLAYER, month, list);
        break;
      }
    }
    if (winPointsUpdated) break;
  }

  if (!winPointsUpdated) {
    // Create new Win Points entry if not found
    await appendPlayerPointsLog(playerId, newPoints, sourceId, 'task');
  }

  // 2. Find and update most recent "Points Changed" entry in current month
  const currentList = await readMonthlyList(EntityType.PLAYER, monthKey);
  for (let i = 0; i < currentList.length; i++) {
    const entry = currentList[i];
    if (entry.entityId === playerId && entry.event === LogEventType.POINTS_CHANGED) {
      entry.points = newPoints;
      entry.lastUpdated = new Date().toISOString();
      await rebuildMonthlyList(EntityType.PLAYER, monthKey, currentList);
      break;
    }
  }
}

// ============================================================================
// Entry ID Management
// ============================================================================

export function ensureLogEntryId(entry: any): string {
  if (entry.id) {
    return entry.id;
  }
  return uuid();
}

// ============================================================================
// Soft Delete, Restore, Permanent Delete, Edit
// (Rare operations — read-modify-write on one month, ~50 entries)
// ============================================================================

export async function softDeleteLogEntry(
  entityType: EntityType,
  entryId: string,
  characterId: string,
  reason?: string
): Promise<void> {
  const months = await getEntityLogMonths(entityType);
  const searchOrder = [getCurrentMonthKey(), ...months.filter(m => m !== getCurrentMonthKey())];

  for (const monthKey of searchOrder) {
    const list = await readMonthlyList(entityType, monthKey);
    const entry = list.find(e => e.id === entryId);

    if (entry) {
      entry.isDeleted = true;
      entry.deletedAt = getUTCNow().toISOString();
      entry.deletedBy = characterId;
      if (reason) entry.deleteReason = reason;

      if (!entry.editHistory) entry.editHistory = [];
      entry.editHistory.push({
        editedAt: getUTCNow().toISOString(),
        editedBy: characterId,
        action: 'delete',
        reason
      });

      await rebuildMonthlyList(entityType, monthKey, list);
      return;
    }
  }

  throw new Error(`Log entry ${entryId} not found in ${entityType} log`);
}

export async function restoreLogEntry(
  entityType: EntityType,
  entryId: string,
  characterId: string,
  reason?: string
): Promise<void> {
  const months = await getEntityLogMonths(entityType);
  const searchOrder = [getCurrentMonthKey(), ...months.filter(m => m !== getCurrentMonthKey())];

  for (const monthKey of searchOrder) {
    const list = await readMonthlyList(entityType, monthKey);
    const entry = list.find(e => e.id === entryId);

    if (entry) {
      if (!entry.isDeleted) {
        throw new Error(`Log entry ${entryId} is not deleted`);
      }

      entry.isDeleted = false;
      delete entry.deletedAt;
      delete entry.deletedBy;
      delete entry.deleteReason;

      if (!entry.editHistory) entry.editHistory = [];
      entry.editHistory.push({
        editedAt: getUTCNow().toISOString(),
        editedBy: characterId,
        action: 'restore',
        reason
      });

      await rebuildMonthlyList(entityType, monthKey, list);
      return;
    }
  }

  throw new Error(`Log entry ${entryId} not found in ${entityType} log`);
}

export async function permanentDeleteLogEntry(
  entityType: EntityType,
  entryId: string,
  characterId: string,
  reason?: string
): Promise<void> {
  const months = await getEntityLogMonths(entityType);
  const searchOrder = [getCurrentMonthKey(), ...months.filter(m => m !== getCurrentMonthKey())];

  for (const monthKey of searchOrder) {
    const list = await readMonthlyList(entityType, monthKey);
    const entryIndex = list.findIndex(e => e.id === entryId);

    if (entryIndex !== -1) {
      list.splice(entryIndex, 1);
      await rebuildMonthlyList(entityType, monthKey, list);
      return;
    }
  }

  throw new Error(`Log entry ${entryId} not found in ${entityType} log`);
}

export async function editLogEntry(
  entityType: EntityType,
  entryId: string,
  updates: Record<string, any>,
  characterId: string,
  reason?: string
): Promise<void> {
  const months = await getEntityLogMonths(entityType);
  const searchOrder = [getCurrentMonthKey(), ...months.filter(m => m !== getCurrentMonthKey())];

  for (const monthKey of searchOrder) {
    const list = await readMonthlyList(entityType, monthKey);
    const entry = list.find(e => e.id === entryId);

    if (entry) {
      if (entry.isDeleted) {
        throw new Error(`Cannot edit deleted log entry ${entryId}`);
      }

      const { timestamp: rawTimestamp, ...restUpdates } = updates;
      const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];

      for (const [field, newValue] of Object.entries(restUpdates)) {
        if (['id', 'entityId', 'event'].includes(field)) {
          continue;
        }
        const oldValue = entry[field];
        if (oldValue !== newValue) {
          changes.push({ field, oldValue, newValue });
          entry[field] = newValue;
        }
      }

      if (rawTimestamp !== undefined) {
        const coerced = coerceLogEditTimestamp(String(rawTimestamp));
        if (entry.timestamp !== coerced) {
          changes.push({ field: 'timestamp', oldValue: entry.timestamp, newValue: coerced });
          entry.timestamp = coerced;
        }
      }

      if (changes.length === 0) return;

      entry.editedAt = getUTCNow().toISOString();
      entry.editedBy = characterId;
      entry.lastUpdated = getUTCNow().toISOString();

      if (!entry.editHistory) entry.editHistory = [];
      entry.editHistory.push({
        editedAt: getUTCNow().toISOString(),
        editedBy: characterId,
        action: 'edit',
        changes,
        reason
      });

      await relocateLogEntryToCorrectMonth(entityType, monthKey, entryId, entry);
      return;
    }
  }

  throw new Error(`Log entry ${entryId} not found in ${entityType} log`);
}

// REMOVED: Account logging functions - Account is infrastructure entity, not Core Entity
// Account only handles: triforce creation, player linking, character linking

// ============================================================================
// Query: Get logs + month index
// ============================================================================

export async function getEntityLogMonths(entityType: EntityType): Promise<string[]> {
  const monthsIndexKey = buildLogMonthsIndexKey(entityType);
  const months = await kvSMembers(monthsIndexKey);
  return sortMonthsDesc(months);
}

/**
 * Locate a single log row by id (search current month first, then index months).
 */
export async function getLogEntryById(
  entityType: EntityType,
  logEntryId: string
): Promise<{ entry: any; monthKey: string } | null> {
  const months = await getEntityLogMonths(entityType);
  const searchOrder = [getCurrentMonthKey(), ...months.filter(m => m !== getCurrentMonthKey())];
  for (const monthKey of searchOrder) {
    const list = await readMonthlyList(entityType, monthKey);
    const entry = list.find(e => e.id === logEntryId);
    if (entry) return { entry, monthKey };
  }
  return null;
}

/** @deprecated Prefer getLogEntryById(EntityType.SALE, id) */
export async function getSaleLogEntryById(
  logEntryId: string
): Promise<{ entry: any; monthKey: string } | null> {
  return getLogEntryById(EntityType.SALE, logEntryId);
}

export type SaleLogLeanPatch = {
  name: string;
  type: string;
  station: string;
  cost: number;
  revenue: number;
  siteId?: string;
};

export type TaskLogLeanPatch = {
  name: string;
  taskType: string;
  station: string;
};

export type ItemLogLeanPatch = {
  name: string;
  itemType: string;
  subItemType: string;
  soldQuantity: number;
};

export type FinancialLogLeanPatch = {
  name: string;
  type: string;
  station: string;
  cost: number;
  revenue: number;
};

/**
 * Precision repair: update one log row by id (preserves id, entityId, event).
 */
export async function patchLogEntryById(
  entityType: EntityType,
  options: {
    logEntryId: string;
    entityId?: string;
    newEvent?: string;
    timestampIso?: string;
    saleLean?: SaleLogLeanPatch;
    taskLean?: TaskLogLeanPatch;
    itemLean?: ItemLogLeanPatch;
    financialLean?: FinancialLogLeanPatch;
  }
): Promise<{ monthKey: string }> {
  const hit = await getLogEntryById(entityType, options.logEntryId);
  if (!hit) {
    throw new Error(`Log entry not found: ${options.logEntryId}`);
  }
  const { entry } = hit;
  if (options.entityId && entry.entityId !== options.entityId) {
    throw new Error(
      `logEntryId ${options.logEntryId} belongs to entity ${entry.entityId}, not ${options.entityId}`
    );
  }

  const ev = String(entry.event ?? '').toUpperCase();

  if (entityType === EntityType.SALE) {
    if (!options.saleLean) {
      throw new Error('saleLean is required when entityType is sale');
    }
    const lean = options.saleLean;
    entry.name = lean.name;
    entry.type = lean.type;
    entry.station = lean.station;
    entry.cost = lean.cost;
    entry.revenue = lean.revenue;
    if (lean.siteId !== undefined) entry.siteId = lean.siteId;
  } else if (entityType === EntityType.TASK) {
    if (!options.taskLean) {
      throw new Error('taskLean is required when entityType is task');
    }
    const lean = options.taskLean;
    entry.name = lean.name;
    entry.taskType = lean.taskType;
    entry.station = lean.station;
  } else if (entityType === EntityType.ITEM) {
    if (!options.itemLean) {
      throw new Error('itemLean is required when entityType is item');
    }
    const lean = options.itemLean;
    entry.name = lean.name;
    entry.itemType = lean.itemType;
    entry.subItemType = lean.subItemType;
    entry.soldQuantity = lean.soldQuantity;
  } else if (entityType === EntityType.FINANCIAL) {
    if (!options.financialLean) {
      throw new Error('financialLean is required when entityType is financial');
    }
    const lean = options.financialLean;
    entry.name = lean.name;
    entry.type = lean.type;
    entry.station = lean.station;
    entry.cost = lean.cost;
    entry.revenue = lean.revenue;
  } else {
    throw new Error(`patchLogEntryById not supported for entityType: ${entityType}`);
  }

  if (options.newEvent) entry.event = options.newEvent;
  if (options.timestampIso) entry.timestamp = options.timestampIso;
  delete entry.lastUpdated;

  return relocateLogEntryToCorrectMonth(entityType, hit.monthKey, options.logEntryId, entry);
}

// ============================================================================
// Cross-Entity Log Cleanup (used by task.workflow.ts on delete)
// ============================================================================

/**
 * Remove all log entries matching a filter across all months for an entity type.
 * Used when deleting entities that have log entries across multiple months.
 */
export async function removeLogEntriesAcrossMonths(
  entityType: EntityType,
  filterFn: (entry: any) => boolean
): Promise<number> {
  const months = await getEntityLogMonths(entityType);
  const allMonthKeys = [...new Set([getCurrentMonthKey(), ...months])];
  let totalRemoved = 0;

  for (const monthKey of allMonthKeys) {
    const list = await readMonthlyList(entityType, monthKey);
    const filtered = list.filter(entry => !filterFn(entry));
    const removed = list.length - filtered.length;

    if (removed > 0) {
      await rebuildMonthlyList(entityType, monthKey, filtered);
      totalRemoved += removed;
    }
  }

  return totalRemoved;
}
