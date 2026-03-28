// @/data-store/services/summary.service.ts
import { FinancialRecord, Sale, Item, Task, ItemSaleLine, BundleSaleLine, SummaryTotals } from '@/types/entities';
import { FinancialStatus, SaleStatus, ItemStatus, TaskStatus } from '@/types/enums';
import { SummaryRepository } from '../repositories/summary.repo';
import { formatMonthKey } from '@/lib/utils/date-utils';

export class SummaryService {
  /**
   * FINANCIALS: Updates Revenue, Costs, and Profit
   */
  static async updateFinancialCounters(
    newRecord: FinancialRecord,
    oldRecord?: FinancialRecord
  ): Promise<void> {
    const monthYear = formatMonthKey(new Date(newRecord.year, newRecord.month - 1, 1));
    let revenueDelta = 0;
    let costDelta = 0;

    const isActive = (status?: string) => 
      status === FinancialStatus.DONE || status === FinancialStatus.COLLECTED;

    const wasActive = oldRecord ? isActive(oldRecord.status) : false;
    const isNowActive = isActive(newRecord.status);

    if (!wasActive && isNowActive) {
      revenueDelta = newRecord.revenue || 0;
      costDelta = newRecord.cost || 0;
    } else if (wasActive && !isNowActive) {
      revenueDelta = -(oldRecord?.revenue || 0);
      costDelta = -(oldRecord?.cost || 0);
    } else if (wasActive && isNowActive) {
      revenueDelta = (newRecord.revenue || 0) - (oldRecord?.revenue || 0);
      costDelta = (newRecord.cost || 0) - (oldRecord?.cost || 0);
    }

    if (revenueDelta !== 0 || costDelta !== 0) {
      await SummaryRepository.updateCounters({ monthYear, revenueDelta, costDelta });
    }
  }

  /**
   * SALES: Updates Sales Revenue and Sales Volume (Count of transactions)
   */
  static async updateSalesCounters(
    newSale: Sale,
    oldSale?: Sale
  ): Promise<void> {
    const date = newSale.collectedAt || newSale.saleDate || new Date();
    const monthYear = formatMonthKey(new Date(date));
    let salesVolumeDelta = 0;
    let salesRevenueDelta = 0;

    const isCountable = (status?: string) =>
      status === SaleStatus.CHARGED || status === SaleStatus.COLLECTED;

    const wasCountable = oldSale ? isCountable(oldSale.status) : false;
    const isNowCountable = isCountable(newSale.status);

    if (!wasCountable && isNowCountable) {
      salesVolumeDelta = 1;
      salesRevenueDelta = newSale.totals.totalRevenue || 0;
    } else if (wasCountable && !isNowCountable) {
      salesVolumeDelta = -1;
      salesRevenueDelta = -(oldSale?.totals.totalRevenue || 0);
    } else if (wasCountable && isNowCountable) {
      salesVolumeDelta = 0; // Count stays the same
      salesRevenueDelta = (newSale.totals.totalRevenue || 0) - (oldSale?.totals.totalRevenue || 0);
    }

    if (salesVolumeDelta !== 0 || salesRevenueDelta !== 0) {
      await SummaryRepository.updateCounters({ monthYear, salesVolumeDelta, salesRevenueDelta });
    }
  }

  /**
   * ITEMS: Updates Items Sold (Count of units/quantity)
   */
  static async updateItemCounters(
    newItem: Item,
    oldItem?: Item
  ): Promise<void> {
    const date = newItem.soldAt || newItem.collectedAt || newItem.updatedAt || new Date();
    const monthYear = formatMonthKey(new Date(date));
    let itemsSoldDelta = 0;

    const isSold = (status?: string, isCollected?: boolean) => 
      (status as string || '').toUpperCase() === 'SOLD' || 
      (status as string || '').toUpperCase() === 'ITEMSTATUS.SOLD' || 
      status === ItemStatus.COLLECTED || 
      !!isCollected;

    const wasSold = oldItem ? isSold(oldItem.status, oldItem.isCollected) : false;
    const isNowSold = isSold(newItem.status, newItem.isCollected);

    if (!wasSold && isNowSold) {
      itemsSoldDelta = newItem.quantitySold || 0;
    } else if (wasSold && !isNowSold) {
      itemsSoldDelta = -(oldItem?.quantitySold || 0);
    } else if (wasSold && isNowSold) {
      itemsSoldDelta = (newItem.quantitySold || 0) - (oldItem?.quantitySold || 0);
    }

    if (itemsSoldDelta !== 0) {
      await SummaryRepository.updateCounters({ monthYear, itemsSoldDelta });
    }
  }

