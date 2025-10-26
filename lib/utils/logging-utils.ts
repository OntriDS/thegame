// lib/utils/logging-utils.ts
import { formatDateDDMMYYYY } from '@/lib/constants/date-constants';
import { EntityType } from '@/types/enums';

/**
 * Generic log entry interface for all entity types
 */
export interface LogEntry {
  id: string;
  entityId: string;
  entityType: EntityType;
  status: string;
  timestamp: string;
  data: any;
  description?: string;
  orgId?: string; // Phase 6: Multi-user scaffolding
  userId?: string; // Phase 6: Multi-user scaffolding
}

/**
 * Generic log structure for all log files
 */
export interface LogStructure {
  entries: LogEntry[];
  lastUpdated: string;
  schemaVersion?: string; // Phase 0: Add schema version for forward migrations
}

/**
 * Check if an entity already has a log entry for a specific status
 * This ensures idempotency - prevents duplicate logging
 */
export function isEntityLogged(
  entries: LogEntry[], 
  entityId: string, 
  status: string
): boolean {
  return entries.some(entry => 
    entry.entityId === entityId && 
    entry.status === status
  );
}

/**
 * Create a new log entry with proper formatting and idempotency
 * FOR CHARACTER LOG: Use the original format that was working perfectly
 */
export function createLogEntry(
  entityId: string,
  entityType: EntityType,
  status: string,
  data: any,
  description?: string,
  orgId?: string,
  userId?: string
): LogEntry {
  if (entityType === EntityType.CHARACTER) {
    // Use the unified format for character logs (no points!)
    return {
      id: `${entityType}-${entityId}-${Date.now()}`,
      entityId,
      entityType,
      status,
      timestamp: formatDateDDMMYYYY(new Date()),
      data,
      description,
      orgId,
      userId
    };
  }
  
  // For other log types, use the new unified format
  return {
    id: `${entityType}-${entityId}-${Date.now()}`,
    entityId,
    entityType,
    status,
    timestamp: formatDateDDMMYYYY(new Date()),
    data,
    description,
    orgId,
    userId
  };
}

/**
 * Add a log entry with idempotency check
 * Returns true if entry was added, false if already exists
 */
export function addLogEntry(
  entries: LogEntry[],
  entityId: string,
  entityType: EntityType,
  status: string,
  data: any,
  description?: string,
  orgId?: string,
  userId?: string
): { success: boolean; entry?: LogEntry } {
  // Check idempotency - don't add if already logged for this status
  if (isEntityLogged(entries, entityId, status)) {
    return { success: false };
  }

  const newEntry = createLogEntry(entityId, entityType, status, data, description, orgId, userId);
  entries.push(newEntry);
  
  return { success: true, entry: newEntry };
}

/**
 * Remove all log entries for a specific entity
 * Used when entity is deleted or status changes
 */
export function removeEntityLogEntries(
  entries: LogEntry[],
  entityId: string
): LogEntry[] {
  return entries.filter(entry => entry.entityId !== entityId);
}

/**
 * Remove log entries for a specific entity and status
 * Used when status changes back (e.g., task uncompleted)
 */
export function removeEntityStatusEntries(
  entries: LogEntry[],
  entityId: string,
  status: string
): LogEntry[] {
  return entries.filter(entry => 
    !(entry.entityId === entityId && entry.status === status)
  );
}


/**
 * Sort log entries by timestamp (newest first by default)
 */
export function sortEntriesByTimestamp(
  entries: LogEntry[],
  order: 'newest' | 'oldest' = 'newest'
): LogEntry[] {
  const parseToDate = (ts?: string): Date => {
    if (!ts || typeof ts !== 'string') return new Date(0);
    // If already in DD-MM-YYYY, convert safely
    const ddmmyyyyMatch = ts.match(/^\d{2}-\d{2}-\d{4}$/);
    if (ddmmyyyyMatch) {
      const [dd, mm, yyyy] = ts.split('-');
      return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    }
    // Fallback: try native Date parsing (ISO or similar)
    const d = new Date(ts);
    if (!isNaN(d.getTime())) return d;
    // As a last resort, treat as epoch 0 to avoid throw
    return new Date(0);
  };

  return [...entries].sort((a, b) => {
    const dateA = parseToDate(a.timestamp);
    const dateB = parseToDate(b.timestamp);
    return order === 'newest' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
  });
}

/**
 * Normalize a single entry timestamp to DD-MM-YYYY.
 * If missing/invalid, falls back to data.createdAt/updatedAt or today.
 */
