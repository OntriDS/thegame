import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { getDescendantTasks } from '@/lib/utils/recurrent-task-utils';

export const dynamic = 'force-dynamic';

/** Subtree size for delete-modal / parent safeguards (includes all nested depths). */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const list = await getDescendantTasks(params.id);
    return NextResponse.json({
      hasDescendants: list.length > 0,
      descendantCount: list.length,
    });
  } catch (e) {
    console.error('[GET /api/tasks/[id]/descendants]', e);
    return NextResponse.json({ error: 'Failed to load descendants' }, { status: 500 });
  }
}
