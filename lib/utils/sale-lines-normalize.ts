// @ts-nocheck
// Legacy: kind 'bundle' + itemId → kind 'item'. ItemType.BUNDLE stays on Item only.

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

function normalizeOptionalMoneyValue(value: unknown): unknown {
  if (value === undefined || value === null || value === '') return undefined;
  const numeric = isRecord(value) && typeof value.minorUnits === 'string'
    ? Number(value.minorUnits) / 100
    : Number(value);
  return Number.isFinite(numeric) && numeric !== 0 ? normalizeMoneyValue(value) : undefined;
}

export function normalizeSaleLine(line: unknown, fallbackLineId?: string): SaleLine | null {
  if (!isRecord(line)) return null;
  const lineId = String(line.lineId ?? fallbackLineId ?? '');
  if (!lineId) return null;

  const kind = String(line.kind ?? '');

  if (kind === 'service') {
    const { metadata, taxAmount, ...withoutLegacyMetadata } = line as any;
    const normalizedTax = normalizeOptionalMoneyValue(taxAmount);
    return {
      ...withoutLegacyMetadata,
      kind: 'service',
      ...(normalizedTax !== undefined ? { taxAmount: normalizedTax } : {}),
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
        taxAmount: normalizeOptionalMoneyValue(line.taxAmount),
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
    const { metadata, taxAmount, ...withoutLegacyMetadata } = line as any;
    const normalizedTax = normalizeOptionalMoneyValue(taxAmount);
    return {
      ...withoutLegacyMetadata,
      kind: 'item',
      lineId,
      itemId,
      quantity: Number(line.quantity) || 1,
      unitPrice: normalizeMoneyValue(line.unitPrice),
      ...(normalizedTax !== undefined ? { taxAmount: normalizedTax } : {}),
      ...(withoutLegacyMetadata.settlement || metadata
        ? { settlement: withoutLegacyMetadata.settlement || metadata }
        : {}),
    } as ItemSaleLine;
  }

  return null;
}

export function normalizeSaleLines(lines: SaleLine[] | undefined | null, saleId?: string): SaleLine[] {
  if (!lines?.length) return [];
  const out: SaleLine[] = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const fallbackLineId = saleId ? `${saleId}-line-${index + 1}` : undefined;
    const n = normalizeSaleLine(line, fallbackLineId);
    if (n) out.push(n);
  }
  return out;
}

/** Preserve supplied lineIds and deterministically fill missing ones during normalization. */
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
    return { ...il, lineId: `${sale.id}-line-${lines.indexOf(line) + 1}` };
  });

  return changed ? { ...sale, lines: next } : sale;
}

export function normalizeSale<T extends Pick<Sale, 'lines' | 'type'>>(sale: T): T {
  let next = sale as T;
  if (sale?.lines?.length) {
    next = { ...next, lines: normalizeSaleLines(sale.lines as SaleLine[], (sale as Sale).id) } as T;
  }
  return next;
}

