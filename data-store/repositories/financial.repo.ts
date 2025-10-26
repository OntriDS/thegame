// data-store/repositories/financial.repo.ts
import { kvGet, kvSet, kvDel, kvSAdd, kvSRem, kvSMembers } from '../kv';
import { buildDataKey, buildIndexKey } from '../keys';
import { EntityType } from '@/types/enums';
import type { FinancialRecord } from '@/types/entities';

const ENTITY = EntityType.FINANCIAL;

export async function getAllFinancials(): Promise<FinancialRecord[]> {
  const indexKey = buildIndexKey(ENTITY);
  const ids = await kvSMembers(indexKey);
  if (ids.length === 0) return [];
  
  const financials: FinancialRecord[] = [];
  for (const id of ids) {
    const key = buildDataKey(ENTITY, id);
    const financial = await kvGet<FinancialRecord>(key);
    if (financial) financials.push(financial);
  }
  
  return financials;
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
  
  const financials: FinancialRecord[] = [];
  for (const id of ids) {
    const key = buildDataKey(ENTITY, id);
    const financial = await kvGet<FinancialRecord>(key);
    if (financial) financials.push(financial);
  }
  
  return financials;
}

export async function upsertFinancial(financial: FinancialRecord): Promise<FinancialRecord> {
  const key = buildDataKey(ENTITY, financial.id);
  const indexKey = buildIndexKey(ENTITY);
  
  await kvSet(key, financial);
  await kvSAdd(indexKey, financial.id);
  
  // Maintain sourceTaskId index
  if (financial.sourceTaskId) {
    const sourceTaskIndexKey = `index:${ENTITY}:sourceTaskId:${financial.sourceTaskId}`;
    await kvSAdd(sourceTaskIndexKey, financial.id);
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
