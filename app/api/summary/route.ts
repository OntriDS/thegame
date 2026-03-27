// app/api/summary/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { SummaryRepository } from '@/data-store/repositories/summary.repo';
import { requireAdminAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // Expects MM-YY

    // If no month provided, we could return all-time, or current month.
    // Given the dashboard needs, let's allow fetching both if requested.
    
    if (month) {
        const summary = await SummaryRepository.getSummary(month);
        return NextResponse.json(summary);
    } else {
        const allTime = await SummaryRepository.getSummary();
        return NextResponse.json(allTime);
    }
  } catch (error: any) {
    console.error('[Summary API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch summary data' },
      { status: 500 }
    );
  }
}

/**
 * Recomputes monthly + all-time rolling counters from archive data.
 * Use after bugs that inflated/deflated hashes (e.g. duplicate lineId resaves).
 */
export async function POST(request: NextRequest) {
  if (!(await requireAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { SummaryService } = await import('@/data-store/services/summary.service');
    const result = await SummaryService.rebuildAllSummaries();
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('[Summary API] Rebuild failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Rebuild failed' },
      { status: 500 }
    );
  }
}
