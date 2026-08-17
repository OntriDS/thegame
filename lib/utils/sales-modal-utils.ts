import { EntityType, LinkType } from '@/types/enums';
import { getAreaForStation } from '@/lib/utils/business-structure-utils';
import { normalizeSaleLines } from '@/lib/utils/sale-lines-normalize';
import type { SaleLine, Item, ItemSaleLine } from '@/types/entities';
import type { Station } from '@/types/type-aliases';

/** Product lines only (legacy bundle rows normalized to item). */
export function collectItemSaleLines(saleLines: SaleLine[]): ItemSaleLine[] {
  return normalizeSaleLines(saleLines).filter((line): line is ItemSaleLine => line.kind === 'item');
}

export function getStationValue(station: Station): string {
  const area = getAreaForStation(station);
  return `${area}:${station}`;
}

export function formatItemTypeSubtypeLabel(itemId: string, catalog: Item[]): string {
  const it = catalog.find((item) => item.id === itemId);
  if (!it) return '—';
  const sub = it.subItemType != null && String(it.subItemType).trim() !== '' ? String(it.subItemType) : '';
  return sub ? `${it.type} / ${sub}` : String(it.type);
}

export function extractSaleItemTargetIds(links: unknown[]): string[] {
  if (!Array.isArray(links)) return [];
  const out: string[] = [];
  for (const raw of links) {
    const l = raw as { linkType?: string; target?: { type?: string; id?: string } };
    if (l?.linkType !== LinkType.SALE_ITEM) continue;
    const id = l.target?.id;
    if (typeof id !== 'string' || !id.trim()) continue;
    if (String(l.target?.type).toLowerCase() !== EntityType.ITEM) continue;
    out.push(id);
  }
  return out;
}

export function resolveItemFromLineItemIdOnly(
  lineItemId: string | undefined,
  items: Item[],
): { resolvedId: string; isKnown: boolean } {
  const lid = lineItemId?.trim() ?? '';
  if (!lid) return { resolvedId: '', isKnown: false };
  if (items.some((i) => i.id === lid)) return { resolvedId: lid, isKnown: true };
  return { resolvedId: lid, isKnown: false };
}
