// workflows/entities-logging.ts
// Redis List-based lifecycle logs with monthly key partitioning
// Writes: LPUSH (O(1), no read needed)
// Reads: LRANGE (paginated, scoped to one month)
// Edit/Delete: read-modify-write on monthly list (rare operations, ~50 entries)

import { kvLPush, kvLRange, kvSAdd, kvSMembers, kvDel, kvLSet } from '@/data-store/kv';
import { buildLogMonthKey, buildLogMonthsIndexKey } from '@/data-store/keys';
import { EntityType, LogEventType } from '@/types/enums';
import { kv } from '@/data-store/kv';
import { v4 as uuid } from 'uuid';

// ============================================================================
// Helpers
// ============================================================================

function getCurrentMonthKey(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  return `${mm}-${yy}`;
}

function getMonthKeyFromTimestamp(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  if (isNaN(date.getTime())) return getCurrentMonthKey();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  return `${mm}-${yy}`;
}

function normalizeLogEntry(entry: any): any {
  if (entry?.id) {
    return entry;
  }
  return { ...entry, id: uuid() };
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

/** Rebuild a monthly list (DEL + RPUSH). Used for rare edit/delete ops. */
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
  details: Record<string, any>
): Promise<void> {
  const monthKey = getCurrentMonthKey();
  const listKey = buildLogMonthKey(entityType, monthKey);

  // 1. Construct the Strict Lean Payload based on EntityType
  // CRITICAL: We NO LONGER spread the full object. We only keep prescribed fields.
  let entry: any = {
    id: uuid(),
    entityId,
    event,
    timestamp: new Date().toISOString()
  };

  switch (entityType) {
    case EntityType.FINANCIAL:
    case EntityType.SALE:
      entry.name = details.name || 'Unknown';
      entry.type = details.type || 'Unknown';
      entry.station = details.station || 'Unknown';
      entry.cost = details.cost ?? 0;
      entry.revenue = details.revenue ?? 0;
      break;

    case EntityType.ITEM:
      entry.name = details.name || 'Unknown';
      entry.itemType = details.itemType || 'Unknown';
      entry.subItemType = details.subItemType || 'Unknown';
      entry.quantity = details.quantity ?? 1;
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

  // 2. Fetch the absolute last log entry to check for redundant loop-spam
  const lastRaw = await kvLRange(listKey, 0, 0);
  if (lastRaw.length > 0) {
    try {
      const lastEntry = parseEntry(lastRaw[0]);
      if (lastEntry && lastEntry.entityId === entityId) {
        const lastTimestamp = new Date(lastEntry.timestamp).getTime();
        const currentTimestamp = new Date(entry.timestamp).getTime();
        const timeDiffMs = currentTimestamp - lastTimestamp;

        // FILTER: If the event type is the exact same as the last one, it's loop spam. Ignore it.
        if (lastEntry.event === event) {
          return;
        }

        // FILTER: Rapid Flip-Flop. If state changed, but it happened within 3 seconds of the last change,
        // it's likely a UI glitch/rapid clicking. We overwrite the last kept log with this final state.
        if (timeDiffMs < 1500) {
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
      createdEntry.lastUpdated = new Date().toISOString();
      await rebuildMonthlyList(entityType, monthKey, list);
      return;
    }

    // Fallback: find most recent entry for this entity in this month
    for (let i = 0; i < list.length; i++) {
      if (list[i]?.entityId === entityId) {
        list[i][fieldName] = newValue;
        list[i].lastUpdated = new Date().toISOString();
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
    timestamp: new Date().toISOString()
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
  sourceType: string
): Promise<void> {
  const monthKey = getCurrentMonthKey();
  const listKey = buildLogMonthKey(EntityType.PLAYER, monthKey);

  const logEntry = {
    id: uuid(),
    event: LogEventType.WIN_POINTS,
    entityId: playerId,
    points: points,
    sourceId: sourceId,
    sourceType: sourceType,
    description: `XP+${points.xp}, RP+${points.rp}, FP+${points.fp}, HP+${points.hp} from ${sourceType}`,
    timestamp: new Date().toISOString()
  };

  await kvLPush(listKey, JSON.stringify(logEntry));
  await kvSAdd(buildLogMonthsIndexKey(EntityType.PLAYER), monthKey);
}

export async function appendPlayerPointsChangedLog(
  playerId: string,
  totalPoints: { xp: number; rp: number; fp: number; hp: number },
  points: { xp: number; rp: number; fp: number; hp: number }
): Promise<void> {
  const monthKey = getCurrentMonthKey();
  const listKey = buildLogMonthKey(EntityType.PLAYER, monthKey);

  const logEntry = {
    id: uuid(),
    event: LogEventType.POINTS_CHANGED,
    entityId: playerId,
    totalPoints: totalPoints,
    points: points,
    description: `Total points: XP=${points.xp}, RP=${points.rp}, FP=${points.fp}, HP=${points.hp}`,
    timestamp: new Date().toISOString()
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
      entry.lastUpdated = new Date().toISOString();
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
      entry.deletedAt = new Date().toISOString();
      entry.deletedBy = characterId;
      if (reason) entry.deleteReason = reason;

      if (!entry.editHistory) entry.editHistory = [];
      entry.editHistory.push({
        editedAt: new Date().toISOString(),
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
        editedAt: new Date().toISOString(),
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

      const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];

      for (const [field, newValue] of Object.entries(updates)) {
        if (['id', 'entityId', 'timestamp', 'event'].includes(field)) {
          continue;
        }
        const oldValue = entry[field];
        if (oldValue !== newValue) {
          changes.push({ field, oldValue, newValue });
          entry[field] = newValue;
        }
      }

      if (changes.length === 0) return;

      entry.editedAt = new Date().toISOString();
      entry.editedBy = characterId;
      entry.lastUpdated = new Date().toISOString();

      if (!entry.editHistory) entry.editHistory = [];
      entry.editHistory.push({
        editedAt: new Date().toISOString(),
        editedBy: characterId,
        action: 'edit',
        changes,
        reason
      });

      await rebuildMonthlyList(entityType, monthKey, list);
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
  let totalRemoved = 0;

  for (const monthKey of months) {
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

// ============================================================================
// Legacy: Rotation (kept for backward compat but not commonly needed now)
// ============================================================================

export async function rotateEntityLogsToMonth(
  entityType: EntityType,
  mmyy: string
): Promise<number> {
  // With the new monthly key architecture, logs are already written to monthly keys.
  // This function is kept for backward compatibility — it moves any entries from the
  // legacy active key to the specified month key.
  const legacyActiveKey = `logs:${entityType}`;
  const { kvGet } = await import('@/data-store/kv');
  const activeLogs = ((await kvGet<any[]>(legacyActiveKey)) || []).map(normalizeLogEntry);

  if (activeLogs.length === 0) return 0;

  // Group by month based on timestamps
  const byMonth = new Map<string, any[]>();
  for (const entry of activeLogs) {
    const entryMonth = entry.timestamp ? getMonthKeyFromTimestamp(entry.timestamp) : mmyy;
    if (!byMonth.has(entryMonth)) byMonth.set(entryMonth, []);
    byMonth.get(entryMonth)!.push(entry);
  }

  let totalMoved = 0;
  for (const [month, entries] of byMonth) {
    const listKey = buildLogMonthKey(entityType, month);
    const serialized = entries.map(e => JSON.stringify(e));
    await kvLPush(listKey, ...serialized);
    await kvSAdd(buildLogMonthsIndexKey(entityType), month);
    totalMoved += entries.length;
  }

  // Clear legacy key
  const { kvSet } = await import('@/data-store/kv');
  await kvSet(legacyActiveKey, []);

  return totalMoved;
}
