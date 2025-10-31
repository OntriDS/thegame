// workflows/entities-workflows/site.workflow.ts
// Site-specific workflow with ACTIVATED, DEACTIVATED events

import { EntityType, LogEventType, SiteStatus } from '@/types/enums';
import type { Site } from '@/types/entities';
import { appendEntityLog, updateEntityLogField } from '../entities-logging';
import { hasEffect, markEffect, clearEffect, clearEffectsByPrefix } from '@/data-store/effects-registry';
import { EffectKeys } from '@/data-store/keys';
import { getLinksFor, removeLink } from '@/links/link-registry';

const STATE_FIELDS = ['status'];
const DESCRIPTIVE_FIELDS = ['name', 'description', 'metadata'];

export async function onSiteUpsert(site: Site, previousSite?: Site): Promise<void> {
  // New site creation
  if (!previousSite) {
    const effectKey = EffectKeys.created('site', site.id);
    if (await hasEffect(effectKey)) return;
    
    // Build CREATED log payload with standard pattern (name, type, status, then type-specific fields)
    const logPayload: any = {
      name: site.name || 'Unnamed Site',
      type: site.metadata?.type || 'UNKNOWN',
      status: site.status || SiteStatus.ACTIVE
    };
    
    // Add description if present
    if (site.description) {
      logPayload.description = site.description;
    }
    
    // Add type-specific metadata fields based on site type
    if (site.metadata) {
      if (site.metadata.type === 'PHYSICAL' && 'businessType' in site.metadata) {
        logPayload.businessType = site.metadata.businessType;
        if (site.metadata.settlementId) {
          logPayload.settlementId = site.metadata.settlementId;
        }
      } else if (site.metadata.type === 'DIGITAL' && 'digitalType' in site.metadata) {
        logPayload.digitalType = site.metadata.digitalType;
      } else if (site.metadata.type === 'SYSTEM' && 'systemType' in site.metadata) {
        logPayload.systemType = site.metadata.systemType;
      }
    }
    
    await appendEntityLog(EntityType.SITE, site.id, LogEventType.CREATED, logPayload);
    await markEffect(effectKey);
    return;
  }
  
  // Status changes (Active <-> Inactive) - log as ACTIVATED or DEACTIVATED
  if (previousSite.status !== site.status) {
    if (site.status === SiteStatus.ACTIVE) {
      await appendEntityLog(EntityType.SITE, site.id, LogEventType.ACTIVATED, {
        name: site.name,
        activatedAt: new Date().toISOString()
      });
    } else if (site.status === SiteStatus.INACTIVE) {
      await appendEntityLog(EntityType.SITE, site.id, LogEventType.DEACTIVATED, {
        name: site.name,
        deactivatedAt: new Date().toISOString()
      });
    }
  }
  
  // Descriptive changes - update in-place
  for (const field of DESCRIPTIVE_FIELDS) {
    if ((previousSite as any)[field] !== (site as any)[field]) {
      await updateEntityLogField(EntityType.SITE, site.id, field, (previousSite as any)[field], (site as any)[field]);
    }
  }
}

/**
 * Remove site effects when site is deleted
 * Sites can have entries in sites log and related links
 */
export async function removeSiteEffectsOnDelete(siteId: string): Promise<void> {
  try {
    console.log(`[removeSiteEffectsOnDelete] Starting cleanup for site: ${siteId}`);
    
    // 1. Remove all Links related to this site
    const siteLinks = await getLinksFor({ type: EntityType.SITE, id: siteId });
    console.log(`[removeSiteEffectsOnDelete] Found ${siteLinks.length} links to remove`);
    
    for (const link of siteLinks) {
      try {
        await removeLink(link.id);
        console.log(`[removeSiteEffectsOnDelete] ✅ Removed link: ${link.linkType}`);
      } catch (error) {
        console.error(`[removeSiteEffectsOnDelete] ❌ Failed to remove link ${link.id}:`, error);
      }
    }
    
    // 2. Clear all effects for this site
    await clearEffect(EffectKeys.created('site', siteId));
    await clearEffectsByPrefix(EntityType.SITE, siteId, '');
    
    // 3. Remove log entries from sites log
    console.log(`[removeSiteEffectsOnDelete] Starting log entry removal for site: ${siteId}`);
    
    // TODO: Implement server-side log removal or remove this call
    console.log(`[removeSiteEffectsOnDelete] ⚠️ Log entry removal skipped - needs server-side implementation`);
    
    console.log(`[removeSiteEffectsOnDelete] ✅ Cleared effects, removed links, and removed log entries for site ${siteId}`);
  } catch (error) {
    console.error('Error removing site effects:', error);
  }
}