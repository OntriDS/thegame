// data-store/repositories/sale.repo.ts
import { kvGet, kvMGet, kvSet, kvDel, kvSAdd, kvSRem, kvSMembers } from '../kv';
import { buildDataKey, buildIndexKey, buildMonthIndexKey } from '../keys';
import { EntityType } from '@/types/enums';
import type { Sale } from '@/types/entities';
import { formatArchiveMonthKeyUTC } from '@/lib/utils/utc-utils';

const ENTITY = EntityType.SALE;

/**
 * Get all sales - SPECIAL CASE ONLY
 * Use: Business analytics, bulk operations, system maintenance
 * Performance Impact: Loads entire dataset into memory
 * Alternative: Use getSalesForMonth(year, month) for UI components
 */
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

  const previous = await kvGet<Sale>(key);

  await kvSet(key, sale);
  await kvSAdd(indexKey, sale.id);

  // Maintain month index (collectedAt → doneAt → saleDate → createdAt)
  const date = (sale as any).collectedAt || (sale as any).doneAt || (sale as any).saleDate || (sale as any).createdAt;
  if (date) {
    const monthKey = formatArchiveMonthKeyUTC(new Date(date));
    await kvSAdd(buildMonthIndexKey(ENTITY, monthKey), sale.id);

    const { buildArchiveMonthsKey } = await import('../keys');
    await kvSAdd(buildArchiveMonthsKey(), monthKey);
  }

  if (previous) {
    const prevDate = (previous as any).collectedAt || (previous as any).doneAt || (previous as any).saleDate || (previous as any).createdAt;
    if (prevDate) {
      const prevMonthKey = formatArchiveMonthKeyUTC(new Date(prevDate));
      const currMonthKey = date ? formatArchiveMonthKeyUTC(new Date(date)) : prevMonthKey;
      if (prevMonthKey !== currMonthKey) {
        await kvSRem(buildMonthIndexKey(ENTITY, prevMonthKey), sale.id);
      }
    }
  }

  return sale;
}

export async function deleteSale(id: string): Promise<void> {
  const key = buildDataKey(ENTITY, id);
  const indexKey = buildIndexKey(ENTITY);

  const existing = await kvGet<Sale>(key);
  if (existing) {
    const prevDate = (existing as any).collectedAt || (existing as any).doneAt || (existing as any).saleDate || (existing as any).createdAt;
    if (prevDate) {
      const prevMonthKey = formatArchiveMonthKeyUTC(new Date(prevDate));
      await kvSRem(buildMonthIndexKey(ENTITY, prevMonthKey), id);
    }
  }

  await kvDel(key);
  await kvSRem(indexKey, id);
}
