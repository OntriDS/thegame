// data-store/repositories/item.repo.ts
import { kvGet, kvSet, kvDel, kvSAdd, kvSRem, kvSMembers } from '../kv';
import { buildDataKey, buildIndexKey } from '../keys';
import { EntityType } from '@/types/enums';
import type { Item } from '@/types/entities';

const ENTITY = EntityType.ITEM;

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

/**
 * Get items by sourceTaskId using an index
 * OPTIMIZED: Only loads items created by this task, not all items
 */
export async function getItemsBySourceTaskId(sourceTaskId: string): Promise<Item[]> {
  const indexKey = `index:${ENTITY}:sourceTaskId:${sourceTaskId}`;
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

/**
 * Get items by sourceRecordId using an index
 * OPTIMIZED: Only loads items created by this record, not all items
 */
export async function getItemsBySourceRecordId(sourceRecordId: string): Promise<Item[]> {
  const indexKey = `index:${ENTITY}:sourceRecordId:${sourceRecordId}`;
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

export async function upsertItem(item: Item): Promise<Item> {
  const key = buildDataKey(ENTITY, item.id);
  const indexKey = buildIndexKey(ENTITY);
  
  await kvSet(key, item);
  await kvSAdd(indexKey, item.id);
  
  // Maintain sourceTaskId index
  if (item.sourceTaskId) {
    const sourceTaskIndexKey = `index:${ENTITY}:sourceTaskId:${item.sourceTaskId}`;
    await kvSAdd(sourceTaskIndexKey, item.id);
  }
  
  // Maintain sourceRecordId index
  if (item.sourceRecordId) {
    const sourceRecordIndexKey = `index:${ENTITY}:sourceRecordId:${item.sourceRecordId}`;
    await kvSAdd(sourceRecordIndexKey, item.id);
  }
  
  return item;
}

export async function deleteItem(id: string): Promise<void> {
  const key = buildDataKey(ENTITY, id);
  const indexKey = buildIndexKey(ENTITY);
  
  // Get item to clean up indexes
  const item = await kvGet<Item>(key);
  if (item) {
    if (item.sourceTaskId) {
      const sourceTaskIndexKey = `index:${ENTITY}:sourceTaskId:${item.sourceTaskId}`;
      await kvSRem(sourceTaskIndexKey, id);
    }
    if (item.sourceRecordId) {
      const sourceRecordIndexKey = `index:${ENTITY}:sourceRecordId:${item.sourceRecordId}`;
      await kvSRem(sourceRecordIndexKey, id);
    }
  }
  
  await kvDel(key);
  await kvSRem(indexKey, id);
}
