// links/links-workflows.ts
// Universal entry point for creating links from entities (property inspection)

import { EntityType, LinkType, LogEventType, TaskStatus, SaleType } from '@/types/enums';
import type { Task, Item, Sale, FinancialRecord, Character, Player, Site, Link } from '@/types/entities';
import { createLink, removeLink, getLinksFor } from './link-registry';
import { getItemsBySourceTaskId, getItemsBySourceRecordId, getItemById } from '@/data-store/repositories/item.repo';
import { getFinancialById } from '@/data-store/repositories/financial.repo';
import { getCharacterById, getBusinessById } from '@/data-store/repositories/character.repo';
import { getTaskById } from '@/data-store/repositories/task.repo';
import { v4 as uuid } from 'uuid';
import { appendEntityLog } from '@/workflows/entities-logging';
import { getTaskCounterpartyId } from '@/workflows/task-counterparty-resolution';
import { getItemCharacterId } from '@/lib/item-character-id';
import { getFinancialCounterpartyId } from '@/lib/financial-record-counterparty-id';
import { getSaleCharacterId } from '@/lib/sale-character-id';
import { getAllSites } from '@/data-store/repositories/site.repo';

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

/**
 * Keep TASK_CHARACTER links aligned with task.characterId (customer or beneficiary).
 * Removes stale links when the counterparty changes or is cleared; creates the link when missing.
 */
