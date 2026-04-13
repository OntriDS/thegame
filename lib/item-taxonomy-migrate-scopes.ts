// lib/item-taxonomy-migrate-scopes.ts
// Scoped item taxonomy migration (Settings dry-run / apply).

import { ItemType } from '@/types/enums';
import type { SubItemType } from '@/types/type-aliases';
import type { Item, Task, FinancialRecord, Sale, SaleLine } from '@/types/entities';
import {
  normalizeItemTaxonomyFields,
  normalizeItemTypeString,
  normalizeSubItemTypeForItemType,
  normalizeTaskOutputTaxonomy,
  normalizeFinancialOutputTaxonomy,
  normalizeServiceLineOutputTaxonomy,
} from '@/lib/item-taxonomy-normalize';

export const ITEM_TAXONOMY_SCOPES = [
  'all',
  'item-type',
  'digital',
  'artwork',
  'print',
  'sticker',
  'merch',
  'craft',
  'bundle',
  'material',
  'equipment',
] as const;

export type ItemTaxonomyMigrationScope = (typeof ITEM_TAXONOMY_SCOPES)[number];

const FAMILY_TO_ITEMTYPE: Record<string, ItemType> = {
  digital: ItemType.DIGITAL,
  artwork: ItemType.ARTWORK,
  print: ItemType.PRINT,
  sticker: ItemType.STICKER,
  merch: ItemType.MERCH,
  craft: ItemType.CRAFT,
  bundle: ItemType.BUNDLE,
  material: ItemType.MATERIAL,
  equipment: ItemType.EQUIPMENT,
};

export function parseTaxonomyScopes(raw: unknown): Set<string> {
  const list = Array.isArray(raw) && raw.length > 0 ? raw : ['all'];
  const set = new Set<string>(list.map((s) => String(s)));
  if (set.has('all')) return new Set(['all']);
  return set;
}

export function migrateItemByScopes(item: Item, scopes: Set<string>): Item {
  if (scopes.has('all')) return normalizeItemTaxonomyFields(item);

  let out = { ...item };
  if (scopes.has('item-type')) {
    const nt = normalizeItemTypeString(String(out.type));
    if (nt) out = { ...out, type: nt };
  }

  const resolvedType =
    (normalizeItemTypeString(String(out.type)) ?? out.type) as ItemType;

  for (const [fam, it] of Object.entries(FAMILY_TO_ITEMTYPE)) {
    if (!scopes.has(fam) || resolvedType !== it) continue;
    const raw = out.subItemType;
    if (raw == null || String(raw).trim() === '') continue;
    const ns = normalizeSubItemTypeForItemType(it, String(raw));
    if (ns !== undefined) out = { ...out, subItemType: ns as SubItemType };
  }

  return out;
}

export function migrateTaskByScopes(task: Task, scopes: Set<string>): Task {
  if (scopes.has('all')) return normalizeTaskOutputTaxonomy(task);

  let out = { ...task };
  if (scopes.has('item-type') && out.outputItemType != null && String(out.outputItemType).trim() !== '') {
    const nt = normalizeItemTypeString(String(out.outputItemType));
    if (nt) out = { ...out, outputItemType: nt };
  }

  const resolved =
    normalizeItemTypeString(String(out.outputItemType ?? '')) ??
    (out.outputItemType as ItemType | undefined);
  if (!resolved || out.outputItemSubType == null || String(out.outputItemSubType).trim() === '') {
    return out;
  }

  for (const [fam, it] of Object.entries(FAMILY_TO_ITEMTYPE)) {
    if (!scopes.has(fam) || resolved !== it) continue;
    const ns = normalizeSubItemTypeForItemType(it, String(out.outputItemSubType));
    if (ns !== undefined) out = { ...out, outputItemSubType: ns as SubItemType };
  }

  return out;
}

export function migrateFinancialByScopes(record: FinancialRecord, scopes: Set<string>): FinancialRecord {
  if (scopes.has('all')) {
    return normalizeFinancialOutputTaxonomy(record);
  }

  let out = { ...record };
  if (scopes.has('item-type') && out.outputItemType != null && String(out.outputItemType).trim() !== '') {
    const nt = normalizeItemTypeString(String(out.outputItemType));
    if (nt) out = { ...out, outputItemType: nt };
  }

  const resolved =
    normalizeItemTypeString(String(out.outputItemType ?? '')) ??
    (out.outputItemType as ItemType | undefined);
  if (!resolved || out.outputItemSubType == null || String(out.outputItemSubType).trim() === '') {
    return out;
  }

  for (const [fam, it] of Object.entries(FAMILY_TO_ITEMTYPE)) {
    if (!scopes.has(fam) || resolved !== it) continue;
    const ns = normalizeSubItemTypeForItemType(it, String(out.outputItemSubType));
    if (ns !== undefined) out = { ...out, outputItemSubType: ns as SubItemType };
  }

  return out;
}

export function migrateSaleByScopes(sale: Sale, scopes: Set<string>): Sale {
  if (scopes.has('all')) {
    const lines = sale.lines?.map((line) => {
      if (line.kind === 'service') return normalizeServiceLineOutputTaxonomy(line);
      return line;
    });
    return { ...sale, lines: lines ?? sale.lines };
  }

  const lines: SaleLine[] | undefined = sale.lines?.map((line) => {
    if (line.kind !== 'service') return line;
    let sl = { ...line };
    if (scopes.has('item-type') && sl.outputItemType !== undefined) {
      const nt = normalizeItemTypeString(String(sl.outputItemType));
      if (nt) sl = { ...sl, outputItemType: nt };
    }
    const resolved =
      normalizeItemTypeString(String(sl.outputItemType ?? '')) ??
      (sl.outputItemType as ItemType | undefined);
    if (!resolved || sl.outputItemSubType == null || String(sl.outputItemSubType).trim() === '') {
      return sl;
    }
    for (const [fam, it] of Object.entries(FAMILY_TO_ITEMTYPE)) {
      if (!scopes.has(fam) || resolved !== it) continue;
      const ns = normalizeSubItemTypeForItemType(it, String(sl.outputItemSubType));
      if (ns !== undefined) sl = { ...sl, outputItemSubType: ns as SubItemType };
    }
    return sl;
  });

  return { ...sale, lines: lines ?? sale.lines };
}
