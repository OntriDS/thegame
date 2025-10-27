// workflows/entities-logging.ts
// Append-only lifecycle logs + in-place field updates for descriptive changes

import { kvGet, kvSet } from '@/data-store/kv';
import { buildLogKey } from '@/data-store/keys';
import { EntityType, LogEventType } from '@/types/enums';
import { v4 as uuid } from 'uuid';

export async function appendEntityLog(
  entityType: EntityType, 
  entityId: string,
  event: LogEventType,
  details: Record<string, any>
): Promise<void> {
  const key = buildLogKey(entityType);
  const list = (await kvGet<any[]>(key)) || [];
  
  const entry = { 
    event,
    entityId,
    ...details,
    timestamp: new Date().toISOString() 
  };
  
  list.push(entry);
  await kvSet(key, list);
}

export async function updateEntityLogField(
  entityType: EntityType, 
  entityId: string, 
  fieldName: string,
  oldValue: any,
  newValue: any
): Promise<void> {
  const key = buildLogKey(entityType);
  const list = (await kvGet<any[]>(key)) || [];
  
  // For CREATED entries specifically, update only the CREATED entry
  // For other event types, update the most recent matching entry
  const createdEntry = list.find(entry => 
    entry.entityId === entityId && 
    entry.event?.toLowerCase() === 'created'
  );
  
  if (createdEntry) {
    // Update CREATED entry directly
    createdEntry[fieldName] = newValue;
    createdEntry.lastUpdated = new Date().toISOString();
  } else {
    // Find the most recent log entry for this entity as fallback
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i]?.entityId === entityId) {
        list[i][fieldName] = newValue;
        list[i].lastUpdated = new Date().toISOString();
        break;
      }
    }
  }
  
  await kvSet(key, list);
}

// Safer helpers: update CREATED entry fields (descriptive corrections only)
export async function updateCreatedEntryFields(
  entityType: EntityType,
  entityId: string,
  partial: Record<string, any>
): Promise<void> {
  const key = buildLogKey(entityType);
  const list = (await kvGet<any[]>(key)) || [];
  const createdEntry = list.find(entry => 
    entry.entityId === entityId && 
    String(entry.event ?? entry.status ?? '').toLowerCase() === 'created'
  );
  if (createdEntry) {
    Object.assign(createdEntry, partial, { lastUpdated: new Date().toISOString() });
    await kvSet(key, list);
  }
}

// Safer helpers: update latest entry of specific event kind
export async function updateLatestEventFields(
  entityType: EntityType,
  entityId: string,
  eventKind: string,
  partial: Record<string, any>
): Promise<void> {
  const key = buildLogKey(entityType);
  const list = (await kvGet<any[]>(key)) || [];
  const kind = eventKind.toLowerCase();
  for (let i = list.length - 1; i >= 0; i--) {
    const e = list[i];
    const ek = String(e?.event ?? e?.status ?? '').toLowerCase();
    if (e?.entityId === entityId && ek === kind) {
      Object.assign(e, partial, { lastUpdated: new Date().toISOString() });
      await kvSet(key, list);
      break;
    }
  }
}

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
  const key = buildLogKey(entityType);
  const list = (await kvGet<any[]>(key)) || [];
  
  const event: LogEventType = operation === 'import' ? LogEventType.BULK_IMPORT : LogEventType.BULK_EXPORT;
  const operationId = uuid();
  
  list.push({
    event,
    operationId,
    operation,
    count: details.count,
    source: details.source,
    importMode: details.importMode,
    exportFormat: details.exportFormat,
    extra: details.extra,
    timestamp: new Date().toISOString()
  });
  
  await kvSet(key, list);
}



/**
 * Log player points award with source tracking
 * Used for points awarded from tasks, financial records, or sales
 */
export async function appendPlayerPointsLog(
  playerId: string,
  points: { xp: number; rp: number; fp: number; hp: number },
  sourceId: string,
  sourceType: string
): Promise<void> {
  const key = buildLogKey(EntityType.PLAYER);
  const list = (await kvGet<any[]>(key)) || [];
  
  const logEntry = {
    event: LogEventType.WIN_POINTS,
    entityId: playerId,
    points: points,
    sourceId: sourceId,
    sourceType: sourceType,
    description: `XP+${points.xp}, RP+${points.rp}, FP+${points.fp}, HP+${points.hp} from ${sourceType}`,
    timestamp: new Date().toISOString()
  };
  
  list.push(logEntry);
  await kvSet(key, list);
}

/**
 * Log player total points after changes
 * Shows the actual total points the player has after any change
 */
export async function appendPlayerPointsChangedLog(
  playerId: string,
  totalPoints: { xp: number; rp: number; fp: number; hp: number },
  points: { xp: number; rp: number; fp: number; hp: number }
): Promise<void> {
  const key = buildLogKey(EntityType.PLAYER);
  const list = (await kvGet<any[]>(key)) || [];
  
  const logEntry = {
    event: LogEventType.POINTS_CHANGED,
    entityId: playerId,
    totalPoints: totalPoints,
    points: points,
    description: `Total points: XP=${points.xp}, RP=${points.rp}, FP=${points.fp}, HP=${points.hp}`,
    timestamp: new Date().toISOString()
  };
  
  list.push(logEntry);
  await kvSet(key, list);
}

/**
 * Log character jungle coins award with source tracking
 * Used for jungle coins awarded from financial records
 */
export async function appendCharacterJungleCoinsLog(
  characterId: string,
  amount: number,
  sourceId: string,
  sourceType: string
): Promise<void> {
  const key = buildLogKey(EntityType.CHARACTER);
  const list = (await kvGet<any[]>(key)) || [];
  
  const logEntry = {
    event: LogEventType.UPDATED,
    entityId: characterId,
    jungleCoins: amount,
    sourceId: sourceId,
    sourceType: sourceType,
    description: `Jungle coins awarded from ${sourceType}: +${amount} J$`,
    timestamp: new Date().toISOString()
  };
  
  list.push(logEntry);
  await kvSet(key, list);
}

/**
 * Log player points update with change tracking
 * Used when task rewards change and points need to be updated
 */
export async function appendPlayerPointsUpdateLog(
  playerId: string,
  oldPoints: { xp: number; rp: number; fp: number; hp: number },
  newPoints: { xp: number; rp: number; fp: number; hp: number },
  sourceId: string
): Promise<void> {
  const key = buildLogKey(EntityType.PLAYER);
  const list = (await kvGet<any[]>(key)) || [];
  
  const delta = {
    xp: newPoints.xp - oldPoints.xp,
    rp: newPoints.rp - oldPoints.rp,
    fp: newPoints.fp - oldPoints.fp,
    hp: newPoints.hp - oldPoints.hp
  };
  
  const logEntry = {
    event: LogEventType.POINTS_CHANGED,
    entityId: playerId,
    oldPoints: oldPoints,
    newPoints: newPoints,
    delta: delta,
    sourceId: sourceId,
    description: `Points updated: XP${delta.xp >= 0 ? '+' : ''}${delta.xp}, RP${delta.rp >= 0 ? '+' : ''}${delta.rp}, FP${delta.fp >= 0 ? '+' : ''}${delta.fp}, HP${delta.hp >= 0 ? '+' : ''}${delta.hp}`,
    timestamp: new Date().toISOString()
  };
  
  list.push(logEntry);
  await kvSet(key, list);
}

// REMOVED: Account logging functions - Account is infrastructure entity, not Core Entity
// Account only handles: triforce creation, player linking, character linking
