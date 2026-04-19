import { kv } from '@/lib/utils/kv';
import { buildSummaryMonthsKey } from '../keys';
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

    // Track this month in the summary activity index
    pipeline.sadd(buildSummaryMonthsKey(), monthYear);

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
    const commands = (pipeline as any).length ?? (pipeline as any).commands?.length ?? 0;
    if (commands > 0) {
      await pipeline.exec();
    } else {
      console.warn(`[SummaryRepository] updateCounters: Skipping empty pipeline for ${monthYear}`);
    }
  }

  /**
   * Updates ONLY the All-Time counters. Used for delta adjustments during index repairs.
   */
  static async updateAllTimeCounters(deltas: Partial<SummaryTotals>) {
    const pipeline = kv.pipeline();
    const {
      revenue = 0,
      costs = 0,
      salesRevenue = 0,
      salesVolume = 0,
      itemsSold = 0,
      taskCount = 0,
      jungleCoins = 0,
      inventoryValue = 0,
      inventoryCost = 0,
      inventoryJ$ = 0,
    } = deltas;

    const profit = revenue - costs;

    if (revenue !== 0) pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'revenue', revenue);
    if (costs !== 0) pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'costs', costs);
    if (profit !== 0) pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'profit', profit);
    if (salesRevenue !== 0) pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'salesRevenue', salesRevenue);
    if (salesVolume !== 0) pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'salesVolume', salesVolume);
    if (itemsSold !== 0) pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'itemsSold', itemsSold);
    if (taskCount !== 0) pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'taskCount', taskCount);
    if (jungleCoins !== 0) pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'jungleCoins', jungleCoins);
    if (inventoryValue !== 0) pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'inventoryValue', inventoryValue);
    if (inventoryCost !== 0) pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'inventoryCost', inventoryCost);
    if (inventoryJ$ !== 0) pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'inventoryJ$', inventoryJ$);

    const commands = (pipeline as any).length ?? (pipeline as any).commands?.length ?? 0;
    if (commands > 0) {
      await pipeline.exec();
    } else {
      console.warn(`[SummaryRepository] updateAllTimeCounters: Skipping empty pipeline`);
    }
  }

  static async setMonthlyAbsolute(monthYear: string, totals: SummaryTotals): Promise<void> {
    const monthlyKey = this.getMonthlyKey(monthYear);
    const pipeline = kv.pipeline();

    pipeline.sadd(buildSummaryMonthsKey(), monthYear);
    pipeline.hset(monthlyKey, {
      revenue: totals.revenue,
      costs: totals.costs,
      profit: totals.profit,
      salesRevenue: totals.salesRevenue,
      salesVolume: totals.salesVolume,
      itemsSold: totals.itemsSold,
      taskCount: totals.taskCount,
      jungleCoins: totals.jungleCoins,
      inventoryValue: totals.inventoryValue,
      inventoryCost: totals.inventoryCost,
      'inventoryJ$': totals.inventoryJ$,
    });

    const commands = (pipeline as any).length ?? (pipeline as any).commands?.length ?? 0;
    if (commands > 0) {
      await pipeline.exec();
    } else {
      console.warn(`[SummaryRepository] setMonthlyAbsolute: Skipping empty pipeline for ${monthYear}`);
    }
  }

  /**
   * Resets a specific summary key (monthly or all-time)
   */
  static async resetSummary(monthYear?: string) {
    const key = monthYear ? this.getMonthlyKey(monthYear) : this.ALL_TIME_KEY;
    await (await import('@/lib/utils/kv')).kv.del(key);
  }

  /**
   * Fetches the summary for a specific month or all-time
   */
  static async getSummary(monthYear?: string): Promise<SummaryTotals> {
    const key = monthYear ? this.getMonthlyKey(monthYear) : this.ALL_TIME_KEY;
    const data = await (await import('@/lib/utils/kv')).kv.hgetall(key) as any;

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

  static async getRawSummary(monthYear: string): Promise<SummaryTotals | null> {
    const key = this.getMonthlyKey(monthYear);
    const data = await (await import('@/lib/utils/kv')).kv.hgetall(key) as any;

    if (!data || Object.keys(data).length === 0) {
      return null;
    }

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

