// app/api/financials/queued/route.ts
// Queue financial record for processing (safety belt)

import { NextRequest, NextResponse } from 'next/server';
import { processLinkEntityQueued } from '@/workflows/workflow-queue';
import { EntityType } from '@/types/enums';
import type { FinancialRecord } from '@/types/entities';

export async function POST(request: NextRequest) {
  try {
    const { record, priority = 1 } = await request.json();
    
    if (!record || !record.id) {
      return NextResponse.json(
        { error: 'Invalid financial record data' },
        { status: 400 }
      );
    }

    const queueId = await processLinkEntityQueued(record, EntityType.FINANCIAL, priority);
    
    return NextResponse.json({ 
      success: true, 
      queueId,
      message: 'Financial record queued for processing'
    });
  } catch (error) {
    console.error('[API] Error queuing financial record:', error);
    return NextResponse.json(
      { error: 'Failed to queue financial record' },
      { status: 500 }
    );
  }
}
