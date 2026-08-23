// @ts-nocheck
// links/links-workflows.ts
// Universal entry point for creating links from entities (property inspection)

import { EntityType, LinkType, LogEventType, TaskStatus, SaleType } from '@/types/enums';
import type { Task, Item, Sale, FinancialRecord, Character, Player, Site, Link } from '@/types/entities';
import { getTaskOwnerIds } from '@/lib/compatibility/task-selectors';
import { createLink, removeLink, getLinksFor } from './link-registry';
import { getItemsBySourceTaskId, getItemsBySourceRecordId, getItemById } from '@/data-store/repositories/item.repo';
import { getFinancialById } from '@/data-store/repositories/financial.repo';
import { getCharacterById, getBusinessById } from '@/data-store/repositories/character.repo';
import { getPlayerById } from '@/data-store/repositories/player.repo';
import { getTaskById } from '@/data-store/repositories/task.repo';
import { v4 as uuid } from 'uuid';
import { appendEntityLog } from '@/workflows/entities-logging';
import { getTaskCounterpartyId } from '@/workflows/task-counterparty-resolution';
import { getItemCharacterId } from '@/lib/item-character-id';
import { getFinancialCounterpartyId, getFinancialCounterpartyRole } from '@/lib/financial-record-counterparty-id';
import { getSaleCharacterId } from '@/lib/sale-character-id';
import { resolveSaleCharacterId } from '@/lib/sale-relationship-selectors';
import { getAllSites, getSiteById } from '@/data-store/repositories/site.repo';

