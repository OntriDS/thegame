import type { Sale } from '@/types/entities';
import { SaleType, SaleStatus } from '@/types/enums';
import { SalesStation } from '@/lib/storage/taxonomy';
import { toUTC, getUTCNow } from '@/lib/utils/utc-utils';

/** Lean payload fields persisted on SALE entity lifecycle log rows */
export function getSaleLogDetails(sale: Sale) {
  const stationMap: Record<string, string> = {
    [SaleType.DIRECT]: SalesStation.DIRECT_SALES,
    [SaleType.BOOTH]: SalesStation.BOOTH_SALES,
    [SaleType.NETWORK]: SalesStation.NETWORK,
    [SaleType.ONLINE]: SalesStation.ONLINE_SALES,
  };

  return {
    name: sale.name || sale.counterpartyName || 'sale',
    type: sale.type,
    station: sale.salesChannel || stationMap[sale.type] || 'unknown',
    cost: sale.totals.totalCost || 0,
    revenue: sale.totals.totalRevenue,
    siteId: sale.siteId || '',
  };
}

/**
 * Business timestamp for sold-item rows and item SOLD logs from a sale.
 * - Charged sale: prefer doneAt (financial record creation / stock removal).
 * - Fallback: saleDate, then now.
 * Note: We DO NOT prefer collectedAt because that timestamp strictly relates to gamification points, not the physical transaction.
 */
export function saleReferenceDateForItemSoldAndLog(
  sale: Pick<Sale, 'status' | 'doneAt' | 'saleDate'>
): Date {
  const toValid = (v: unknown): Date | null => {
    if (v == null || v === '') return null;
    try {
      const d = toUTC(v as Date | string);
      return Number.isFinite(d.getTime()) ? d : null;
    } catch {
      return null;
    }
  };

  const done = toValid(sale.doneAt);
  if (done) return done;
  const sd = toValid(sale.saleDate);
  if (sd) return sd;
  return getUTCNow();
}