export function normalizeTimestamp(entry: LogEntry): string {
  const toDDMMYYYY = (d: Date) => formatDateDDMMYYYY(d);

  // If already valid DD-MM-YYYY, keep it
  if (entry.timestamp && /^\d{2}-\d{2}-\d{4}$/.test(entry.timestamp)) {
    return entry.timestamp;
  }

  // Try to parse timestamp as native date string
  if (entry.timestamp) {
    const d = new Date(entry.timestamp);
    if (!isNaN(d.getTime())) return toDDMMYYYY(d);
  }

  // Try data.createdAt / data.updatedAt if present
  const candidate = (entry as any).data?.createdAt || (entry as any).data?.updatedAt;
  if (candidate) {
    const d = new Date(candidate);
    if (!isNaN(d.getTime())) return toDDMMYYYY(d);
  }

  // Fallback to today
  return toDDMMYYYY(new Date());
}

/** Normalize all entries' timestamps to DD-MM-YYYY. */
export function normalizeEntriesTimestamps(entries: LogEntry[]): LogEntry[] {
  return entries.map(e => ({ ...e, timestamp: normalizeTimestamp(e) }));
}

// ============================================================================
// LOG PROCESSING UTILITIES (Client-side)
// ============================================================================

/**
 * Client-side deduplication for log entries
 */
