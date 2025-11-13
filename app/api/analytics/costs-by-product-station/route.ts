// app/api/analytics/costs-by-product-station/route.ts
// Server-side API route for costs by product station analytics

import { NextRequest, NextResponse } from 'next/server';
import { getAllFinancials } from '@/data-store/datastore';
import { getCostsByProductStation } from '@/lib/analytics/financial-analytics';

export async function POST(request: NextRequest) {
  try {
    const { year, month, filterByMonth } = await request.json().catch(() => ({}));
    
    const records = await getAllFinancials();
    const filteredRecords = filterByMonth && year && month
      ? records.filter(r => r.year === year && r.month === month)
      : records;

    const costs = await getCostsByProductStation(filteredRecords);
    
    return NextResponse.json({
      success: true,
      data: costs
    });
    
  } catch (error) {
    console.error('[API] Costs by product station failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

