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

/**
 * Canonical write boundary for FinancialRecords.
 *
 * Older workflow code still constructs plain numeric financial fields and
 * root-level emissary fields. New records must persist Money/context/lifecycle
 * only, so the adapter translates those inputs once before repository write.
 */
export function normalizeFinancialRecordFields(record: FinancialRecord): FinancialRecord {
  const raw = record as any;
  const toMoneyValue = (value: unknown): { minorUnits: string; currency: string } => {
    if (value && typeof value === 'object' && typeof (value as any).minorUnits === 'string') return value as any;
    return { minorUnits: String(Math.round(Number(value || 0) * 100)), currency: 'USD' };
  };

  const cost = toMoneyValue(raw.cost);
  const revenue = toMoneyValue(raw.revenue);
  const numericCost = Number(cost.minorUnits) / 100;
  const numericRevenue = Number(revenue.minorUnits) / 100;

  const legacyPlanValues = [
    raw.outputItemType,
    raw.outputItemSubType,
    raw.outputQuantity,
    raw.outputItemName,
    raw.outputItemPrice,
    raw.outputUnitCost,
    raw.isNewItem,
    raw.isSold,
  ];
  const existingPlan = raw.context?.productionPlan;
  const hasLegacyPlan = legacyPlanValues.some((value) => value !== undefined && value !== null);
  const productionPlan = existingPlan || hasLegacyPlan
    ? {
        ...existingPlan,
        outputItemType: existingPlan?.outputItemType ?? raw.outputItemType,
        outputItemSubType: existingPlan?.outputItemSubType ?? raw.outputItemSubType,
        outputQuantity: existingPlan?.outputQuantity ?? raw.outputQuantity,
        outputItemName: existingPlan?.outputItemName ?? raw.outputItemName,
        outputItemPrice: existingPlan?.outputItemPrice ?? (raw.outputItemPrice != null ? toMoneyValue(raw.outputItemPrice) : undefined),
        outputUnitCost: existingPlan?.outputUnitCost ?? (raw.outputUnitCost != null ? toMoneyValue(raw.outputUnitCost) : undefined),
        isNewItem: existingPlan?.isNewItem ?? raw.isNewItem,
        isSold: existingPlan?.isSold ?? raw.isSold,
      }
    : undefined;

  const {
    customerCharacterRole,
    newCustomerName,
    jungleCoins,
    outputItemType,
    outputItemSubType,
    outputQuantity,
    outputUnitCost,
    outputItemName,
    outputItemPrice,
    outputItemCollection,
    outputItemStatus,
    isNewItem,
    isSold,
    isNotPaid,
    isNotCharged,
    rewards,
    doneAt,
    collectedAt,
    netCashflow,
    jungleCoinsValue,
    outputItemId,
    links,
    description,
    siteId,
    targetSiteId,
    characterId,
    playerCharacterId,
    sourceTaskId,
    sourceSaleId,
    salesChannel,
    ...canonicalBase
  } = raw;

  const paymentObservation = raw.context?.paymentObservation ??
    (isNotPaid || isNotCharged
      ? {
          paid: !Boolean(isNotPaid),
          charged: !Boolean(isNotCharged),
        }
      : undefined);
  const counterpartyId = raw.context?.counterparty?.counterpartyId ?? raw.characterId ?? null;
  const counterpartyRole = raw.context?.counterparty?.role ?? customerCharacterRole;
  const counterparty = counterpartyId || newCustomerName
    ? {
        ...(raw.context?.counterparty || {}),
        counterpartyId,
        role: counterpartyRole,
      }
    : undefined;
  const normalizedContext = { ...(raw.context || {}) } as Record<string, unknown>;
  if (normalizedContext.jungleCoins === 0) delete normalizedContext.jungleCoins;
  if (!normalizedContext.newCustomerName) delete normalizedContext.newCustomerName;
  if (!productionPlan) delete normalizedContext.productionPlan;
  if (!paymentObservation ||
      (raw.status === 'done' && paymentObservation.paid && paymentObservation.charged)) {
    delete normalizedContext.paymentObservation;
  }
  delete normalizedContext.counterparty;

  return {
    ...canonicalBase,
    schemaVersion: raw.schemaVersion ?? 1,
    version: raw.version ?? 0,
    cost,
    revenue,
    netCashflow: toMoneyValue(raw.netCashflow ?? numericRevenue - numericCost),
    status: raw.status ?? (isNotPaid ? 'pending' : 'done'),
    ...(description ? { description } : {}),
    ...(siteId != null ? { siteId } : {}),
    ...(targetSiteId != null ? { targetSiteId } : {}),
    ...(characterId != null ? { characterId } : {}),
    ...(playerCharacterId != null ? { playerCharacterId } : {}),
    ...(sourceTaskId != null ? { sourceTaskId } : {}),
    ...(sourceSaleId != null ? { sourceSaleId } : {}),
    ...(salesChannel != null ? { salesChannel } : {}),
    ...(
      raw.lifecycle?.doneAt || raw.lifecycle?.collectedAt || doneAt || collectedAt
        ? {
            lifecycle: {
              ...(raw.lifecycle || {}),
              ...(raw.lifecycle?.doneAt ?? doneAt ? { doneAt: raw.lifecycle?.doneAt ?? doneAt } : {}),
              ...(raw.lifecycle?.collectedAt ?? collectedAt ? { collectedAt: raw.lifecycle?.collectedAt ?? collectedAt } : {}),
            },
          }
        : {}
    ),
    context: {
      ...normalizedContext,
      kind: 'financial-record-context',
      schemaVersion: 1,
      ...(counterparty ? { counterparty } : {}),
      ...((raw.context?.jungleCoins ?? jungleCoins) !== undefined &&
        (raw.context?.jungleCoins ?? jungleCoins) !== 0
        ? { jungleCoins: raw.context?.jungleCoins ?? jungleCoins }
        : {}),
      ...(paymentObservation &&
        (!paymentObservation.paid || !paymentObservation.charged || Boolean(isNotPaid) || Boolean(isNotCharged))
        ? { paymentObservation }
        : {}),
      ...((raw.context?.newCustomerName ?? newCustomerName)
        ? { newCustomerName: raw.context?.newCustomerName ?? newCustomerName }
        : {}),
      ...(productionPlan ? { productionPlan } : {}),
    },
  } as FinancialRecord;
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
