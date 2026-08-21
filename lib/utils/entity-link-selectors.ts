import { EntityType, LinkType } from '@/types/enums';

type LinkLike = {
  linkType?: string;
  relationship?: string | null;
  target?: { type?: string; id?: string };
};

export type LinkedCharacterSelection = {
  id: string;
  role: string;
};

const normalized = (value: unknown): string => String(value ?? '').trim().toLowerCase();

/** Resolve a target from a canonical link, optionally constrained by relationship. */
export function getLinkedTargetId(
  links: LinkLike[],
  linkType: LinkType | string,
  targetType: EntityType | string,
  relationship?: string
): string | null {
  const match = links.find((link) =>
    normalized(link.linkType) === normalized(linkType) &&
    normalized(link.target?.type) === normalized(targetType) &&
    (relationship === undefined || normalized(link.relationship) === normalized(relationship)) &&
    Boolean(link.target?.id)
  );

  return match?.target?.id ?? null;
}

export function getLinkedSiteId(
  links: LinkLike[],
  linkType: LinkType | string,
  relationship?: string
): string | null {
  return getLinkedTargetId(links, linkType, EntityType.SITE, relationship);
}

export function getLinkedCharacterId(
  links: LinkLike[],
  linkType: LinkType | string,
  relationship?: string
): string | null {
  return getLinkedTargetId(links, linkType, EntityType.CHARACTER, relationship);
}

/** Resolve the task character selector from canonical links. */
export function getLinkedCharacterSelection(
  links: LinkLike[],
  linkType: LinkType | string,
  relationships: string[] = ['customer', 'beneficiary']
): LinkedCharacterSelection | null {
  const allowed = new Set(relationships.map(normalized));
  const match = links.find((link) =>
    normalized(link.linkType) === normalized(linkType) &&
    normalized(link.target?.type) === normalized(EntityType.CHARACTER) &&
    allowed.has(normalized(link.relationship)) &&
    Boolean(link.target?.id)
  );

  return match?.target?.id
    ? { id: match.target.id, role: normalized(match.relationship) }
    : null;
}
