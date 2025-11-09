import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import {
  getAvailableArchiveMonths,
  getArchivedTasksByMonth,
  getArchivedSalesByMonth,
  getArchivedFinancialRecordsByMonth,
  getArchivedItemsByMonth,
  getPlayerArchiveEventsByMonth,
  formatArchiveMonthLabel,
} from '@/data-store/datastore';
import type { AvailableArchiveMonth } from '@/types/archive';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!(await requireAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const monthKeys = await getAvailableArchiveMonths();

    const months: AvailableArchiveMonth[] = [];

    for (const key of monthKeys) {
      const [tasks, sales, financials, items, playerEvents] = await Promise.all([
        getArchivedTasksByMonth(key),
        getArchivedSalesByMonth(key),
        getArchivedFinancialRecordsByMonth(key),
        getArchivedItemsByMonth(key),
        getPlayerArchiveEventsByMonth(key),
      ]);

      months.push({
        key,
        label: formatArchiveMonthLabel(key),
        summary: {
          tasks: tasks.length,
          sales: sales.length,
          financials: financials.length,
          items: items.length,
          playerEvents: playerEvents.length,
        },
      });
    }

    return NextResponse.json(months);
  } catch (error) {
    console.error('[GET /api/archive/months] Failed:', error);
    return NextResponse.json(
      { error: 'Failed to load archive months' },
      { status: 500 }
    );
  }
}

