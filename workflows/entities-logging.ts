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
    id: uuid(), // Add unique ID to each new entry
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
 * Update player points changed log entry in-place (idempotent)
 * Updates the most recent POINTS_CHANGED entry if it exists, otherwise creates a new one
 */
export async function upsertPlayerPointsChangedLog(
  playerId: string,
  totalPoints: { xp: number; rp: number; fp: number; hp: number },
  points: { xp: number; rp: number; fp: number; hp: number }
): Promise<void> {
  const key = buildLogKey(EntityType.PLAYER);
  const list = (await kvGet<any[]>(key)) || [];
  
  // Find the most recent POINTS_CHANGED entry
  let found = false;
  for (let i = list.length - 1; i >= 0; i--) {
    const entry = list[i];
    if (entry.entityId === playerId && entry.event === LogEventType.POINTS_CHANGED) {
      // Update existing entry in-place
      entry.totalPoints = totalPoints;
      entry.points = points;
      entry.lastUpdated = new Date().toISOString();
      found = true;
      console.log(`[upsertPlayerPointsChangedLog] Updated existing POINTS_CHANGED entry for player ${playerId}`);
      break;
    }
  }
  
  // If no existing entry found, create a new one
  if (!found) {
    const logEntry = {
      event: LogEventType.POINTS_CHANGED,
      entityId: playerId,
      totalPoints: totalPoints,
      points: points,
      description: `Total points: XP=${points.xp}, RP=${points.rp}, FP=${points.fp}, HP=${points.hp}`,
      timestamp: new Date().toISOString()
    };
    list.push(logEntry);
    console.log(`[upsertPlayerPointsChangedLog] Created new POINTS_CHANGED entry for player ${playerId}`);
  }
  
  await kvSet(key, list);
}

/**
 * Log player points update with change tracking
 * Used when task rewards change and points need to be updated
 * This function UPDATES existing log entries in-place instead of creating new ones
 */
export async function appendPlayerPointsUpdateLog(
  playerId: string,
  oldPoints: { xp: number; rp: number; fp: number; hp: number },
  newPoints: { xp: number; rp: number; fp: number; hp: number },
  sourceId: string
): Promise<void> {
  const key = buildLogKey(EntityType.PLAYER);
  const list = (await kvGet<any[]>(key)) || [];
  
  // 1. Find and update the existing "Win Points" entry for this source task
  let winPointsUpdated = false;
  for (let i = list.length - 1; i >= 0; i--) {
    const entry = list[i];
    if (entry.entityId === playerId && 
        entry.event === LogEventType.WIN_POINTS && 
        entry.sourceId === sourceId) {
      // Update the existing "Win Points" entry
      entry.points = newPoints;
      entry.description = `XP+${newPoints.xp}, RP+${newPoints.rp}, FP+${newPoints.fp}, HP+${newPoints.hp} from task`;
      entry.lastUpdated = new Date().toISOString();
      winPointsUpdated = true;
      console.log(`[appendPlayerPointsUpdateLog] Updated existing "Win Points" log entry for sourceId: ${sourceId}`);
      break;
    }
  }
  
  // If no existing "Win Points" entry found, create a new one (shouldn't happen in normal flow)
  if (!winPointsUpdated) {
    console.warn(`[appendPlayerPointsUpdateLog] No existing "Win Points" log entry found for sourceId: ${sourceId}, creating new entry`);
    const winPointsEntry = {
      event: LogEventType.WIN_POINTS,
      entityId: playerId,
      points: newPoints,
      sourceId: sourceId,
      sourceType: 'task',
      description: `XP+${newPoints.xp}, RP+${newPoints.rp}, FP+${newPoints.fp}, HP+${newPoints.hp} from task`,
      timestamp: new Date().toISOString()
    };
    list.push(winPointsEntry);
  }
  
  // 2. Find and update the most recent "Points Changed" entry
  // This entry doesn't have sourceId, so we update the most recent one for this player
  let pointsChangedUpdated = false;
  for (let i = list.length - 1; i >= 0; i--) {
    const entry = list[i];
    if (entry.entityId === playerId && entry.event === LogEventType.POINTS_CHANGED) {
      // Update the existing "Points Changed" entry
      entry.points = newPoints;
      entry.lastUpdated = new Date().toISOString();
      pointsChangedUpdated = true;
      console.log(`[appendPlayerPointsUpdateLog] Updated existing "Points Changed" log entry`);
      break;
    }
  }
  
  // If no "Points Changed" entry found, we don't create one here
  // It will be created by the player entity workflow when needed
  if (!pointsChangedUpdated) {
    console.log(`[appendPlayerPointsUpdateLog] No existing "Points Changed" entry found to update`);
  }
  
  await kvSet(key, list);
}

/**
 * Ensure a log entry has a unique ID
 * If entry already has an ID, return it. Otherwise, generate and add one.
 * Used for backward compatibility with existing logs that don't have IDs yet.
 */
export function ensureLogEntryId(entry: any): string {
  if (entry.id) {
    return entry.id;
  }
  return uuid();
}

/**
 * Soft-delete a specific log entry
 * - Marks entry as deleted with timestamp and actor
 * - Preserves original entry for audit
 * - Does NOT remove entry from log array
 */
