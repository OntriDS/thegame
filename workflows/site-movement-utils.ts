// workflows/site-movement-utils.ts
// Site Movement Link Creation Utilities

import { makeLink } from '@/links/links-workflows';
import { createLink } from '@/links/link-registry';
import { appendLinkLog } from '@/links/links-logging';
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
  metadata: {
    itemId: string;
    quantity: number;
    movedAt: Date;
  }
): Promise<void> {
  const link = makeLink(
    LinkType.SITE_SITE,
    { type: EntityType.SITE, id: fromSiteId },
    { type: EntityType.SITE, id: toSiteId },
    {
      reason: 'inventory_movement',
      itemId: metadata.itemId,
      quantity: metadata.quantity,
      movedAt: metadata.movedAt
    }
  );
  
  await createLink(link);
  await appendLinkLog(link, 'created');
}
