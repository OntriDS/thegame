// workflows/entities-workflows/site.workflow.ts
// Site-specific workflow with ACTIVATED, DEACTIVATED events

import { EntityType, LogEventType, SiteStatus, SiteType } from '@/types/enums';
import { LinkType } from '@/types/enums';
import type { Site, Sale, FinancialRecord, Task, Character } from '@/types/entities';
import { appendEntityLog, updateEntityLeanFields } from '../entities-logging';
import { acquireEffectClaim, resolveEffectClaim, deleteEffectClaim, deleteEffectClaimsByPrefix } from '@/lib/domain/effects/effect-claim-store';
import { EffectClaimStatus } from '@/types/enums';
import { EffectKeys } from '@/data-store/keys';
import { getLinksFor, removeLink } from '@/links/link-registry';
// UTC STANDARDIZATION: Using new UTC utilities
import { getUTCNow, toUTCISOString } from '@/lib/utils/utc-utils';

const STATE_FIELDS = ['status'];

async function syncSaleFinancialsForSiteNameChange(siteId: string): Promise<void> {
  const links = await getLinksFor({ type: EntityType.SITE, id: siteId });
  if (!links.length) return;

  const saleIds = new Set<string>();
  const financialIds = new Set<string>();
  const taskIds = new Set<string>();
  const itemIds = new Set<string>();
  const characterIds = new Set<string>();

  for (const link of links) {
    if (link.linkType === LinkType.SALE_SITE || link.linkType === LinkType.SITE_SALE) {
      if (link.source.type === EntityType.SALE) {
        saleIds.add(link.source.id);
      } else if (link.target.type === EntityType.SALE) {
        saleIds.add(link.target.id);
      }
    }

    if (link.linkType === LinkType.TASK_SITE || link.linkType === LinkType.SITE_TASK) {
      if (link.source.type === EntityType.TASK) {
        taskIds.add(link.source.id);
      } else if (link.target.type === EntityType.TASK) {
        taskIds.add(link.target.id);
      }
    }

    if (link.linkType === LinkType.FINREC_SITE || link.linkType === LinkType.SITE_FINREC) {
      if (link.source.type === EntityType.FINANCIAL) {
        financialIds.add(link.source.id);
      } else if (link.target.type === EntityType.FINANCIAL) {
        financialIds.add(link.target.id);
      }
    }

    if (link.linkType === LinkType.ITEM_SITE || link.linkType === LinkType.SITE_ITEM) {
      if (link.source.type === EntityType.ITEM) {
        itemIds.add(link.source.id);
      } else if (link.target.type === EntityType.ITEM) {
        itemIds.add(link.target.id);
      }
    }

    if (link.linkType === LinkType.CHARACTER_SITE || link.linkType === LinkType.SITE_CHARACTER) {
      if (link.source.type === EntityType.CHARACTER) {
        characterIds.add(link.source.id);
      } else if (link.target.type === EntityType.CHARACTER) {
        characterIds.add(link.target.id);
      }
    }
  }

  const { getSaleById, getFinancialById, getItemById, getCharacterById } = await import('@/data-store/datastore');
  const { getTaskById } = await import('@/data-store/datastore');
  const { updateFinancialRecordsFromSale } = await import('../update-propagation-utils');

  for (const characterId of characterIds) {
    try {
      const character = await getCharacterById(characterId) as Character | null;
      if (!character) continue;

      const characterLinks = await getLinksFor({ type: EntityType.CHARACTER, id: characterId });
      for (const characterLink of characterLinks) {
        if (characterLink.linkType !== LinkType.SALE_CHARACTER && characterLink.linkType !== LinkType.CHARACTER_SALE) {
          continue;
        }

        if (characterLink.source.type === EntityType.SALE) {
          saleIds.add(characterLink.source.id);
        } else if (characterLink.target.type === EntityType.SALE) {
          saleIds.add(characterLink.target.id);
        }
      }
    } catch (error) {
      console.error('[site.workflow] Failed to resolve CHARACTER_SITE-linked sales for sale refresh', characterId, error);
    }
  }

  if (
    saleIds.size === 0 &&
    financialIds.size === 0 &&
    taskIds.size === 0 &&
    itemIds.size === 0 &&
    characterIds.size === 0
  ) {
    return;
  }

  for (const itemId of itemIds) {
    try {
      const item = await getItemById(itemId);
      if (!item) continue;

      const itemLinks = await getLinksFor({ type: EntityType.ITEM, id: itemId });
      for (const itemLink of itemLinks) {
        if (itemLink.linkType !== LinkType.ITEM_SALE) {
          continue;
        }

        if (itemLink.source.type === EntityType.SALE) {
          saleIds.add(itemLink.source.id);
        } else if (itemLink.target.type === EntityType.SALE) {
          saleIds.add(itemLink.target.id);
        }
      }
    } catch (error) {
      console.error('[site.workflow] Failed to resolve ITEM_SITE-linked sales for sale refresh', itemId, error);
    }
  }

  for (const taskId of taskIds) {
    try {
      const task = await getTaskById(taskId) as Task | null;
      if (!task || !task.siteId || task.siteId !== siteId) {
        continue;
      }

      const taskLinks = await getLinksFor({ type: EntityType.TASK, id: taskId });
      for (const taskLink of taskLinks) {
        if (taskLink.linkType !== LinkType.SALE_TASK) {
          continue;
        }

        if (taskLink.source.type === EntityType.SALE) {
          saleIds.add(taskLink.source.id);
        } else if (taskLink.target.type === EntityType.SALE) {
          saleIds.add(taskLink.target.id);
        }
      }
    } catch (error) {
      console.error('[site.workflow] Failed to resolve TASK_SITE-linked sales for sale refresh', taskId, error);
    }
  }

  for (const saleId of saleIds) {
    try {
      const sale = await getSaleById(saleId) as Sale | null;
      if (!sale || !sale.siteId || sale.siteId !== siteId) continue;

      await updateFinancialRecordsFromSale(sale, sale);
    } catch (error) {
      console.error('[site.workflow] Failed to refresh sale-linked financial records for sale', saleId, error);
    }
  }

  for (const financialId of financialIds) {
    try {
      const financial = await getFinancialById(financialId) as FinancialRecord | null;
      if (!financial) continue;
      const financialLinks = await getLinksFor({ type: EntityType.FINANCIAL, id: financialId });
      const saleLink = financialLinks.find((link: any) =>
        (link.linkType === LinkType.SALE_FINREC && link.source?.type === EntityType.SALE) ||
        (link.linkType === LinkType.FINREC_SALE && link.target?.type === EntityType.SALE)
      ) as any;
      const sourceSaleId = saleLink?.source?.type === EntityType.SALE ? saleLink.source.id :
        saleLink?.target?.type === EntityType.SALE ? saleLink.target.id : null;
      if (!sourceSaleId || saleIds.has(sourceSaleId)) continue;

      const sourceSale = await getSaleById(sourceSaleId);
      if (!sourceSale || !sourceSale.siteId || sourceSale.siteId !== siteId) continue;

      await updateFinancialRecordsFromSale(sourceSale, sourceSale);
    } catch (error) {
      console.error('[site.workflow] Failed to refresh sale-linked financial record for finrec', financialId, error);
    }
  }
}

