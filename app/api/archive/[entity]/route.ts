import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import {
  getArchivedTasksByMonth,
  getArchivedSalesByMonth,
  getArchivedFinancialRecordsByMonth,
  getArchivedItemsByMonth,
  getPlayerArchiveEventsByMonth,
  archiveItemSnapshot,
} from '@/data-store/datastore';
import type { Item } from '@/types/entities';
import { formatMonthKey } from '@/lib/utils/date-utils';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { entity: string } }
) {
  if (!(await requireAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const entity = params.entity;
  const month = request.nextUrl.searchParams.get('month');

  if (!month) {
    return NextResponse.json(
      { error: 'Missing month parameter' },
      { status: 400 }
    );
  }

  try {
    switch (entity) {
      case 'tasks': {
        const data = await getArchivedTasksByMonth(month);
        return NextResponse.json(data);
      }
      case 'sales': {
        const data = await getArchivedSalesByMonth(month);
        return NextResponse.json(data);
      }
      case 'financials': {
        const data = await getArchivedFinancialRecordsByMonth(month);
        return NextResponse.json(data);
      }
      case 'items': {
        const data = await getArchivedItemsByMonth(month);
        return NextResponse.json(data);
      }
      case 'player': {
        const data = await getPlayerArchiveEventsByMonth(month);
        return NextResponse.json(data);
      }
      default:
        return NextResponse.json({ error: 'Unknown archive entity' }, { status: 404 });
    }
  } catch (error) {
    console.error(`[GET /api/archive/${entity}] Failed:`, error);
    return NextResponse.json(
      { error: `Failed to load archived ${entity}` },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { entity: string } }
) {
  if (!(await requireAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const entity = params.entity;
  if (entity !== 'items') {
    return NextResponse.json(
      { error: 'Archive append is only supported for items' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const snapshot = body.snapshot as Item | undefined;
    const soldAtIso = body.soldAt as string | undefined;

    if (!snapshot) {
      return NextResponse.json(
        { error: 'Missing snapshot payload' },
        { status: 400 }
      );
    }

    const soldAt = soldAtIso ? new Date(soldAtIso) : new Date();
    const normalizedSnapshot: Item = {
      ...snapshot,
      createdAt: snapshot.createdAt ? new Date(snapshot.createdAt) : soldAt,
      updatedAt: snapshot.updatedAt ? new Date(snapshot.updatedAt) : soldAt,
    };

    const monthKey = formatMonthKey(soldAt);
    await archiveItemSnapshot(normalizedSnapshot, monthKey);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[POST /api/archive/${entity}] Failed:`, error);
    return NextResponse.json(
      { error: `Failed to archive ${entity}` },
      { status: 500 }
    );
  }
}

