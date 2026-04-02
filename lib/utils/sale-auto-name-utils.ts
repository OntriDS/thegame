import { SaleType } from '@/types/enums';
import type { Site } from '@/types/entities';
import { getSiteNameFromId } from '@/lib/utils/site-options-utils';

const TITLE_SEP = ' • ';

/** Local calendar date as DD-MM-YY (hyphens). */
export function formatSaleAutoDateDDMMYY(date: Date): string {
  const d = date instanceof Date && Number.isFinite(date.getTime()) ? date : new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

export function getSaleTypeLabelForAutoName(type: SaleType): string {
  switch (type) {
    case SaleType.BOOTH:
      return 'Booth Sale';
    case SaleType.DIRECT:
      return 'Direct Sale';
    case SaleType.NETWORK:
      return 'Network Sale';
    case SaleType.ONLINE:
      return 'Online Sale';
    case SaleType.NFT:
      return 'NFT Sale';
    default:
      return 'Sale';
  }
}

/**
 * Standard sale list title: `[Type] • [Site display name] • [DD-MM-YY]`
 * If there is no site, omit that segment entirely (e.g. `Booth Sale • 27-02-26`).
 * When site is set, label resolves via catalog (falls back to stored id if unknown).
 */
export function buildAutoSaleName(type: SaleType, siteId: string, saleDate: Date, sites: Site[]): string {
  const typeLabel = getSaleTypeLabelForAutoName(type);
  const rawSite = siteId?.trim() ?? '';
  const siteLabel = rawSite ? getSiteNameFromId(rawSite, sites).trim() : '';
  const dateLabel = formatSaleAutoDateDDMMYY(saleDate);
  const parts = [typeLabel, siteLabel, dateLabel].filter((p) => p.length > 0);
  return parts.join(TITLE_SEP);
}
