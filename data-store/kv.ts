// data-store/kv.ts
// Thin server-only wrappers around a KV client. Prefers @vercel/kv when env vars are present,
// falls back to an in-memory implementation for local development.

import { Redis } from '@upstash/redis';

type KVClient = {
  get: <T>(key: string) => Promise<T | null>;
  set: (key: string, value: unknown) => Promise<void>;
  del: (key: string, ...keys: string[]) => Promise<void>;
  mget: (keys: string[]) => Promise<(unknown | null)[]>;
  scanIterator: (options: { match: string; count?: number }) => AsyncIterable<string>;
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

function createLocalKV(): KVClient {
  const kvStore = new Map<string, unknown>();
  const setStore = new Map<string, Set<string>>();
  const listStore = new Map<string, string[]>();

  const api: KVClient = {
    async get<T>(key: string) {
      return (kvStore.has(key) ? (kvStore.get(key) as T) : null) as T | null;
    },
    async set(key: string, value: unknown) {
      kvStore.set(key, value);
    },
    async del(key: string, ...keys: string[]) {
      const allKeys = [key, ...keys];
      allKeys.forEach(k => {
        kvStore.delete(k);
        setStore.delete(k);
        listStore.delete(k);
      });
    },
    async mget(keys: string[]) {
      return keys.map((k) => (kvStore.has(k) ? kvStore.get(k)! : null));
    },
    async *scanIterator(options: { match: string; count?: number }) {
      const prefix = options.match.replace(/\*$/, '');
      for (const key of kvStore.keys()) {
        if (key.startsWith(prefix)) {
          yield key;
        }
      }
    },
    async sadd(key: string, ...members: string[]) {
      const set = setStore.get(key) ?? new Set<string>();
      members.forEach((m) => set.add(m));
      setStore.set(key, set);
    },
    async srem(key: string, ...members: string[]) {
      const set = setStore.get(key);
      if (!set) return;
      members.forEach((m) => set.delete(m));
      if (set.size === 0) setStore.delete(key);
    },
    async smembers(key: string) {
      const set = setStore.get(key);
      return set ? Array.from(set) : [];
    },
    async lpush(key: string, ...values: string[]) {
      const list = listStore.get(key) ?? [];
      list.unshift(...values); // Add to beginning (like Redis lpush)
      listStore.set(key, list);
    },
    async lrange(key: string, start: number, stop: number) {
      const list = listStore.get(key) ?? [];
      const end = stop === -1 ? list.length : stop + 1;
      return list.slice(start, end);
    },
    async keys(pattern: string) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      const allKeys = [
        ...kvStore.keys(),
        ...setStore.keys(),
        ...listStore.keys()
      ];
      return allKeys.filter(key => regex.test(key));
    },
    multi() {
      const operations: Array<() => void> = [];
      return {
        del: (key: string, ...keys: string[]) => {
          const allKeys = [key, ...keys];
          operations.push(() => {
            allKeys.forEach(k => {
              kvStore.delete(k);
              setStore.delete(k);
              listStore.delete(k);
            });
          });
        },
        set: (key: string, value: unknown) => {
          operations.push(() => {
            kvStore.set(key, value);
          });
        },
        sadd: (key: string, ...members: string[]) => {
          operations.push(() => {
            const set = setStore.get(key) ?? new Set<string>();
            members.forEach((m) => set.add(m));
            setStore.set(key, set);
          });
        },
        exec: async () => {
          operations.forEach(op => op());
        }
      };
    },
  };

  return api;
}

const hasUpstash = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

// 🔥 DEBUG MODE: Let's see what's actually happening!
// Only log on server-side (where env vars are available)
if (typeof window === 'undefined') {
  console.log('🔥 KV DEBUG - Environment Check:', {
    hasUpstash,
    url: process.env.UPSTASH_REDIS_REST_URL ? `SET (${process.env.UPSTASH_REDIS_REST_URL.substring(0, 20)}...)` : 'MISSING',
    token: process.env.UPSTASH_REDIS_REST_TOKEN ? `SET (${process.env.UPSTASH_REDIS_REST_TOKEN.substring(0, 10)}...)` : 'MISSING',
    allUpstashKeys: Object.keys(process.env).filter(k => k.includes('UPSTASH')),
    allRedisKeys: Object.keys(process.env).filter(k => k.includes('REDIS')),
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    timestamp: new Date().toISOString()
  });
}

export const kv: KVClient = hasUpstash
  ? (() => {
      if (typeof window === 'undefined') {
        console.log('🔥 KV DEBUG - Using Upstash Redis client');
      }
      return Redis.fromEnv() as unknown as KVClient;
    })()
  : (() => {
      if (typeof window === 'undefined') {
        console.warn(
          "🔥 KV DEBUG - Missing UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN. Using in-memory KV fallback (dev only)."
        );
      }
      return createLocalKV();
    })();

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

export async function kvScan(prefix: string, limit = 100): Promise<string[]> {
  const keys: string[] = [];
  const iter = kv.scanIterator({ match: `${prefix}*`, count: limit });
  for await (const key of iter) {
    keys.push(key as string);
  }
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


