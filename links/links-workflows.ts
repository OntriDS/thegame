// links/links-workflows.ts
// Universal entry point for creating links from entities (property inspection)

import { EntityType, LinkType } from '@/types/enums';
import type { Task, Item, Sale, FinancialRecord, Character, Player, Site, Link } from '@/types/entities';
import { createLink, removeLink, getLinksFor } from './link-registry';
import { appendLinkLog } from './links-logging';
import { getAllItems } from '@/data-store/datastore';
import { v4 as uuid } from 'uuid';
import { isProcessing, startProcessing, endProcessing } from '@/data-store/effects-registry';

export function makeLink(linkType: LinkType, source: { type: EntityType; id: string }, target: { type: EntityType; id: string }, metadata?: Record<string, any>): Link {
  return {
    id: uuid(),
    linkType,
    source,
    target,
    createdAt: new Date(),
    metadata,
  };
}

export async function processLinkEntity(entity: any, entityType: EntityType): Promise<void> {
  // Check for circular reference
  if (await isProcessing(entityType, entity.id)) {
    console.warn(`[CircuitBreaker] Already processing ${entityType}:${entity.id} - skipping to prevent circular reference`);
    return;
  }
  
  try {
    await startProcessing(entityType, entity.id);
    
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
  } finally {
    await endProcessing(entityType, entity.id);
  }
}

export async function processTaskEffects(task: Task): Promise<void> {
  if (task.siteId) {
    const l = makeLink(LinkType.TASK_SITE, { type: EntityType.TASK, id: task.id }, { type: EntityType.SITE, id: task.siteId });
    await createLink(l);
    await appendLinkLog(l, 'created');
  }
  if (task.outputItemId) {
    const l = makeLink(LinkType.TASK_ITEM, { type: EntityType.TASK, id: task.id }, { type: EntityType.ITEM, id: task.outputItemId });
    await createLink(l);
    await appendLinkLog(l, 'created');
  }
  
  // TASK_CHARACTER link
  if (task.playerCharacterId) {
    const l = makeLink(
      LinkType.TASK_CHARACTER,
      { type: EntityType.TASK, id: task.id },
      { type: EntityType.CHARACTER, id: task.playerCharacterId }
    );
    await createLink(l);
    await appendLinkLog(l, 'created');
  }
  
  // Create TASK_ITEM link for items created from task emissary fields
  if (task.outputItemType && task.outputQuantity && task.status === 'Done') {
    // Find the item created by this task
    const items = await getAllItems();
    const createdItem = items.find(item => item.sourceTaskId === task.id && item.type === task.outputItemType);
    
    if (createdItem) {
      const l = makeLink(
        LinkType.TASK_ITEM, 
        { type: EntityType.TASK, id: task.id }, 
        { type: EntityType.ITEM, id: createdItem.id },
        {
          quantity: task.outputQuantity,
          unitCost: task.outputUnitCost,
          price: task.outputItemPrice,
          itemType: task.outputItemType
        }
      );
      await createLink(l);
      await appendLinkLog(l, 'created');
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
        await appendLinkLog(oldLink, 'removed');
      }
    }
    
    const l = makeLink(LinkType.ITEM_TASK, { type: EntityType.ITEM, id: item.id }, { type: EntityType.TASK, id: item.sourceTaskId });
    await createLink(l);
    await appendLinkLog(l, 'created');
  }
  
  // ITEM_SITE links (for stock locations)
  // Remove all old ITEM_SITE links, then create new ones
  const oldSiteLinks = existingLinks.filter(l => l.linkType === LinkType.ITEM_SITE);
  for (const oldLink of oldSiteLinks) {
    await removeLink(oldLink.id);
  }
  
  // Create fresh ITEM_SITE links for current stock
  for (const s of item.stock || []) {
    if (s.siteId) {
      const l = makeLink(LinkType.ITEM_SITE, { type: EntityType.ITEM, id: item.id }, { type: EntityType.SITE, id: s.siteId });
      await createLink(l);
      await appendLinkLog(l, 'created');
    }
  }
  
  // ITEM_CHARACTER link
  if (item.ownerCharacterId) {
    // Remove old ITEM_CHARACTER links (in case owner changed)
    const oldCharacterLinks = existingLinks.filter(l => l.linkType === LinkType.ITEM_CHARACTER);
    for (const oldLink of oldCharacterLinks) {
      if (oldLink.target.id !== item.ownerCharacterId) {
        await removeLink(oldLink.id);
        await appendLinkLog(oldLink, 'removed');
      }
    }
    
    const l = makeLink(
      LinkType.ITEM_CHARACTER,
      { type: EntityType.ITEM, id: item.id },
      { type: EntityType.CHARACTER, id: item.ownerCharacterId }
    );
    await createLink(l);
    await appendLinkLog(l, 'created');
  } else {
    // If no owner, remove all ITEM_CHARACTER links
    const oldCharacterLinks = existingLinks.filter(l => l.linkType === LinkType.ITEM_CHARACTER);
    for (const oldLink of oldCharacterLinks) {
      await removeLink(oldLink.id);
      await appendLinkLog(oldLink, 'removed');
    }
  }
  
  // Note: ITEM_SALE links handled in processSaleEffects (from sale.lines)
}

