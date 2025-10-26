// app/api/tasks-log/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { EntityType } from '@/types/enums';
import { buildLogKey } from '@/data-store/keys';
import path from 'path';

// Force dynamic rendering - this route accesses cookies
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!(await requireAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Try KV first (production)
    const { kvGet } = await import('@/data-store/kv');
    const tasksLog = await kvGet(buildLogKey(EntityType.TASK));

    if (tasksLog) {
      return NextResponse.json({ entries: tasksLog });
    }

    // KV-only system - return empty array if no data in KV
    return NextResponse.json({ entries: [] });

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

    const { kvGet, kvSet } = await import('@/data-store/kv');
    const key = buildLogKey(EntityType.TASK);
    const log = (await kvGet<any[]>(key)) || [];

    // Filter out entries for this entity
    const filteredLog = log.filter(entry => entry.entityId !== entityId);
    
    await kvSet(key, filteredLog);

    return NextResponse.json({ 
      success: true, 
      message: `Removed log entries for task ${entityId}`,
      removedCount: log.length - filteredLog.length
    });

  } catch (error) {
    console.error('Error removing task log entries:', error);
    return NextResponse.json({ error: 'Failed to remove task log entries' }, { status: 500 });
  }
}