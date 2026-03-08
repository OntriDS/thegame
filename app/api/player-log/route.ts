// app/api/player-log/route.ts
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

    const { getEntityLogs, getEntityLogMonths } = await import('@/data-store/datastore');
    const entries = await getEntityLogs(EntityType.PLAYER, { month });
    const months = await getEntityLogMonths(EntityType.PLAYER);

    return NextResponse.json({ entries, months });
  } catch (error) {
    console.error('Error fetching player log:', error);
    return NextResponse.json({ error: 'Failed to fetch player log' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { entityId, event, details } = body || {};
    if (!entityId || !event) {
      return NextResponse.json({ error: 'Missing entityId or event' }, { status: 400 });
    }
    const { appendEntityLog } = await import('@/workflows/entities-logging');
    await appendEntityLog(EntityType.PLAYER, String(entityId), event, details || {});
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error appending player log:', error);
    return NextResponse.json({ error: 'Failed to append player log' }, { status: 500 });
  }
}