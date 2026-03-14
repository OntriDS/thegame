// app/api/admin/summary/rebuild/route.ts
import { NextResponse } from 'next/server';
import { SummaryService } from '@/data-store/services/summary.service';

export const dynamic = 'force-dynamic';

export async function POST() {
  return await handleRebuild();
}

export async function GET() {
  return await handleRebuild();
}

async function handleRebuild() {
  try {
    console.log('[Summary Rebuilder] Starting full rebuild...');
    const result = await SummaryService.rebuildAllSummaries();
    
    return NextResponse.json({
      message: 'Summary rebuild completed successfully.',
      monthsProcessed: result.count
    });
  } catch (error: any) {
    console.error('[Summary Rebuilder] Error:', error);
    return NextResponse.json(
      { error: 'Failed to rebuild summaries.', details: error.message },
      { status: 500 }
    );
  }
}
