import type { FinancialRecord } from '@/types/entities';

const normalizeId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

export function getFinancialCounterpartyId(record?: FinancialRecord | null): string | null {
  if (!record) return null;
  return normalizeId(record.characterId);
}