  /**
   * TASKS: Updates Task Count (Count of completed tasks)
   */
  static async updateTaskCounters(
    newTask: Task,
    oldTask?: Task
  ): Promise<void> {
    const date = newTask.collectedAt || newTask.doneAt || newTask.updatedAt || new Date();
    const monthYear = formatMonthKey(new Date(date));
    let taskCountDelta = 0;

    const isDone = (status?: string, isCollected?: boolean) => 
      status === TaskStatus.DONE || status === TaskStatus.COLLECTED || !!isCollected;

    const wasDone = oldTask ? isDone(oldTask.status, oldTask.isCollected) : false;
    const isNowDone = isDone(newTask.status, newTask.isCollected);

    if (!wasDone && isNowDone) taskCountDelta = 1;
    else if (wasDone && !isNowDone) taskCountDelta = -1;

    if (taskCountDelta !== 0) {
      await SummaryRepository.updateCounters({ monthYear, taskCountDelta });
    }
  }

  // Deletion Handlers
  static async handleFinancialDeletion(record: FinancialRecord) {
    const monthYear = formatMonthKey(new Date(record.year, record.month - 1, 1));
    await SummaryRepository.updateCounters({
      monthYear,
      revenueDelta: -(record.revenue || 0),
      costDelta: -(record.cost || 0)
    });
  }

  static async handleSaleDeletion(sale: Sale) {
    const date = sale.collectedAt || sale.saleDate || new Date();
    await SummaryRepository.updateCounters({
      monthYear: formatMonthKey(new Date(date)),
      salesVolumeDelta: -1,
      salesRevenueDelta: -(sale.totals.totalRevenue || 0)
    });
  }

  static async handleItemDeletion(item: Item) {
    const date = item.soldAt || item.collectedAt || new Date();
    await SummaryRepository.updateCounters({
      monthYear: formatMonthKey(new Date(date)),
      itemsSoldDelta: -(item.quantitySold || 0)
    });
  }

  static async handleTaskDeletion(task: Task) {
    const date = task.collectedAt || task.doneAt || new Date();
    await SummaryRepository.updateCounters({
      monthYear: formatMonthKey(new Date(date)),
      taskCountDelta: -1
    });
  }

  /**
   * Physical units implied by sale lines — matches "Physical items delivered" on the sales dashboard.
   * Prefer this over summing Item.quantitySold on rebuild: bundles fan out to many item rows and
   * items may no longer be flipped to SOLD status, which inflates or duplicates rolling totals.
   */
  private static sumPhysicalUnitsFromArchivedSales(sales: Sale[]): number {
    let total = 0;
    for (const sale of sales) {
      for (const line of sale.lines || []) {
        if (line.kind === 'item') {
          total += Math.max(0, (line as ItemSaleLine).quantity || 0);
        } else if (line.kind === 'bundle') {
          const b = line as BundleSaleLine;
          const q = Math.max(0, b.quantity || 0);
          const per = Math.max(1, b.itemsPerBundle || 1);
          total += q * per;
        }
      }
    }
    return total;
  }

