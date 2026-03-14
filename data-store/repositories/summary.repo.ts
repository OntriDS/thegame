import { kv } from '@/data-store/kv';
import type { SummaryTotals } from '@/types/entities';

export class SummaryRepository {
  private static ALL_TIME_KEY = 'thegame:summary:all-time';

  static getMonthlyKey(monthYear: string) {
    // Expects format 'MM-YYYY' or 'MM-YY'
    return `thegame:summary:monthly:${monthYear}`;
  }

  /**
   * Atomically updates multiple counters across global and monthly scopes.
   * Use negative numbers in the deltas to decrement.
   */
  static async updateCounters({
    monthYear,
    revenueDelta = 0,
    costDelta = 0,
    salesRevenueDelta = 0,
    salesVolumeDelta = 0,
    itemsSoldDelta = 0,
    taskCountDelta = 0,
    jungleCoinsDelta = 0,
    inventoryValueDelta = 0,
    inventoryCostDelta = 0,
    inventoryJ$Delta = 0,
  }: {
    monthYear: string;
    revenueDelta?: number;
    costDelta?: number;
    salesRevenueDelta?: number;
    salesVolumeDelta?: number;
    itemsSoldDelta?: number;
    taskCountDelta?: number;
    jungleCoinsDelta?: number;
    inventoryValueDelta?: number;
    inventoryCostDelta?: number;
    inventoryJ$Delta?: number;
  }) {
    const profitDelta = revenueDelta - costDelta;
    const monthlyKey = this.getMonthlyKey(monthYear);
    
    // Create an atomic pipeline
    const pipeline = kv.pipeline();

    // Monthly scope
    if (revenueDelta !== 0) pipeline.hincrbyfloat(monthlyKey, 'revenue', revenueDelta);
    if (costDelta !== 0) pipeline.hincrbyfloat(monthlyKey, 'costs', costDelta);
    if (profitDelta !== 0) pipeline.hincrbyfloat(monthlyKey, 'profit', profitDelta);
    if (salesRevenueDelta !== 0) pipeline.hincrbyfloat(monthlyKey, 'salesRevenue', salesRevenueDelta);
    if (salesVolumeDelta !== 0) pipeline.hincrbyfloat(monthlyKey, 'salesVolume', salesVolumeDelta);
    if (itemsSoldDelta !== 0) pipeline.hincrbyfloat(monthlyKey, 'itemsSold', itemsSoldDelta);
    if (taskCountDelta !== 0) pipeline.hincrbyfloat(monthlyKey, 'taskCount', taskCountDelta);
    if (jungleCoinsDelta !== 0) pipeline.hincrbyfloat(monthlyKey, 'jungleCoins', jungleCoinsDelta);
    if (inventoryValueDelta !== 0) pipeline.hincrbyfloat(monthlyKey, 'inventoryValue', inventoryValueDelta);
    if (inventoryCostDelta !== 0) pipeline.hincrbyfloat(monthlyKey, 'inventoryCost', inventoryCostDelta);
    if (inventoryJ$Delta !== 0) pipeline.hincrbyfloat(monthlyKey, 'inventoryJ$', inventoryJ$Delta);

    // All-Time scope
    if (revenueDelta !== 0) pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'revenue', revenueDelta);
    if (costDelta !== 0) pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'costs', costDelta);
    if (profitDelta !== 0) pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'profit', profitDelta);
    if (salesRevenueDelta !== 0) pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'salesRevenue', salesRevenueDelta);
    if (salesVolumeDelta !== 0) pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'salesVolume', salesVolumeDelta);
    if (itemsSoldDelta !== 0) pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'itemsSold', itemsSoldDelta);
    if (taskCountDelta !== 0) pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'taskCount', taskCountDelta);
    if (jungleCoinsDelta !== 0) pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'jungleCoins', jungleCoinsDelta);
    if (inventoryValueDelta !== 0) pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'inventoryValue', inventoryValueDelta);
    if (inventoryCostDelta !== 0) pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'inventoryCost', inventoryCostDelta);
    if (inventoryJ$Delta !== 0) pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'inventoryJ$', inventoryJ$Delta);

    // Execute all commands atomically in a single network round-trip
    await pipeline.exec();
  }

  /**
   * Resets a specific summary key (monthly or all-time)
   */
  static async resetSummary(monthYear?: string) {
    const key = monthYear ? this.getMonthlyKey(monthYear) : this.ALL_TIME_KEY;
    await (await import('@/data-store/kv')).kv.del(key);
  }

  /**
   * Fetches the summary for a specific month or all-time
   */
  static async getSummary(monthYear?: string): Promise<SummaryTotals> {
    const key = monthYear ? this.getMonthlyKey(monthYear) : this.ALL_TIME_KEY;
    const data = await (await import('@/data-store/kv')).kv.hgetall(key) as any;

    return {
      revenue: Number(data?.revenue || 0),
      costs: Number(data?.costs || 0),
      profit: Number(data?.profit || 0),
      salesRevenue: Number(data?.salesRevenue || 0),
      salesVolume: Number(data?.salesVolume || 0),
      itemsSold: Number(data?.itemsSold || 0),
      taskCount: Number(data?.taskCount || 0),
      jungleCoins: Number(data?.jungleCoins || 0),
      inventoryValue: Number(data?.inventoryValue || 0),
      inventoryCost: Number(data?.inventoryCost || 0),
      inventoryJ$: Number(data?.inventoryJ$ || 0),
    };
  }
}
