// @/data-store/repositories/summary.repo.ts
import { kv } from '@/data-store/kv';

export interface SummaryTotals {
  revenue: number;
  costs: number;
  profit: number;
  salesVolume: number;
  itemsSold: number;
  taskCount: number;
}

export class SummaryRepository {
  private static ALL_TIME_KEY = 'thegame:summary:all-time';

  static getMonthlyKey(monthYear: string) {
    // Expects format 'MM-YYYY'
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
    salesVolumeDelta = 0,
    itemsSoldDelta = 0,
    taskCountDelta = 0,
  }: {
    monthYear: string;
    revenueDelta?: number;
    costDelta?: number;
    salesVolumeDelta?: number;
    itemsSoldDelta?: number;
    taskCountDelta?: number;
  }) {
    const profitDelta = revenueDelta - costDelta;
    const monthlyKey = this.getMonthlyKey(monthYear);

    const pipeline = (await import('@/data-store/kv')).kv.pipeline();

    // Mapping of fields to their deltas
    const deltas: Partial<Record<keyof SummaryTotals, number>> = {
      revenue: revenueDelta,
      costs: costDelta,
      profit: profitDelta,
      salesVolume: salesVolumeDelta,
      itemsSold: itemsSoldDelta,
      taskCount: taskCountDelta,
    };

    for (const [field, delta] of Object.entries(deltas)) {
      if (delta !== 0) {
        pipeline.hincrbyfloat(this.ALL_TIME_KEY, field, delta);
        pipeline.hincrbyfloat(monthlyKey, field, delta);
      }
    }

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
      salesVolume: Number(data?.salesVolume || 0),
      itemsSold: Number(data?.itemsSold || 0),
      taskCount: Number(data?.taskCount || 0),
    };
  }
}
