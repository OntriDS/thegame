import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { kvGet, kvSet } from '@/data-store/kv';
import { SYNC_STRATEGIES } from '@/workflows/settings/research-sync';
import fs from 'fs';
import path from 'path';

/**
 * API route to trigger research logs sync
 */
export async function POST(req: NextRequest) {
  console.log('[Sync Research Logs API] POST request received');
  
  if (!(await requireAdminAuth(req))) {
    console.log('[Sync Research Logs API] ❌ Auth failed');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await req.json();
    const { logType, strategyOverride } = body;
    
    if (logType) {
      // Individual sync
      console.log(`[Sync Research Logs API] 🔄 Starting ${logType} sync...`);
      const results = await syncIndividualLogType(logType, strategyOverride);
      
      console.log(`[Sync Research Logs API] ✅ ${logType} sync completed:`, results);
      return NextResponse.json({
        success: true,
        message: `${logType} sync completed`,
        results
      });
    } else {
      // Full sync
      console.log('[Sync Research Logs API] 🔄 Starting full sync...');
      const results = await syncAllLogs();
      
      console.log('[Sync Research Logs API] ✅ Full sync completed:', results);
      return NextResponse.json({
        success: true,
        message: 'Research logs sync completed',
        results
      });
    }
    } catch (error) {
      console.error('[Sync Research Logs API] ❌ Sync failed:', error);
      return NextResponse.json({ 
        success: false,
        error: 'Failed to sync research logs',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
}

/**
 * API route to check sync status without syncing
 */
export async function GET(req: NextRequest) {
  console.log('[Sync Research Logs API] GET request received (status check)');
  
  if (!(await requireAdminAuth(req))) {
    console.log('[Sync Research Logs API] ❌ Auth failed');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const status = await checkSyncStatus();
    
    console.log('[Sync Research Logs API] 📊 Status check completed:', status);
    return NextResponse.json({
      success: true,
      status
    });
    } catch (error) {
      console.error('[Sync Research Logs API] ❌ Status check failed:', error);
      return NextResponse.json({ 
        success: false,
        error: 'Failed to check sync status',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
}

// === SERVER-SIDE SYNC FUNCTIONS ===

interface SyncResult {
  synced: string[];
  skipped: string[];
  conflicts: string[];
  errors: string[];
}

/**
 * Check sync status by comparing local files with KV data
 */
async function checkSyncStatus(): Promise<{needsSync: string[], upToDate: string[], conflicts: string[]}> {
  const results = {needsSync: [] as string[], upToDate: [] as string[], conflicts: [] as string[]};
  
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    console.log('[Sync Research Logs API] ⏭️ No KV available - returning empty status');
    return results;
  }
  
  const logsToCheck = ['project-status', 'dev-log', 'notes-log'];
  
  for (const logType of logsToCheck) {
    try {
      // Get local file data
      const localData = await getLocalFileData(logType);
      if (!localData) {
        console.log(`[Sync Research Logs API] ⚠️ No deployed file for ${logType} - this is a conflict`);
        results.conflicts.push(logType);
        continue;
      }
      
      // Get KV data
      const kvData = await kvGet(logType);
      
      // 1. Check if KV is empty
      if (!kvData || Object.keys(kvData).length === 0) {
        results.needsSync.push(logType);
        console.log(`[Sync Research Logs API] 📊 ${logType}: needs sync (no KV data)`);
        continue;
      }

      // 2. Compare timestamps
      const localLastUpdated = (localData as any).lastUpdated;
      const kvLastUpdated = (kvData as any)?.lastUpdated;

      // 3. If no timestamps, compare data directly
      if (!localLastUpdated || !kvLastUpdated) {
        const dataMatches = JSON.stringify(localData) === JSON.stringify(kvData);
        if (!dataMatches) {
          results.needsSync.push(logType);
          console.log(`[Sync Research Logs API] 📊 ${logType}: needs sync (data differs)`);
        } else {
          results.upToDate.push(logType);
          console.log(`[Sync Research Logs API] 📊 ${logType}: up to date (data matches)`);
        }
        continue;
      }

      // 4. Compare timestamps
      if (new Date(localLastUpdated) > new Date(kvLastUpdated)) {
        results.needsSync.push(logType);
        console.log(`[Sync Research Logs API] 📊 ${logType}: needs sync (local newer)`);
      } else if (new Date(kvLastUpdated) > new Date(localLastUpdated)) {
        // KV is newer - check for data integrity issues
        if (hasDataIntegrityIssues(kvData, logType)) {
          results.conflicts.push(logType);
          console.log(`[Sync Research Logs API] 📊 ${logType}: conflict (data integrity issues)`);
        } else {
          results.upToDate.push(logType);
          console.log(`[Sync Research Logs API] 📊 ${logType}: up to date (KV newer but valid)`);
        }
      } else {
        results.upToDate.push(logType);
        console.log(`[Sync Research Logs API] 📊 ${logType}: up to date (timestamps match)`);
      }
    } catch (error) {
      console.error(`[Sync Research Logs API] ❌ Error checking ${logType}:`, error);
      results.conflicts.push(logType);
    }
  }
  
  console.log('[Sync Research Logs API] 📊 Status check completed:', results);
  return results;
}

/**
 * Check for data integrity issues (duplicates, corruption, missing fields)
 */
function hasDataIntegrityIssues(data: any, logType: string): boolean {
  if (logType === 'dev-log') {
    // Check for duplicate sprint IDs
    const sprints = data.sprints || [];
    const sprintIds = sprints.map((s: any) => s.id);
    const hasDuplicates = sprintIds.length !== new Set(sprintIds).size;
    if (hasDuplicates) {
      console.log(`[Sync Research Logs API] ⚠️ ${logType}: duplicate sprint IDs detected`);
      return true;
    }
    
    // Check for missing required fields
    if (!data.sprints || !Array.isArray(data.sprints)) {
      console.log(`[Sync Research Logs API] ⚠️ ${logType}: missing or invalid sprints array`);
      return true;
    }
  }
  
  if (logType === 'project-status') {
    // Check for required fields
    if (!data.currentSprint || !data.currentSprintNumber) {
      console.log(`[Sync Research Logs API] ⚠️ ${logType}: missing required fields`);
      return true;
    }
  }
  
  if (logType === 'notes-log') {
    // Check for valid structure
    if (!data.notes || !Array.isArray(data.notes)) {
      console.log(`[Sync Research Logs API] ⚠️ ${logType}: missing or invalid notes array`);
      return true;
    }
  }
  
  return false;
}

/**
 * Sync all log types
 */
async function syncAllLogs(): Promise<SyncResult> {
  const results: SyncResult = {synced: [], skipped: [], conflicts: [], errors: []};
  
  const logsToSync = ['project-status', 'dev-log', 'notes-log'];
  
  for (const logType of logsToSync) {
    try {
      const result = await syncIndividualLogType(logType);
      results.synced.push(...result.synced);
      results.skipped.push(...result.skipped);
      results.conflicts.push(...result.conflicts);
      results.errors.push(...result.errors);
    } catch (error) {
      console.error(`[Sync Research Logs API] ❌ Error syncing ${logType}:`, error);
      results.errors.push(`${logType} (${error instanceof Error ? error.message : 'Unknown error'})`);
    }
  }
  
  return results;
}

/**
 * Sync individual log type
 */
async function syncIndividualLogType(
  logType: string, 
  strategyOverride?: 'replace' | 'merge'
): Promise<SyncResult> {
  const results: SyncResult = {synced: [], skipped: [], conflicts: [], errors: []};
  
  if (!SYNC_STRATEGIES[logType]) {
    results.errors.push(`${logType} (unknown sync strategy)`);
    return results;
  }
  
  try {
    console.log(`[Sync Research Logs API] 🔄 Starting ${logType} sync...`);
    
    // Get local file data
    const localData = await getLocalFileData(logType);
    if (!localData) {
      results.skipped.push(`${logType} (no local file)`);
      return results;
    }
    
    // Get KV data
    const kvData = await kvGet(logType);
    
    // Get file stats for timestamp comparison
    const fileStats = await getFileStats(logType);
    
    // Use override strategy if provided, otherwise use default
    const strategy = strategyOverride ? 
      { type: strategyOverride, description: `Override: ${strategyOverride}` } : 
      SYNC_STRATEGIES[logType];
    
    // Apply sync strategy
    const syncDecision = await applySyncStrategy(logType, strategy, localData, kvData, fileStats);
    
    if (syncDecision.action === 'synced') {
      // Use merged data if available (for merge strategy), otherwise use local data (for replace strategy)
      const dataToSync = syncDecision.mergedData || localData;
      await kvSet(logType, dataToSync);
      results.synced.push(logType);
      console.log(`[Sync Research Logs API] ✅ ${logType} synced: ${syncDecision.reason}`);
    } else if (syncDecision.action === 'skipped') {
      results.skipped.push(`${logType} (${syncDecision.reason})`);
      console.log(`[Sync Research Logs API] ⏭️ ${logType} skipped: ${syncDecision.reason}`);
    } else if (syncDecision.action === 'conflict') {
      results.conflicts.push(`${logType} (${syncDecision.reason})`);
      console.log(`[Sync Research Logs API] ⚠️ ${logType} conflict: ${syncDecision.reason}`);
    }
    
  } catch (error) {
    console.error(`[Sync Research Logs API] ❌ Error syncing ${logType}:`, error);
    results.errors.push(`${logType} (${error instanceof Error ? error.message : 'Unknown error'})`);
  }
  
  return results;
}

/**
 * Get local file data
 */
async function getLocalFileData(logType: string): Promise<any | null> {
  try {
    let filePath: string;
    switch (logType) {
      case 'project-status':
        filePath = path.join(process.cwd(), 'PROJECT-STATUS.json');
        break;
      case 'dev-log':
        filePath = path.join(process.cwd(), 'logs-research', 'dev-log.json');
        break;
      case 'notes-log':
        filePath = path.join(process.cwd(), 'logs-research', 'notes-log.json');
        break;
      default:
        return null;
    }
    
    const fileContent = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.log(`[Sync Research Logs API] ⏭️ Could not read local file for ${logType}:`, error);
    return null;
  }
}

/**
 * Get file stats for timestamp comparison
 */
async function getFileStats(logType: string): Promise<any> {
  let filePath: string;
  switch (logType) {
    case 'project-status':
      filePath = path.join(process.cwd(), 'PROJECT-STATUS.json');
      break;
    case 'dev-log':
      filePath = path.join(process.cwd(), 'logs-research', 'dev-log.json');
      break;
    case 'notes-log':
      filePath = path.join(process.cwd(), 'logs-research', 'notes-log.json');
      break;
    default:
      throw new Error(`Unknown log type: ${logType}`);
  }
  
  return await fs.promises.stat(filePath);
}

/**
 * Merge data from deployed files with existing KV data
 */
function mergeData(localData: any, kvData: any, logType: string): any {
  if (logType === 'notes-log') {
    // For notes-log, merge arrays instead of replacing
    const localNotes = localData.notes || [];
    const kvNotes = kvData.notes || [];
    
    // Combine notes arrays, avoiding duplicates based on id
    const existingIds = new Set(kvNotes.map((note: any) => note.id));
    const newNotes = localNotes.filter((note: any) => !existingIds.has(note.id));
    const mergedNotes = [...kvNotes, ...newNotes];
    
    return {
      ...localData,
      notes: mergedNotes,
      lastUpdated: new Date().toISOString()
    };
  }
  
  // For other types, return local data (replace behavior)
  return localData;
}

/**
 * Apply sync strategy
 */
async function applySyncStrategy(
  logType: string, 
  strategy: any, 
  localData: any, 
  kvData: any, 
  fileStats: any
): Promise<{action: 'synced' | 'skipped' | 'conflict', reason: string, mergedData?: any}> {
  
  const kvLastUpdated = (kvData as any)?.lastUpdated || null;
  const localLastUpdated = (localData as any).lastUpdated || fileStats.mtime.toISOString();
  
  console.log(`[Sync Research Logs API] 📊 ${logType} (${strategy.type}) comparison:`, {
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
        const mergedData = mergeData(localData, kvData, logType);
        return { action: 'synced', reason: 'Deployed files are newer, merging', mergedData };
      } else if (new Date(kvLastUpdated) > new Date(localLastUpdated)) {
        return { action: 'conflict', reason: 'KV is newer than deployed files - potential data loss' };
      } else {
        return { action: 'skipped', reason: 'Both are up to date' };
      }
      
    default:
      return { action: 'skipped', reason: 'Unknown strategy' };
  }
}
