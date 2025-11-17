// data-store/repositories/financial.repo.ts
import { kvGet, kvMGet, kvSet, kvDel, kvSAdd, kvSRem, kvSMembers } from '../kv';
import { buildDataKey, buildIndexKey, buildMonthIndexKey } from '../keys';
import { EntityType } from '@/types/enums';
import type { FinancialRecord } from '@/types/entities';
import { formatMonthKey } from '@/lib/utils/date-utils';

const ENTITY = EntityType.FINANCIAL;

/**
 * Get all financial records - SPECIAL CASE ONLY
 * Use: Business analytics, bulk operations, system maintenance
 * Performance Impact: Loads entire dataset into memory
 * Alternative: Use getFinancialsForMonth(year, month) for UI components
 */
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

/**
 * Get financial records by sourceSaleId using an index
 * OPTIMIZED: Only loads records created by this sale, not all records
 */
export async function getFinancialsBySourceSaleId(sourceSaleId: string): Promise<FinancialRecord[]> {
  const indexKey = `index:${ENTITY}:sourceSaleId:${sourceSaleId}`;
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

  // Maintain month index using explicit year/month
  if (financial.year && financial.month) {
    const monthDate = new Date(financial.year, (financial.month || 1) - 1, 1);
    const currentMonthKey = formatMonthKey(monthDate);
    await kvSAdd(buildMonthIndexKey(ENTITY, currentMonthKey), financial.id);
  }
  
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
  
  // Maintain sourceSaleId index
  if (financial.sourceSaleId) {
    const sourceSaleIndexKey = `index:${ENTITY}:sourceSaleId:${financial.sourceSaleId}`;
    await kvSAdd(sourceSaleIndexKey, financial.id);
  }
  
  // Clean up old sourceSaleId index if it changed or was removed
  if (previousFinancial?.sourceSaleId && previousFinancial.sourceSaleId !== financial.sourceSaleId) {
    const oldSourceSaleIndexKey = `index:${ENTITY}:sourceSaleId:${previousFinancial.sourceSaleId}`;
    await kvSRem(oldSourceSaleIndexKey, financial.id);
  }

  // Clean up old month index if month/year changed
  if (previousFinancial?.year && previousFinancial?.month && financial.year && financial.month) {
    const prevMonthKey = formatMonthKey(new Date(previousFinancial.year, previousFinancial.month - 1, 1));
    const currMonthKey = formatMonthKey(new Date(financial.year, financial.month - 1, 1));
    if (prevMonthKey !== currMonthKey) {
      await kvSRem(buildMonthIndexKey(ENTITY, prevMonthKey), financial.id);
    }
  }
  
  return financial;
}

export async function deleteFinancial(id: string): Promise<void> {
  const key = buildDataKey(ENTITY, id);
  const indexKey = buildIndexKey(ENTITY);
  
  // Get financial to clean up indexes
  const financial = await kvGet<FinancialRecord>(key);
  if (financial?.sourceTaskId) {
    const sourceTaskIndexKey = `index:${ENTITY}:sourceTaskId:${financial.sourceTaskId}`;
    await kvSRem(sourceTaskIndexKey, id);
  }
  if (financial?.sourceSaleId) {
    const sourceSaleIndexKey = `index:${ENTITY}:sourceSaleId:${financial.sourceSaleId}`;
    await kvSRem(sourceSaleIndexKey, id);
  }
  if (financial?.year && financial?.month) {
    const prevMonthKey = formatMonthKey(new Date(financial.year, financial.month - 1, 1));
    await kvSRem(buildMonthIndexKey(ENTITY, prevMonthKey), id);
  }
  
  await kvDel(key);
  await kvSRem(indexKey, id);
}
