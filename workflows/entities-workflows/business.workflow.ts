// workflows/entities-workflows/business.workflow.ts
// Business-specific workflow - logs to CHARACTER log
// Businesses are infrastructure entities that belong to characters

import { EntityType, LogEventType } from '@/types/enums';
import type { Business } from '@/types/entities';
import { appendEntityLog } from '../entities-logging';
import { hasEffect, markEffect } from '@/data-store/effects-registry';
import { EffectKeys } from '@/data-store/keys';

/**
 * Business workflow - Logs to CHARACTER log
 * Businesses are infrastructure entities that belong to characters
 */
export async function onBusinessUpsert(business: Business, previousBusiness?: Business): Promise<void> {
    // New business creation/linking
    if (!previousBusiness) {
        const effectKey = EffectKeys.created('business', business.id);
        if (await hasEffect(effectKey)) {
            return; // Already logged
        }

        // Log to CHARACTER log (businesses are infra entities of characters)
        if (business.linkedCharacterId) {
            await appendEntityLog(
                EntityType.CHARACTER,
                business.linkedCharacterId,
                LogEventType.BUSINESS_LINKED,
                {
                    businessId: business.id,
                    businessName: business.name,
                    businessType: business.type,
                    linkedAt: new Date().toISOString()
                }
            );
        }

        await markEffect(effectKey);
    }
}
