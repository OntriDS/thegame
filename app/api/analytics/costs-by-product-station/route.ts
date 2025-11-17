// app/api/analytics/costs-by-product-station/route.ts
// Server-side API route for costs by product station analytics

import { NextRequest, NextResponse } from 'next/server';
import { getAllFinancials } from '@/data-store/datastore';
import { getCostsByProductStation } from '@/lib/analytics/financial-analytics';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let memoryBefore: number | null = null;

  try {
    const { year, month, filterByMonth } = await request.json().catch(() => ({}));

    // Performance monitoring
    if (typeof process !== 'undefined' && process.memoryUsage) {
      memoryBefore = process.memoryUsage().heapUsed;
    }

    const records = await getAllFinancials();
    const filteredRecords = filterByMonth && year && month
      ? records.filter(r => r.year === year && r.month === month)
      : records;

    const costs = await getCostsByProductStation(filteredRecords);

    // Calculate performance metrics
    const processingTime = Date.now() - startTime;
    const memoryUsed = memoryBefore && typeof process !== 'undefined' && process.memoryUsage
      ? process.memoryUsage().heapUsed - memoryBefore
      : null;

    // Log performance metrics
    console.log(`[Analytics Performance] costs-by-product-station:`, {
      processingTime: `${processingTime}ms`,
      totalRecords: records.length,
      filteredRecords: filteredRecords.length,
      memoryUsed: memoryUsed ? `${Math.round(memoryUsed / 1024 / 1024)}MB` : 'N/A',
      usingMonthFilter: filterByMonth && year && month
    });

    return NextResponse.json({
      success: true,
      data: costs,
      meta: {
        performance: {
          processingTime: `${processingTime}ms`,
          recordsProcessed: records.length,
          memoryUsed: memoryUsed ? `${Math.round(memoryUsed / 1024 / 1024)}MB` : null
        }
      }
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

