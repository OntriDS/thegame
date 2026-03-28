// links/links-workflows.ts
// Universal entry point for creating links from entities (property inspection)

import { EntityType, LinkType, LogEventType, TaskStatus } from '@/types/enums';
import type { Task, Item, Sale, FinancialRecord, Character, Player, Site, Link } from '@/types/entities';
import { createLink, removeLink, getLinksFor } from './link-registry';
import { getItemsBySourceTaskId, getItemsBySourceRecordId, getItemById } from '@/data-store/repositories/item.repo';
import { getCharacterById, getBusinessById } from '@/data-store/repositories/character.repo';
import { getTaskById } from '@/data-store/repositories/task.repo';
import { v4 as uuid } from 'uuid';
import { appendEntityLog } from '@/workflows/entities-logging';

export function makeLink(linkType: LinkType, source: { type: EntityType; id: string }, target: { type: EntityType; id: string }): Link {
  return {
    id: uuid(),
    linkType,
    source,
    target,
    createdAt: new Date(),
  };
}


export async function processLinkEntity(entity: any, entityType: EntityType): Promise<void> {
  switch (entityType) {
    case EntityType.TASK:
      await processTaskEffects(entity as Task);
      break;
    case EntityType.ITEM:
      await processItemEffects(entity as Item);
      break;
    case EntityType.SALE:
      await processSaleEffects(entity as Sale);
      break;
    case EntityType.FINANCIAL:
      await processFinancialEffects(entity as FinancialRecord);
      break;
    case EntityType.CHARACTER:
      await processCharacterEffects(entity as Character);
      break;
    case EntityType.PLAYER:
      await processPlayerEffects(entity as Player);
      break;
    case EntityType.SITE:
      // Sites don't create links when saved - they're link targets only
      // SITE_SITE links created by movement operations (workflows/site-movement-utils.ts)
      break;
    default:
      return;
  }
}

export async function processTaskEffects(task: Task): Promise<void> {
  if (task.siteId) {
    const l = makeLink(LinkType.TASK_SITE, { type: EntityType.TASK, id: task.id }, { type: EntityType.SITE, id: task.siteId });
    await createLink(l);
  }
  if (task.outputItemId) {
    const l = makeLink(LinkType.TASK_ITEM, { type: EntityType.TASK, id: task.id }, { type: EntityType.ITEM, id: task.outputItemId });
    await createLink(l);
  }

  // TASK_CHARACTER link (from customerCharacterId)
  // NOTE: playerCharacterId is internal assignment, not logged as a character action
  if (task.customerCharacterId) {
    const l = makeLink(
      LinkType.TASK_CHARACTER,
      { type: EntityType.TASK, id: task.id },
      { type: EntityType.CHARACTER, id: task.customerCharacterId }
    );
    const wasCreated = await createLink(l);

    if (wasCreated) {
      const character = await getCharacterById(task.customerCharacterId);

      // Log in character log (customer requested task)
      await appendEntityLog(EntityType.CHARACTER, task.customerCharacterId, LogEventType.REQUESTED_TASK, {
        name: character?.name || 'Unknown Character',
        roles: character?.roles || [],
        taskId: task.id,
        taskName: task.name,
        taskType: task.type,
        station: task.station
      });
    }
  }

  // Create TASK_ITEM link for items created from task emissary fields
  if (task.outputItemType && task.outputQuantity && task.status === TaskStatus.DONE) {
    // Find the item created by this task (optimized query)
    const taskItems = await getItemsBySourceTaskId(task.id);
    const createdItem = taskItems.find(item => item.type === task.outputItemType);

    if (createdItem) {
      const l = makeLink(
        LinkType.TASK_ITEM,
        { type: EntityType.TASK, id: task.id },
        { type: EntityType.ITEM, id: createdItem.id }
      );
      await createLink(l);
    }
  }

  // Note: TASK_PLAYER handled by points-rewards-utils.ts ✅
  // Note: TASK_FINREC handled by financial-record-utils.ts ✅
}

