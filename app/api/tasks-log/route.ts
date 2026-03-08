// app/api/tasks-log/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { EntityType } from '@/types/enums';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!(await requireAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || undefined;
    const start = searchParams.has('start') ? parseInt(searchParams.get('start')!, 10) : undefined;
    const count = searchParams.has('count') ? parseInt(searchParams.get('count')!, 10) : undefined;

    const { getEntityLogs, getEntityLogMonths } = await import('@/data-store/datastore');
    const entries = await getEntityLogs(EntityType.TASK, { month, start, count });
    const months = await getEntityLogMonths(EntityType.TASK);

    return NextResponse.json({ entries, months });
  } catch (error) {
    console.error('Error fetching tasks log:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks log' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await requireAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { entityId } = await request.json();
    if (!entityId) {
      return NextResponse.json({ error: 'entityId is required' }, { status: 400 });
    }

    const { removeLogEntriesAcrossMonths } = await import('@/data-store/datastore');
    const removedCount = await removeLogEntriesAcrossMonths(
      EntityType.TASK,
      (entry) => entry.entityId === entityId
    );

    return NextResponse.json({
      success: true,
      message: `Removed log entries for task ${entityId}`,
      removedCount
    });
  } catch (error) {
    console.error('Error removing task log entries:', error);
    return NextResponse.json({ error: 'Failed to remove task log entries' }, { status: 500 });
  }
}