// data-store/repositories/financial.repo.ts
import { kvGet, kvSet, kvDel, kvSAdd, kvSRem, kvSMembers } from '../kv';
import { buildDataKey, buildIndexKey } from '../keys';
import type { FinancialRecord } from '@/types/entities';

const ENTITY = 'financials';

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

export async function upsertFinancial(financial: FinancialRecord): Promise<FinancialRecord> {
  const key = buildDataKey(ENTITY, financial.id);
  const indexKey = buildIndexKey(ENTITY);
  
  await kvSet(key, financial);
  await kvSAdd(indexKey, financial.id);
  
  return financial;
}

export async function deleteFinancial(id: string): Promise<void> {
  const key = buildDataKey(ENTITY, id);
  const indexKey = buildIndexKey(ENTITY);
  
  await kvDel(key);
  await kvSRem(indexKey, id);
}
