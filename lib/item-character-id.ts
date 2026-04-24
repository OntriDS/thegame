import type { Item } from '@/types/entities';

const normalizeId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

export function getItemCharacterId(item?: Item | null): string | null {
  if (!item) return null;
  return normalizeId(item.characterId);
}

