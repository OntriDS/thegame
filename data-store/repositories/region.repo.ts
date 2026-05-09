// data-store/repositories/region.repo.ts
import { kvGet, kvMGet, kvSet, kvDel, kvSAdd, kvSRem, kvSMembers } from '../kv';
import { buildDataKey, buildIndexKey } from '../keys';
import { EntityType } from '@/types/enums';
import type { Region } from '@/types/entities';

const ENTITY = EntityType.REGION;

export async function getAllRegions(): Promise<Region[]> {
  const indexKey = buildIndexKey(ENTITY);
  const ids = await kvSMembers(indexKey);
  if (ids.length === 0) return [];

  const keys = ids.map(id => buildDataKey(ENTITY, id));
  const regions = await kvMGet<Region>(keys);
  return regions.filter((region): region is Region => region !== null);
}

export async function getRegionById(id: string): Promise<Region | null> {
  const key = buildDataKey(ENTITY, id);
  return await kvGet<Region>(key);
}

export async function upsertRegion(region: Region): Promise<Region> {
  const key = buildDataKey(ENTITY, region.id);
  const indexKey = buildIndexKey(ENTITY);

  await kvSet(key, region);
  await kvSAdd(indexKey, region.id);

  return region;
}

export async function removeRegion(id: string): Promise<void> {
  const key = buildDataKey(ENTITY, id);
  const indexKey = buildIndexKey(ENTITY);

  await kvDel(key);
  await kvSRem(indexKey, id);
}