export async function onSiteUpsert(site: Site, previousSite?: Site): Promise<void> {
  // New site creation
  if (!previousSite) {
    const effectKey = EffectKeys.created('site', site.id);
    const claim = await acquireEffectClaim({
      idempotencyKey: effectKey,
      ownerId: `site-workflow-${site.id}`,
      commandId: `upsert-${site.id}`,
      leaseSeconds: 60
    });
    if (!claim) return;
    
    // Build CREATED log payload with standard pattern (name, type, status, then type-specific fields)
    const logPayload: any = {
      name: site.name || 'Unnamed Site',
      type: site.type || 'UNKNOWN',
      status: site.status || SiteStatus.ACTIVE
    };
    
    // Add description if present
    if (site.description) {
      logPayload.description = site.description;
    }
    
    // Add type-specific metadata fields based on site type
    if (site.type) {
      if (site.type === SiteType.PHYSICAL) {
        logPayload.businessType = site.subtype;
        if (site.settlementId) {
          logPayload.settlementId = site.settlementId;
        }
      } else if (site.type === SiteType.DIGITAL_SITE) {
        logPayload.digitalType = site.subtype;
      } else if (site.type === SiteType.SYSTEM) {
        logPayload.systemType = site.subtype;
      }
    }
    
    await appendEntityLog(EntityType.SITE, site.id, LogEventType.CREATED, logPayload);
    await resolveEffectClaim({
      idempotencyKey: effectKey,
      leaseToken: claim.leaseToken,
      status: EffectClaimStatus.COMPLETED
    });
    return;
  }
  
  // Status changes (Active <-> Inactive) - log as ACTIVATED or DEACTIVATED
  if (previousSite.status !== site.status) {
    if (site.status === SiteStatus.ACTIVE) {
      await appendEntityLog(EntityType.SITE, site.id, LogEventType.ACTIVATED, {
        name: site.name,
        activatedAt: toUTCISOString(getUTCNow())
      });
    } else if (site.status === SiteStatus.INACTIVE) {
      await appendEntityLog(EntityType.SITE, site.id, LogEventType.DEACTIVATED, {
        name: site.name,
        deactivatedAt: toUTCISOString(getUTCNow())
      });
    }
  }
  
  // Lean identity fields changed — cascade patch ALL log entries across ALL months and events
  if (previousSite) {
    const getLeanFields = (s: Site) => {
      return {
        name: s.name || 'Unknown',
        type: s.type || 'Unknown',
        businessType: s.subtype || 'Unknown',
        url: s.url || '',
        settlementId: s.settlementId || null
      };
    };

    const oldLean = getLeanFields(previousSite);
    const newLean = getLeanFields(site);

    const leanFieldsChanged =
      oldLean.name !== newLean.name ||
      oldLean.type !== newLean.type ||
      oldLean.businessType !== newLean.businessType ||
      oldLean.url !== newLean.url ||
      oldLean.settlementId !== newLean.settlementId;

    if (leanFieldsChanged) {
      await updateEntityLeanFields(EntityType.SITE, site.id, {
        name: site.name,
        type: site.type,
        businessType: site.subtype,
        url: site.url,
        settlementId: site.settlementId
      });
    }
  }
}

export async function removeSiteEffectsOnDelete(siteId: string): Promise<void> {
  await deleteEffectClaim(EffectKeys.created('site', siteId));
  const { removeLogEntriesAcrossMonths } = await import('../entities-logging');
  await removeLogEntriesAcrossMonths(EntityType.SITE, entry => entry.entityId === siteId);
}
