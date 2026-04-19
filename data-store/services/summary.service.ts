// @/data-store/services/summary.service.ts
import { FinancialRecord, Sale, Item, Task, ItemSaleLine, SummaryTotals } from '@/types/entities';
import { SaleStatus, ItemStatus, TaskStatus } from '@/types/enums';
import { SummaryRepository } from '../repositories/summary.repo';
import { formatMonthKey } from '@/lib/utils/date-utils';
import { formatArchiveMonthKeyUTC, formatArchiveMonthKeyUTCFromParts } from '@/lib/utils/utc-utils';
import {
  cashflowCountableCost,
  cashflowCountableJungleCoins,
  cashflowCountableRevenue,
} from '@/lib/utils/financial-utils';

export class SummaryService {
  private static normalizeMonthKeyInput(monthKey: string): string {
    const value = String(monthKey).trim();
    if (!value) {
      throw new Error('monthKey is required for targeted summary rebuild.');
    }

    const mmYyyyMatch = value.match(/^(\d{2})-(\d{4})$/);
    const mmYyMatch = value.match(/^(\d{2})-(\d{2})$/);
    const yyyyMmMatch = value.match(/^(\d{4})-(\d{2})$/);

    if (!mmYyyyMatch && !mmYyMatch && !yyyyMmMatch) {
      throw new Error('Invalid monthKey format. Expected MM-YY or MM-YYYY.');
    }

    const [monthText, yearText] = mmYyMatch
      ? [mmYyMatch[1], `20${mmYyMatch[2]}`]
      : mmYyyyMatch
      ? [mmYyyyMatch[1], mmYyyyMatch[2]]
      : [yyyyMmMatch ? yyyyMmMatch[2] : '', yyyyMmMatch ? yyyyMmMatch[1] : ''];

    const month = Number(monthText);
    const year = Number(yearText);

    if (!Number.isFinite(month) || !Number.isFinite(year)) {
      throw new Error('Invalid monthKey values.');
    }
    if (month < 1 || month > 12) {
      throw new Error(`Invalid month in monthKey: ${monthText}`);
    }
    if (year < 2000 || year > 2100) {
      throw new Error(`Invalid year in monthKey: ${yearText}`);
    }

    return formatArchiveMonthKeyUTCFromParts(year, month);
  }

