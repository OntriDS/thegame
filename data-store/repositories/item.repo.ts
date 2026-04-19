// data-store/repositories/item.repo.ts
import { kvGet, kvMGet, kvSet, kvDel, kvSAdd, kvSRem, kvSMembers } from '../kv';
import { buildDataKey, buildIndexKey, buildMonthIndexKey, buildEntityIndexKey, buildArchiveMonthsKey, buildItemActiveIndexKey, buildItemLegacyIndexKey } from '../keys';
import { EntityType, ItemType, ItemStatus } from '@/types/enums';
import { isSoldStatus } from '@/lib/utils/status-utils';
import type { Item } from '@/types/entities';
import { formatArchiveMonthKeyUTC } from '@/lib/utils/utc-utils';

const ENTITY = EntityType.ITEM;

/**
 * Get all items - SPECIAL CASE ONLY
 * Use: Bulk operations, system maintenance, AI analysis
 * Performance Impact: Loads entire dataset into memory
 * Alternative: Use getItemsForMonth(year, month) for UI components
 */
export async function getAllItems(): Promise<Item[]> {
  const indexKey = buildIndexKey(ENTITY);
  const ids = await kvSMembers(indexKey);
  if (ids.length === 0) return [];

  const keys = ids.map(id => buildDataKey(ENTITY, id));
  const items = await kvMGet<Item>(keys);
  return items.filter((item): item is Item => item !== null && item !== undefined);
}

/**
 * Get active items (not sold, not legacy)
 * OPTIMIZED: Replaces generalized getAllItems() for UI active inventory fetching
 */
export async function getActiveItems(): Promise<Item[]> {
  const indexKey = buildItemActiveIndexKey();
  const ids = await kvSMembers(indexKey);
  if (ids.length === 0) return [];

  const keys = ids.map(id => buildDataKey(ENTITY, id));
  const items = await kvMGet<Item>(keys);
  return items.filter((item): item is Item => item !== null && item !== undefined);
}

/**
 * Get legacy historical items
 */
