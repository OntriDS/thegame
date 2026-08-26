// workflows/entities-workflows/business.workflow.ts
// Business-specific workflow - logs to CHARACTER log
// Businesses are infrastructure entities that belong to characters

import { EntityType, LinkType, LogEventType } from '@/types/enums';
import type { Business } from '@/types/entities';
import { appendEntityLog } from '../entities-logging';
import { acquireEffectClaim, resolveEffectClaim } from '@/lib/domain/effects/effect-claim-store';
import { EffectClaimStatus } from '@/types/enums';
import { EffectKeys } from '@/data-store/keys';
import { getLinksFor } from '@/links/link-registry';

/**
 * Business workflow - Logs to CHARACTER log
 * Businesses are infrastructure entities that belong to characters
 */
export async function onBusinessUpsert(business: Business, previousBusiness?: Business): Promise<void> {
    // New business creation/linking
    if (!previousBusiness) {
        const effectKey = EffectKeys.created('business', business.id);
        const claim = await acquireEffectClaim({
            idempotencyKey: effectKey,
            ownerId: `business-workflow-${business.id}`,
            commandId: `upsert-${business.id}`,
            leaseSeconds: 60
        });

        if (!claim) {
            return; // Already processed or locked
        }

        // Log to the owning Character log. Ownership is resolved from the canonical Link.
        const businessLinks = await getLinksFor({ type: EntityType.BUSINESS, id: business.id });
        const ownerLink = businessLinks.find((link) =>
            link.linkType === LinkType.CHARACTER_BUSINESS &&
            link.source.type === EntityType.CHARACTER &&
            link.target.type === EntityType.BUSINESS &&
            link.target.id === business.id
        );
        if (ownerLink) {
            await appendEntityLog(
                EntityType.CHARACTER,
                ownerLink.source.id,
                LogEventType.BUSINESS_LINKED,
                {
                    name: business.name || 'Unknown Business',
                    roles: [] // Keep the strict schema happy
                }
            );
        }

        await resolveEffectClaim({
            idempotencyKey: effectKey,
            leaseToken: claim.leaseToken,
            status: EffectClaimStatus.COMPLETED
        });
    }
}
