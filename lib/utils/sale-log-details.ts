import type { Sale } from '@/types/entities';
import { SaleType } from '@/types/enums';

/** Lean payload fields persisted on SALE entity lifecycle log rows */
export function getSaleLogDetails(sale: Sale) {
  const stationMap: Record<string, string> = {
    [SaleType.DIRECT]: 'direct-sales',
    [SaleType.BOOTH]: 'booth-sales',
    [SaleType.NETWORK]: 'network',
    [SaleType.ONLINE]: 'online-sales',
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