  /**
   * FINANCIALS: Updates Revenue, Costs, and Profit
   */
  static async updateFinancialCounters(
    newRecord: FinancialRecord,
    oldRecord?: FinancialRecord
  ): Promise<void> {
    const monthYear = formatArchiveMonthKeyUTCFromParts(newRecord.year, newRecord.month);

    const oldRev = oldRecord ? cashflowCountableRevenue(oldRecord) : 0;
    const newRev = cashflowCountableRevenue(newRecord);
    const oldCost = oldRecord ? cashflowCountableCost(oldRecord) : 0;
    const newCost = cashflowCountableCost(newRecord);
    const oldJ = oldRecord ? cashflowCountableJungleCoins(oldRecord) : 0;
    const newJ = cashflowCountableJungleCoins(newRecord);

    const revenueDelta = newRev - oldRev;
    const costDelta = newCost - oldCost;
    const jungleCoinsDelta = newJ - oldJ;

    if (revenueDelta !== 0 || costDelta !== 0 || jungleCoinsDelta !== 0) {
      await SummaryRepository.updateCounters({ monthYear, revenueDelta, costDelta, jungleCoinsDelta });
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
    const monthYear = formatArchiveMonthKeyUTC(new Date(date));
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
    const date = newItem.soldAt || newItem.updatedAt || new Date();
    const monthYear = formatArchiveMonthKeyUTC(new Date(date));
    let itemsSoldDelta = 0;

    const isSold = (status?: string) => {
      const u = (status as string || '').toUpperCase();
      return u === 'SOLD' || u === 'ITEMSTATUS.SOLD' || u === 'COLLECTED' || u === 'ITEMSTATUS.COLLECTED';
    };

    const wasSold = oldItem ? isSold(oldItem.status) : false;
    const isNowSold = isSold(newItem.status);

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
    const monthYear = formatArchiveMonthKeyUTC(new Date(date));
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
    const monthYear = formatArchiveMonthKeyUTCFromParts(record.year, record.month);
    await SummaryRepository.updateCounters({
      monthYear,
      revenueDelta: -cashflowCountableRevenue(record),
      costDelta: -cashflowCountableCost(record),
      jungleCoinsDelta: -cashflowCountableJungleCoins(record),
    });
  }

  static async handleSaleDeletion(sale: Sale) {
    const date = sale.collectedAt || sale.saleDate || new Date();
    await SummaryRepository.updateCounters({
      monthYear: formatArchiveMonthKeyUTC(new Date(date)),
      salesVolumeDelta: -1,
      salesRevenueDelta: -(sale.totals.totalRevenue || 0)
    });
  }

  static async handleItemDeletion(item: Item) {
    const date = item.soldAt || new Date();
    await SummaryRepository.updateCounters({
      monthYear: formatArchiveMonthKeyUTC(new Date(date)),
      itemsSoldDelta: -(item.quantitySold || 0)
    });
  }

  static async handleTaskDeletion(task: Task) {
    const date = task.collectedAt || task.doneAt || new Date();
    await SummaryRepository.updateCounters({
      monthYear: formatArchiveMonthKeyUTC(new Date(date)),
      taskCountDelta: -1
    });
  }

  /**
   * Physical units implied by sale lines — matches "Physical items delivered" on the sales dashboard.
   * Prefer this over summing Item.quantitySold on rebuild: items may no longer be flipped to SOLD status.
   */
  private static sumPhysicalUnitsFromSales(sales: Sale[]): number {
    let total = 0;
    for (const sale of sales) {
      for (const line of sale.lines || []) {
        if (line.kind === 'item') {
          total += Math.max(0, (line as ItemSaleLine).quantity || 0);
        }
      }
    }
    return total;
  }

  /**
   * Complete rebuild of all monthly summaries and the all-time summary.
   * Uses live month indexes (tasks, financials, sales). itemsSold is derived from sales lines.
   */
  static async rebuildAllSummaries(): Promise<{ success: boolean; count: number }> {
    const { formatMonthKey } = await import('@/lib/utils/date-utils');
    const { kvDel, kvSAdd } = await import('@/lib/utils/kv');
    const { buildSummaryMonthsKey } = await import('@/data-store/keys');
    
    // 1. Reset Global All-Time summary
    await SummaryRepository.resetSummary();

    // 2. Identify all months that exist in live month indexes
    const rawMonths = await this.getAllKnownMonths();
    
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
  static async rebuildSummaryForMonth(monthKey: string, isBulkRebuild: boolean = false): Promise<SummaryTotals> {
    const { getTasksFromMonthIndex, getFinancialsFromMonthIndex, getSalesFromMonthIndex } = await import('@/data-store/datastore');

    // Normalize monthKey (handles MM-YYYY -> MM-YY conversion)
    const normalizedMonthKey = this.normalizeMonthKeyInput(monthKey);
    console.log(`[SummaryService] Rebuilding summary for: ${normalizedMonthKey} (Original: ${monthKey})`);

    // 1. If not bulk, we need to subtract current monthly values from All-Time first
    if (!isBulkRebuild) {
      const currentMonth = await SummaryRepository.getRawSummary(normalizedMonthKey);
      if (currentMonth) {
        const subtractions: Partial<SummaryTotals> = {
          revenue: -currentMonth.revenue,
          costs: -currentMonth.costs,
          salesRevenue: -currentMonth.salesRevenue,
          salesVolume: -currentMonth.salesVolume,
          itemsSold: -currentMonth.itemsSold,
          taskCount: -currentMonth.taskCount,
          jungleCoins: -currentMonth.jungleCoins,
          inventoryValue: -currentMonth.inventoryValue,
          inventoryCost: -currentMonth.inventoryCost,
          inventoryJ$: -currentMonth.inventoryJ$,
        };
        await SummaryRepository.updateAllTimeCounters(subtractions);
      }
    }

    // 3. Scan live month indexes
    const [tasks, financials, sales] = await Promise.all([
      getTasksFromMonthIndex(normalizedMonthKey),
      getFinancialsFromMonthIndex(normalizedMonthKey),
      getSalesFromMonthIndex(normalizedMonthKey),
    ]);

    const countableSales = sales.filter(s =>
      s.status === SaleStatus.CHARGED ||
      s.status === SaleStatus.COLLECTED ||
      s.isCollected
    );
    const countableTasks = tasks.filter(t =>
      t.status === TaskStatus.DONE ||
      t.status === TaskStatus.COLLECTED ||
      t.isCollected
    );
    const withCashflow = financials.filter(
      (f) =>
        cashflowCountableRevenue(f) !== 0 ||
        cashflowCountableCost(f) !== 0 ||
        cashflowCountableJungleCoins(f) !== 0
    );

    console.log(`[SummaryService] Live index stats for ${normalizedMonthKey}: Sales: ${countableSales.length}, Financials (cashflow-contributing): ${withCashflow.length}, Tasks: ${countableTasks.length}`);

    // 4. Calculate totals for this month
    const totals: SummaryTotals = {
      revenue: financials.reduce((sum, f) => sum + cashflowCountableRevenue(f), 0),
      costs: financials.reduce((sum, f) => sum + cashflowCountableCost(f), 0),
      profit: 0,
      salesRevenue: countableSales.reduce((sum, s) => sum + (s.totals.totalRevenue || 0), 0),
      salesVolume: countableSales.length,
      itemsSold: this.sumPhysicalUnitsFromSales(countableSales),
      taskCount: countableTasks.length,
      jungleCoins: financials.reduce((sum, f) => sum + cashflowCountableJungleCoins(f), 0),
      inventoryValue: 0,
      inventoryCost: 0,
      inventoryJ$: 0,
    };
    totals.profit = totals.revenue - totals.costs;

    // 5. Push to Redis (Updates Monthly Hash and INCREMENTS All-Time)
    await SummaryRepository.setMonthlyAbsolute(normalizedMonthKey, totals);
    await SummaryRepository.updateAllTimeCounters(totals);

    return totals;
  }

  private static async getAllKnownMonths(): Promise<string[]> {
    const { kvScan, kvSMembers } = await import('@/lib/utils/kv');
    const { buildArchiveMonthsKey, buildSummaryMonthsKey } = await import('@/data-store/keys');

    const prefixes = [
      'thegame:index:sale:by-month:',
      'thegame:index:task:by-month:',
      'thegame:index:financial:by-month:',
      'thegame:index:item:by-month:',
    ];

    const liveKeys = (await Promise.all(prefixes.map(prefix => kvScan(prefix)))).flat();
    const metaMonths = (
      await Promise.all([kvSMembers(buildArchiveMonthsKey()), kvSMembers(buildSummaryMonthsKey())])
    ).flat();

    const months = new Set<string>();

    for (const key of liveKeys) {
      const parts = key.split(':');
      const monthKey = parts[parts.length - 1];
      if (monthKey) months.add(monthKey);
    }

    for (const monthKey of metaMonths) {
      if (monthKey) months.add(monthKey);
    }

    const normalizedMonths = new Set<string>();
    for (const monthKey of months) {
      try {
        normalizedMonths.add(formatMonthKey(monthKey));
      } catch (error) {
        // Ignore non-month-like set members; this should only include months in practice.
      }
    }

    return [...normalizedMonths];
  }
}

