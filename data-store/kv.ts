// data-store/kv.ts
// KV client wrapper for Upstash Redis (production-only environment)

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
  keys: (pattern: string) => Promise<string[]>;
  multi: () => {
    del: (key: string, ...keys: string[]) => void;
    set: (key: string, value: unknown) => void;
    sadd: (key: string, ...members: string[]) => void;
    exec: () => Promise<void>;
  };
};

const hasUpstash = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

if (!hasUpstash) {
  throw new Error('CRITICAL: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set. This is a KV-only production environment.');
}

export const kv: KVClient = Redis.fromEnv() as unknown as KVClient;

export async function kvGet<T>(key: string): Promise<T | null> {
  return (await kv.get<T>(key)) ?? null;
}

export async function kvSet<T>(key: string, value: T): Promise<void> {
  await kv.set(key, value as any);
}

export async function kvDel(key: string): Promise<void> {
  await kv.del(key);
}

export async function kvMGet<T>(keys: string[]): Promise<(T | null)[]> {
  const res = await kv.mget(keys);
  return (res as any[]).map(v => (v ?? null));
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

export async function kvDelMany(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  
  // Use the del method with multiple keys (Redis DEL command supports multiple keys)
  await kv.del(keys[0], ...keys.slice(1));
}


