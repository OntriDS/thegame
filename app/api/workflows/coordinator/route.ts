import { NextResponse } from 'next/server';

/**
 * This route was an unauthenticated fire-and-forget execution surface.
 * Workflow execution is now internal to TheGame's dispatcher/coordinator;
 * no public HTTP endpoint may accept an arbitrary workflow id.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'The generic workflow coordinator endpoint has been removed. Use a dedicated authenticated workflow action.' },
    { status: 410 },
  );
}
