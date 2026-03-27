// workflows/site-movement-utils.ts
// Site Movement Link Creation Utilities

import { makeLink } from '@/links/links-workflows';
import { createLink } from '@/links/link-registry';
import { LinkType, EntityType } from '@/types/enums';

/**
 * Create SITE_SITE link when items move between sites
 * Called explicitly from item movement operations
 * 
 * Pattern: Standalone workflow utility (like createItemFromTask)
 * NOT called from processSiteEffects (Sites don't have movement DNA)
 */
export async function createSiteMovementLink(
  fromSiteId: string,
  toSiteId: string,
  _movement: {
    itemId: string;
    quantity: number;
    movedAt: Date;
  }
): Promise<void> {
  const link = makeLink(
    LinkType.SITE_SITE,
    { type: EntityType.SITE, id: fromSiteId },
    { type: EntityType.SITE, id: toSiteId }
  );

  await createLink(link);
}
