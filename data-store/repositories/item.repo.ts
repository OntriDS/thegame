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
 * Get items by ownerCharacterId using an index
 * OPTIMIZED: For character inventory fetching
 */
export async function getItemsByOwnerId(ownerId: string): Promise<Item[]> {
  const indexKey = buildEntityIndexKey(ENTITY, 'ownerCharacterId', ownerId);
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

/**
 * Get items by subItemType using an index
 * OPTIMIZED: Only loads items matching specific sub-item type(s), not all items
 */
export async function getItemsBySubType(subItemTypes: string | string[]): Promise<Item[]> {
  const subTypes = Array.isArray(subItemTypes) ? subItemTypes : [subItemTypes];
  const allIds = new Set<string>();

  for (const subType of subTypes) {
    const subTypeIndexKey = buildEntityIndexKey(ENTITY, 'subItemType', subType);
    const ids = await kvSMembers(subTypeIndexKey);
    ids.forEach(id => allIds.add(id));
  }

  if (allIds.size === 0) return [];

  const keys = Array.from(allIds).map(id => buildDataKey(ENTITY, id));
  const items = await kvMGet<Item>(keys);

  return items.filter((item): item is Item =>
    item !== null &&
    item !== undefined &&
    item.subItemType !== undefined &&
    subTypes.includes(item.subItemType)
  );
}

function normalizeStringListFilter(values?: string | string[]): string[] | null {
  if (values === undefined) return null;

  if (Array.isArray(values)) {
    const normalized = values.map((value) => String(value || '').trim()).filter((value) => value.length > 0);
    return normalized;
  }

  const value = String(values || '').trim();
  return value ? [value] : [];
}

/**
 * Count items using indexed lookups
 * - If both filters provided, returns intersection
 * - If one filter is provided, returns that set size
 * - If no filters are passed, returns full index count
 * - If an explicit filter is provided but empty, returns 0
 */
export async function countItems(types?: string | string[], subTypes?: string | string[]): Promise<number> {
  const normalizedTypes = normalizeStringListFilter(types);
  const normalizedSubTypes = normalizeStringListFilter(subTypes);

  if (types !== undefined && normalizedTypes && normalizedTypes.length === 0) return 0;
  if (subTypes !== undefined && normalizedSubTypes && normalizedSubTypes.length === 0) return 0;

  if (normalizedTypes === null && normalizedSubTypes === null) {
    const allIds = await kvSMembers(buildIndexKey(ENTITY));
    return allIds.length;
  }

  const collectIdsByField = async (field: 'type' | 'subItemType', values: string[]): Promise<Set<string>> => {
    const idSet = new Set<string>();
    for (const value of values) {
      const indexKey = buildEntityIndexKey(ENTITY, field, value);
      const ids = await kvSMembers(indexKey);
      ids.forEach((id) => idSet.add(id));
    }
    return idSet;
  };

  const typeIdSet = normalizedTypes && normalizedTypes.length > 0
    ? await collectIdsByField('type', normalizedTypes)
    : null;
  const subTypeIdSet = normalizedSubTypes && normalizedSubTypes.length > 0
    ? await collectIdsByField('subItemType', normalizedSubTypes)
    : null;

  if (typeIdSet && subTypeIdSet) {
    let result = 0;
    for (const id of typeIdSet) {
      if (subTypeIdSet.has(id)) result += 1;
    }
    return result;
  }

  if (typeIdSet) return typeIdSet.size;
  if (subTypeIdSet) return subTypeIdSet.size;

  return 0;
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

  // Maintain subItemType index
  if (toSave.subItemType) {
    const subItemTypeIndexKey = buildEntityIndexKey(ENTITY, 'subItemType', toSave.subItemType);
    await kvSAdd(subItemTypeIndexKey, item.id);
  }

  // Clean up old subItemType index if it changed or was removed
  if (previousItem?.subItemType !== toSave.subItemType) {
    if (previousItem?.subItemType) {
      const oldSubItemTypeIndexKey = buildEntityIndexKey(ENTITY, 'subItemType', previousItem.subItemType);
      await kvSRem(oldSubItemTypeIndexKey, item.id);
    }
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

  // Maintain ownerCharacterId index
  if (item.ownerCharacterId) {
    const ownerIndexKey = buildEntityIndexKey(ENTITY, 'ownerCharacterId', item.ownerCharacterId);
    await kvSAdd(ownerIndexKey, item.id);
  }

  // Clean up old ownerCharacterId index
  if (previousItem?.ownerCharacterId && previousItem.ownerCharacterId !== item.ownerCharacterId) {
    const oldOwnerIndexKey = buildEntityIndexKey(ENTITY, 'ownerCharacterId', previousItem.ownerCharacterId);
    await kvSRem(oldOwnerIndexKey, item.id);
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

    if (item.subItemType) {
      const subItemTypeIndexKey = buildEntityIndexKey(ENTITY, 'subItemType', item.subItemType);
      await kvSRem(subItemTypeIndexKey, id);
    }

    if (item.sourceTaskId) {
      const sourceTaskIndexKey = buildEntityIndexKey(ENTITY, 'sourceTaskId', item.sourceTaskId);
      await kvSRem(sourceTaskIndexKey, id);
    }
    if (item.sourceRecordId) {
      const sourceRecordIndexKey = buildEntityIndexKey(ENTITY, 'sourceRecordId', item.sourceRecordId);
      await kvSRem(sourceRecordIndexKey, id);
    }
    if (item.ownerCharacterId) {
      const ownerIndexKey = buildEntityIndexKey(ENTITY, 'ownerCharacterId', item.ownerCharacterId);
      await kvSRem(ownerIndexKey, id);
    }
  }

  await kvDel(key);
  await kvSRem(indexKey, id);
  await kvSRem(buildItemActiveIndexKey(), id);
  await kvSRem(buildItemLegacyIndexKey(), id);
}
