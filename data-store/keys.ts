// data-store/keys.ts
// Centralized KV key builders. Keep shapes consistent across repositories.
// Production-only system - no environment namespacing needed

import { EntityType } from '@/types/enums';

const MMYY_REGEX = /^(0[1-9]|1[0-2])-\d{2}$/;
const NAMESPACE = 'thegame:';
const CHARACTER_INDEX_PREFIX = `${NAMESPACE}index:character`;

function normalizeMonthKey(mmyy: string): string {
  const value = mmyy.trim();
  if (!MMYY_REGEX.test(value)) {
    throw new Error(`Invalid month format "${mmyy}". Expected "MM-YY".`);
  }
  return value;
}

export function buildDataKey(entity: string, id: string): string {
  return `${NAMESPACE}data:${entity}:${id}`;
}

export function buildAccountKey(identifier: string): string {
  return `${NAMESPACE}account:${identifier}`;
}

export function buildIndexKey(entity: string): string {
  return `${NAMESPACE}index:${entity}`; // set of ids
}

export function buildEntityIndexKey(entity: string, field: string, value: string): string {
  return `${NAMESPACE}index:${entity}:${field}:${value}`;
}

export function buildCharacterEmailIndexKey(email: string): string {
  return `${CHARACTER_INDEX_PREFIX}:email:${email}`;
}

export function buildCharacterPhoneIndexKey(phone: string): string {
  return `${CHARACTER_INDEX_PREFIX}:phone:${phone}`;
}

export function buildArchiveDataKey(entity: string, mmyy: string, id: string): string {
  const monthKey = normalizeMonthKey(mmyy);
  return `${NAMESPACE}archive:${entity}:${monthKey}:${id}`;
}

export function buildArchiveIndexKey(entity: string, mmyy: string): string {
  const monthKey = normalizeMonthKey(mmyy);
  return `${NAMESPACE}archive:index:${monthKey}:${entity}`;
}

export function buildArchiveMonthsKey(): string {
  return `${NAMESPACE}archive:months`;
}

export function buildSummaryMonthsKey(): string {
  return `${NAMESPACE}summary:months`;
}

export function buildMonthIndexKey(entity: string, mmyy: string): string {
  const monthKey = normalizeMonthKey(mmyy);
  return `${NAMESPACE}index:${entity}:by-month:${monthKey}`;
}

export function buildTaskChildrenKey(parentId: string): string {
  return `${NAMESPACE}index:task:children:${parentId}`; // set of child task ids
}

/** Task ids eligible for mission/recurrent/automation trees (not collected). */
export function buildTaskActiveIndexKey(): string {
  return `${NAMESPACE}index:task:active`;
}

/** Active items (not sold, not legacy) */
export function buildItemActiveIndexKey(): string {
  return `${NAMESPACE}index:item:active`;
}

/** Historical portfolio legacy items */
export function buildItemLegacyIndexKey(): string {
  return `${NAMESPACE}index:item:legacy`;
}

export function buildLinksIndexKey(entityType: string, id: string): string {
  return `${NAMESPACE}index:links:by-entity:${entityType}:${id}`; // set of link ids
}

/** Set of all live link ids (maintained by createLink/removeLink; backfilled on first getAllLinks if empty). */
export function buildLinksGlobalIndexKey(): string {
  return `${NAMESPACE}index:links:all`;
}

export function buildLinkKey(id: string): string {
  return `${NAMESPACE}links:link:${id}`;
}

export function buildEffectKey(effectKey: string): string {
  return `${NAMESPACE}effects:${effectKey}`;
}

// Unified effect key builders
export const EffectKeys = {
  created(entity: string, id: string): string {
    return `${NAMESPACE}${entity}:${id}:created`;
  },
  status(entity: string, id: string, from: string, to: string, bucket?: string): string {
    const base = `${NAMESPACE}${entity}:${id}:status:${from}->${to}`;
    return bucket ? `${base}:${bucket}` : base;
  },
  sideEffect(entity: string, id: string, kind: string): string {
    return `${NAMESPACE}${entity}:${id}:${kind}`; // e.g. task:123:itemCreated
  },
  monthly(entity: string, id: string, kind: string, yyyymm: string): string {
    return `${NAMESPACE}${entity}:${id}:${kind}:${yyyymm}`; // e.g. task:123:pointsLogged:2025-10
  }
};

export function buildLogKey(entity: EntityType | string, yyyymm?: string): string {
  if (yyyymm) {
    const monthKey = normalizeMonthKey(yyyymm);
    return `${NAMESPACE}logs:${entity}:${monthKey}`;
  }
  return `${NAMESPACE}logs:${entity}`;
}

export function buildLogMonthKey(entity: EntityType | string, mmyy: string): string {
  return buildLogKey(entity, mmyy);
}

export function buildLogMonthsIndexKey(entity: EntityType | string): string {
  return `${NAMESPACE}logs:index:months:${entity}`;
}

