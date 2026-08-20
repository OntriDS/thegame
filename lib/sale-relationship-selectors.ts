import type { Sale } from '@/types/entities';
import { EntityType, LinkType } from '@/types/enums';
import { getLinksFor } from '@/links/link-registry';
import { getSaleCharacterId } from '@/lib/sale-character-id';

const normalizeId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/** Resolve the Sale customer from SALE_CHARACTER(customer). */
export async function resolveSaleCharacterId(sale?: Sale | null): Promise<string | null> {
  if (!sale) return null;
  const links = await getLinksFor({ type: EntityType.SALE, id: sale.id });
  const linked = links.find(
    link => link.linkType === LinkType.SALE_CHARACTER &&
      link.target.type === EntityType.CHARACTER &&
      (!link.relationship || link.relationship === 'customer')
  );
  return normalizeId(linked?.target.id) ?? getSaleCharacterId(sale);
}

/** Resolve the Sale owner Character from SALE_CHARACTER(owner). */
export async function resolveSaleOwnerId(sale?: Sale | null): Promise<string | null> {
  if (!sale) return null;
  const links = await getLinksFor({ type: EntityType.SALE, id: sale.id });
  const linked = links.find(
    link => link.linkType === LinkType.SALE_CHARACTER &&
      link.relationship === 'owner' &&
      link.target.type === EntityType.CHARACTER
  );
  return normalizeId(linked?.target.id) ?? normalizeId(sale.ownerId);
}
