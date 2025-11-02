// data-store/repositories/sale.repo.ts
import { kvGet, kvMGet, kvSet, kvDel, kvSAdd, kvSRem, kvSMembers } from '../kv';
import { buildDataKey, buildIndexKey } from '../keys';
import { EntityType } from '@/types/enums';
import type { Sale } from '@/types/entities';

const ENTITY = EntityType.SALE;

export async function getAllSales(): Promise<Sale[]> {
  const indexKey = buildIndexKey(ENTITY);
  const ids = await kvSMembers(indexKey);
  if (ids.length === 0) return [];
  
  const keys = ids.map(id => buildDataKey(ENTITY, id));
  const sales = await kvMGet<Sale>(keys);
  return sales.filter((sale): sale is Sale => sale !== null && sale !== undefined);
}

export async function getSaleById(id: string): Promise<Sale | null> {
  const key = buildDataKey(ENTITY, id);
  return await kvGet<Sale>(key);
}

export async function upsertSale(sale: Sale): Promise<Sale> {
  const key = buildDataKey(ENTITY, sale.id);
  const indexKey = buildIndexKey(ENTITY);
  
  await kvSet(key, sale);
  await kvSAdd(indexKey, sale.id);
  
  return sale;
}

export async function deleteSale(id: string): Promise<void> {
  const key = buildDataKey(ENTITY, id);
  const indexKey = buildIndexKey(ENTITY);
  
  await kvDel(key);
  await kvSRem(indexKey, id);
}
