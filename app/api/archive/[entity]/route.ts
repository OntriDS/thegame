import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import {
  getArchivedTasksByMonth,
  getArchivedSalesByMonth,
  getArchivedFinancialRecordsByMonth,
  getArchivedItemsByMonth,
  getPlayerArchiveEventsByMonth,
} from '@/data-store/datastore';

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

