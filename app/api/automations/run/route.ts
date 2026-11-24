import { NextRequest, NextResponse } from 'next/server';
import { requireAdminOrM2MAuth } from '@/lib/api-auth';
import { runAutomation, type AutomationRunMode } from '@/workflows/automation/run-automation';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!(await requireAdminOrM2MAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const mode = body?.mode as AutomationRunMode;
    if (mode !== 'dry-run' && mode !== 'execute') {
      return NextResponse.json({ error: 'mode must be dry-run or execute' }, { status: 400 });
    }
    if (typeof body?.taskId !== 'string' || !body.taskId.trim()) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }
    const requestIdHeader = request.headers.get('Idempotency-Key')?.trim();
    const requestIdBody = typeof body?.requestId === 'string' ? body.requestId.trim() : '';
    const requestId = requestIdHeader || requestIdBody || undefined;

    const result = await runAutomation({
      taskId: body.taskId.trim(),
      year: Number(body.year),
      month: Number(body.month),
      mode,
      requestId,
      initiator: 'pixelbrain-m2m',
    });
    return NextResponse.json(result);
  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Automation run failed.';
    const status = message === 'AUTOMATION_RUN_IN_PROGRESS' ? 409
      : message.includes('NOT_FOUND') || message.includes('NOT_RUNNABLE') || message.includes('NOT_AUTOMATION') || message.includes('INVALID') || message.includes('NOT_REGISTERED') ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
