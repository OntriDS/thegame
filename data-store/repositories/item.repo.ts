// data-store/repositories/item.repo.ts
import { kvGet, kvMGet, kvSet, kvDel, kvSAdd, kvSRem, kvSMembers } from '../kv';
import { buildDataKey, buildIndexKey } from '../keys';
import { EntityType, ItemType } from '@/types/enums';
import type { Item } from '@/types/entities';

const ENTITY = EntityType.ITEM;

export async function getAllItems(): Promise<Item[]> {
  const indexKey = buildIndexKey(ENTITY);
  const ids = await kvSMembers(indexKey);
  if (ids.length === 0) return [];
  
  const keys = ids.map(id => buildDataKey(ENTITY, id));
  const items = await kvMGet<Item>(keys);
  return items.filter((item): item is Item => item !== null && item !== undefined);
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
  
  const keys = ids.map(id => buildDataKey(ENTITY, id));
  const items = await kvMGet<Item>(keys);
  return items.filter((item): item is Item => item !== null && item !== undefined);
}

/**
 * Get items by sourceRecordId using an index
 * OPTIMIZED: Only loads items created by this record, not all items
 */
export async function getItemsBySourceRecordId(sourceRecordId: string): Promise<Item[]> {
  const indexKey = `index:${ENTITY}:sourceRecordId:${sourceRecordId}`;
  const ids = await kvSMembers(indexKey);
  if (ids.length === 0) return [];
  
  const keys = ids.map(id => buildDataKey(ENTITY, id));
  const items = await kvMGet<Item>(keys);
  return items.filter((item): item is Item => item !== null && item !== undefined);
}

/**
 * Get items by type using an index
 * OPTIMIZED: Only loads items of specific type(s), not all items
 */
export async function getItemsByType(itemTypes: ItemType | ItemType[]): Promise<Item[]> {
  const types = Array.isArray(itemTypes) ? itemTypes : [itemTypes];
  const allIds = new Set<string>();
  
  // Get IDs from type index for each type
  for (const type of types) {
    const typeIndexKey = `index:${ENTITY}:type:${type}`;
    const ids = await kvSMembers(typeIndexKey);
    ids.forEach(id => allIds.add(id));
  }
  
  if (allIds.size === 0) return [];
  
  const keys = Array.from(allIds).map(id => buildDataKey(ENTITY, id));
  const items = await kvMGet<Item>(keys);
  
  // Filter to ensure type matches (defensive check)
  return items.filter((item): item is Item => 
    item !== null && item !== undefined && types.includes(item.type)
  );
}

export async function upsertItem(item: Item): Promise<Item> {
  const key = buildDataKey(ENTITY, item.id);
  const indexKey = buildIndexKey(ENTITY);
  
  // Get previous item to clean up old indexes if they changed
  const previousItem = await kvGet<Item>(key);
  
  await kvSet(key, item);
  await kvSAdd(indexKey, item.id);
  
  // Maintain type index
  const typeIndexKey = `index:${ENTITY}:type:${item.type}`;
  await kvSAdd(typeIndexKey, item.id);
  
  // Clean up old type index if type changed
  if (previousItem && previousItem.type !== item.type) {
    const oldTypeIndexKey = `index:${ENTITY}:type:${previousItem.type}`;
    await kvSRem(oldTypeIndexKey, item.id);
  }
  
  // Maintain sourceTaskId index
  if (item.sourceTaskId) {
    const sourceTaskIndexKey = `index:${ENTITY}:sourceTaskId:${item.sourceTaskId}`;
    await kvSAdd(sourceTaskIndexKey, item.id);
  }
  
  // Clean up old sourceTaskId index if it changed or was removed
  if (previousItem?.sourceTaskId && previousItem.sourceTaskId !== item.sourceTaskId) {
    const oldSourceTaskIndexKey = `index:${ENTITY}:sourceTaskId:${previousItem.sourceTaskId}`;
    await kvSRem(oldSourceTaskIndexKey, item.id);
  }
  
  // Maintain sourceRecordId index
  if (item.sourceRecordId) {
    const sourceRecordIndexKey = `index:${ENTITY}:sourceRecordId:${item.sourceRecordId}`;
    await kvSAdd(sourceRecordIndexKey, item.id);
  }
  
  // Clean up old sourceRecordId index if it changed or was removed
  if (previousItem?.sourceRecordId && previousItem.sourceRecordId !== item.sourceRecordId) {
    const oldSourceRecordIndexKey = `index:${ENTITY}:sourceRecordId:${previousItem.sourceRecordId}`;
    await kvSRem(oldSourceRecordIndexKey, item.id);
  }
  
  return item;
}

export async function deleteItem(id: string): Promise<void> {
  const key = buildDataKey(ENTITY, id);
  const indexKey = buildIndexKey(ENTITY);
  
  // Get item to clean up indexes
  const item = await kvGet<Item>(key);
  if (item) {
    // Clean up type index
    const typeIndexKey = `index:${ENTITY}:type:${item.type}`;
    await kvSRem(typeIndexKey, id);
    
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
