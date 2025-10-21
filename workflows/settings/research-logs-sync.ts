import { kvGet, kvSet } from '@/data-store/kv';

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

/**
 * Sync strategies for different research data types
 */
export const SYNC_STRATEGIES: Record<string, SyncStrategy> = {
  'project-status': {
    type: 'force',
    description: 'Always overwrite KV with local (version controlled)'
  },
  'dev-log': {
    type: 'smart', 
    description: 'Check timestamps, warn on conflicts (can be edited locally or via UI)'
  },
  'notes-log': {
    type: 'migrate-once',
    description: 'One-time migration, then KV becomes source of truth'
  }
};

/**
 * Auto-sync research logs from local files to KV when changed
 * Uses different strategies based on file type
 */
export async function syncResearchLogsToKV(): Promise<SyncResult> {
  const results: SyncResult = {synced: [], skipped: [], conflicts: [], errors: []};
  
  // Check if we're in production (KV available)
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    console.log('[ResearchSync] ⏭️ Skipping sync - not in production (no KV)');
    return results;
  }
  
  // Dynamic imports for server-side only modules
  const fs = await import('fs').then(m => m.promises);
  const path = await import('path');
  
  console.log('[ResearchSync] 🔄 Starting research logs sync to KV...');
  
  const logsToSync = ['project-status', 'notes-log', 'dev-log'];
  
  for (const logType of logsToSync) {
    try {
      // Determine file path based on type
      const localFile = logType === 'project-status' 
        ? path.join(process.cwd(), 'PROJECT-STATUS.json')
        : path.join(process.cwd(), 'logs-research', `${logType}.json`);
      
      // Check if local file exists and get stats
      let fileStats;
      let fileContent;
      let localData;
      
      try {
        fileStats = await fs.stat(localFile);
        fileContent = await fs.readFile(localFile, 'utf8');
        localData = JSON.parse(fileContent);
        console.log(`[ResearchSync] 📁 Found local ${logType} (${fileStats.size} bytes)`);
      } catch (error) {
        console.log(`[ResearchSync] ⚠️ Local ${logType} not found or invalid, skipping`);
        results.skipped.push(`${logType} (local file missing)`);
        continue;
      }
      
      // Get current KV data
      const kvKey = `data:${logType}`;
      const kvData = await kvGet(kvKey);
      
      // Apply sync strategy
      const strategy = SYNC_STRATEGIES[logType];
      const syncResult = await applySyncStrategy(logType, strategy, localData, kvData, fileStats);
      
      // Update results based on strategy outcome
      if (syncResult.action === 'synced') {
        await kvSet(kvKey, localData);
        results.synced.push(logType);
        console.log(`[ResearchSync] ✅ Synced ${logType} to KV`);
      } else if (syncResult.action === 'skipped') {
        results.skipped.push(`${logType} (${syncResult.reason})`);
        console.log(`[ResearchSync] ⏭️ Skipped ${logType}: ${syncResult.reason}`);
      } else if (syncResult.action === 'conflict') {
        results.conflicts.push(`${logType} (${syncResult.reason})`);
        console.log(`[ResearchSync] ⚠️ Conflict detected for ${logType}: ${syncResult.reason}`);
      }
      
    } catch (error) {
      console.error(`[ResearchSync] ❌ Error syncing ${logType}:`, error);
      results.errors.push(`${logType} (${error instanceof Error ? error.message : 'Unknown error'})`);
    }
  }
  
  console.log('[ResearchSync] 📋 Sync results:', results);
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
      // Always sync (project-status)
      return { action: 'synced', reason: 'Force sync (version controlled)' };
      
    case 'smart':
      // Check for conflicts (dev-log)
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
 */
export async function checkResearchLogsSyncStatus(): Promise<{needsSync: string[], upToDate: string[], conflicts: string[]}> {
  const results = {needsSync: [] as string[], upToDate: [] as string[], conflicts: [] as string[]};
  
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    return results;
  }
  
  // Dynamic imports for server-side only modules
  const fs = await import('fs').then(m => m.promises);
  const path = await import('path');
  
  const logsToCheck = ['project-status', 'notes-log', 'dev-log'];
  
  for (const logType of logsToCheck) {
    try {
      // Determine file path based on type
      const localFile = logType === 'project-status' 
        ? path.join(process.cwd(), 'PROJECT-STATUS.json')
        : path.join(process.cwd(), 'logs-research', `${logType}.json`);
      
      const kvKey = `data:${logType}`;
      
      const fileStats = await fs.stat(localFile);
      const fileContent = await fs.readFile(localFile, 'utf8');
      const localData = JSON.parse(fileContent);
      
      const kvData = await kvGet(kvKey);
      const strategy = SYNC_STRATEGIES[logType];
      
      // Apply strategy logic without actually syncing
      const syncResult = await applySyncStrategy(logType, strategy, localData, kvData, fileStats);
      
      if (syncResult.action === 'synced') {
        results.needsSync.push(logType);
      } else if (syncResult.action === 'conflict') {
        results.conflicts.push(logType);
      } else {
        results.upToDate.push(logType);
      }
    } catch (error) {
      console.error(`[ResearchSync] Error checking ${logType}:`, error);
    }
  }
  
  return results;
}

/**
 * Sync individual research data type
 */
export async function syncIndividualResearchData(logType: string): Promise<SyncResult> {
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
  
  // Dynamic imports for server-side only modules
  const fs = await import('fs').then(m => m.promises);
  const path = await import('path');
  
  console.log(`[ResearchSync] 🔄 Starting ${logType} sync...`);
  
  try {
    // Determine file path based on type
    const localFile = logType === 'project-status' 
      ? path.join(process.cwd(), 'PROJECT-STATUS.json')
      : path.join(process.cwd(), 'logs-research', `${logType}.json`);
    
    // Check if local file exists and get stats
    let fileStats;
    let fileContent;
    let localData;
    
    try {
      fileStats = await fs.stat(localFile);
      fileContent = await fs.readFile(localFile, 'utf8');
      localData = JSON.parse(fileContent);
      console.log(`[ResearchSync] 📁 Found local ${logType} (${fileStats.size} bytes)`);
    } catch (error) {
      console.log(`[ResearchSync] ⚠️ Local ${logType} not found or invalid`);
      results.errors.push(`${logType} (local file missing)`);
      return results;
    }
    
    // Get current KV data
    const kvKey = `data:${logType}`;
    const kvData = await kvGet(kvKey);
    
    // Apply sync strategy
    const strategy = SYNC_STRATEGIES[logType];
    const syncResult = await applySyncStrategy(logType, strategy, localData, kvData, fileStats);
    
    // Update results based on strategy outcome
    if (syncResult.action === 'synced') {
      await kvSet(kvKey, localData);
      results.synced.push(logType);
      console.log(`[ResearchSync] ✅ Synced ${logType} to KV`);
    } else if (syncResult.action === 'skipped') {
      results.skipped.push(`${logType} (${syncResult.reason})`);
      console.log(`[ResearchSync] ⏭️ Skipped ${logType}: ${syncResult.reason}`);
    } else if (syncResult.action === 'conflict') {
      results.conflicts.push(`${logType} (${syncResult.reason})`);
      console.log(`[ResearchSync] ⚠️ Conflict detected for ${logType}: ${syncResult.reason}`);
    }
    
  } catch (error) {
    console.error(`[ResearchSync] ❌ Error syncing ${logType}:`, error);
    results.errors.push(`${logType} (${error instanceof Error ? error.message : 'Unknown error'})`);
  }
  
  return results;
}