export function makeLink(linkType: LinkType, source: { type: EntityType; id: string }, target: { type: EntityType; id: string }, relationship: string): Link {
  return {
    id: uuid(),
    linkType,
    source,
    target,
    ...(relationship ? { relationship } : {}),
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
  const desiredId = getTaskCounterpartyId(task);

  const existingLinks = await getLinksFor({ type: EntityType.TASK, id: task.id });
  const taskCharacterLinks = existingLinks.filter((l) => l.linkType === LinkType.TASK_CHARACTER);
  const reconcileOwners = Object.prototype.hasOwnProperty.call(task, 'ownerIds');

  const promises: Promise<any>[] = [];
  for (const link of taskCharacterLinks) {
    const isOwnerLink = String(link.relationship || '').toLowerCase() === 'owner';
    if (reconcileOwners || !isOwnerLink) {
      promises.push(removeLink(link.id));
    }
  }

  const desiredRelationships: Array<{
    id: string;
    relationship: 'owner' | 'customer' | 'beneficiary' | 'creator';
  }> = [];
  if (desiredId) {
    desiredRelationships.push({
      id: desiredId,
      relationship: (typeof (task as any).__counterparty?.role === 'string' && (task as any).__counterparty.role.toLowerCase() === 'beneficiary') ||
        (typeof task.context?.counterparty?.role === 'string' && task.context.counterparty.role.toLowerCase() === 'beneficiary') ||
        (typeof task.customerCharacterRole === 'string' && task.customerCharacterRole.toLowerCase() === 'beneficiary')
        ? 'beneficiary'
        : 'customer',
    });
  }
  if (reconcileOwners) {
    for (const ownerId of getTaskOwnerIds(task)) {
      if (!desiredRelationships.some((entry) => entry.id === ownerId && entry.relationship === 'owner')) {
        desiredRelationships.push({ id: ownerId, relationship: 'owner' });
      }
    }
  }

  for (const desired of desiredRelationships) {
    const l = makeLink(
      LinkType.TASK_CHARACTER,
      { type: EntityType.TASK, id: task.id },
      { type: EntityType.CHARACTER, id: desired.id },
      desired.relationship
    );
    promises.push(createLink(l).then(async (wasCreated) => {
      if (wasCreated && desired.relationship !== 'owner') {
        const character = await getCharacterById(desired.id);
        await appendEntityLog(EntityType.CHARACTER, desired.id, LogEventType.REQUESTED_TASK, {
          name: character?.name || 'Unknown Character',
          roles: character?.roles || [],
          taskId: task.id,
          taskName: task.name,
          taskType: task.type,
          station: task.station
        });
      }
    }));
  }
  await Promise.all(promises);
}

export async function processTaskEffects(task: Task): Promise<void> {
  // Task hierarchy is a Task -> Task relationship. Keep parentId as a
  // transitional compatibility field for the existing parent-child index,
  // but make TASK_TASK the canonical relationship authority.
  const promises: Promise<any>[] = [];
  const existingTaskLinks = await getLinksFor({ type: EntityType.TASK, id: task.id });
  const existingParentLinks = existingTaskLinks.filter((link) => link.linkType === LinkType.TASK_TASK && link.source.id === task.id);
  for (const link of existingParentLinks) {
    if (!task.parentId || link.target?.type !== EntityType.TASK || link.target.id !== task.parentId) {
      promises.push(removeLink(link.id));
    }
  }
  if (task.parentId) {
    promises.push(createLink(makeLink(
      LinkType.TASK_TASK,
      { type: EntityType.TASK, id: task.id },
      { type: EntityType.TASK, id: task.parentId },
      'parent'
    )));
  }

  if (task.siteId) {
    const l = makeLink(LinkType.TASK_SITE, { type: EntityType.TASK, id: task.id }, { type: EntityType.SITE, id: task.siteId }, 'performed-at');
    promises.push(createLink(l));
  }
  if (task.outputItemId) {
    const l = makeLink(
      LinkType.TASK_ITEM,
      { type: EntityType.TASK, id: task.id },
      { type: EntityType.ITEM, id: task.outputItemId },
      'requested'
    );
    promises.push(createLink(l));
  }
  
  // SALE_TASK link (Task created from Sale)
  const sourceSaleId = task.sourceSaleId || task.context?.sourceSaleId;
  if (sourceSaleId) {
    const l = makeLink(
      LinkType.SALE_TASK,
      { type: EntityType.SALE, id: sourceSaleId },
      { type: EntityType.TASK, id: task.id },
      'sold-service'
    );
    promises.push(createLink(l));
  }

  // TASK_CHARACTER: reconcile with counterparty (heals missing links after counterparty-only edits)
  // NOTE: playerCharacterId is internal assignment, not logged as a character action
  promises.push(syncTaskCharacterCounterpartyLinks(task));

  // Create TASK_ITEM link for items created from the canonical production plan.
  // Existing flat fields remain read-only compatibility for pre-migration tasks.
  const productionPlan = task.context?.productionPlan;
  const outputItemType = productionPlan?.outputItemType ?? task.outputItemType;
  if (outputItemType && (productionPlan?.outputQuantity ?? task.outputQuantity)) {
    // Find the item created by this task (optimized query)
    const taskItems = await getItemsBySourceTaskId(task.id);
    const createdItem = taskItems.find(item => item.type === outputItemType);

    if (createdItem) {
      const l = makeLink(
        LinkType.TASK_ITEM,
        { type: EntityType.TASK, id: task.id },
        { type: EntityType.ITEM, id: createdItem.id },
        'produced'
      );
      promises.push(createLink(l));
    }
  }

  await Promise.all(promises);
  // Note: TASK_PLAYER handled by points-rewards-utils.ts ✅
  // Note: TASK_FINREC handled by financial-record-utils.ts ✅
}

export async function processItemEffects(item: Item): Promise<void> {
  // Get existing links for cleanup
  const existingLinks = await getLinksFor({ type: EntityType.ITEM, id: item.id });
  const validSiteIds = new Set((await getAllSites()).map(site => site.id));
  const promises: Promise<any>[] = [];

  // ITEM_TASK links are no longer created here to follow original direction (Task -> Item).
  // Clean up any stray ITEM_TASK links if needed, but TASK_ITEM is the canonical link.
  const oldTaskLinks = existingLinks.filter(l => l.linkType === LinkType.ITEM_TASK);
  for (const oldLink of oldTaskLinks) {
    promises.push(removeLink(oldLink.id));
  }

  // ITEM_SITE links (for stock locations)
  // Remove all old ITEM_SITE links, then create new ones
  const oldSiteLinks = existingLinks.filter(l => l.linkType === LinkType.ITEM_SITE);
  for (const oldLink of oldSiteLinks) {
    promises.push(removeLink(oldLink.id));
  }

  // Create fresh ITEM_SITE links for current stock
  for (const s of item.stock || []) {
    const normalizedSiteId = String(s.siteId || '').trim();
    if (normalizedSiteId && validSiteIds.has(normalizedSiteId)) {
      const l = makeLink(LinkType.ITEM_SITE, { type: EntityType.ITEM, id: item.id }, { type: EntityType.SITE, id: normalizedSiteId }, 'stored-at');
      promises.push(createLink(l));
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
      { type: EntityType.CHARACTER, id: itemCharacterId },
      'owned-by'
    );
    promises.push(createLink(l).then(async (wasCreated) => {
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
    }));
  } else {
    // Canonical ownership is link-owned. Do not remove an existing ownership
    // link merely because the compatibility root characterId is absent.
    // New canonical Items intentionally do not persist characterId.
  }

  // Note: ITEM_SALE links handled in processSaleEffects (from sale.lines)
  await Promise.all(promises);
}

export async function processSaleEffects(sale: Sale): Promise<void> {
  const saleCounterpartyCharId = await resolveSaleCharacterId(sale);
  // Online orders are owned by their customer journey, not by the admin who
  // processes them. This also removes any historical accidental owner link.
  const saleOwnerCharId = sale.type === SaleType.ONLINE ? null : sale.ownerId || null;
  const existingLinks = await getLinksFor({ type: EntityType.SALE, id: sale.id });

  // Helper: resolve an ID to a Character ID.
  // A Business resolves through its canonical Character→Business Link; its
  // former linkedCharacterId field is not relationship authority.
  const resolveToCharacterId = async (id: string): Promise<string | null> => {
    const character = await getCharacterById(id);
    if (character) return id;
    const business = await getBusinessById(id);
    if (business) {
      const businessLinks = await getLinksFor({ type: EntityType.BUSINESS, id: business.id });
      const characterLink = businessLinks.find((link) =>
        link.linkType === LinkType.CHARACTER_BUSINESS &&
        link.source.type === EntityType.CHARACTER &&
        link.target.type === EntityType.BUSINESS &&
        link.target.id === business.id &&
        (link.relationship === 'owns' || link.relationship === 'represents')
      );
      return characterLink?.source.id || null;
    }
    return null;
  };

  const promises: Promise<any>[] = [];

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
      promises.push(removeLink(l.id));
    }
  }

  // --- SALE_FINREC cleanup ---
  for (const l of existingLinks) {
    if (l.linkType !== LinkType.SALE_FINREC || l.target.type !== EntityType.FINANCIAL) continue;
    promises.push(getFinancialById(l.target.id).then(fin => {
      if (!fin) { return removeLink(l.id); }
      // The SALE_FINREC link itself is now the source-of-truth relationship;
      // FinancialRecord no longer persists sourceSaleId.
    }));
  }

  // --- SALE_BUSINESS legacy cleanup (always purge — migrated to SALE_CHARACTER) ---
  for (const l of existingLinks) {
    if (l.linkType === LinkType.SALE_BUSINESS) {
      promises.push(removeLink(l.id));
    }
  }

  // --- SALE_CHARACTER cleanup ---
  // Build the full set of allowed character target IDs,
  // resolving any business IDs through CHARACTER_BUSINESS.
  const allowedCharacterIds = new Set<string>();
  if (saleCounterpartyCharId) allowedCharacterIds.add(saleCounterpartyCharId);
  if (saleOwnerCharId) allowedCharacterIds.add(saleOwnerCharId);
  if (sale.partnerId) {
    const charId = await resolveToCharacterId(sale.partnerId);
    if (charId) allowedCharacterIds.add(charId);
  }
  for (const l of existingLinks) {
    if (
      l.linkType === LinkType.SALE_CHARACTER &&
      (!allowedCharacterIds.has(l.target.id) ||
        (l.relationship === 'owner' && l.target.id !== saleOwnerCharId) ||
        ((!l.relationship || l.relationship === 'customer') && l.target.id !== saleCounterpartyCharId))
    ) {
      promises.push(removeLink(l.id));
    }
  }

  // --- SALE_SITE ---
  if (sale.siteId) {
    const l = makeLink(LinkType.SALE_SITE, { type: EntityType.SALE, id: sale.id }, { type: EntityType.SITE, id: sale.siteId }, 'sold-at');
    promises.push(createLink(l));
  }

  // --- SALE_CHARACTER for customer / counterparty character ---
  if (saleCounterpartyCharId) {
    const l = makeLink(
      LinkType.SALE_CHARACTER,
      { type: EntityType.SALE, id: sale.id },
      { type: EntityType.CHARACTER, id: saleCounterpartyCharId },
      'customer'
    );
    promises.push(createLink(l).then(async (wasCreated) => {
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
    }));
  }

  // --- SALE_CHARACTER for the Character who made/owns the sale ---
  if (saleOwnerCharId) {
    const l = makeLink(
      LinkType.SALE_CHARACTER,
      { type: EntityType.SALE, id: sale.id },
      { type: EntityType.CHARACTER, id: saleOwnerCharId },
      'owner'
    );
    promises.push(createLink(l));
  }

  // --- SALE_CHARACTER for partnerId (resolves Business → CHARACTER_BUSINESS) ---
  if (sale.partnerId) {
    const charId = await resolveToCharacterId(sale.partnerId);
    if (charId) {
      const l = makeLink(
        LinkType.SALE_CHARACTER,
        { type: EntityType.SALE, id: sale.id },
        { type: EntityType.CHARACTER, id: charId },
        'partner'
      );
      promises.push(createLink(l));
    } else {
      console.warn(
        `[processSaleEffects] Partner ID ${sale.partnerId} not found as Character or Business with a canonical CHARACTER_BUSINESS Link. Skipping link.`
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
          { type: EntityType.ITEM, id: line.itemId },
          'sold-item'
        );
        promises.push(createLink(l));
      }
    }
  }

  await Promise.all(promises);
}

