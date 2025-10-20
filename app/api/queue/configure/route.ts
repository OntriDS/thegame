// app/api/queue/configure/route.ts
// Configure queue settings

import { NextRequest, NextResponse } from 'next/server';
import { configureQueue } from '@/workflows/workflow-queue';

export async function POST(request: NextRequest) {
  try {
    const options = await request.json();
    configureQueue(options);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error configuring queue:', error);
    return NextResponse.json(
      { error: 'Failed to configure queue' },
      { status: 500 }
    );
  }
}
