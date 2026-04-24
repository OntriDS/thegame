import type { Sale } from '@/types/entities';

const normalizeId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/** Customer / counterparty character on a Sale (canonical: `Sale.characterId`). */
export function getSaleCharacterId(sale?: Sale | null): string | null {
  if (!sale) return null;
  return normalizeId(sale.characterId);
}
