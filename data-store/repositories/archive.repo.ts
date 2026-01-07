// data-store/repositories/archive.repo.ts
// Generic helpers for storing and retrieving archived entities in monthly buckets

import { kvGet, kvMGet, kvSAdd, kvSMembers, kvSet, kvSRem, kvDel } from '@/data-store/kv';
import {
  buildArchiveDataKey,
  buildArchiveIndexKey,
  buildArchiveMonthsKey
} from '@/data-store/keys';

type ArchiveEntity = { id: string };

function sortMonthsDesc(months: string[]): string[] {
  return [...months].sort((a, b) => {
    const [amStr, ayStr] = a.split('-');
    const [bmStr, byStr] = b.split('-');

    const ay = parseInt(`20${ayStr}`, 10);
    const by = parseInt(`20${byStr}`, 10);
    const am = parseInt(amStr, 10);
    const bm = parseInt(bmStr, 10);

    if (ay !== by) {
      return by - ay;
    }

    return bm - am;
  });
}

export async function addMonthToArchiveIndex(mmyy: string): Promise<void> {
  await kvSAdd(buildArchiveMonthsKey(), mmyy);
}

export async function getAvailableArchiveMonths(): Promise<string[]> {
  const months = await kvSMembers(buildArchiveMonthsKey());
  return sortMonthsDesc(months);
}

export async function addEntityToArchive<T extends ArchiveEntity>(
  entityType: string,
  mmyy: string,
  entity: T
): Promise<void> {
  const dataKey = buildArchiveDataKey(entityType, mmyy, entity.id);
  const indexKey = buildArchiveIndexKey(entityType, mmyy);

  await kvSet(dataKey, entity);
  await kvSAdd(indexKey, entity.id);
  await addMonthToArchiveIndex(mmyy);
}

export async function getArchivedEntitiesByMonth<T>(
  entityType: string,
  mmyy: string,
  altEntityTypes: string[] = []
): Promise<T[]> {
  const indexKey = buildArchiveIndexKey(entityType, mmyy);
  const ids = await kvSMembers(indexKey);
  if (ids.length === 0) return [];

  // Strategy: Data might be stored in ANY month bucket, not just the requested one.
  // We must scan all candidate months for the data keys corresponding to these IDs.
  // Also scan alternate entity names (e.g. 'item' vs 'item-snapshots').
  const months = await getAvailableArchiveMonths();
  const candidateMonths = Array.from(new Set([mmyy, ...months]));
  const targetEntities = [entityType, ...altEntityTypes];

  const allKeys: string[] = [];
  const keyToId = new Map<string, string>();

  // Construct search keys for every ID across every candidate month AND every candidate entity name
  for (const id of ids) {
    for (const ent of targetEntities) {
      for (const month of candidateMonths) {
        const key = buildArchiveDataKey(ent, month, id);
        allKeys.push(key);
        keyToId.set(key, id);
      }
    }
  }

  // Fetch everything in one go
  const values = await kvMGet<T>(allKeys);

  // Map found data back to IDs, prioritizing the first found instance
  const foundEntities = new Map<string, T>();

  values.forEach((val, index) => {
    if (val) {
      const key = allKeys[index];
      const id = keyToId.get(key);
      if (id && !foundEntities.has(id)) {
        foundEntities.set(id, val);
      }
    }
  });

  return Array.from(foundEntities.values());
}

export async function getArchivedEntityById<T>(
  entityType: string,
  mmyy: string,
  id: string
): Promise<T | null> {
  return await kvGet<T>(buildArchiveDataKey(entityType, mmyy, id));
}
export async function deleteEntityFromArchive(
  entityType: string,
  mmyy: string,
  id: string
): Promise<void> {
  const indexKey = buildArchiveIndexKey(entityType, mmyy);
  const dataKey = buildArchiveDataKey(entityType, mmyy, id);

  await kvSRem(indexKey, id);
  await kvDel(dataKey);
}
