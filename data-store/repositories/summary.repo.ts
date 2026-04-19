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
    
    let commandCount = 0;

    // Create an atomic pipeline
    const pipeline = kv.pipeline();

    // Track this month in the summary activity index
    pipeline.sadd(buildSummaryMonthsKey(), monthYear);
    commandCount += 1;

    // Monthly scope
    if (revenueDelta !== 0) {
      pipeline.hincrbyfloat(monthlyKey, 'revenue', revenueDelta);
      commandCount += 1;
    }
    if (costDelta !== 0) {
      pipeline.hincrbyfloat(monthlyKey, 'costs', costDelta);
      commandCount += 1;
    }
    if (profitDelta !== 0) {
      pipeline.hincrbyfloat(monthlyKey, 'profit', profitDelta);
      commandCount += 1;
    }
    if (salesRevenueDelta !== 0) {
      pipeline.hincrbyfloat(monthlyKey, 'salesRevenue', salesRevenueDelta);
      commandCount += 1;
    }
    if (salesVolumeDelta !== 0) {
      pipeline.hincrbyfloat(monthlyKey, 'salesVolume', salesVolumeDelta);
      commandCount += 1;
    }
    if (itemsSoldDelta !== 0) {
      pipeline.hincrbyfloat(monthlyKey, 'itemsSold', itemsSoldDelta);
      commandCount += 1;
    }
    if (taskCountDelta !== 0) {
      pipeline.hincrbyfloat(monthlyKey, 'taskCount', taskCountDelta);
      commandCount += 1;
    }
    if (jungleCoinsDelta !== 0) {
      pipeline.hincrbyfloat(monthlyKey, 'jungleCoins', jungleCoinsDelta);
      commandCount += 1;
    }
    if (inventoryValueDelta !== 0) {
      pipeline.hincrbyfloat(monthlyKey, 'inventoryValue', inventoryValueDelta);
      commandCount += 1;
    }
    if (inventoryCostDelta !== 0) {
      pipeline.hincrbyfloat(monthlyKey, 'inventoryCost', inventoryCostDelta);
      commandCount += 1;
    }
    if (inventoryJ$Delta !== 0) {
      pipeline.hincrbyfloat(monthlyKey, 'inventoryJ$', inventoryJ$Delta);
      commandCount += 1;
    }

    // All-Time scope
    if (revenueDelta !== 0) {
      pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'revenue', revenueDelta);
      commandCount += 1;
    }
    if (costDelta !== 0) {
      pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'costs', costDelta);
      commandCount += 1;
    }
    if (profitDelta !== 0) {
      pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'profit', profitDelta);
      commandCount += 1;
    }
    if (salesRevenueDelta !== 0) {
      pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'salesRevenue', salesRevenueDelta);
      commandCount += 1;
    }
    if (salesVolumeDelta !== 0) {
      pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'salesVolume', salesVolumeDelta);
      commandCount += 1;
    }
    if (itemsSoldDelta !== 0) {
      pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'itemsSold', itemsSoldDelta);
      commandCount += 1;
    }
    if (taskCountDelta !== 0) {
      pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'taskCount', taskCountDelta);
      commandCount += 1;
    }
    if (jungleCoinsDelta !== 0) {
      pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'jungleCoins', jungleCoinsDelta);
      commandCount += 1;
    }
    if (inventoryValueDelta !== 0) {
      pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'inventoryValue', inventoryValueDelta);
      commandCount += 1;
    }
    if (inventoryCostDelta !== 0) {
      pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'inventoryCost', inventoryCostDelta);
      commandCount += 1;
    }
    if (inventoryJ$Delta !== 0) {
      pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'inventoryJ$', inventoryJ$Delta);
      commandCount += 1;
    }

    // Execute all commands atomically in a single network round-trip
    if (commandCount > 0) {
      await pipeline.exec();
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

    let commandCount = 0;

    if (revenue !== 0) {
      pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'revenue', revenue);
      commandCount += 1;
    }
    if (costs !== 0) {
      pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'costs', costs);
      commandCount += 1;
    }
    if (profit !== 0) {
      pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'profit', profit);
      commandCount += 1;
    }
    if (salesRevenue !== 0) {
      pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'salesRevenue', salesRevenue);
      commandCount += 1;
    }
    if (salesVolume !== 0) {
      pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'salesVolume', salesVolume);
      commandCount += 1;
    }
    if (itemsSold !== 0) {
      pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'itemsSold', itemsSold);
      commandCount += 1;
    }
    if (taskCount !== 0) {
      pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'taskCount', taskCount);
      commandCount += 1;
    }
    if (jungleCoins !== 0) {
      pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'jungleCoins', jungleCoins);
      commandCount += 1;
    }
    if (inventoryValue !== 0) {
      pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'inventoryValue', inventoryValue);
      commandCount += 1;
    }
    if (inventoryCost !== 0) {
      pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'inventoryCost', inventoryCost);
      commandCount += 1;
    }
    if (inventoryJ$ !== 0) {
      pipeline.hincrbyfloat(this.ALL_TIME_KEY, 'inventoryJ$', inventoryJ$);
      commandCount += 1;
    }

    if (commandCount > 0) {
      await pipeline.exec();
    }
  }

  static async setMonthlyAbsolute(monthYear: string, totals: SummaryTotals): Promise<void> {
    const monthlyKey = this.getMonthlyKey(monthYear);
    const kvClient = (await import('@/lib/utils/kv')).kv as unknown as {
      sadd: (key: string, ...members: string[]) => Promise<void>;
      hset: (key: string, fields: Record<string, number>) => Promise<void>;
    };

    await kvClient.sadd(buildSummaryMonthsKey(), monthYear);
    await kvClient.hset(monthlyKey, {
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

