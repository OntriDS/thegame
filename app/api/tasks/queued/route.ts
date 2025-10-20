// app/api/tasks/queued/route.ts
// Queue task for processing (safety belt)

import { NextRequest, NextResponse } from 'next/server';
import { processLinkEntityQueued } from '@/workflows/workflow-queue';
import { EntityType } from '@/types/enums';
import type { Task } from '@/types/entities';

export async function POST(request: NextRequest) {
  try {
    const { task, priority = 1 } = await request.json();
    
    if (!task || !task.id) {
      return NextResponse.json(
        { error: 'Invalid task data' },
        { status: 400 }
      );
    }

    const queueId = await processLinkEntityQueued(task, EntityType.TASK, priority);
    
    return NextResponse.json({ 
      success: true, 
      queueId,
      message: 'Task queued for processing'
    });
  } catch (error) {
    console.error('[API] Error queuing task:', error);
    return NextResponse.json(
      { error: 'Failed to queue task' },
      { status: 500 }
    );
  }
}
