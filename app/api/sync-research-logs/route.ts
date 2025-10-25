import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { 
  syncResearchLogsToKV, 
  checkResearchLogsSyncStatus,
  syncIndividualResearchData 
} from '@/workflows/settings/research-sync';

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
      const results = await syncIndividualResearchData(logType, strategyOverride);
      
      console.log(`[Sync Research Logs API] ✅ ${logType} sync completed:`, results);
      return NextResponse.json({
        success: true,
        message: `${logType} sync completed`,
        results
      });
    } else {
      // Full sync
      console.log('[Sync Research Logs API] 🔄 Starting full sync...');
      const results = await syncResearchLogsToKV();
      
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
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
}
