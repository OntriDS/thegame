// lib/utils/financial-aggregation-utils.ts
// Centralized financial aggregation utilities following DRY principles

import { FinancialRecord } from '@/types/entities';
import type { Station } from '@/types/type-aliases';

export interface StationBreakdown {
  revenue: number;
  cost: number;
  net: number;
  jungleCoins: number;
}

export interface AreaBreakdown {
  [station: string]: StationBreakdown;
}

/**
 * Aggregate financial records by station
 * @param records - Financial records to aggregate
 * @param stations - List of stations to include in breakdown
 * @returns Object mapping station names to their financial breakdown
 */
export function aggregateRecordsByStation(
  records: FinancialRecord[],
  stations: readonly Station[]
): AreaBreakdown {
  // Initialize breakdown with zeros for all stations
  const breakdown: AreaBreakdown = {};
  stations.forEach(station => {
    breakdown[station] = {
      revenue: 0,
      cost: 0,
      net: 0,
      jungleCoins: 0
    };
  });
  
  // Aggregate records by station
  records.forEach(record => {
    if (breakdown[record.station]) {
      breakdown[record.station].revenue += record.revenue;
      breakdown[record.station].cost += record.cost;
      breakdown[record.station].net += (record.revenue - record.cost);
      breakdown[record.station].jungleCoins += record.jungleCoins;
    }
  });
  
  return breakdown;
}

/**
 * Calculate totals across all stations
 */
export function calculateTotals(breakdown: AreaBreakdown) {
  return Object.values(breakdown).reduce(
    (totals, station) => ({
      revenue: totals.revenue + station.revenue,
      cost: totals.cost + station.cost,
      net: totals.net + station.net,
      jungleCoins: totals.jungleCoins + station.jungleCoins
    }),
    { revenue: 0, cost: 0, net: 0, jungleCoins: 0 }
  );
}
