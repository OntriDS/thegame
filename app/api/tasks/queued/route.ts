import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'In-memory queue is disabled (Phase 0 Migration). Please use synchronous routes or wait for the durable Workflow Coordinator.' },
    { status: 400 }
  );
}
