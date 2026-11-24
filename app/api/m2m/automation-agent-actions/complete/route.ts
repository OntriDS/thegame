import { NextRequest, NextResponse } from 'next/server';
import { requireAdminOrM2MAuth } from '@/lib/api-auth';
import { completeAutomationAgentAction } from '@/data-store/workflow-store';

export const dynamic = 'force-dynamic';

const ACTION_STATUSES = new Set(['completed', 'failed-retryable', 'failed-terminal']);

export async function POST(request: NextRequest) {
  if (!(await requireAdminOrM2MAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (typeof body?.actionId !== 'string' || !body.actionId.trim()) {
      return NextResponse.json({ error: 'actionId is required' }, { status: 400 });
    }
    if (typeof body?.claimToken !== 'string' || !body.claimToken.trim()) {
      return NextResponse.json({ error: 'claimToken is required' }, { status: 400 });
    }
    if (!ACTION_STATUSES.has(body?.status)) {
      return NextResponse.json({ error: 'status must be completed, failed-retryable, or failed-terminal' }, { status: 400 });
    }

    const action = await completeAutomationAgentAction({
      actionId: body.actionId.trim(),
      claimToken: body.claimToken.trim(),
      status: body.status,
      resultRef: typeof body.resultRef === 'string' ? body.resultRef.trim() : undefined,
      errorCode: typeof body.errorCode === 'string' ? body.errorCode.trim() : undefined,
    });
    return NextResponse.json({ action });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to complete automation action.';
    const status = message.includes('NOT_FOUND') || message.includes('INVALID') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
