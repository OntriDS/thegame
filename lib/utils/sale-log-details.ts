import type { Sale } from '@/types/entities';
import { SaleType } from '@/types/enums';
import { SalesStation } from '@/lib/storage/taxonomy';

/** Lean payload fields persisted on SALE entity lifecycle log rows */
export function getSaleLogDetails(sale: Sale) {
  const stationMap: Record<string, string> = {
    [SaleType.DIRECT]: SalesStation.DIRECT_SALES,
    [SaleType.BOOTH]: SalesStation.BOOTH_SALES,
    [SaleType.NETWORK]: SalesStation.NETWORK,
    [SaleType.ONLINE]: SalesStation.ONLINE_SALES,
  };

  return {
    name: sale.name || sale.counterpartyName || 'Sale',
    type: sale.type,
    station: sale.salesChannel || stationMap[sale.type] || 'unknown',
    cost: sale.totals.totalCost || 0,
    revenue: sale.totals.totalRevenue,
    siteId: sale.siteId || '',
  };
}
