// app/api/queue/status/route.ts
// Get queue status for monitoring

import { NextRequest, NextResponse } from 'next/server';
import { getQueueStatus } from '@/workflows/workflow-queue';

export async function GET(request: NextRequest) {
  try {
    const status = getQueueStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('[API] Error getting queue status:', error);
    return NextResponse.json(
      { error: 'Failed to get queue status' },
      { status: 500 }
    );
  }
}
