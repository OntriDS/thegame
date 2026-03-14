// @/data-store/services/summary.service.ts
import { FinancialRecord, Sale, Item, Task } from '@/types/entities';
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
   * REBUILDER: Retroactively populates the rolling counters by scanning all historical records.
   * This is a heavy operation and should be used sparingly.
   */
  static async rebuildAllSummaries(): Promise<{ success: boolean; count: number }> {
    // 1. Get all available months from the Archive Vault
    const { getAvailableArchiveMonths, getArchivedTasksByMonth, getArchivedFinancialRecordsByMonth, getArchivedSalesByMonth, getArchivedItemsByMonth } = await import('@/data-store/datastore');
    const months = await getAvailableArchiveMonths();
    
    // 2. Clear All-Time summaries and monthly ones (Safety reset)
    await SummaryRepository.resetSummary(); // Clear all-time
    for (const mmyy of months) {
      await SummaryRepository.resetSummary(mmyy);
    }
    
    let totalUpdated = 0;

    for (const mmyy of months) {
      // Fetch everything for the month
      const [tasks, financials, sales, items] = await Promise.all([
        getArchivedTasksByMonth(mmyy),
        getArchivedFinancialRecordsByMonth(mmyy),
        getArchivedSalesByMonth(mmyy),
        getArchivedItemsByMonth(mmyy)
      ]);

      // Calculate totals for this month
      const totals = {
        monthYear: mmyy,
        revenueDelta: financials.reduce((sum, f) => sum + (f.revenue || 0), 0),
        costDelta: financials.reduce((sum, f) => sum + (f.cost || 0), 0),
        salesRevenueDelta: sales.reduce((sum, s) => sum + (s.totals.totalRevenue || 0), 0),
        salesVolumeDelta: sales.length,
        itemsSoldDelta: items.reduce((sum, i) => sum + (i.quantitySold || 0), 0),
        taskCountDelta: tasks.length,
        jungleCoinsDelta: financials.reduce((sum, f) => sum + (f.jungleCoins || 0), 0),
      };

      // Push to Redis (Hash keys)
      await SummaryRepository.updateCounters(totals);
      totalUpdated++;
    }

    return { success: true, count: totalUpdated };
  }
}