export async function processItemEffects(item: Item): Promise<void> {
  // Get existing links for cleanup
  const existingLinks = await getLinksFor({ type: EntityType.ITEM, id: item.id });

  // ITEM_TASK link
  if (item.sourceTaskId) {
    // Remove old ITEM_TASK links (in case sourceTaskId changed)
    const oldTaskLinks = existingLinks.filter(l => l.linkType === LinkType.ITEM_TASK);
    for (const oldLink of oldTaskLinks) {
      if (oldLink.target.id !== item.sourceTaskId) {
        await removeLink(oldLink.id);
      }
    }

    const l = makeLink(LinkType.ITEM_TASK, { type: EntityType.ITEM, id: item.id }, { type: EntityType.TASK, id: item.sourceTaskId });
    await createLink(l);
  }

  // ITEM_SITE links (for stock locations)
  // Remove all old ITEM_SITE links, then create new ones
  const oldSiteLinks = existingLinks.filter(l => l.linkType === LinkType.ITEM_SITE);
  for (const oldLink of oldSiteLinks) {
    await removeLink(oldLink.id);
  }

  // Create fresh ITEM_SITE links for current stock
  for (const s of item.stock || []) {
    if (s.siteId && s.siteId !== 'None') { // Skip invalid "None" site IDs
      const l = makeLink(LinkType.ITEM_SITE, { type: EntityType.ITEM, id: item.id }, { type: EntityType.SITE, id: s.siteId });
      await createLink(l);
    }
  }

  // ITEM_CHARACTER link
  if (item.ownerCharacterId) {
    const l = makeLink(
      LinkType.ITEM_CHARACTER,
      { type: EntityType.ITEM, id: item.id },
      { type: EntityType.CHARACTER, id: item.ownerCharacterId }
    );
    const wasCreated = await createLink(l);

    if (wasCreated) {
      const character = await getCharacterById(item.ownerCharacterId);
      let sourceTaskName: string | undefined;

      // Get source task name if available
      if (item.sourceTaskId) {
        const sourceTask = await getTaskById(item.sourceTaskId);
        if (sourceTask) {
          sourceTaskName = sourceTask.name;
        }
      }

      // Log in character log (customer owns item)
      await appendEntityLog(EntityType.CHARACTER, item.ownerCharacterId, LogEventType.OWNS_ITEM, {
        name: character?.name || 'Unknown Character',
        roles: character?.roles || [],
        itemId: item.id,
        itemName: item.name,
        itemType: item.type,
        sourceTaskId: item.sourceTaskId,
        sourceTaskName: sourceTaskName
      });
    }
  } else {
    // If no owner, remove all ITEM_CHARACTER links
    const oldCharacterLinks = existingLinks.filter(l => l.linkType === LinkType.ITEM_CHARACTER);
    for (const oldLink of oldCharacterLinks) {
      await removeLink(oldLink.id);
    }
  }

  // Note: ITEM_SALE links handled in processSaleEffects (from sale.lines)
}

export async function processSaleEffects(sale: Sale): Promise<void> {
  const existingLinks = await getLinksFor({ type: EntityType.SALE, id: sale.id });

  const allowedSaleCharBusTargets = new Set(
    [sale.customerId, sale.associateId, sale.partnerId].filter(Boolean) as string[]
  );
  for (const l of existingLinks) {
    if (
      (l.linkType === LinkType.SALE_CHARACTER || l.linkType === LinkType.SALE_BUSINESS) &&
      !allowedSaleCharBusTargets.has(l.target.id)
    ) {
      await removeLink(l.id);
    }
  }

  if (sale.siteId) {
    const l = makeLink(LinkType.SALE_SITE, { type: EntityType.SALE, id: sale.id }, { type: EntityType.SITE, id: sale.siteId });
    await createLink(l);
  }

  if (sale.customerId) {
    const l = makeLink(
      LinkType.SALE_CHARACTER,
      { type: EntityType.SALE, id: sale.id },
      { type: EntityType.CHARACTER, id: sale.customerId }
    );
    const wasCreated = await createLink(l);

    if (wasCreated) {
      const character = await getCharacterById(sale.customerId);
      await appendEntityLog(EntityType.CHARACTER, sale.customerId, LogEventType.PURCHASED, {
        name: character?.name || 'Unknown Character',
        roles: character?.roles || [],
        saleId: sale.id,
        saleName: sale.counterpartyName || sale.name,
        saleType: sale.type,
        totalRevenue: sale.totals.totalRevenue
      });
    }
  }

  if (sale.associateId) {
    let targetType: EntityType | null = null;
    let linkType: LinkType | null = null;
    const character = await getCharacterById(sale.associateId);
    if (character) {
      targetType = EntityType.CHARACTER;
      linkType = LinkType.SALE_CHARACTER;
    } else {
      const business = await getBusinessById(sale.associateId);
      if (business) {
        targetType = EntityType.BUSINESS;
        linkType = LinkType.SALE_BUSINESS;
      }
    }
    if (targetType && linkType) {
      const l = makeLink(
        linkType,
        { type: EntityType.SALE, id: sale.id },
        { type: targetType, id: sale.associateId }
      );
      await createLink(l);
    } else {
      console.warn(
        `[processSaleEffects] Associate ID ${sale.associateId} not found as Character or Business. Skipping link creation.`
      );
    }
  }

  if (sale.partnerId) {
    let targetType: EntityType | null = null;
    let linkType: LinkType | null = null;
    const character = await getCharacterById(sale.partnerId);
    if (character) {
      targetType = EntityType.CHARACTER;
      linkType = LinkType.SALE_CHARACTER;
    } else {
      const business = await getBusinessById(sale.partnerId);
      if (business) {
        targetType = EntityType.BUSINESS;
        linkType = LinkType.SALE_BUSINESS;
      }
    }
    if (targetType && linkType) {
      const l = makeLink(linkType, { type: EntityType.SALE, id: sale.id }, { type: targetType, id: sale.partnerId });
      await createLink(l);
    } else {
      console.warn(
        `[processSaleEffects] Partner ID ${sale.partnerId} not found as Character or Business. Skipping link creation.`
      );
    }
  }

  if (sale.lines && sale.lines.length > 0) {
    for (const line of sale.lines) {
      if (line.kind === 'item' && line.itemId) {
        const item = await getItemById(line.itemId);
        if (!item) {
          console.warn(
            `[processSaleEffects] SALE_ITEM skipped — item not found: ${line.itemId} (sale ${sale.id}). ` +
              `Repair data or recreate sold row; save will not fail.`
          );
          continue;
        }
        const l = makeLink(
          LinkType.SALE_ITEM,
          { type: EntityType.SALE, id: sale.id },
          { type: EntityType.ITEM, id: line.itemId }
        );
        await createLink(l);
      }
    }
  }

  if (sale.sourceTaskId) {
    const l = makeLink(
      LinkType.SALE_TASK,
      { type: EntityType.SALE, id: sale.id },
      { type: EntityType.TASK, id: sale.sourceTaskId }
    );
    await createLink(l);
  }
}

