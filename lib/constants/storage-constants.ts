// lib/constants/storage-constants.ts
// KV-only system for Vercel production

// Organization namespace for KV keys. Prefer env override when available.
export const ORG_ID: string =
  (typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_ORG_ID || process.env.ORG_ID)) ||
  'akiles';

// Character identifier scaffold (future multi-user). Optional; unused if single-user.
export const PLAYER_ID: string =
  (typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_PLAYER_ID || process.env.PLAYER_ID)) ||
  'akiles';

// Build a namespaced KV key, e.g. "akiles::tasks" or "akiles::tasks::<id>"
export function buildKvKey(namespace: string, id?: string): string {
  const base = `${ORG_ID}::${namespace}`;
  return id ? `${base}::${id}` : base;
}

// Common namespaces for core entities
export const KV_ENTITY_NAMESPACES = {
  TASKS: 'tasks',
  ITEMS: 'items',
  ASSETS: 'assets',
  SETTINGS: 'settings',
} as const;


