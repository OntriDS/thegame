// lib/utils/kv.ts
// KV client wrapper for Upstash Redis (production-only environment)
import 'server-only';

import { Redis } from '@upstash/redis';

type KVClient = {
  get: <T>(key: string) => Promise<T | null>;
  set: (key: string, value: unknown, options?: { ex?: number }) => Promise<void>;
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
  eval: (script: string, keys: string[], args: any[]) => Promise<any>;
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

export async function kvGet<T>(key: string): Promise<T | null> {
  return (await kv.get<T>(key)) ?? null;
}

export async function kvSet<T>(key: string, value: T): Promise<void> {
  await kv.set(key, value as any);
}

export async function kvSetWithTTL<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  await kv.set(key, value as any, { ex: ttlSeconds });
}

export async function kvEval<T>(script: string, keys: string[], args: any[]): Promise<T> {
  return (await kv.eval(script, keys, args)) as T;
}

/**
 * Optimistic Locking CAS (Compare-And-Swap)
 * Updates a key only if its current "version" property matches expectedVersion.
 * Automatically increments the version property on success.
 * Assumes the stored data is a JSON object.
 * Returns true if successful, false if version mismatched or key doesn't exist.
 */
export async function kvCAS(key: string, expectedVersion: number, newData: any): Promise<boolean> {
  const casScript = `
    local currentStr = redis.call('GET', KEYS[1])
    if currentStr == false then
      if tonumber(ARGV[1]) == 0 then
        -- Creating new entity
        redis.call('SET', KEYS[1], ARGV[2])
        return 1
      else
        return 0 -- Key does not exist, but expectedVersion > 0
      end
    end

    local currentObj = cjson.decode(currentStr)
    local currentVer = currentObj.version or 0
    if tonumber(currentVer) == tonumber(ARGV[1]) then
      redis.call('SET', KEYS[1], ARGV[2])
      return 1
    else
      return 0
    end
  `;

  // We ensure the new data has the incremented version
  const dataToSave = {
    ...newData,
    version: expectedVersion + 1,
  };

  const result = await kvEval<number>(casScript, [key], [expectedVersion, JSON.stringify(dataToSave)]);
  return result === 1;
}

export async function kvDel(key: string): Promise<void> {
  await kv.del(key);
}

export async function kvMGet<T>(keys: string[]): Promise<(T | null)[]> {
  const res = await kv.mget(keys);
  return (res as any[]).map(v => (v ?? null));
}

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

export async function kvLPush(key: string, ...values: string[]): Promise<void> {
  if (values.length) await kv.lpush(key, ...(values as [string, ...string[]]));
}

export async function kvLRange(key: string, start: number, stop: number): Promise<string[]> {
  return (await kv.lrange(key, start, stop)) ?? [];
}

export async function kvLSet(key: string, index: number, value: string): Promise<void> {
  await kv.lset(key, index, value);
}

export async function kvDelMany(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await kv.del(keys[0], ...keys.slice(1));
}


