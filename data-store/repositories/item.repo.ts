// data-store/repositories/item.repo.ts
import { kvGet, kvSet, kvDel, kvSAdd, kvSRem, kvSMembers } from '../kv';
import { buildDataKey, buildIndexKey } from '../keys';
import type { Item } from '@/types/entities';

const ENTITY = 'items';

export async function getAllItems(): Promise<Item[]> {
  const indexKey = buildIndexKey(ENTITY);
  const ids = await kvSMembers(indexKey);
  if (ids.length === 0) return [];
  
  const items: Item[] = [];
  for (const id of ids) {
    const key = buildDataKey(ENTITY, id);
    const item = await kvGet<Item>(key);
    if (item) items.push(item);
  }
  
  return items;
}

export async function getItemById(id: string): Promise<Item | null> {
  const key = buildDataKey(ENTITY, id);
  return await kvGet<Item>(key);
}

export async function upsertItem(item: Item): Promise<Item> {
  const key = buildDataKey(ENTITY, item.id);
  const indexKey = buildIndexKey(ENTITY);
  
  await kvSet(key, item);
  await kvSAdd(indexKey, item.id);
  
  return item;
}

export async function deleteItem(id: string): Promise<void> {
  const key = buildDataKey(ENTITY, id);
  const indexKey = buildIndexKey(ENTITY);
  
  await kvDel(key);
  await kvSRem(indexKey, id);
}
