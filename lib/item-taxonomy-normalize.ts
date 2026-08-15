// lib/item-taxonomy-normalize.ts
// Coerce item type / subtype strings to canonical enum values on write (exact or case-insensitive match).

import { ItemType } from '@/types/enums';
import type { SubItemType } from '@/types/type-aliases';
import { getSubTypesForItemType } from '@/lib/utils/item-utils';
import type {
  FinancialRecord,
  Item,
  Sale,
  SaleLine,
  ServiceLine,
  Task,
  ProductionPlanFacetV1
} from '@/types/entities';

const ITEM_TYPE_VALUES = new Set<string>(Object.values(ItemType));

export function normalizeItemTypeString(raw: string | undefined | null): ItemType | undefined {
  if (raw == null) return undefined;
  const s = String(raw).trim();
  if (s === '') return undefined;
  if (ITEM_TYPE_VALUES.has(s)) return s as ItemType;
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
  const lower = s.toLowerCase();
  const hit = allowed.find((a) => String(a).toLowerCase() === lower);
  if (hit) return hit;
  return s;
}

export function normalizeItemTaxonomyFields(entity: Item): Item {
  const nextType = normalizeItemTypeString(entity.type as string) ?? entity.type;
  const typed = nextType as ItemType;
  const rawSub = entity.context?.subItemType != null ? String(entity.context.subItemType).trim() : '';
  const nextSub =
    rawSub !== '' ? normalizeSubItemTypeForItemType(typed, rawSub) : undefined;
  return {
    ...entity,
    type: nextType as ItemType,
    context: {
      ...entity.context,
      subItemType: (nextSub ?? entity.context?.subItemType) as SubItemType,
    }
  };
}

export function normalizeTaskOutputTaxonomy(task: Task): Task {
  const plan = task.context?.productionPlan;
  if (!plan) return task;

  const rawType = plan.outputItemType;
  if (rawType == null || String(rawType).trim() === '') return task;

  const trimmed = String(rawType).trim();
  const resolvedType =
    normalizeItemTypeString(trimmed) ?? (ITEM_TYPE_VALUES.has(trimmed) ? (trimmed as ItemType) : undefined);
  const outputItemType = (resolvedType ?? trimmed) as ProductionPlanFacetV1['outputItemType'];

  let outputItemSubType = plan.outputItemSubType;
  if (resolvedType && plan.outputItemSubType != null && String(plan.outputItemSubType).trim() !== '') {
    const ns = normalizeSubItemTypeForItemType(resolvedType, String(plan.outputItemSubType));
    outputItemSubType = (ns ?? plan.outputItemSubType) as ProductionPlanFacetV1['outputItemSubType'];
  }

  return {
    ...task,
    context: {
      ...task.context,
      productionPlan: {
        ...plan,
        outputItemType,
        outputItemSubType,
      },
    },
  };
}

export function normalizeFinancialOutputTaxonomy(record: FinancialRecord): FinancialRecord {
  const plan = record.context?.productionPlan;
  if (!plan) return record;

  const rawType = plan.outputItemType;
  if (rawType == null || String(rawType).trim() === '') return record;

  const trimmed = String(rawType).trim();
  const resolvedType =
    normalizeItemTypeString(trimmed) ?? (ITEM_TYPE_VALUES.has(trimmed) ? (trimmed as ItemType) : undefined);
  const outputItemType = (resolvedType ?? trimmed) as ProductionPlanFacetV1['outputItemType'];

  let outputItemSubType = plan.outputItemSubType;
  if (resolvedType && plan.outputItemSubType != null && String(plan.outputItemSubType).trim() !== '') {
    const ns = normalizeSubItemTypeForItemType(resolvedType, String(plan.outputItemSubType));
    outputItemSubType = (ns ?? plan.outputItemSubType) as ProductionPlanFacetV1['outputItemSubType'];
  }

  return {
    ...record,
    context: {
      ...record.context,
      productionPlan: {
        ...plan,
        outputItemType,
        outputItemSubType,
      },
    },
  };
}

export function normalizeServiceLineOutputTaxonomy(line: ServiceLine): ServiceLine {
  const plan = line.context?.productionPlan;
  if (!plan) return line;

  const t = plan.outputItemType;
  if (t === undefined) return line;

  const nextType = normalizeItemTypeString(String(t)) ?? (t as ItemType);
  const itemType = nextType as ItemType;
  const rawOutSub =
    plan.outputItemSubType != null ? String(plan.outputItemSubType).trim() : '';
  const nextSub =
    rawOutSub !== ''
      ? normalizeSubItemTypeForItemType(itemType, rawOutSub)
      : plan.outputItemSubType;

  return {
    ...line,
    context: {
      ...line.context,
      kind: 'service-line-context',
      schemaVersion: 1,
      productionPlan: {
        ...plan,
        outputItemType: nextType as ProductionPlanFacetV1['outputItemType'],
        outputItemSubType: nextSub as ProductionPlanFacetV1['outputItemSubType'],
      },
    },
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