export async function getLegacyItems(): Promise<Item[]> {
  const indexKey = buildItemLegacyIndexKey();
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
  const indexKey = buildEntityIndexKey(ENTITY, 'sourceTaskId', sourceTaskId);
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
  const indexKey = buildEntityIndexKey(ENTITY, 'sourceRecordId', sourceRecordId);
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
    const typeIndexKey = buildEntityIndexKey(ENTITY, 'type', type);
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

  const toSave: Item = item;

  await kvSet(key, toSave);

  const activeIndexKey = buildItemActiveIndexKey();
  const legacyIndexKey = buildItemLegacyIndexKey();
  const isLegacy = toSave.status === ItemStatus.LEGACY;
  const isSold = isSoldStatus(toSave.status);

  // 1. Maintain main index: Every item EXCEPT legacy
  if (isLegacy) {
    await kvSRem(indexKey, item.id);
    await kvSAdd(legacyIndexKey, item.id);
    await kvSRem(activeIndexKey, item.id);
  } else {
    await kvSAdd(indexKey, item.id);
    await kvSRem(legacyIndexKey, item.id);

    // 2. Maintain active index: Every item EXCEPT sold/legacy
    if (isSold) {
      await kvSRem(activeIndexKey, item.id);
    } else {
      await kvSAdd(activeIndexKey, item.id);
    }
  }

  // 3. Maintain month index (soldAt → createdAt)
  // CRITICAL: Sold items must be indexed by their soldAt date to appear in the correct "Sold Items" month tab
  // Legacy items are intentionally EXCLUDED from month indexing so they stay fully hidden
  const dateForIndex = toSave.soldAt || toSave.createdAt;
  if (!isLegacy && dateForIndex) {
    const currentMonthKey = formatArchiveMonthKeyUTC(dateForIndex);
    await kvSAdd(buildMonthIndexKey(ENTITY, currentMonthKey), item.id);
    // Ensure this month appears in the global month selector (archive months set)
    await kvSAdd(buildArchiveMonthsKey(), currentMonthKey);
  }

  // Maintain type index
  const typeIndexKey = buildEntityIndexKey(ENTITY, 'type', toSave.type);
  await kvSAdd(typeIndexKey, item.id);

  // Clean up old type index if type changed
  if (previousItem && previousItem.type !== toSave.type) {
    const oldTypeIndexKey = buildEntityIndexKey(ENTITY, 'type', previousItem.type);
    await kvSRem(oldTypeIndexKey, item.id);
  }

  // Clean up old month index if month changed
  if (previousItem) {
    const prevDateForIndex = previousItem.soldAt || previousItem.createdAt;
    const currDateForIndex = toSave.soldAt || toSave.createdAt;

    if (prevDateForIndex && currDateForIndex) {
      const prevMonthKey = formatArchiveMonthKeyUTC(prevDateForIndex);
      const currMonthKey = formatArchiveMonthKeyUTC(currDateForIndex);

      if (prevMonthKey !== currMonthKey) {
        await kvSRem(buildMonthIndexKey(ENTITY, prevMonthKey), item.id);
      }
    }
  }

  // Maintain sourceTaskId index
  if (item.sourceTaskId) {
    const sourceTaskIndexKey = buildEntityIndexKey(ENTITY, 'sourceTaskId', item.sourceTaskId);
    await kvSAdd(sourceTaskIndexKey, item.id);
  }

  // Clean up old sourceTaskId index if it changed or was removed
  if (previousItem?.sourceTaskId && previousItem.sourceTaskId !== item.sourceTaskId) {
    const oldSourceTaskIndexKey = buildEntityIndexKey(ENTITY, 'sourceTaskId', previousItem.sourceTaskId);
    await kvSRem(oldSourceTaskIndexKey, item.id);
  }

  // Maintain sourceRecordId index
  if (item.sourceRecordId) {
    const sourceRecordIndexKey = buildEntityIndexKey(ENTITY, 'sourceRecordId', item.sourceRecordId);
    await kvSAdd(sourceRecordIndexKey, item.id);
  }

  // Clean up old sourceRecordId index if it changed or was removed
  if (previousItem?.sourceRecordId && previousItem.sourceRecordId !== item.sourceRecordId) {
    const oldSourceRecordIndexKey = buildEntityIndexKey(ENTITY, 'sourceRecordId', previousItem.sourceRecordId);
    await kvSRem(oldSourceRecordIndexKey, item.id);
  }

  return toSave;
}

export async function deleteItem(id: string): Promise<void> {
  const key = buildDataKey(ENTITY, id);
  const indexKey = buildIndexKey(ENTITY);

  // Get item to clean up indexes
  const item = await kvGet<Item>(key);
  if (item) {
    const dateForIndex = item.soldAt || item.createdAt;
    if (dateForIndex) {
      const prevMonthKey = formatArchiveMonthKeyUTC(dateForIndex);
      await kvSRem(buildMonthIndexKey(ENTITY, prevMonthKey), id);
    }
    // Clean up type index
    const typeIndexKey = buildEntityIndexKey(ENTITY, 'type', item.type);
    await kvSRem(typeIndexKey, id);

    if (item.sourceTaskId) {
      const sourceTaskIndexKey = buildEntityIndexKey(ENTITY, 'sourceTaskId', item.sourceTaskId);
      await kvSRem(sourceTaskIndexKey, id);
    }
    if (item.sourceRecordId) {
      const sourceRecordIndexKey = buildEntityIndexKey(ENTITY, 'sourceRecordId', item.sourceRecordId);
      await kvSRem(sourceRecordIndexKey, id);
    }
  }

  await kvDel(key);
  await kvSRem(indexKey, id);
  await kvSRem(buildItemActiveIndexKey(), id);
  await kvSRem(buildItemLegacyIndexKey(), id);
}
