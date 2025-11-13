// app/api/analytics/product-performance/route.ts
// Server-side API route for product performance analytics

import { NextRequest, NextResponse } from 'next/server';
import { getAllFinancials } from '@/data-store/datastore';
import { getProductPerformance } from '@/lib/analytics/financial-analytics';

export async function POST(request: NextRequest) {
  try {
    const { year, month, filterByMonth } = await request.json().catch(() => ({}));
    
    const records = await getAllFinancials();
    const filteredRecords = filterByMonth && year && month
      ? records.filter(r => r.year === year && r.month === month)
      : records;

    const products = await getProductPerformance(filteredRecords, false);
    
    return NextResponse.json({
      success: true,
      data: products
    });
    
  } catch (error) {
    console.error('[API] Product performance failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

