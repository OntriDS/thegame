// app/api/analytics/product-channel-matrix/route.ts
// Server-side API route for product-channel matrix analytics

import { NextRequest, NextResponse } from 'next/server';
import { getAllFinancials } from '@/data-store/datastore';
import { getProductChannelMatrix } from '@/lib/analytics/financial-analytics';

export async function POST(request: NextRequest) {
  try {
    const { year, month, filterByMonth } = await request.json().catch(() => ({}));
    
    const records = await getAllFinancials();
    const filteredRecords = filterByMonth && year && month
      ? records.filter(r => r.year === year && r.month === month)
      : records;

    const matrix = await getProductChannelMatrix(filteredRecords);
    
    return NextResponse.json({
      success: true,
      data: matrix
    });
    
  } catch (error) {
    console.error('[API] Product-channel matrix failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

