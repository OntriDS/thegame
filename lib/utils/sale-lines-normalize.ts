// Legacy: kind 'bundle' + itemId → kind 'item'. ItemType.BUNDLE stays on Item only.

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

export function normalizeSale<T extends Pick<Sale, 'lines'>>(sale: T): T {
  if (!sale?.lines?.length) return sale;
  return { ...sale, lines: normalizeSaleLines(sale.lines as SaleLine[]) } as T;
}
