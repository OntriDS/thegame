// app/api/summary/route.ts
import { NextResponse } from 'next/server';
import { SummaryRepository } from '@/data-store/repositories/summary.repo';
import { getCurrentMonthKey } from '@/lib/utils/date-utils';

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