export async function processFinancialEffects(fin: FinancialRecord): Promise<void> {
  const financialCounterpartyId = getFinancialCounterpartyId(fin);
  const relations = (fin as any).__financialRelations || {};
  const relationsProvided = Boolean((fin as any).__financialRelationsProvided);
  // Get existing links for cleanup
  const existingLinks = await getLinksFor({ type: EntityType.FINANCIAL, id: fin.id });

  const promises: Promise<any>[] = [];

  // Replace old role-less FINREC_CHARACTER links with the canonical
  // relationship-bearing form.
  if (relationsProvided) {
    for (const link of existingLinks.filter((l) => l.linkType === LinkType.FINREC_CHARACTER)) {
      promises.push(removeLink(link.id));
    }

    for (const link of existingLinks.filter((l) => l.linkType === LinkType.FINREC_SITE)) {
      promises.push(removeLink(link.id));
    }
  }

  if (relationsProvided && relations.siteId) {
    const l = makeLink(LinkType.FINREC_SITE, { type: EntityType.FINANCIAL, id: fin.id }, { type: EntityType.SITE, id: relations.siteId }, 'source-site');
    promises.push(createLink(l));
  }
  if (relationsProvided && relations.targetSiteId && relations.targetSiteId !== relations.siteId) {
    const l = makeLink(LinkType.FINREC_SITE, { type: EntityType.FINANCIAL, id: fin.id }, { type: EntityType.SITE, id: relations.targetSiteId }, 'target-site');
    promises.push(createLink(l));
  }

  // FINREC_CHARACTER link
  if (relationsProvided && financialCounterpartyId) {
    const l = makeLink(
      LinkType.FINREC_CHARACTER,
      { type: EntityType.FINANCIAL, id: fin.id },
      { type: EntityType.CHARACTER, id: financialCounterpartyId },
      getFinancialCounterpartyRole(fin) === 'beneficiary' ? 'beneficiary' : 'customer'
    );
    promises.push(createLink(l).then(async (wasCreated) => {
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
    }));
  }

  // Create FINREC_ITEM link for items created from the canonical financial
  // production plan. Legacy root output fields are no longer authoritative.
  const productionPlan = fin.context?.productionPlan;
  if (productionPlan?.outputItemType && productionPlan.outputQuantity) {
    // Remove previous FINREC_ITEM links to avoid duplicates when switching items
    const existingItemLinks = existingLinks.filter(link => link.linkType === LinkType.FINREC_ITEM);
    for (const link of existingItemLinks) {
      promises.push(removeLink(link.id));
    }

    let createdItem: Item | undefined;

    if (!createdItem) {
      const recordItems = await getItemsBySourceRecordId(fin.id);
      createdItem = recordItems.find(item => item.type === productionPlan.outputItemType);
    }

    if (createdItem) {
      const l = makeLink(
        LinkType.FINREC_ITEM,
        { type: EntityType.FINANCIAL, id: fin.id },
        { type: EntityType.ITEM, id: createdItem.id },
        'item-bought'
      );
      promises.push(createLink(l));
    }
  }

  // TASK_FINREC self-heal: ensure the task↔financial link exists whenever the
  // financial carries a sourceTaskId ambassador. Happy path creates this link
  // inside `createFinancialRecordFromTask`, but financials that were upserted
  // outside that flow (imports, manual repairs, retries where createLink failed
  // after upsertFinancial succeeded) can end up synced-but-unlinked. Running
  // this on every financial upsert makes the next resave the repair trigger.
  // createLink is idempotent, so this is a no-op when the link already exists.
  const sourceTaskId = relations.sourceTaskId;
  if (sourceTaskId) {
    promises.push(getTaskById(sourceTaskId).then(sourceTask => {
      if (sourceTask) {
        const l = makeLink(
          LinkType.TASK_FINREC,
          { type: EntityType.TASK, id: sourceTask.id },
          { type: EntityType.FINANCIAL, id: fin.id },
          'task-record'
        );
        return createLink(l);
      }
    }));
  }

  await Promise.all(promises);

  // FINREC_PLAYER: only created by shared points helpers if something awards with sourceType `financial` — `onFinancialUpsert` does not award points.
}

