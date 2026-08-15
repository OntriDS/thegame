// data-store/kv.ts
// KV client wrapper for Upstash Redis (production-only environment)
import 'server-only';

import { Redis } from '@upstash/redis';

type KVClient = {
  get: <T>(key: string) => Promise<T | null>;
  set: (key: string, value: unknown) => Promise<void>;
  del: (key: string, ...keys: string[]) => Promise<void>;
  mget: (keys: string[]) => Promise<(unknown | null)[]>;
  mset: (keyValues: Record<string, unknown>) => Promise<void>;
  scan: (cursor: number, options?: { match?: string; count?: number }) => Promise<[string, string[]]>;
  sadd: (key: string, ...members: string[]) => Promise<void>;
  srem: (key: string, ...members: string[]) => Promise<void>;
  smembers: (key: string) => Promise<string[]>;
  lpush: (key: string, ...values: string[]) => Promise<void>;
  lrange: (key: string, start: number, stop: number) => Promise<string[]>;
  lset: (key: string, index: number, value: string) => Promise<void>;
  keys: (pattern: string) => Promise<string[]>;
  sunion: (...keys: string[]) => Promise<string[]>;
  hincrbyfloat: (key: string, field: string, increment: number) => Promise<number>;
  hgetall: <T>(key: string) => Promise<T | null>;
  pipeline: () => {
    hincrbyfloat: (key: string, field: string, increment: number) => any;
    exec: () => Promise<any[]>;
    [key: string]: any;
  };
  multi: () => {
    del: (key: string, ...keys: string[]) => void;
    set: (key: string, value: unknown) => void;
    sadd: (key: string, ...members: string[]) => void;
    exec: () => Promise<void>;
  };
};

export const kv: KVClient = Redis.fromEnv() as unknown as KVClient;

// Entity records are staged under this temporary V1 key family during the
// cutover. Keep non-entity data keys (logs, settings, summaries, etc.) on the
// normal path.
const ENTITY_DATA_KEY = /^thegame:data:(account|player|character|site|business|contract|task|financial|sale|item):(.+)$/;

function v1EntityKey(key: string): string | null {
  return ENTITY_DATA_KEY.test(key) ? key.replace('thegame:data:', 'thegame:v1:data:') : null;
}

export async function kvGet<T>(key: string): Promise<T | null> {
  const v1Key = v1EntityKey(key);
  if (v1Key) {
    const staged = await kv.get<T>(v1Key);
    if (staged !== null && staged !== undefined) return staged;
  }
  return (await kv.get<T>(key)) ?? null;
}

export async function kvSet<T>(key: string, value: T): Promise<void> {
  const v1Key = v1EntityKey(key);
  if (!v1Key) {
    await kv.set(key, value as any);
    return;
  }
  const isV1 = !!value && typeof value === 'object' && (value as any).schemaVersion === 1;
  if (isV1) {
    await Promise.all([kv.set(key, value as any), kv.set(v1Key, value as any)]);
  } else {
    // A legacy-shaped write must not leave an older staged V1 value ahead of it.
    await kv.set(key, value as any);
    await kv.del(v1Key);
  }
}

export async function kvDel(key: string): Promise<void> {
  const v1Key = v1EntityKey(key);
  if (v1Key) await kv.del(key, v1Key);
  else await kv.del(key);
}

export async function kvMGet<T>(keys: string[]): Promise<(T | null)[]> {
  if (keys.length === 0) return [];
  const stagedKeys = keys.map(v1EntityKey);
  const stagedValues = await kv.mget(stagedKeys.map((key, index) => key || keys[index]));
  const legacyIndexes = stagedKeys.map((key, index) => key ? index : -1).filter((index) => index >= 0 && (stagedValues[index] === null || stagedValues[index] === undefined));
  const legacyValues = legacyIndexes.length ? await kv.mget(legacyIndexes.map((index) => keys[index])) : [];
  for (let index = 0; index < legacyIndexes.length; index++) stagedValues[legacyIndexes[index]] = legacyValues[index];
  return (stagedValues as any[]).map(v => (v ?? null));
}

/**
 * Bulk SET operation - sets multiple key-value pairs in a single operation
 * More efficient than multiple kvSet() calls for bulk operations
 * 
 * @param keyValues - Object with key-value pairs to set
 * 
 * @example
 * await kvMSet({
 *   'data:item:1': item1,
 *   'data:item:2': item2,
 *   'data:item:3': item3
 * });
 */
export async function kvMSet<T>(keyValues: Record<string, T>): Promise<void> {
  if (Object.keys(keyValues).some((key) => v1EntityKey(key))) {
    await Promise.all(Object.entries(keyValues).map(([key, value]) => kvSet(key, value)));
    return;
  }
  await kv.mset(keyValues as Record<string, unknown>);
}

export async function kvScan(prefix: string, limit = 100): Promise<string[]> {
  const keys: string[] = [];
  let cursor = 0;

  do {
    const [newCursor, foundKeys] = await kv.scan(cursor, {
      match: `${prefix}*`,
      count: limit
    });

    keys.push(...foundKeys);
    cursor = parseInt(newCursor);
  } while (cursor !== 0);

  return keys;
}

export async function kvSAdd(key: string, ...members: string[]): Promise<void> {
  if (members.length) await kv.sadd(key, ...(members as [string, ...string[]]));
}

export async function kvSRem(key: string, ...members: string[]): Promise<void> {
  if (members.length) await kv.srem(key, ...(members as [string, ...string[]]));
}

export async function kvSMembers(key: string): Promise<string[]> {
  const members = await kv.smembers(key);
  return members ?? [];
}

/**
 * SUNION operation - returns the union of multiple sets
 * Efficiently deduplicates IDs across multiple indices at the DB layer
 */
export async function kvSUnion(...keys: string[]): Promise<string[]> {
  if (keys.length === 0) return [];
  if (keys.length === 1) return await kvSMembers(keys[0]);
  return await kv.sunion(...keys);
}

export async function kvDelMany(keys: string[]): Promise<void> {
  if (keys.length === 0) return;

  // Use the del method with multiple keys (Redis DEL command supports multiple keys)
  await kv.del(keys[0], ...keys.slice(1));
}

// Redis List operations — O(1) append, range-based reads
export async function kvLPush(key: string, ...values: string[]): Promise<void> {
  if (values.length) await kv.lpush(key, ...(values as [string, ...string[]]));
}

export async function kvLRange(key: string, start: number, stop: number) : Promise<string[]> {
  return (await kv.lrange(key, start, stop)) ?? [];
}

export async function kvLSet(key: string, index: number, value: string): Promise<void> {
  await kv.lset(key, index, value);
}


