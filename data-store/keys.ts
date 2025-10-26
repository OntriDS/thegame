// data-store/keys.ts
// Centralized KV key builders. Keep shapes consistent across repositories.
// Production-only system - no environment namespacing needed

import { EntityType } from '@/types/enums';

export function buildDataKey(entity: string, id: string): string {
  return `data:${entity}:${id}`;
}

export function buildIndexKey(entity: string): string {
  return `index:${entity}`; // set of ids
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
  return yyyymm
    ? `logs:${entity}:${yyyymm}`
    : `logs:${entity}`;
}