export async function processCharacterEffects(character: Character): Promise<void> {
  const promises: Promise<any>[] = [];
  // CHARACTER_PLAYER is canonical: every Character may exist without a Player,
  // but only some Characters point to a Player.
  const existingPlayerLinks = (await getLinksFor({ type: EntityType.CHARACTER, id: character.id }))
    .filter((link) =>
      (link.linkType === LinkType.CHARACTER_PLAYER) ||
      (link.linkType === LinkType.PLAYER_CHARACTER && link.target.type === EntityType.CHARACTER)
    );
  for (const link of existingPlayerLinks) promises.push(removeLink(link.id));

  if (character.playerId) {
    promises.push(getPlayerById(character.playerId).then(player => {
      if (!player) {
        throw new Error(`Cannot link Character ${character.id} to missing Player ${character.playerId}.`);
      }
      const link = makeLink(
        LinkType.CHARACTER_PLAYER,
        { type: EntityType.CHARACTER, id: character.id },
        { type: EntityType.PLAYER, id: character.playerId },
        'primary'
      );
      return createLink(link);
    }));
  }

  // CHARACTER_SITE link (if character has home site)
  if (character.siteId) {
    promises.push(getSiteById(character.siteId).then(site => {
      if (!site) {
        throw new Error(`Cannot link Character ${character.id} to missing Site ${character.siteId}.`);
      }
      const link = makeLink(
        LinkType.CHARACTER_SITE,
        { type: EntityType.CHARACTER, id: character.id },
        { type: EntityType.SITE, id: character.siteId },
        'owns'
      );
      return createLink(link);
    }));
  }

  await Promise.all(promises);
}

