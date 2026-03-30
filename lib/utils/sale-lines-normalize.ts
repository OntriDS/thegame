// Legacy: kind 'bundle' + itemId → kind 'item'. ItemType.BUNDLE stays on Item only.

import { v4 as uuid } from 'uuid';
import { getSalesChannelFromSaleType } from '@/lib/utils/business-structure-utils';
import type { ItemSaleLine, Sale, SaleLine, ServiceLine } from '@/types/entities';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export function normalizeSaleLine(line: unknown): SaleLine | null {
  if (!isRecord(line)) return null;
  const lineId = String(line.lineId ?? '');
  if (!lineId) return null;

  const kind = String(line.kind ?? '');

  if (kind === 'service') {
    return { ...(line as unknown as ServiceLine), kind: 'service' };
  }

  if (kind === 'bundle') {
    const itemId = line.itemId;
    if (typeof itemId === 'string' && itemId.length > 0) {
      const meta =
        typeof line.metadata === 'object' && line.metadata !== null && !Array.isArray(line.metadata)
          ? { ...(line.metadata as Record<string, unknown>) }
          : {};
      meta.migratedFromBundleLine = true;
      const out: ItemSaleLine = {
        lineId,
        kind: 'item',
        itemId,
        quantity: Number(line.quantity) || 1,
        unitPrice: Number(line.unitPrice) || 0,
        description: typeof line.description === 'string' ? line.description : undefined,
        taxAmount: typeof line.taxAmount === 'number' ? line.taxAmount : undefined,
        discount: line.discount as ItemSaleLine['discount'],
        metadata: meta,
      };
      return out;
    }
    console.warn('[normalizeSaleLine] Dropping legacy bundle line without itemId', lineId);
    return null;
  }

  if (kind === 'item' || (typeof line.itemId === 'string' && line.itemId.length > 0)) {
    const itemId = String(line.itemId ?? '');
    if (!itemId) return null;
    return {
      ...(line as unknown as ItemSaleLine),
      kind: 'item',
      lineId,
      itemId,
      quantity: Number(line.quantity) || 1,
      unitPrice: Number(line.unitPrice) || 0,
    };
  }

  return null;
}

export function normalizeSaleLines(lines: SaleLine[] | undefined | null): SaleLine[] {
  if (!lines?.length) return [];
  const out: SaleLine[] = [];
  for (const line of lines) {
    const n = normalizeSaleLine(line);
    if (n) out.push(n);
  }
  return out;
}

/** Persist stable UUID lineIds so sold-clone keys and multi-line same-SKU sales never collide. */
export function ensureItemSaleLineIds(sale: Sale): Sale {
  const lines = sale.lines;
  if (!lines?.length) return sale;

  let changed = false;
  const next: SaleLine[] = lines.map(line => {
    if (line.kind !== 'item' || !('itemId' in line)) return line;
    const il = line as ItemSaleLine;
    if (!il.itemId?.trim()) return line;
    const lid = il.lineId;
    if (lid != null && String(lid).trim() !== '') return line;
    changed = true;
    return { ...il, lineId: uuid() };
  });

  return changed ? { ...sale, lines: next } : sale;
}

export function normalizeSale<T extends Pick<Sale, 'lines' | 'type' | 'salesChannel'>>(sale: T): T {
  let next = sale as T;
  if (sale?.lines?.length) {
    next = { ...next, lines: normalizeSaleLines(sale.lines as SaleLine[]) } as T;
  }
  const s = next as Pick<Sale, 'type' | 'salesChannel'>;
  const ch = s.salesChannel;
  if ((ch == null || String(ch).trim() === '') && s.type) {
    const inferred = getSalesChannelFromSaleType(String(s.type));
    if (inferred) {
      next = { ...(next as object), salesChannel: inferred } as T;
    }
  }
  return next;
}
