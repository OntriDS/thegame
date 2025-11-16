// data-store/keys.ts
// Centralized KV key builders. Keep shapes consistent across repositories.
// Production-only system - no environment namespacing needed

import { EntityType } from '@/types/enums';

const MMYY_REGEX = /^(0[1-9]|1[0-2])-\d{2}$/;

function normalizeMonthKey(mmyy: string): string {
  const value = mmyy.trim();
  if (!MMYY_REGEX.test(value)) {
    throw new Error(`Invalid month format "${mmyy}". Expected "MM-YY".`);
  }
  return value;
}

export function buildDataKey(entity: string, id: string): string {
  return `data:${entity}:${id}`;
}

export function buildIndexKey(entity: string): string {
  return `index:${entity}`; // set of ids
}

export function buildArchiveDataKey(entity: string, mmyy: string, id: string): string {
  const monthKey = normalizeMonthKey(mmyy);
  return `archive:${entity}:${monthKey}:${id}`;
}

export function buildArchiveIndexKey(entity: string, mmyy: string): string {
  const monthKey = normalizeMonthKey(mmyy);
  return `archive:index:${monthKey}:${entity}`;
}

export function buildArchiveMonthsKey(): string {
  return 'archive:months';
}

export function buildMonthIndexKey(entity: string, mmyy: string): string {
  const monthKey = normalizeMonthKey(mmyy);
  return `index:${entity}:by-month:${monthKey}`;
}

export function buildLinksIndexKey(entityType: string, id: string): string {
  return `index:links:by-entity:${entityType}:${id}`; // set of link ids
}

export function buildLinkKey(id: string): string {
  return `links:link:${id}`;
}

export function buildEffectKey(effectKey: string): string {
  return `effects:${effectKey}`;
}

// Unified effect key builders
export const EffectKeys = {
  created(entity: string, id: string): string {
    return `${entity}:${id}:created`;
  },
  status(entity: string, id: string, from: string, to: string, bucket?: string): string {
    const base = `${entity}:${id}:status:${from}->${to}`;
    return bucket ? `${base}:${bucket}` : base;
  },
  sideEffect(entity: string, id: string, kind: string): string {
    return `${entity}:${id}:${kind}`; // e.g. task:123:itemCreated
  },
  monthly(entity: string, id: string, kind: string, yyyymm: string): string {
    return `${entity}:${id}:${kind}:${yyyymm}`; // e.g. task:123:pointsLogged:2025-10
  }
};

export function buildLogKey(entity: EntityType | string, yyyymm?: string): string {
  if (yyyymm) {
    const monthKey = normalizeMonthKey(yyyymm);
    return `logs:${entity}:${monthKey}`;
  }
  return `logs:${entity}`;
}

export function buildLogActiveKey(entity: EntityType | string): string {
  return buildLogKey(entity);
}

export function buildLogMonthKey(entity: EntityType | string, mmyy: string): string {
  return buildLogKey(entity, mmyy);
}

export function buildLogMonthsIndexKey(entity: EntityType | string): string {
  return `logs:index:months:${entity}`;
}


