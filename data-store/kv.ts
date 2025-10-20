// data-store/kv.ts
// Thin server-only wrappers around @vercel/kv. No HTTP calls to own routes.

import { kv } from '@vercel/kv';

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


