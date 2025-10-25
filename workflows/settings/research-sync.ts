import { kvGet, kvSet } from '@/data-store/kv';

// === TYPES ===
export interface SyncResult {
  synced: string[];
  skipped: string[];
  conflicts: string[];
  errors: string[];
}

export interface SyncStrategy {
  type: 'force' | 'smart' | 'migrate-once';
  description: string;
}

// === SYNC STRATEGIES ===
export const SYNC_STRATEGIES: Record<string, SyncStrategy> = {
  'project-status': {
    type: 'force',
    description: 'Always overwrite KV with local (version controlled)'
  },
  'dev-log': {
    type: 'force',  // CHANGED from 'smart' - CRITICAL FIX
    description: 'Always overwrite KV with local (version controlled)'
  },
  'notes-log': {
    type: 'migrate-once',
    description: 'One-time migration, then KV becomes source of truth'
  }
};

// === IMPLEMENTATION ===

/**
 * Auto-sync research logs from local files to KV when changed
 * Uses different strategies based on file type
 * 
 * NOTE: This function is designed for development environments where local files exist.
 * In production KV-only architecture, this functionality is not available.
 */
export async function syncResearchLogsToKV(): Promise<SyncResult> {
  const results: SyncResult = {synced: [], skipped: [], conflicts: [], errors: []};
  
  // Check if we're in production (KV available)
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    console.log('[ResearchSync] ⏭️ Skipping sync - not in production (no KV)');
    return results;
  }
  
  // In KV-only architecture, there are no local files to sync
  console.log('[ResearchSync] ⏭️ Skipping sync - KV-only architecture has no local files');
  results.skipped.push('project-status (KV-only architecture)');
  results.skipped.push('dev-log (KV-only architecture)');
  results.skipped.push('notes-log (KV-only architecture)');
  
  return results;
}

/**
 * Apply sync strategy based on file type
 */
async function applySyncStrategy(
  logType: string, 
  strategy: SyncStrategy, 
  localData: any, 
  kvData: any, 
  fileStats: any
): Promise<{action: 'synced' | 'skipped' | 'conflict', reason: string}> {
  
  const kvLastUpdated = (kvData as any)?.lastUpdated || null;
  const localLastUpdated = (localData as any).lastUpdated || fileStats.mtime.toISOString();
  
  console.log(`[ResearchSync] 📊 ${logType} (${strategy.type}) comparison:`, {
    localLastUpdated,
    kvLastUpdated: kvLastUpdated || 'null',
    localNewer: !kvLastUpdated || new Date(localLastUpdated) > new Date(kvLastUpdated)
  });
  
  switch (strategy.type) {
    case 'force':
      // Always sync (project-status, dev-log)
      return { action: 'synced', reason: 'Force sync (version controlled)' };
      
    case 'smart':
      // Check for conflicts (dev-log when overridden)
      if (!kvLastUpdated) {
        return { action: 'synced', reason: 'No KV data, syncing from local' };
      }
      
      if (new Date(localLastUpdated) > new Date(kvLastUpdated)) {
        return { action: 'synced', reason: 'Local is newer, syncing' };
      } else if (new Date(kvLastUpdated) > new Date(localLastUpdated)) {
        return { action: 'conflict', reason: 'KV is newer than local - potential data loss' };
      } else {
        return { action: 'skipped', reason: 'Both are up to date' };
      }
      
    case 'migrate-once':
      // One-time migration (notes-log)
      if (kvData && Object.keys(kvData).length > 0) {
        return { action: 'skipped', reason: 'Already migrated - KV is source of truth' };
      }
      return { action: 'synced', reason: 'One-time migration to KV' };
      
    default:
      return { action: 'skipped', reason: 'Unknown strategy' };
  }
}

/**
 * Check if research logs need syncing without actually syncing
 * 
 * NOTE: In KV-only architecture, this always returns that everything is up to date
 * since there are no local files to compare against.
 */
export async function checkResearchLogsSyncStatus(): Promise<{needsSync: string[], upToDate: string[], conflicts: string[]}> {
  const results = {needsSync: [] as string[], upToDate: [] as string[], conflicts: [] as string[]};
  
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    return results;
  }
  
  // In KV-only architecture, all research data is already in KV
  // There are no local files to sync, so everything is up to date
  const logsToCheck = ['project-status', 'notes-log', 'dev-log'];
  results.upToDate = logsToCheck;
  
  console.log('[ResearchSync] 📊 Status check - KV-only architecture: all data up to date');
  
  return results;
}

/**
 * Sync individual research data type
 * 
 * NOTE: In KV-only architecture, this function is not applicable since there are no local files.
 * All research data is already stored in KV and managed through the normal API routes.
 */
export async function syncIndividualResearchData(
  logType: string, 
  strategyOverride?: 'force' | 'smart' | 'migrate-once'
): Promise<SyncResult> {
  const results: SyncResult = {synced: [], skipped: [], conflicts: [], errors: []};
  
  // Check if we're in production (KV available)
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    console.log(`[ResearchSync] ⏭️ Skipping ${logType} sync - not in production (no KV)`);
    results.skipped.push(`${logType} (not in production)`);
    return results;
  }
  
  if (!SYNC_STRATEGIES[logType]) {
    results.errors.push(`${logType} (unknown sync strategy)`);
    return results;
  }
  
  // In KV-only architecture, there are no local files to sync
  console.log(`[ResearchSync] ⏭️ Skipping ${logType} sync - KV-only architecture has no local files`);
  results.skipped.push(`${logType} (KV-only architecture - no local files)`);
  
  return results;
}