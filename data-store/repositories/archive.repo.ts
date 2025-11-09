// data-store/repositories/archive.repo.ts
// Generic helpers for storing and retrieving archived entities in monthly buckets

import { kvGet, kvMGet, kvSAdd, kvSMembers, kvSet } from '@/data-store/kv';
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
  mmyy: string
): Promise<T[]> {
  const indexKey = buildArchiveIndexKey(entityType, mmyy);
  const ids = await kvSMembers(indexKey);
  if (ids.length === 0) return [];

  const keys = ids.map(id => buildArchiveDataKey(entityType, mmyy, id));
  const entities = await kvMGet<T>(keys);

  return entities.filter((entity): entity is T => entity !== null);
}

export async function getArchivedEntityById<T>(
  entityType: string,
  mmyy: string,
  id: string
): Promise<T | null> {
  return await kvGet<T>(buildArchiveDataKey(entityType, mmyy, id));
}

