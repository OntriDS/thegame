// app/api/analytics/product-channel-matrix/route.ts
// Server-side API route for product-channel matrix analytics

import { NextRequest, NextResponse } from 'next/server';
import { getAllFinancials, getFinancialsForMonth } from '@/data-store/datastore';
import { getProductChannelMatrix } from '@/lib/analytics/financial-analytics';

export async function POST(request: NextRequest) {
  try {
    let { year, month, filterByMonth } = await request.json().catch(() => ({}));
    
    // 1. Strict Parsing and Validation for filtering
    if (filterByMonth) {
      const now = new Date();
      const adjustedNow = new Date(now.getTime() - 6 * 60 * 60 * 1000);
      
      year = year ? parseInt(year, 10) : adjustedNow.getFullYear();
      month = month ? parseInt(month, 10) : adjustedNow.getMonth() + 1;
      
      if (year < 100) year += 2000;
      if (isNaN(year) || year < 2024 || year > 2100) year = adjustedNow.getFullYear();
      if (isNaN(month) || month < 1 || month > 12) month = adjustedNow.getMonth() + 1;
    }

    // 2. Fetch scoped data if filtering, otherwise fallback
    const records = (filterByMonth && year && month)
      ? await getFinancialsForMonth(year, month)
      : await getAllFinancials();

    const matrix = await getProductChannelMatrix(records);
    
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

