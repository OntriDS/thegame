import { kvGet, kvSet } from '@/data-store/kv';

// === TYPES ===
export interface SyncResult {
  synced: string[];
  skipped: string[];
  conflicts: string[];
  errors: string[];
}

export interface SyncStrategy {
  type: 'replace' | 'merge';
  description: string;
}

// === SYNC STRATEGIES ===
export const SYNC_STRATEGIES: Record<string, SyncStrategy> = {
  'project-status': {
    type: 'replace',
    description: 'Replace KV data with deployed files (version controlled)'
  },
  'dev-log': {
    type: 'replace',
    description: 'Replace KV data with deployed files (version controlled)'
  },
  'notes-log': {
    type: 'merge',
    description: 'Merge deployed files with KV data (preserves existing)'
  }
};

// === IMPLEMENTATION ===

/**
 * Auto-sync research logs from local files to KV when changed
 * This is a client-side function that calls the server API
 */
export async function syncResearchLogsToKV(): Promise<SyncResult> {
  try {
    const response = await fetch('/api/sync-research-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.results;
    }
    
    return { synced: [], skipped: [], conflicts: [], errors: ['API call failed'] };
  } catch (error) {
    console.error('[ResearchSync] ❌ Error syncing:', error);
    return { synced: [], skipped: [], conflicts: [], errors: [error instanceof Error ? error.message : 'Unknown error'] };
  }
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
    case 'replace':
      // Always replace KV with deployed files (project-status, dev-log)
      return { action: 'synced', reason: 'Replace sync (version controlled)' };
      
    case 'merge':
      // Merge deployed files with KV data (notes-log)
      if (!kvLastUpdated) {
        return { action: 'synced', reason: 'No KV data, syncing from deployed files' };
      }
      
      if (new Date(localLastUpdated) > new Date(kvLastUpdated)) {
        return { action: 'synced', reason: 'Deployed files are newer, merging' };
      } else if (new Date(kvLastUpdated) > new Date(localLastUpdated)) {
        return { action: 'conflict', reason: 'KV is newer than deployed files - potential data loss' };
      } else {
        return { action: 'skipped', reason: 'Both are up to date' };
      }
      
    default:
      return { action: 'skipped', reason: 'Unknown strategy' };
  }
}

/**
 * Check if research logs need syncing without actually syncing
 * This is a client-side function that calls the server API
 */
export async function checkResearchLogsSyncStatus(): Promise<{needsSync: string[], upToDate: string[], conflicts: string[]}> {
  try {
    const response = await fetch('/api/sync-research-logs');
    if (response.ok) {
      const data = await response.json();
      return data.status;
    }
    return { needsSync: [], upToDate: [], conflicts: [] };
  } catch (error) {
    console.error('[ResearchSync] ❌ Error checking sync status:', error);
    return { needsSync: [], upToDate: [], conflicts: [] };
  }
}

/**
 * Sync individual research data type
 * This is a client-side function that calls the server API
 */
export async function syncIndividualResearchData(
  logType: string, 
  strategyOverride?: 'replace' | 'merge'
): Promise<SyncResult> {
  try {
    const response = await fetch('/api/sync-research-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logType, strategyOverride })
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.results;
    }
    
    return { synced: [], skipped: [], conflicts: [], errors: ['API call failed'] };
  } catch (error) {
    console.error(`[ResearchSync] ❌ Error syncing ${logType}:`, error);
    return { synced: [], skipped: [], conflicts: [], errors: [error instanceof Error ? error.message : 'Unknown error'] };
  }
}