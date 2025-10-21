import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { syncResearchLogsToKV, checkResearchLogsSyncStatus } from '@/workflows/settings/research-logs-sync';

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
    console.log('[Sync Research Logs API] 🔄 Starting sync...');
    const results = await syncResearchLogsToKV();
    
    console.log('[Sync Research Logs API] ✅ Sync completed:', results);
    return NextResponse.json({
      success: true,
      message: 'Research logs sync completed',
      results
    });
  } catch (error) {
    console.error('[Sync Research Logs API] ❌ Sync failed:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to sync research logs',
      details: error.message 
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
    const status = await checkResearchLogsSyncStatus();
    
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
      details: error.message 
    }, { status: 500 });
  }
}
