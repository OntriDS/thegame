import type { Task, Sale, FinancialRecord, Item } from '@/types/entities';
import { toUTC, getUTCNow } from './utc-utils';

/**
 * Get the month (1-12) for a given entity based on canonical month fields.
 * - FinancialRecord: entity.month
 * - Sale: saleDate (fallback createdAt)
 * - Task: doneAt → collectedAt → createdAt
 * - Item: createdAt (active inventory context)
 */
export function getEntityMonth(entity: Task | Sale | FinancialRecord | Item): number {
  if ((entity as FinancialRecord).year !== undefined && (entity as FinancialRecord).month !== undefined) {
    return (entity as FinancialRecord).month;
  }
  if ((entity as Sale).saleDate !== undefined) {
    const date = (entity as Sale).saleDate || (entity as any).createdAt;
    return date ? toUTC(date).getUTCMonth() + 1 : getUTCNow().getUTCMonth() + 1;
  }
  if ((entity as any).collectedAt !== undefined || (entity as any).doneAt !== undefined || (entity as any).createdAt !== undefined) {
    const anyEntity = entity as any;
    const date: Date | string | null =
      anyEntity.doneAt || anyEntity.collectedAt || anyEntity.createdAt || null;
    return date ? toUTC(date).getUTCMonth() + 1 : getUTCNow().getUTCMonth() + 1;
  }
  return getUTCNow().getUTCMonth() + 1;
}

/**
 * Get the year (YYYY) for a given entity based on canonical month fields.
 * - FinancialRecord: entity.year
 * - Sale: saleDate (fallback createdAt)
 * - Task: doneAt → collectedAt → createdAt
 * - Item: createdAt (active inventory context)
 */
export function getEntityYear(entity: Task | Sale | FinancialRecord | Item): number {
  if ((entity as FinancialRecord).year !== undefined && (entity as FinancialRecord).month !== undefined) {
    return (entity as FinancialRecord).year;
  }
  if ((entity as Sale).saleDate !== undefined) {
    const date = (entity as Sale).saleDate || (entity as any).createdAt;
    return date ? toUTC(date).getUTCFullYear() : getUTCNow().getUTCFullYear();
  }
  if ((entity as any).collectedAt !== undefined || (entity as any).doneAt !== undefined || (entity as any).createdAt !== undefined) {
    const anyEntity = entity as any;
    const date: Date | string | null =
      anyEntity.doneAt || anyEntity.collectedAt || anyEntity.createdAt || null;
    return date ? toUTC(date).getUTCFullYear() : getUTCNow().getUTCFullYear();
  }
  return getUTCNow().getUTCFullYear();
}

/**
 * Determine if an entity should be considered archived relative to a given (month, year).
 * Tasks/sales/financials: historically keyed on isCollected. Items: sold state + month drift.
 */
export function isEntityArchived(
  entity: Task | Sale | FinancialRecord | Item,
  currentMonth: number,
  currentYear: number
): boolean {
  const e = entity as any;
  if (Array.isArray(e.stock) && e.type && !e.totals) {
    const st = String(e.status ?? '').toLowerCase();
    if (!st.includes('sold') && st !== 'collected') return false;
    const m = getEntityMonth(entity);
    const y = getEntityYear(entity);
    return m !== currentMonth || y !== currentYear;
  }
  if (!e.isCollected) return false;
  const m = getEntityMonth(entity);
  const y = getEntityYear(entity);
  return m !== currentMonth || y !== currentYear;
}
