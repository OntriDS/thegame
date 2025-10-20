// workflows/entities-workflows/site.workflow.ts
// Site-specific workflow with ACTIVATED, DEACTIVATED events

import type { Site } from '@/types/entities';
import { appendEntityLog, updateEntityLogField } from '../entities-logging';
import { hasEffect, markEffect, clearEffect, clearEffectsByPrefix } from '@/data-store/effects-registry';
import { ClientAPI } from '@/lib/client-api';

const STATE_FIELDS = ['isActive', 'status'];
const DESCRIPTIVE_FIELDS = ['name', 'description', 'metadata'];

export async function onSiteUpsert(site: Site, previousSite?: Site): Promise<void> {
  // New site creation
  if (!previousSite) {
    const effectKey = `site:${site.id}:created`;
    if (await hasEffect(effectKey)) return;
    
    await appendEntityLog('site', site.id, 'CREATED', { 
      name: site.name, 
      type: site.metadata.type,
      isActive: site.isActive
    });
    await markEffect(effectKey);
    return;
  }
  
  // Activation status changes
  if (previousSite.isActive !== site.isActive) {
    if (site.isActive) {
      await appendEntityLog('site', site.id, 'ACTIVATED', {
        name: site.name,
        activatedAt: new Date().toISOString()
      });
    } else {
      await appendEntityLog('site', site.id, 'DEACTIVATED', {
        name: site.name,
        deactivatedAt: new Date().toISOString()
      });
    }
  }
  
  // Status changes - UPDATED event
  if (previousSite.status !== site.status) {
    await appendEntityLog('site', site.id, 'UPDATED', {
      name: site.name,
      oldStatus: previousSite.status,
      newStatus: site.status
    });
  }
  
  // Descriptive changes - update in-place
  for (const field of DESCRIPTIVE_FIELDS) {
    if ((previousSite as any)[field] !== (site as any)[field]) {
      await updateEntityLogField('site', site.id, field, (previousSite as any)[field], (site as any)[field]);
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
    const siteLinks = await ClientAPI.getLinksFor({ type: 'site', id: siteId });
    console.log(`[removeSiteEffectsOnDelete] Found ${siteLinks.length} links to remove`);
    
    for (const link of siteLinks) {
      try {
        await ClientAPI.removeLink(link.id);
        console.log(`[removeSiteEffectsOnDelete] ✅ Removed link: ${link.linkType}`);
      } catch (error) {
        console.error(`[removeSiteEffectsOnDelete] ❌ Failed to remove link ${link.id}:`, error);
      }
    }
    
    // 2. Clear all effects for this site
    await clearEffect(`site:${siteId}:created`);
    await clearEffectsByPrefix('site', siteId, '');
    
    // 3. Remove log entries from sites log
    console.log(`[removeSiteEffectsOnDelete] Starting log entry removal for site: ${siteId}`);
    
    const result = await ClientAPI.removeLogEntry('sites', siteId);
    
    if (result.success) {
      console.log(`[removeSiteEffectsOnDelete] ✅ Site log entries removed successfully for site: ${siteId}`);
    } else if (result.message === 'No matching entries found') {
      console.log(`[removeSiteEffectsOnDelete] ⏭️ No log entries found for site: ${siteId} (this is normal)`);
    } else {
      console.error(`[removeSiteEffectsOnDelete] Failed to remove site log entries: ${result.message}`);
    }
    
    console.log(`[removeSiteEffectsOnDelete] ✅ Cleared effects, removed links, and removed log entries for site ${siteId}`);
  } catch (error) {
    console.error('Error removing site effects:', error);
  }
}