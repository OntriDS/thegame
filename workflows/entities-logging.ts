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
  console.log('🔥 [appendEntityLog] START', { entityType, entityId, event, key });
  
  const list = (await kvGet<any[]>(key)) || [];
  console.log('🔥 [appendEntityLog] Current list length:', list.length);
  
  const entry = { 
    event,
    entityId,
    ...details,
    timestamp: new Date().toISOString() 
  };
  
  list.push(entry);
  console.log('🔥 [appendEntityLog] Pushing entry:', entry);
  
  await kvSet(key, list);
  console.log('🔥 [appendEntityLog] ✅ Saved to KV, new length:', list.length);
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
  
  // Find the most recent log entry for this entity
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i]?.entityId === entityId) {
      list[i][fieldName] = newValue;
      list[i].lastUpdated = new Date().toISOString();
      break;
    }
  }
  
  await kvSet(key, list);
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
 * Log item creation with source tracking
 * Used for items created from tasks, financial records, or directly
 */
export async function appendItemCreationLog(
  item: any,
  sourceType: 'task' | 'record' | 'direct',
  sourceId?: string
): Promise<void> {
  const key = buildLogKey('item');
  const list = (await kvGet<any[]>(key)) || [];
  
  const logEntry = {
    event: LogEventType.CREATED,
    entityId: item.id,
    itemName: item.name,
    itemType: item.type,
    collection: item.collection,
    status: item.status,
    quantity: item.stock?.reduce((sum: number, stock: any) => sum + stock.quantity, 0) || 0,
    unitCost: item.unitCost || 0,
    totalCost: (item.stock?.reduce((sum: number, stock: any) => sum + stock.quantity, 0) || 0) * (item.unitCost || 0),
    price: item.price || 0,
    station: item.station,
    category: item.category,
    year: item.year,
    sourceType,
    sourceId,
    description: `Item created from ${sourceType}: ${item.type} (${item.stock?.reduce((sum: number, stock: any) => sum + stock.quantity, 0) || 0}x)`,
    timestamp: new Date().toISOString()
  };
  
  list.push(logEntry);
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
  const key = buildLogKey('player');
  const list = (await kvGet<any[]>(key)) || [];
  
  const logEntry = {
    event: LogEventType.POINTS_CHANGED,
    entityId: playerId,
    points: points,
    sourceId: sourceId,
    sourceType: sourceType,
    description: `Points awarded from ${sourceType}: XP+${points.xp}, RP+${points.rp}, FP+${points.fp}, HP+${points.hp}`,
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
  const key = buildLogKey('character');
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
  const key = buildLogKey('player');
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

/**
 * Log account authentication events
 * Used for login, logout, password reset, email verification
 */
export async function appendAccountAuthLog(
  accountId: string,
  eventType: LogEventType,
  details: {
    email?: string;
    loginAttempts?: number;
    ipAddress?: string;
    userAgent?: string;
    success?: boolean;
    reason?: string;
  }
): Promise<void> {
  const key = buildLogKey('account');
  const list = (await kvGet<any[]>(key)) || [];
  
  const logEntry = {
    event: eventType,
    entityId: accountId,
    email: details.email,
    loginAttempts: details.loginAttempts,
    ipAddress: details.ipAddress,
    userAgent: details.userAgent,
    success: details.success,
    reason: details.reason,
    description: `${eventType} event for account ${accountId}`,
    timestamp: new Date().toISOString()
  };
  
  list.push(logEntry);
  await kvSet(key, list);
}

/**
 * Log account security events
 * Used for failed login attempts, suspicious activity, account lockouts
 */
export async function appendAccountSecurityLog(
  accountId: string,
  eventType: LogEventType,
  details: {
    email?: string;
    loginAttempts?: number;
    ipAddress?: string;
    userAgent?: string;
    reason?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  }
): Promise<void> {
  const key = buildLogKey('account');
  const list = (await kvGet<any[]>(key)) || [];
  
  const logEntry = {
    event: eventType,
    entityId: accountId,
    email: details.email,
    loginAttempts: details.loginAttempts,
    ipAddress: details.ipAddress,
    userAgent: details.userAgent,
    reason: details.reason,
    severity: details.severity,
    description: `Security event: ${eventType} for account ${accountId} - ${details.reason || 'No reason provided'}`,
    timestamp: new Date().toISOString()
  };
  
  list.push(logEntry);
  await kvSet(key, list);
}