export async function processPlayerEffects(player: Player): Promise<void> {
  const promises: Promise<any>[] = [];
  // Player.characterId is compatibility input; persist the canonical
  // Character -> Player relationship so the sparse Character side owns it.
  const characterId = typeof player.characterId === 'string' ? player.characterId.trim() : '';
  if (characterId) {
    const character = await getCharacterById(characterId);
    if (!character) {
      throw new Error(`Cannot link Player ${player.id} to missing Character ${characterId}.`);
    }
    const existingLinks = await getLinksFor({ type: EntityType.CHARACTER, id: characterId });
    for (const link of existingLinks) {
      if (
        (link.linkType === LinkType.CHARACTER_PLAYER && link.target.id === player.id) ||
        (link.linkType === LinkType.PLAYER_CHARACTER && link.source.id === player.id)
      ) promises.push(removeLink(link.id));
    }
    const link = makeLink(
      LinkType.CHARACTER_PLAYER,
      { type: EntityType.CHARACTER, id: characterId },
      { type: EntityType.PLAYER, id: player.id },
      'primary'
    );
    promises.push(createLink(link));
  }

  await Promise.all(promises);

  // Note: PLAYER_SITE links not implemented - Player doesn't have siteId field
}

// Sites don't create links when saved - they're primarily link targets
// SITE_SITE links are created by movement operations (see workflows/site-movement-utils.ts)
// No processSiteEffects function needed - sites have no link-creating properties