  /**
   * Complete rebuild of all monthly summaries and the all-time summary.
   * Scans the Archive Vault for all items, tasks, and financials.
   */
  static async rebuildAllSummaries(): Promise<{ success: boolean; count: number }> {
    const { getAvailableArchiveMonths } = await import('@/data-store/datastore');
    const { formatMonthKey } = await import('@/lib/utils/date-utils');
    const { kvDel, kvSAdd } = await import('@/data-store/kv');
    const { buildSummaryMonthsKey } = await import('@/data-store/keys');
    
    // 1. Reset Global All-Time summary
    await SummaryRepository.resetSummary();

    // 2. Identify all months that have ever been touched (polluted index)
    const rawMonths = await getAvailableArchiveMonths();
    
    // 3. Normalize and deduplicate (e.g., "12-2024" and "12-24" both become "12-24")
    const uniqueMonths = Array.from(new Set(rawMonths.map(m => formatMonthKey(m))));
    
    console.log(`[SummaryService] Rebuilding ${uniqueMonths.length} unique months (from ${rawMonths.length} raw index entries)`);

    // 4. Sanitize the months index set in Redis
    await kvDel(buildSummaryMonthsKey());
    // Small loop is safe here, usually < 24-48 months for a healthy system
    for (const m of uniqueMonths) {
      await kvSAdd(buildSummaryMonthsKey(), m);
    }

    // 5. Rebuild each month one by one (this will also increment the new All-Time summary)
    let totalUpdated = 0;
    for (const mmyy of uniqueMonths) {
      try {
        await this.rebuildSummaryForMonth(mmyy, true); // true = bulk mode (don't adjust All-Time, just let it increment)
        totalUpdated++;
      } catch (err) {
        console.error(`[SummaryService] Failed to rebuild month ${mmyy}:`, err);
      }
    }

    return { success: true, count: totalUpdated };
  }

  /**
   * Rebuilds a specific month and adapts the All-Time counters correctly.
   */
  static async rebuildSummaryForMonth(monthKey: string, isBulkRebuild: boolean = false): Promise<void> {
    const { getArchivedTasksByMonth, getArchivedFinancialRecordsByMonth, getArchivedSalesByMonth } = await import('@/data-store/datastore');
    const { formatMonthKey } = await import('@/lib/utils/date-utils');

    // Normalize monthKey (handles MM-YYYY -> MM-YY conversion)
    const normalizedMonthKey = formatMonthKey(monthKey);
    console.log(`[SummaryService] Rebuilding summary for: ${normalizedMonthKey} (Original: ${monthKey})`);

    // 1. If not bulk, we need to subtract current monthly values from All-Time first
    if (!isBulkRebuild) {
      const currentMonth = await SummaryRepository.getSummary(normalizedMonthKey);
      const subtractions: Partial<SummaryTotals> = {
        revenue: -currentMonth.revenue,
        costs: -currentMonth.costs,
        salesRevenue: -currentMonth.salesRevenue,
        salesVolume: -currentMonth.salesVolume,
        itemsSold: -currentMonth.itemsSold,
        taskCount: -currentMonth.taskCount,
        jungleCoins: -currentMonth.jungleCoins,
      };
      await SummaryRepository.updateAllTimeCounters(subtractions);
    }

    // 2. Clear this month's key
    await SummaryRepository.resetSummary(normalizedMonthKey);

    // 3. Scan Archive Vault for this month only
    const [tasks, financials, sales] = await Promise.all([
      getArchivedTasksByMonth(normalizedMonthKey),
      getArchivedFinancialRecordsByMonth(normalizedMonthKey),
      getArchivedSalesByMonth(normalizedMonthKey),
    ]);

    console.log(`[SummaryService] Archive stats for ${normalizedMonthKey}: Sales: ${sales.length}, Financials: ${financials.length}, Tasks: ${tasks.length}`);

    // 4. Calculate totals for this month
    const totals = {
      monthYear: normalizedMonthKey,
      revenueDelta: financials.reduce((sum, f) => sum + (f.revenue || 0), 0),
      costDelta: financials.reduce((sum, f) => sum + (f.cost || 0), 0),
      salesRevenueDelta: sales.reduce((sum, s) => sum + (s.totals.totalRevenue || 0), 0),
      salesVolumeDelta: sales.length,
      itemsSoldDelta: this.sumPhysicalUnitsFromArchivedSales(sales),
      taskCountDelta: tasks.length,
      jungleCoinsDelta: financials.reduce((sum, f) => sum + (f.jungleCoins || 0), 0),
    };

    // 5. Push to Redis (Updates Monthly Hash and INCREMENTS All-Time)
    await SummaryRepository.updateCounters(totals);
  }
}
