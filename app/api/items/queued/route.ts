// app/api/items/queued/route.ts
// Queue item for processing (safety belt)

import { NextRequest, NextResponse } from 'next/server';
import { processLinkEntityQueued } from '@/workflows/workflow-queue';
import { EntityType } from '@/types/enums';
import type { Item } from '@/types/entities';

export async function POST(request: NextRequest) {
  try {
    const { item, priority = 1 } = await request.json();
    
    if (!item || !item.id) {
      return NextResponse.json(
        { error: 'Invalid item data' },
        { status: 400 }
      );
    }

    const queueId = await processLinkEntityQueued(item, EntityType.ITEM, priority);
    
    return NextResponse.json({ 
      success: true, 
      queueId,
      message: 'Item queued for processing'
    });
  } catch (error) {
    console.error('[API] Error queuing item:', error);
    return NextResponse.json(
      { error: 'Failed to queue item' },
      { status: 500 }
    );
  }
}
