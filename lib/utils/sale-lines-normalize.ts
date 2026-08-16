// @ts-nocheck
// Legacy: kind 'bundle' + itemId → kind 'item'. ItemType.BUNDLE stays on Item only.

import { v4 as uuid } from 'uuid';
import { getSalesChannelFromSaleType } from '@/lib/utils/business-structure-utils';
import { toMoney } from '@/lib/utils/financial-utils';
import type { ItemSaleLine, Sale, SaleLine, ServiceLine } from '@/types/entities';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** Preserve canonical V1 Money values while accepting legacy numeric values. */
function normalizeMoneyValue(value: unknown): unknown {
  if (isRecord(value) && typeof value.minorUnits === 'string') return value;
  const numeric = Number(value);
  return toMoney(Number.isFinite(numeric) ? numeric : 0);
}

export function normalizeSaleLine(line: unknown): SaleLine | null {
  if (!isRecord(line)) return null;
  const lineId = String(line.lineId ?? '');
  if (!lineId) return null;

  const kind = String(line.kind ?? '');

  if (kind === 'service') {
    const { metadata, ...withoutLegacyMetadata } = line as any;
    return {
      ...withoutLegacyMetadata,
      kind: 'service',
      ...(withoutLegacyMetadata.settlement || metadata
        ? { settlement: withoutLegacyMetadata.settlement || metadata }
        : {}),
    } as ServiceLine;
  }

  if (kind === 'bundle') {
    const itemId = line.itemId;
    if (typeof itemId === 'string' && itemId.length > 0) {
      const settlement =
        typeof line.metadata === 'object' && line.metadata !== null && !Array.isArray(line.metadata)
          ? { ...(line.metadata as Record<string, unknown>) }
          : {};
      settlement.migratedFromBundleLine = true;
      const out: ItemSaleLine = {
        lineId,
        kind: 'item',
        itemId,
        quantity: Number(line.quantity) || 1,
        unitPrice: normalizeMoneyValue(line.unitPrice),
        description: typeof line.description === 'string' ? line.description : undefined,
        taxAmount: line.taxAmount !== undefined ? normalizeMoneyValue(line.taxAmount) : undefined,
        discount: line.discount as ItemSaleLine['discount'],
        settlement,
      };
      return out;
    }
    console.warn('[normalizeSaleLine] Dropping legacy bundle line without itemId', lineId);
    return null;
  }

  if (kind === 'item' || (typeof line.itemId === 'string' && line.itemId.length > 0)) {
    const itemId = String(line.itemId ?? '');
    if (!itemId) return null;
    const { metadata, ...withoutLegacyMetadata } = line as any;
    return {
      ...withoutLegacyMetadata,
      kind: 'item',
      lineId,
      itemId,
      quantity: Number(line.quantity) || 1,
      unitPrice: normalizeMoneyValue(line.unitPrice),
      ...(line.taxAmount !== undefined ? { taxAmount: normalizeMoneyValue(line.taxAmount) } : {}),
      ...(withoutLegacyMetadata.settlement || metadata
        ? { settlement: withoutLegacyMetadata.settlement || metadata }
        : {}),
    } as ItemSaleLine;
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

