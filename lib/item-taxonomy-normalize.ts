// lib/item-taxonomy-normalize.ts
// Normalize legacy item type / subtype strings to canonical enum storage values.

import { ItemType } from '@/types/enums';
import type { SubItemType } from '@/types/type-aliases';
import { getSubTypesForItemType } from '@/lib/utils/item-utils';
import { LEGACY_ITEM_TYPE_TO_CANONICAL, LEGACY_SUBTYPE_BY_ITEM_TYPE } from '@/lib/item-taxonomy-legacy';
import type { Item, Task, FinancialRecord, ServiceLine, Sale, SaleLine } from '@/types/entities';

const ITEM_TYPE_VALUES = new Set<string>(Object.values(ItemType));

export function normalizeItemTypeString(raw: string | undefined | null): ItemType | undefined {
  if (raw == null) return undefined;
  const s = String(raw).trim();
  if (s === '') return undefined;
  if (ITEM_TYPE_VALUES.has(s)) return s as ItemType;
  const fromLegacy = LEGACY_ITEM_TYPE_TO_CANONICAL[s];
  if (fromLegacy !== undefined) return fromLegacy;
  const lower = s.toLowerCase();
  if (ITEM_TYPE_VALUES.has(lower)) return lower as ItemType;
  return undefined;
}

export function normalizeSubItemTypeForItemType(
  itemType: ItemType | undefined,
  raw: string | undefined | null
): string | undefined {
  if (raw == null || itemType === undefined) return undefined;
  const s = String(raw).trim();
  if (s === '') return undefined;
  const allowed = getSubTypesForItemType(itemType);
  if (allowed.includes(s as SubItemType)) return s;
  const legacyMap = LEGACY_SUBTYPE_BY_ITEM_TYPE[itemType];
  const mapped = legacyMap?.[s];
  if (mapped && allowed.includes(mapped as SubItemType)) return mapped;
  return s;
}

export function normalizeItemTaxonomyFields<T extends Pick<Item, 'type' | 'subItemType'>>(entity: T): T {
  const nextType = normalizeItemTypeString(entity.type as string) ?? entity.type;
  const typed = nextType as ItemType;
  const rawSub = entity.subItemType != null ? String(entity.subItemType).trim() : '';
  const nextSub =
    rawSub !== '' ? normalizeSubItemTypeForItemType(typed, rawSub) : undefined;
  return {
    ...entity,
    type: nextType as T['type'],
    subItemType: (nextSub ?? entity.subItemType) as T['subItemType'],
  };
}

export function normalizeTaskOutputTaxonomy<T extends Pick<Task, 'outputItemType' | 'outputItemSubType'>>(task: T): T {
  const rawType = task.outputItemType;
  if (rawType == null || String(rawType).trim() === '') return task;

  const trimmed = String(rawType).trim();
  const resolvedType =
    normalizeItemTypeString(trimmed) ?? (ITEM_TYPE_VALUES.has(trimmed) ? (trimmed as ItemType) : undefined);
  const outputItemType = (resolvedType ?? trimmed) as T['outputItemType'];

  let outputItemSubType = task.outputItemSubType;
  if (resolvedType && task.outputItemSubType != null && String(task.outputItemSubType).trim() !== '') {
    const ns = normalizeSubItemTypeForItemType(resolvedType, String(task.outputItemSubType));
    outputItemSubType = (ns ?? task.outputItemSubType) as T['outputItemSubType'];
  }

  return { ...task, outputItemType, outputItemSubType };
}

export function normalizeFinancialOutputTaxonomy<
  T extends Pick<FinancialRecord, 'outputItemType' | 'outputItemSubType'>
>(record: T): T {
  const rawType = record.outputItemType;
  if (rawType == null || String(rawType).trim() === '') return record;

  const trimmed = String(rawType).trim();
  const resolvedType =
    normalizeItemTypeString(trimmed) ?? (ITEM_TYPE_VALUES.has(trimmed) ? (trimmed as ItemType) : undefined);
  const outputItemType = (resolvedType ?? trimmed) as T['outputItemType'];

  let outputItemSubType = record.outputItemSubType;
  if (resolvedType && record.outputItemSubType != null && String(record.outputItemSubType).trim() !== '') {
    const ns = normalizeSubItemTypeForItemType(resolvedType, String(record.outputItemSubType));
    outputItemSubType = (ns ?? record.outputItemSubType) as T['outputItemSubType'];
  }

  return { ...record, outputItemType, outputItemSubType };
}

export function normalizeServiceLineOutputTaxonomy(line: ServiceLine): ServiceLine {
  const t = line.outputItemType;
  if (t === undefined) return line;
  const nextType = normalizeItemTypeString(String(t)) ?? (t as ItemType);
  const itemType = nextType as ItemType;
  const rawOutSub =
    line.outputItemSubType != null ? String(line.outputItemSubType).trim() : '';
  const nextSub =
    rawOutSub !== ''
      ? normalizeSubItemTypeForItemType(itemType, rawOutSub)
      : line.outputItemSubType;
  return {
    ...line,
    outputItemType: nextType as ServiceLine['outputItemType'],
    outputItemSubType: nextSub as ServiceLine['outputItemSubType'],
  };
}

export function normalizeSaleOutputTaxonomy(sale: Sale): Sale {
  if (!sale.lines?.length) return sale;
  const lines: SaleLine[] = sale.lines.map((line) => {
    if (line.kind === 'service') return normalizeServiceLineOutputTaxonomy(line);
    return line;
  });
  return { ...sale, lines };
}
