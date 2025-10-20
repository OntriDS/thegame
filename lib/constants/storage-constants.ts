// lib/constants/storage-constants.ts
// Storage mode selection and org namespacing for KV keys

export enum StorageMode {
  LOCAL = 'local',
  KV = 'kv',
  HYBRID = 'hybrid',
}

// Organization namespace for KV keys. Prefer env override when available.
export const ORG_ID: string =
  (typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_ORG_ID || process.env.ORG_ID)) ||
  'akiles';

// Character identifier scaffold (future multi-user). Optional; unused if single-user.
export const PLAYER_ID: string =
  (typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_PLAYER_ID || process.env.PLAYER_ID)) ||
  'akiles';

// Default storage mode: local in dev, hybrid in production (offline cache + KV source-of-truth)
export const DEFAULT_STORAGE_MODE: StorageMode = (() => {
  if (typeof process !== 'undefined') {
    const envMode = (process.env.NEXT_PUBLIC_STORAGE_MODE || '').toLowerCase();
    if (envMode === StorageMode.LOCAL) return StorageMode.LOCAL;
    if (envMode === StorageMode.KV) return StorageMode.KV;
    if (envMode === StorageMode.HYBRID) return StorageMode.HYBRID;
    // Fallback to sensible defaults
    return process.env.NODE_ENV === 'production' ? StorageMode.HYBRID : StorageMode.LOCAL;
  }
  return StorageMode.LOCAL;
})();

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


