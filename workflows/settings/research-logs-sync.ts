import { promises as fs } from 'fs';
import path from 'path';
import { kvGet, kvSet } from '@/data-store/kv';

/**
 * Auto-sync research logs from local files to KV when changed
 * Only syncs when local files are newer than KV data
 */
export async function syncResearchLogsToKV(): Promise<{synced: string[], skipped: string[]}> {
  const results = {synced: [] as string[], skipped: [] as string[]};
  
  // Check if we're in production (KV available)
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    console.log('[ResearchSync] ⏭️ Skipping sync - not in production (no KV)');
    return results;
  }
  
  console.log('[ResearchSync] 🔄 Starting research logs sync to KV...');
  
  const logsToSync = ['notes-log', 'dev-log'];
  
  for (const logType of logsToSync) {
    try {
      const localFile = path.join(process.cwd(), 'logs-research', `${logType}.json`);
      
      // Check if local file exists and get stats
      let fileStats;
      let fileContent;
      let localData;
      
      try {
        fileStats = await fs.stat(localFile);
        fileContent = await fs.readFile(localFile, 'utf8');
        localData = JSON.parse(fileContent);
        console.log(`[ResearchSync] 📁 Found local ${logType}.json (${fileStats.size} bytes)`);
      } catch (error) {
        console.log(`[ResearchSync] ⚠️ Local ${logType}.json not found or invalid, skipping`);
        results.skipped.push(`${logType} (local file missing)`);
        continue;
      }
      
      // Get current KV data
      const kvKey = `data:${logType}`;
      const kvData = await kvGet(kvKey);
      
      // Compare lastUpdated timestamps
      const kvLastUpdated = (kvData as any)?.lastUpdated || null;
      const localLastUpdated = (localData as any).lastUpdated || fileStats.mtime.toISOString();
      
      console.log(`[ResearchSync] 📊 ${logType} comparison:`, {
        localLastUpdated,
        kvLastUpdated: kvLastUpdated || 'null',
        localNewer: !kvLastUpdated || new Date(localLastUpdated) > new Date(kvLastUpdated)
      });
      
      if (!kvLastUpdated || new Date(localLastUpdated) > new Date(kvLastUpdated)) {
        // Local is newer - sync to KV
        console.log(`[ResearchSync] 🔄 Syncing ${logType} to KV (local newer)...`);
        await kvSet(kvKey, localData);
        results.synced.push(logType);
        console.log(`[ResearchSync] ✅ Synced ${logType} to KV (local newer)`);
      } else {
        results.skipped.push(`${logType} (KV up to date)`);
        console.log(`[ResearchSync] ⏭️ Skipped ${logType} (KV up to date)`);
      }
    } catch (error) {
      console.error(`[ResearchSync] ❌ Error syncing ${logType}:`, error);
      results.skipped.push(`${logType} (error: ${error instanceof Error ? error.message : 'Unknown error'})`);
    }
  }
  
  console.log('[ResearchSync] 📋 Sync results:', results);
  return results;
}

/**
 * Check if research logs need syncing without actually syncing
 */
export async function checkResearchLogsSyncStatus(): Promise<{needsSync: string[], upToDate: string[]}> {
  const results = {needsSync: [] as string[], upToDate: [] as string[]};
  
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    return results;
  }
  
  const logsToCheck = ['notes-log', 'dev-log'];
  
  for (const logType of logsToCheck) {
    try {
      const localFile = path.join(process.cwd(), 'logs-research', `${logType}.json`);
      const kvKey = `data:${logType}`;
      
      const fileStats = await fs.stat(localFile);
      const fileContent = await fs.readFile(localFile, 'utf8');
      const localData = JSON.parse(fileContent);
      
      const kvData = await kvGet(kvKey);
      
      const kvLastUpdated = (kvData as any)?.lastUpdated || null;
      const localLastUpdated = (localData as any).lastUpdated || fileStats.mtime.toISOString();
      
      if (!kvLastUpdated || new Date(localLastUpdated) > new Date(kvLastUpdated)) {
        results.needsSync.push(logType);
      } else {
        results.upToDate.push(logType);
      }
    } catch (error) {
      console.error(`[ResearchSync] Error checking ${logType}:`, error);
    }
  }
  
  return results;
}
