// app/api/analytics/channel-performance/route.ts
// Server-side API route for channel performance analytics

import { NextRequest, NextResponse } from 'next/server';
import { getAllFinancials } from '@/data-store/datastore';
import { getChannelPerformance } from '@/lib/analytics/financial-analytics';

export async function POST(request: NextRequest) {
  try {
    const { year, month, filterByMonth } = await request.json().catch(() => ({}));
    
    const records = await getAllFinancials();
    const filteredRecords = filterByMonth && year && month
      ? records.filter(r => r.year === year && r.month === month)
      : records;

    const channels = await getChannelPerformance(filteredRecords);
    
    return NextResponse.json({
      success: true,
      data: channels
    });
    
  } catch (error) {
    console.error('[API] Channel performance failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

