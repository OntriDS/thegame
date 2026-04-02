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

/** Coerce API/string sale type to enum for labeling. */
export function coerceSaleTypeForAutoName(input: SaleType | string | undefined | null): SaleType {
  if (input === undefined || input === null) return SaleType.DIRECT;
  if (typeof input !== 'string') return input;
  const u = String(input).trim().toUpperCase();
  const map: Record<string, SaleType> = {
    DIRECT: SaleType.DIRECT,
    BOOTH: SaleType.BOOTH,
    NETWORK: SaleType.NETWORK,
    ONLINE: SaleType.ONLINE,
    NFT: SaleType.NFT,
  };
  return map[u] ?? SaleType.DIRECT;
}

/**
 * Sale-sourced financial primary title (server): matches list-sale pattern using a resolved site label.
 * `[Type] • [Site] • [DD-MM-YY]` — omits site segment when label empty.
 */
export function buildFinrecTitleFromSaleParts(
  saleType: SaleType | string | undefined | null,
  siteDisplayName: string,
  at: Date
): string {
  const typeLabel = getSaleTypeLabelForAutoName(coerceSaleTypeForAutoName(saleType));
  const site = (siteDisplayName ?? '').trim();
  const dateLabel = formatSaleAutoDateDDMMYY(at);
  const parts = [typeLabel, site, dateLabel].filter((p) => p.length > 0);
  return parts.join(TITLE_SEP);
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