export async function processSaleEffects(sale: Sale): Promise<void> {
  if (sale.siteId) {
    const l = makeLink(LinkType.SALE_SITE, { type: EntityType.SALE, id: sale.id }, { type: EntityType.SITE, id: sale.siteId });
    await createLink(l);
    await appendLinkLog(l, 'created');
  }
  
  // SALE_CHARACTER link
  if (sale.customerId) {
    const l = makeLink(
      LinkType.SALE_CHARACTER,
      { type: EntityType.SALE, id: sale.id },
      { type: EntityType.CHARACTER, id: sale.customerId }
    );
    await createLink(l);
    await appendLinkLog(l, 'created');
  }
  
  // SALE_ITEM links (from sale lines)
  if (sale.lines && sale.lines.length > 0) {
    for (const line of sale.lines) {
      if (line.kind === 'item' && line.itemId) {
        const l = makeLink(
          LinkType.SALE_ITEM,
          { type: EntityType.SALE, id: sale.id },
          { type: EntityType.ITEM, id: line.itemId },
          { quantity: line.quantity, unitPrice: line.unitPrice }
        );
        await createLink(l);
        await appendLinkLog(l, 'created');
      }
    }
  }
  
  // SALE_TASK link (if sale spawned from task)
  if (sale.sourceTaskId) {
    const l = makeLink(
      LinkType.SALE_TASK,
      { type: EntityType.SALE, id: sale.id },
      { type: EntityType.TASK, id: sale.sourceTaskId }
    );
    await createLink(l);
    await appendLinkLog(l, 'created');
  }
  
  // Note: SALE_PLAYER handled by points-rewards-utils.ts ✅
}

export async function processFinancialEffects(fin: FinancialRecord): Promise<void> {
  if (fin.siteId) {
    const l = makeLink(LinkType.FINREC_SITE, { type: EntityType.FINANCIAL, id: fin.id }, { type: EntityType.SITE, id: fin.siteId });
    await createLink(l);
    await appendLinkLog(l, 'created');
  }
  
  // FINREC_CHARACTER link
  if (fin.customerCharacterId) {
    const l = makeLink(
      LinkType.FINREC_CHARACTER,
      { type: EntityType.FINANCIAL, id: fin.id },
      { type: EntityType.CHARACTER, id: fin.customerCharacterId }
    );
    await createLink(l);
    await appendLinkLog(l, 'created');
  }
  
  // Create FINREC_ITEM link for items created from financial record emissary fields
  if (fin.outputItemType && fin.outputQuantity) {
    // Find the item created by this financial record
    const items = await getAllItems();
    const createdItem = items.find(item => item.sourceRecordId === fin.id && item.type === fin.outputItemType);
    
    if (createdItem) {
      const l = makeLink(
        LinkType.FINREC_ITEM, 
        { type: EntityType.FINANCIAL, id: fin.id }, 
        { type: EntityType.ITEM, id: createdItem.id },
        {
          quantity: fin.outputQuantity,
          unitCost: fin.outputUnitCost,
          price: fin.outputItemPrice,
          itemType: fin.outputItemType
        }
      );
      await createLink(l);
      await appendLinkLog(l, 'created');
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
    await appendLinkLog(link, 'created');
  }
  
  // CHARACTER_SITE link (if character has home site)
  if (character.siteId) {
    const link = makeLink(
      LinkType.CHARACTER_SITE,
      { type: EntityType.CHARACTER, id: character.id },
      { type: EntityType.SITE, id: character.siteId }
    );
    await createLink(link);
    await appendLinkLog(link, 'created');
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
      await appendLinkLog(link, 'created');
    }
  }
  
  // Note: PLAYER_SITE links not implemented - Player doesn't have siteId field
}

// Sites don't create links when saved - they're primarily link targets
// SITE_SITE links are created by movement operations (see workflows/site-movement-utils.ts)
// No processSiteEffects function needed - sites have no link-creating properties


