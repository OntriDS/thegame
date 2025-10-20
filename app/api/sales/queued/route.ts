// app/api/sales/queued/route.ts
// Queue sale for processing (safety belt)

import { NextRequest, NextResponse } from 'next/server';
import { processLinkEntityQueued } from '@/workflows/workflow-queue';
import { EntityType } from '@/types/enums';
import type { Sale } from '@/types/entities';

export async function POST(request: NextRequest) {
  try {
    const { sale, priority = 1 } = await request.json();
    
    if (!sale || !sale.id) {
      return NextResponse.json(
        { error: 'Invalid sale data' },
        { status: 400 }
      );
    }

    const queueId = await processLinkEntityQueued(sale, EntityType.SALE, priority);
    
    return NextResponse.json({ 
      success: true, 
      queueId,
      message: 'Sale queued for processing'
    });
  } catch (error) {
    console.error('[API] Error queuing sale:', error);
    return NextResponse.json(
      { error: 'Failed to queue sale' },
      { status: 500 }
    );
  }
}
