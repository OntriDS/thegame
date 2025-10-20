// app/api/queue/clear/route.ts
// Clear queue (emergency)

import { NextRequest, NextResponse } from 'next/server';
import { clearQueue } from '@/workflows/workflow-queue';

export async function POST(request: NextRequest) {
  try {
    clearQueue();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error clearing queue:', error);
    return NextResponse.json(
      { error: 'Failed to clear queue' },
      { status: 500 }
    );
  }
}
