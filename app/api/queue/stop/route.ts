// app/api/queue/stop/route.ts
// Stop queue processing

import { NextRequest, NextResponse } from 'next/server';
import { stopQueue } from '@/workflows/workflow-queue';

export async function POST(request: NextRequest) {
  try {
    stopQueue();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error stopping queue:', error);
    return NextResponse.json(
      { error: 'Failed to stop queue' },
      { status: 500 }
    );
  }
}
