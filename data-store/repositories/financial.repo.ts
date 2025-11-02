// data-store/repositories/financial.repo.ts
import { kvGet, kvMGet, kvSet, kvDel, kvSAdd, kvSRem, kvSMembers } from '../kv';
import { buildDataKey, buildIndexKey } from '../keys';
import { EntityType } from '@/types/enums';
import type { FinancialRecord } from '@/types/entities';

const ENTITY = EntityType.FINANCIAL;

export async function getAllFinancials(): Promise<FinancialRecord[]> {
  const indexKey = buildIndexKey(ENTITY);
  const ids = await kvSMembers(indexKey);
  if (ids.length === 0) return [];
  
  const keys = ids.map(id => buildDataKey(ENTITY, id));
  const financials = await kvMGet<FinancialRecord>(keys);
  return financials.filter((financial): financial is FinancialRecord => financial !== null && financial !== undefined);
}

export async function getFinancialById(id: string): Promise<FinancialRecord | null> {
  const key = buildDataKey(ENTITY, id);
  return await kvGet<FinancialRecord>(key);
}

/**
 * Get financial records by sourceTaskId using an index
 * OPTIMIZED: Only loads records created by this task, not all records
 */
export async function getFinancialsBySourceTaskId(sourceTaskId: string): Promise<FinancialRecord[]> {
  const indexKey = `index:${ENTITY}:sourceTaskId:${sourceTaskId}`;
  const ids = await kvSMembers(indexKey);
  if (ids.length === 0) return [];
  
  const keys = ids.map(id => buildDataKey(ENTITY, id));
  const financials = await kvMGet<FinancialRecord>(keys);
  return financials.filter((financial): financial is FinancialRecord => financial !== null && financial !== undefined);
}

export async function upsertFinancial(financial: FinancialRecord): Promise<FinancialRecord> {
  const key = buildDataKey(ENTITY, financial.id);
  const indexKey = buildIndexKey(ENTITY);
  
  // Get previous financial to clean up old indexes if they changed
  const previousFinancial = await kvGet<FinancialRecord>(key);
  
  await kvSet(key, financial);
  await kvSAdd(indexKey, financial.id);
  
  // Maintain sourceTaskId index
  if (financial.sourceTaskId) {
    const sourceTaskIndexKey = `index:${ENTITY}:sourceTaskId:${financial.sourceTaskId}`;
    await kvSAdd(sourceTaskIndexKey, financial.id);
  }
  
  // Clean up old sourceTaskId index if it changed or was removed
  if (previousFinancial?.sourceTaskId && previousFinancial.sourceTaskId !== financial.sourceTaskId) {
    const oldSourceTaskIndexKey = `index:${ENTITY}:sourceTaskId:${previousFinancial.sourceTaskId}`;
    await kvSRem(oldSourceTaskIndexKey, financial.id);
  }
  
  return financial;
}

export async function deleteFinancial(id: string): Promise<void> {
  const key = buildDataKey(ENTITY, id);
  const indexKey = buildIndexKey(ENTITY);
  
  // Get financial to clean up sourceTaskId index
  const financial = await kvGet<FinancialRecord>(key);
  if (financial?.sourceTaskId) {
    const sourceTaskIndexKey = `index:${ENTITY}:sourceTaskId:${financial.sourceTaskId}`;
    await kvSRem(sourceTaskIndexKey, id);
  }
  
  await kvDel(key);
  await kvSRem(indexKey, id);
}
