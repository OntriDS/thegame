import { NextRequest, NextResponse } from 'next/server';
import { requireAdminOrM2MAuth } from '@/lib/api-auth';
import { claimNextAutomationAgentAction } from '@/data-store/workflow-store';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!(await requireAdminOrM2MAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (body?.agent !== 'admin') {
      return NextResponse.json({ error: 'Only the registered admin report agent is supported.' }, { status: 400 });
    }
    if (body?.actionId !== undefined && (typeof body.actionId !== 'string' || !body.actionId.trim())) {
      return NextResponse.json({ error: 'actionId must be a non-empty string when supplied.' }, { status: 400 });
    }
    const action = await claimNextAutomationAgentAction('admin', body.actionId?.trim());
    return NextResponse.json({ action });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to claim automation action.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