export async function processFinancialEffects(fin: FinancialRecord): Promise<void> {
  // Get existing links for cleanup
  const existingLinks = await getLinksFor({ type: EntityType.FINANCIAL, id: fin.id });

  if (fin.siteId) {
    const l = makeLink(LinkType.FINREC_SITE, { type: EntityType.FINANCIAL, id: fin.id }, { type: EntityType.SITE, id: fin.siteId });
    await createLink(l);
  }

  // FINREC_CHARACTER link
  if (fin.customerCharacterId) {
    const l = makeLink(
      LinkType.FINREC_CHARACTER,
      { type: EntityType.FINANCIAL, id: fin.id },
      { type: EntityType.CHARACTER, id: fin.customerCharacterId }
    );
    const wasCreated = await createLink(l);

    if (wasCreated) {
      const character = await getCharacterById(fin.customerCharacterId);

      // Log in character log (customer transacted)
      await appendEntityLog(EntityType.CHARACTER, fin.customerCharacterId, LogEventType.TRANSACTED, {
        name: character?.name || 'Unknown Character',
        roles: character?.roles || [],
        financialId: fin.id,
        financialName: fin.name,
        type: fin.type,
        cost: fin.cost,
        revenue: fin.revenue
      });
    }
  }

  // Create FINREC_ITEM link for items created from financial record emissary fields
  if ((fin.outputItemType || fin.outputItemId) && fin.outputQuantity) {
    // Remove previous FINREC_ITEM links to avoid duplicates when switching items
    const existingItemLinks = existingLinks.filter(link => link.linkType === LinkType.FINREC_ITEM);
    for (const link of existingItemLinks) {
      await removeLink(link.id);
    }

    let createdItem: Item | undefined;

    if (fin.outputItemId) {
      createdItem = await getItemById(fin.outputItemId) || undefined;
    }

    if (!createdItem) {
      const recordItems = await getItemsBySourceRecordId(fin.id);
      createdItem = recordItems.find(item => item.type === fin.outputItemType);
    }

    if (createdItem) {
      const l = makeLink(
        LinkType.FINREC_ITEM,
        { type: EntityType.FINANCIAL, id: fin.id },
        { type: EntityType.ITEM, id: createdItem.id }
      );
      await createLink(l);
    }
  }

  // Note: FINREC_TASK handled by financial-record-utils.ts ✅
  // Note: FINREC_PLAYER handled by points-rewards-utils.ts ✅
}

export async function processCharacterEffects(character: Character): Promise<void> {
  // CHARACTER_PLAYER link
  if (character.playerId) {
    const link = makeLink(
      LinkType.CHARACTER_PLAYER,
      { type: EntityType.CHARACTER, id: character.id },
      { type: EntityType.PLAYER, id: character.playerId }
    );
    await createLink(link);
  }

  // CHARACTER_SITE link (if character has home site)
  if (character.siteId) {
    const link = makeLink(
      LinkType.CHARACTER_SITE,
      { type: EntityType.CHARACTER, id: character.id },
      { type: EntityType.SITE, id: character.siteId }
    );
    await createLink(link);
  }
}

export async function processPlayerEffects(player: Player): Promise<void> {
  // PLAYER_CHARACTER links (array of characters)
  if (player.characterIds && player.characterIds.length > 0) {
    for (const characterId of player.characterIds) {
      const link = makeLink(
        LinkType.PLAYER_CHARACTER,
        { type: EntityType.PLAYER, id: player.id },
        { type: EntityType.CHARACTER, id: characterId }
      );
      await createLink(link);
    }
  }

  // Note: PLAYER_SITE links not implemented - Player doesn't have siteId field
}

// Sites don't create links when saved - they're primarily link targets
// SITE_SITE links are created by movement operations (see workflows/site-movement-utils.ts)
// No processSiteEffects function needed - sites have no link-creating properties