export async function softDeleteLogEntry(
  entityType: EntityType,
  entryId: string,
  characterId: string,
  reason?: string
): Promise<void> {
  const key = buildLogKey(entityType);
  const list = (await kvGet<any[]>(key)) || [];
  
  const entry = list.find(e => e.id === entryId);
  if (!entry) {
    throw new Error(`Log entry ${entryId} not found in ${entityType} log`);
  }
  
  // Mark entry as deleted
  entry.isDeleted = true;
  entry.deletedAt = new Date().toISOString();
  entry.deletedBy = characterId;
  if (reason) {
    entry.deleteReason = reason;
  }
  
  // Append audit record to entry's edit history
  if (!entry.editHistory) {
    entry.editHistory = [];
  }
  entry.editHistory.push({
    editedAt: new Date().toISOString(),
    editedBy: characterId,
    action: 'delete',
    reason
  });
  
  await kvSet(key, list);
  console.log(`[softDeleteLogEntry] Entry ${entryId} soft-deleted in ${entityType} log`);
}

/**
 * Restore a soft-deleted entry
 * - Removes deletedAt/isDeleted/deletedBy flags
 * - Appends restoration audit entry
 */
export async function restoreLogEntry(
  entityType: EntityType,
  entryId: string,
  characterId: string,
  reason?: string
): Promise<void> {
  const key = buildLogKey(entityType);
  const list = (await kvGet<any[]>(key)) || [];
  
  const entry = list.find(e => e.id === entryId);
  if (!entry) {
    throw new Error(`Log entry ${entryId} not found in ${entityType} log`);
  }
  
  if (!entry.isDeleted) {
    throw new Error(`Log entry ${entryId} is not deleted`);
  }
  
  // Remove deletion flags
  entry.isDeleted = false;
  delete entry.deletedAt;
  delete entry.deletedBy;
  delete entry.deleteReason;
  
  // Append audit record to entry's edit history
  if (!entry.editHistory) {
    entry.editHistory = [];
  }
  entry.editHistory.push({
    editedAt: new Date().toISOString(),
    editedBy: characterId,
    action: 'restore',
    reason
  });
  
  await kvSet(key, list);
  console.log(`[restoreLogEntry] Entry ${entryId} restored in ${entityType} log`);
}

/**
 * Permanently delete a log entry
 * - Removes entry from log array completely
 * - Cannot be undone
 */
export async function permanentDeleteLogEntry(
  entityType: EntityType,
  entryId: string,
  characterId: string,
  reason?: string
): Promise<void> {
  const key = buildLogKey(entityType);
  const list = (await kvGet<any[]>(key)) || [];

  const entryIndex = list.findIndex(e => e.id === entryId);
  if (entryIndex === -1) {
    throw new Error(`Log entry ${entryId} not found in ${entityType} log`);
  }

  // Remove entry from array completely
  list.splice(entryIndex, 1);

  await kvSet(key, list);
  console.log(`[permanentDeleteLogEntry] Entry ${entryId} permanently deleted from ${entityType} log`);
}

/**
 * Edit a specific log entry
 * - Creates audit record of changes
 * - Updates entry with new values
 * - Tracks who made the change
 */
export async function editLogEntry(
  entityType: EntityType,
  entryId: string,
  updates: Record<string, any>,
  characterId: string,
  reason?: string
): Promise<void> {
  const key = buildLogKey(entityType);
  const list = (await kvGet<any[]>(key)) || [];
  
  const entry = list.find(e => e.id === entryId);
  if (!entry) {
    throw new Error(`Log entry ${entryId} not found in ${entityType} log`);
  }
  
  if (entry.isDeleted) {
    throw new Error(`Cannot edit deleted log entry ${entryId}`);
  }
  
  // Create audit record of changes
  const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
  
  // Update fields and track changes
  for (const [field, newValue] of Object.entries(updates)) {
    // Skip immutable fields
    if (['id', 'entityId', 'timestamp', 'event'].includes(field)) {
      console.warn(`[editLogEntry] Attempted to modify immutable field: ${field}`);
      continue;
    }
    
    const oldValue = entry[field];
    if (oldValue !== newValue) {
      changes.push({ field, oldValue, newValue });
      entry[field] = newValue;
    }
  }
  
  if (changes.length === 0) {
    console.log(`[editLogEntry] No changes detected for entry ${entryId}`);
    return;
  }
  
  // Add audit metadata
  entry.editedAt = new Date().toISOString();
  entry.editedBy = characterId;
  entry.lastUpdated = new Date().toISOString();
  
  // Append audit record to entry's edit history
  if (!entry.editHistory) {
    entry.editHistory = [];
  }
  entry.editHistory.push({
    editedAt: new Date().toISOString(),
    editedBy: characterId,
    action: 'edit',
    changes,
    reason
  });
  
  await kvSet(key, list);
  console.log(`[editLogEntry] Entry ${entryId} updated in ${entityType} log with ${changes.length} changes`);
}

// REMOVED: Account logging functions - Account is infrastructure entity, not Core Entity
// Account only handles: triforce creation, player linking, character linking