export function deduplicateLogEntries(log: any): any {
  if (!log || !log.entries) return log;

  const map = new Map<string, any>();

  for (const entry of log.entries) {
    // Use event first (our logs store event), then fall back to status/type
    const kind = (entry.event ?? entry.status ?? entry.type ?? 'unknown');
    const key = `${entry.entityId ?? entry.id ?? 'unknown'}|${String(kind).toLowerCase()}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, entry);
      continue;
    }

    const existingTime = new Date(existing.timestamp ?? existing.date ?? 0).getTime();
    const currentTime = new Date(entry.timestamp ?? entry.date ?? 0).getTime();

    if (currentTime >= existingTime) {
      map.set(key, entry);
    }
  }

  return {
    ...log,
    entries: Array.from(map.values())
  };
}

/**
 * Sort log entries by date (alternative implementation)
 */
export function sortLogEntries(entries: any[], order: 'newest' | 'oldest' = 'newest'): any[] {
  if (!entries || !Array.isArray(entries)) return [];

  const toMs = (value: any): number => {
    const ts: string | number | undefined = value?.timestamp ?? value?.date;
    if (!ts) return 0;
    if (typeof ts === 'number') return ts;

    // If format is DD-MM-YYYY, convert to YYYY-MM-DD for Date()
    const ddmmyyyyMatch = /^\d{2}-\d{2}-\d{4}$/.test(ts);
    if (ddmmyyyyMatch) {
      const [dd, mm, yyyy] = ts.split('-');
      const d = new Date(`${yyyy}-${mm}-${dd}`);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    }

    // Otherwise try native parsing (e.g., ISO strings)
    const d = new Date(ts);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  };

  return [...entries].sort((a, b) => {
    const aMs = toMs(a);
    const bMs = toMs(b);
    
    // Primary sort by timestamp
    if (aMs !== bMs) {
      return order === 'newest' ? bMs - aMs : aMs - bMs;
    }
    
    // Tie-breaker: Use _logOrder field if present, otherwise use event lifecycle order
    const orderA = (a as any)._logOrder ?? getEventOrder(a);
    const orderB = (b as any)._logOrder ?? getEventOrder(b);
    
    // For newest: ascending order (CREATED 0 < DONE 1)
    // For oldest: also ascending order (CREATED 0 < DONE 1)
    return orderA - orderB;
  });
}

function getEventOrder(entry: any): number {
  const eventOrder: Record<string, number> = {
    'created': 0,
    'pending': 1,
    'moved': 2,
    'updated': 3,
    'done': 4,
    'sold': 5,
    'collected': 6,
    'cancelled': 7,
  };
  
  const event = (entry.event || entry.status || '').toLowerCase();
  return eventOrder[event] ?? 999;
}

/**
 * Derive a normalized event kind for an entry.
 * Prefers `event`, falls back to `status` or `type`.
 */
export function getEntryEventKind(entry: any): string {
  const kind = (entry?.event ?? entry?.status ?? entry?.type ?? 'unknown');
  return String(kind).toLowerCase();
}

/**
 * Build a map of entityId -> latest state event kind (for badges).
 * State events considered: created, pending, updated, done, collected, cancelled, moved, sold
 */
export function buildLatestStatusMap(entries: any[]): Record<string, string> {
  const stateEventSet = new Set([
    'created', 'pending', 'updated', 'done', 'collected', 'cancelled', 'moved', 'sold'
  ]);
  const latest: Record<string, { when: number; kind: string }> = {};

  for (const e of entries || []) {
    const entityId = e.entityId || e.id;
    if (!entityId) continue;
    const kind = getEntryEventKind(e);
    if (!stateEventSet.has(kind)) continue;
    const whenRaw = e.timestamp ?? e.date;
    const when = whenRaw ? new Date(whenRaw).getTime() : 0;
    const prev = latest[entityId];
    if (!prev || when >= prev.when) {
      latest[entityId] = { when, kind };
    }
  }

  const result: Record<string, string> = {};
  Object.keys(latest).forEach(id => (result[id] = latest[id].kind));
  return result;
}

/** Extract a best-effort display name from a log entry */
export function extractEntryName(entry: any): string | undefined {
  const d = entry?.data || {};
  return (
    entry?.name ||
    d.name ||
    entry?.taskName || d.taskName ||
    entry?.itemName || d.itemName ||
    entry?.saleName || d.saleName ||
    undefined
  );
}

/** Build entityId -> latest known display name map */
export function buildLatestNameMap(entries: any[]): Record<string, string> {
  const latestName: Record<string, { when: number; name: string }> = {};
  for (const e of entries || []) {
    const entityId = e.entityId || e.id;
    if (!entityId) continue;
    const name = extractEntryName(e);
    if (!name) continue;
    const whenRaw = e.timestamp ?? e.date;
    const when = whenRaw ? new Date(whenRaw).getTime() : 0;
    const prev = latestName[entityId];
    if (!prev || when >= prev.when) {
      latestName[entityId] = { when, name };
    }
  }
  const result: Record<string, string> = {};
  Object.keys(latestName).forEach(id => (result[id] = latestName[id].name));
  return result;
}

/**
 * Filter log entries by type
 */
export function filterLogEntries(entries: any[], type: string): any[] {
  if (!entries || !Array.isArray(entries)) return [];
  if (!type || type === 'all') return entries;
  
  return entries.filter(entry => {
    const entryType = entry.type || entry.status;
    if (!entryType) return false;
    return entryType.toLowerCase() === type.toLowerCase();
  });
}

/**
 * Get log entry count by type
 */
export function getLogEntryCounts(entries: any[]): { [key: string]: number } {
  if (!entries || !Array.isArray(entries)) return {};

  const counts: { [key: string]: number } = {};
  entries.forEach(entry => {
    const type = getEntryEventKind(entry) || 'unknown';
    counts[type] = (counts[type] || 0) + 1;
  });

  return counts;
}

/**
 * Format log entry for display
 */
export function formatLogEntry(entry: any): any {
  const raw = entry?.timestamp ?? entry?.date ?? '';

  // Default: show the stored string as-is for DD-MM-YYYY (previous behavior)
  let formattedDate = typeof raw === 'string' ? raw : '';
  let formattedTime = '';

  // If it's an ISO or natively parseable date-time, format nicely
  if (typeof raw === 'string' && /T/.test(raw)) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      formattedDate = d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      formattedTime = d.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }

  return {
    ...entry,
    formattedDate,
    formattedTime,
    displayDate: formattedTime ? `${formattedDate} ${formattedTime}` : formattedDate
  };
}

/**
 * Process and prepare log data for display
 */
export function processLogData(log: any, order: 'newest' | 'oldest' = 'newest', typeFilter?: string): any {
  if (!log || !log.entries) return { entries: [], counts: {} };

  let processedEntries = [...log.entries];

  // Compute latest status per entity for deterministic badge usage by consumers
  const latestStatusMap = buildLatestStatusMap(processedEntries);
  // Compute latest display name per entity for consistent naming after renames
  const latestNameMap = buildLatestNameMap(processedEntries);

  // Apply type filter if specified
  if (typeFilter && typeFilter !== 'all') {
    processedEntries = filterLogEntries(processedEntries, typeFilter);
  }
  
  // Sort entries
  processedEntries = sortLogEntries(processedEntries, order);
  
  // Format entries
  processedEntries = processedEntries.map((e: any) => ({
    ...formatLogEntry(e),
    currentStatus: latestStatusMap[e.entityId || e.id],
    displayName: latestNameMap[e.entityId || e.id]
  }));
  
  // Get counts
  const counts = getLogEntryCounts(log.entries);

  return {
    entries: processedEntries,
    counts,
    total: log.entries.length,
    filtered: processedEntries.length,
    latestStatusMap,
    latestNameMap
  };
}

// ============================================================================
// BACKWARD COMPATIBILITY ALIASES
// ============================================================================

// Keep old function names for backward compatibility
export const deduplicateTasksLog = deduplicateLogEntries;
export const deduplicateItemsLog = deduplicateLogEntries;
export const deduplicateFinancialsLog = deduplicateLogEntries;
export const deduplicatePlayerLog = deduplicateLogEntries;

