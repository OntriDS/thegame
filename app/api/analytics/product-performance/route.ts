// app/api/analytics/product-performance/route.ts
// Server-side API route for product performance analytics

import { NextRequest, NextResponse } from 'next/server';
import { getAllFinancials, getFinancialsForMonth } from '@/data-store/datastore';
import { getProductPerformance } from '@/lib/analytics/financial-analytics';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let memoryBefore: number | null = null;

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

    // Performance monitoring
    if (typeof process !== 'undefined' && process.memoryUsage) {
      memoryBefore = process.memoryUsage().heapUsed;
    }

    // 2. Fetch scoped data if filtering, otherwise fallback (avoiding full scan if possible)
    const records = (filterByMonth && year && month)
      ? await getFinancialsForMonth(year, month)
      : await getAllFinancials();

    const products = await getProductPerformance(records, false);

    // Calculate performance metrics
    const processingTime = Date.now() - startTime;
    const memoryUsed = memoryBefore && typeof process !== 'undefined' && process.memoryUsage
      ? process.memoryUsage().heapUsed - memoryBefore
      : null;

    // Log performance metrics
    console.log(`[Analytics Performance] product-performance:`, {
      processingTime: `${processingTime}ms`,
      totalRecords: records.length,
      filteredRecords: records.length,
      memoryUsed: memoryUsed ? `${Math.round(memoryUsed / 1024 / 1024)}MB` : 'N/A',
      usingMonthFilter: filterByMonth && year && month
    });

    return NextResponse.json({
      success: true,
      data: products,
      meta: {
        performance: {
          processingTime: `${processingTime}ms`,
          recordsProcessed: records.length,
          memoryUsed: memoryUsed ? `${Math.round(memoryUsed / 1024 / 1024)}MB` : null
        }
      }
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

