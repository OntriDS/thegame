import type { Sale } from '@/types/entities';
import { SaleType } from '@/types/enums';

/** Lean payload fields persisted on SALE entity lifecycle log rows */
export function getSaleLogDetails(sale: Sale) {
  const stationMap: Record<string, string> = {
    [SaleType.DIRECT]: 'Direct-Sales',
    [SaleType.BOOTH]: 'Booth-Sales',
    [SaleType.NETWORK]: 'Network',
    [SaleType.ONLINE]: 'Online-Sales',
    [SaleType.NFT]: 'Web3-Gallery',
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
