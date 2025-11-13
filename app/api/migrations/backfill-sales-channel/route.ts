// app/api/migrations/backfill-sales-channel/route.ts
// API route to run salesChannel backfill migration in Vercel KV environment

import { NextRequest, NextResponse } from 'next/server';
import { backfillSalesChannel } from '@/scripts/migrations/backfill-sales-channel';

export async function POST(request: NextRequest) {
  try {
    console.log('[API] Starting salesChannel backfill migration...');
    
    const stats = await backfillSalesChannel();
    
    return NextResponse.json({
      success: true,
      message: 'Sales channel backfill completed',
      stats
    });
    
  } catch (error) {
    console.error('[API] Sales channel backfill failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Sales Channel Backfill Migration',
    description: 'POST to this endpoint to run the migration',
    usage: 'POST /api/migrations/backfill-sales-channel'
  });
}

