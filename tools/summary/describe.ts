import { SummaryRepository } from '@/data-store/repositories/summary.repo';
import { EntityType } from '@/types/enums';
import { buildMonthIndexKey } from '@/data-store/keys';
import { formatArchiveMonthKeyUTCFromParts } from '@/lib/utils/utc-utils';
import { kvSMembers } from '@/lib/utils/kv';

function normalizeMonthKeyForSummary(monthKey: string) {
  const value = String(monthKey).trim();
  if (!value) return null;
  const mmYyyyMatch = value.match(/^(\d{2})-(\d{4})$/);
  const mmYyMatch = value.match(/^(\d{2})-(\d{2})$/);
  const yyyyMmMatch = value.match(/^(\d{4})-(\d{2})$/);
  if (!mmYyyyMatch && !mmYyMatch && !yyyyMmMatch) return null;
  const monthText = mmYyyyMatch ? mmYyyyMatch[1] : mmYyMatch ? mmYyMatch[1] : yyyyMmMatch ? yyyyMmMatch[2] : '';
  const yearText = mmYyyyMatch ? mmYyyyMatch[2] : mmYyMatch ? `20${mmYyMatch[2]}` : yyyyMmMatch ? yyyyMmMatch[1] : '';
  return formatArchiveMonthKeyUTCFromParts(Number(yearText), Number(monthText));
}

export async function execute(parameters: any) {
  const normalizedMonthKey = normalizeMonthKeyForSummary(parameters.monthKey);
  if (!normalizedMonthKey) throw new Error('Invalid monthKey format.');
  const [salesIds, taskIds, financialIds, itemIds, hash, rawHash] = await Promise.all([
    kvSMembers(buildMonthIndexKey(EntityType.SALE, normalizedMonthKey)),
    kvSMembers(buildMonthIndexKey(EntityType.TASK, normalizedMonthKey)),
    kvSMembers(buildMonthIndexKey(EntityType.FINANCIAL, normalizedMonthKey)),
    kvSMembers(buildMonthIndexKey(EntityType.ITEM, normalizedMonthKey)),
    SummaryRepository.getSummary(normalizedMonthKey),
    SummaryRepository.getRawSummary(normalizedMonthKey),
  ]);
  return {
    monthKey: normalizedMonthKey,
    hashExists: rawHash !== null,
    hash,
    counts: {
      sales: (salesIds || []).length,
      tasks: (taskIds || []).length,
      financials: (financialIds || []).length,
      items: (itemIds || []).length,
    }
  };
}