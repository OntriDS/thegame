import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { EntityType } from '@/types/enums';
import { formatMonthKey } from '@/lib/utils/date-utils';
import { kvSAdd } from '@/data-store/kv';
import { buildMonthIndexKey } from '@/data-store/keys';
import { 
  getAllTasks as repoGetAllTasks
} from '@/data-store/repositories/task.repo';
import { 
  getAllItems as repoGetAllItems
} from '@/data-store/repositories/item.repo';
import { 
  getAllSales as repoGetAllSales
} from '@/data-store/repositories/sale.repo';
import { 
  getAllFinancials as repoGetAllFinancials
} from '@/data-store/repositories/financial.repo';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let added = 0;

    // Tasks: collectedAt -> doneAt -> createdAt
    const tasks = await repoGetAllTasks();
    for (const t of tasks) {
      const date: any = (t as any).collectedAt || (t as any).doneAt || t.createdAt;
      if (!date) continue;
      const mmyy = formatMonthKey(date);
      await kvSAdd(buildMonthIndexKey(EntityType.TASK, mmyy), t.id);
      added++;
    }

    // Items: createdAt
    const items = await repoGetAllItems();
    for (const i of items) {
      if (!i.createdAt) continue;
      const mmyy = formatMonthKey(i.createdAt);
      await kvSAdd(buildMonthIndexKey(EntityType.ITEM, mmyy), i.id);
      added++;
    }

    // Sales: saleDate -> createdAt
    const sales = await repoGetAllSales();
    for (const s of sales) {
      const date: any = (s as any).saleDate || (s as any).createdAt;
      if (!date) continue;
      const mmyy = formatMonthKey(date);
      await kvSAdd(buildMonthIndexKey(EntityType.SALE, mmyy), s.id);
      added++;
    }

    // Financials: year/month
    const financials = await repoGetAllFinancials();
    for (const f of financials) {
      // Prefer explicit year/month; otherwise fall back to createdAt
      const fallbackDate = (f as any).createdAt ? new Date((f as any).createdAt) : null;
      const d = (f.year && f.month)
        ? new Date(f.year, f.month - 1, 1)
        : fallbackDate;
      if (!d) continue;
      const mmyy = formatMonthKey(d);
      await kvSAdd(buildMonthIndexKey(EntityType.FINANCIAL, mmyy), f.id);
      added++;
    }

    return NextResponse.json({ success: true, indexed: added });
  } catch (error) {
    console.error('[backfill-month-indexes] Failed', error);
    return NextResponse.json({ error: 'Backfill failed' }, { status: 500 });
  }
}