export async function syncTaskCharacterCounterpartyLinks(task: Task): Promise<void> {
  const desiredId =
    getTaskCounterpartyId(task);

  const existingLinks = await getLinksFor({ type: EntityType.TASK, id: task.id });
  const taskCharacterLinks = existingLinks.filter((l) => l.linkType === LinkType.TASK_CHARACTER);

  for (const link of taskCharacterLinks) {
    if (!desiredId || link.target.id !== desiredId) {
      await removeLink(link.id);
    }
  }

  if (!desiredId) return;

  const l = makeLink(
    LinkType.TASK_CHARACTER,
    { type: EntityType.TASK, id: task.id },
    { type: EntityType.CHARACTER, id: desiredId }
  );
  const wasCreated = await createLink(l);

  if (wasCreated) {
    const character = await getCharacterById(desiredId);
    await appendEntityLog(EntityType.CHARACTER, desiredId, LogEventType.REQUESTED_TASK, {
      name: character?.name || 'Unknown Character',
      roles: character?.roles || [],
      taskId: task.id,
      taskName: task.name,
      taskType: task.type,
      station: task.station
    });
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

  // TASK_CHARACTER: reconcile with counterparty (heals missing links after counterparty-only edits)
  // NOTE: playerCharacterId is internal assignment, not logged as a character action
  await syncTaskCharacterCounterpartyLinks(task);

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
  const validSiteIds = new Set((await getAllSites()).map(site => site.id));

  // ITEM_TASK links are no longer created here to follow original direction (Task -> Item).
  // Clean up any stray ITEM_TASK links if needed, but TASK_ITEM is the canonical link.
  const oldTaskLinks = existingLinks.filter(l => l.linkType === LinkType.ITEM_TASK);
  for (const oldLink of oldTaskLinks) {
    await removeLink(oldLink.id);
  }

  // ITEM_SITE links (for stock locations)
  // Remove all old ITEM_SITE links, then create new ones
  const oldSiteLinks = existingLinks.filter(l => l.linkType === LinkType.ITEM_SITE);
  for (const oldLink of oldSiteLinks) {
    await removeLink(oldLink.id);
  }

  // Create fresh ITEM_SITE links for current stock
  for (const s of item.stock || []) {
    const normalizedSiteId = String(s.siteId || '').trim();
    if (normalizedSiteId && validSiteIds.has(normalizedSiteId)) {
      const l = makeLink(LinkType.ITEM_SITE, { type: EntityType.ITEM, id: item.id }, { type: EntityType.SITE, id: normalizedSiteId });
      await createLink(l);
    } else if (normalizedSiteId) {
      console.warn(
        `[processItemEffects] Skipping ITEM_SITE link for invalid site "${normalizedSiteId}" on item ${item.id}.`
      );
    }
  }

  // ITEM_CHARACTER link
  const itemCharacterId = getItemCharacterId(item);
  if (itemCharacterId) {
    const l = makeLink(
      LinkType.ITEM_CHARACTER,
      { type: EntityType.ITEM, id: item.id },
      { type: EntityType.CHARACTER, id: itemCharacterId }
    );
    const wasCreated = await createLink(l);

    if (wasCreated) {
      const character = await getCharacterById(itemCharacterId);
      let sourceTaskName: string | undefined;

      // Get source task name if available
      if (item.sourceTaskId) {
        const sourceTask = await getTaskById(item.sourceTaskId);
        if (sourceTask) {
          sourceTaskName = sourceTask.name;
        }
      }

      // Log in character log (customer owns item)
      await appendEntityLog(EntityType.CHARACTER, itemCharacterId, LogEventType.OWNS_ITEM, {
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
  const saleCounterpartyCharId = getSaleCharacterId(sale);
  const existingLinks = await getLinksFor({ type: EntityType.SALE, id: sale.id });

  // Helper: resolve an ID to a Character ID.
  // If the ID is a Business, follow Business.linkedCharacterId.
  const resolveToCharacterId = async (id: string): Promise<string | null> => {
    const character = await getCharacterById(id);
    if (character) return id;
    const business = await getBusinessById(id);
    if (business?.linkedCharacterId) return business.linkedCharacterId;
    return null;
  };

  // --- SALE_ITEM cleanup ---
  const allowedSaleItemIds = new Set<string>();
  for (const line of sale.lines || []) {
    if (line.kind === 'item' && line.itemId) {
      allowedSaleItemIds.add(line.itemId);
    }
  }
  for (const l of existingLinks) {
    if (
      l.linkType === LinkType.SALE_ITEM &&
      l.target.type === EntityType.ITEM &&
      !allowedSaleItemIds.has(l.target.id)
    ) {
      await removeLink(l.id);
    }
  }

  // --- SALE_FINREC cleanup ---
  for (const l of existingLinks) {
    if (l.linkType !== LinkType.SALE_FINREC || l.target.type !== EntityType.FINANCIAL) continue;
    const fin = await getFinancialById(l.target.id);
    if (!fin) { await removeLink(l.id); continue; }
    if (fin.sourceSaleId != null && fin.sourceSaleId !== sale.id) {
      await removeLink(l.id);
    }
  }

  // --- SALE_BUSINESS legacy cleanup (always purge — migrated to SALE_CHARACTER) ---
  for (const l of existingLinks) {
    if (l.linkType === LinkType.SALE_BUSINESS) {
      await removeLink(l.id);
    }
  }

  // --- SALE_CHARACTER cleanup ---
  // Build the full set of allowed character target IDs,
  // resolving any business IDs to their linkedCharacterId.
  const allowedCharacterIds = new Set<string>();
  if (saleCounterpartyCharId) allowedCharacterIds.add(saleCounterpartyCharId);
  if (sale.partnerId) {
    const charId = await resolveToCharacterId(sale.partnerId);
    if (charId) allowedCharacterIds.add(charId);
  }
  for (const l of existingLinks) {
    if (l.linkType === LinkType.SALE_CHARACTER && !allowedCharacterIds.has(l.target.id)) {
      await removeLink(l.id);
    }
  }

  // --- SALE_SITE ---
  if (sale.siteId) {
    const l = makeLink(LinkType.SALE_SITE, { type: EntityType.SALE, id: sale.id }, { type: EntityType.SITE, id: sale.siteId });
    await createLink(l);
  }

  // --- SALE_CHARACTER for customer / counterparty character ---
  if (saleCounterpartyCharId) {
    const l = makeLink(
      LinkType.SALE_CHARACTER,
      { type: EntityType.SALE, id: sale.id },
      { type: EntityType.CHARACTER, id: saleCounterpartyCharId }
    );
    const wasCreated = await createLink(l);
    if (wasCreated) {
      const character = await getCharacterById(saleCounterpartyCharId);
      await appendEntityLog(EntityType.CHARACTER, saleCounterpartyCharId, LogEventType.PURCHASED, {
        name: character?.name || 'Unknown Character',
        roles: character?.roles || [],
        saleId: sale.id,
        saleName: sale.counterpartyName || sale.name,
        saleType: sale.type,
        totalRevenue: sale.totals.totalRevenue
      });
    }
  }

  // --- SALE_CHARACTER for partnerId (resolves Business → linkedCharacterId) ---
  if (sale.partnerId) {
    const charId = await resolveToCharacterId(sale.partnerId);
    if (charId) {
      const l = makeLink(
        LinkType.SALE_CHARACTER,
        { type: EntityType.SALE, id: sale.id },
        { type: EntityType.CHARACTER, id: charId }
      );
      await createLink(l);
    } else {
      console.warn(
        `[processSaleEffects] Partner ID ${sale.partnerId} not found as Character or Business with linkedCharacterId. Skipping link.`
      );
    }
  }

  // --- SALE_ITEM for lines ---
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

  // --- SALE_TASK ---
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
  const financialCounterpartyId = getFinancialCounterpartyId(fin);
  // Get existing links for cleanup
  const existingLinks = await getLinksFor({ type: EntityType.FINANCIAL, id: fin.id });

  if (fin.siteId) {
    const l = makeLink(LinkType.FINREC_SITE, { type: EntityType.FINANCIAL, id: fin.id }, { type: EntityType.SITE, id: fin.siteId });
    await createLink(l);
  }

  // FINREC_CHARACTER link
  if (financialCounterpartyId) {
    const l = makeLink(
      LinkType.FINREC_CHARACTER,
      { type: EntityType.FINANCIAL, id: fin.id },
      { type: EntityType.CHARACTER, id: financialCounterpartyId }
    );
    const wasCreated = await createLink(l);

    if (wasCreated) {
      const character = await getCharacterById(financialCounterpartyId);

      // Log in character log (customer transacted)
      await appendEntityLog(EntityType.CHARACTER, financialCounterpartyId, LogEventType.TRANSACTED, {
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

  // TASK_FINREC self-heal: ensure the task↔financial link exists whenever the
  // financial carries a sourceTaskId ambassador. Happy path creates this link
  // inside `createFinancialRecordFromTask`, but financials that were upserted
  // outside that flow (imports, manual repairs, retries where createLink failed
  // after upsertFinancial succeeded) can end up synced-but-unlinked. Running
  // this on every financial upsert makes the next resave the repair trigger.
  // createLink is idempotent, so this is a no-op when the link already exists.
  if (fin.sourceTaskId) {
    const sourceTask = await getTaskById(fin.sourceTaskId);
    if (sourceTask) {
      const l = makeLink(
        LinkType.TASK_FINREC,
        { type: EntityType.TASK, id: sourceTask.id },
        { type: EntityType.FINANCIAL, id: fin.id }
      );
      await createLink(l);
    }
  }

  // FINREC_PLAYER: only created by shared points helpers if something awards with sourceType `financial` — `onFinancialUpsert` does not award points.
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
  // PLAYER_CHARACTER links (single primary character)
  if (player.characterId) {
    const characterId = String(player.characterId).trim();
    if (!characterId) return;

    const link = makeLink(
      LinkType.PLAYER_CHARACTER,
      { type: EntityType.PLAYER, id: player.id },
      { type: EntityType.CHARACTER, id: characterId }
    );
    await createLink(link);
  }

  // Note: PLAYER_SITE links not implemented - Player doesn't have siteId field
}

// Sites don't create links when saved - they're primarily link targets
// SITE_SITE links are created by movement operations (see workflows/site-movement-utils.ts)
// No processSiteEffects function needed - sites have no link-creating properties


