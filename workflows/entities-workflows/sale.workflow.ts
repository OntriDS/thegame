// workflows/entities-workflows/sale.workflow.ts
// Sale-specific workflow with CHARGED, CANCELLED, COLLECTED events

import { EntityType, LogEventType, PLAYER_ONE_ID, SaleStatus } from '@/types/enums';
import type { Item, Sale } from '@/types/entities';
import { appendEntityLog, updateEntityLogField } from '../entities-logging';
import { hasEffect, markEffect, clearEffectsByPrefix } from '@/data-store/effects-registry';
import { EffectKeys, buildLogKey } from '@/data-store/keys';
import { kvGet, kvSet } from '@/data-store/kv';
import { getLinksFor, removeLink } from '@/links/link-registry';
import { getPlayerById, getSaleById, getItemById } from '@/data-store/datastore';
import { awardPointsToPlayer, removePointsFromPlayer, calculatePointsFromRevenue } from '../points-rewards-utils';
import { processSaleLines } from '../sale-line-utils';
import {
  updateFinancialRecordsFromSale,
  updateItemsFromSale,
  updatePlayerPointsFromSource,
  hasRevenueChanged,
  hasLinesChanged
} from '../update-propagation-utils';
import { createCharacterFromSale } from '../character-creation-utils';
import { archiveSaleSnapshot, upsertSale } from '@/data-store/datastore';
import { formatMonthKey } from '@/lib/utils/date-utils';
import { createItemSnapshot, createSaleSnapshot } from '../snapshot-workflows';

const STATE_FIELDS = ['status', 'isNotPaid', 'isNotCharged', 'isCollected', 'postedAt', 'doneAt', 'cancelledAt'];
const DESCRIPTIVE_FIELDS = ['counterpartyName', 'totals'];

export async function onSaleUpsert(sale: Sale, previousSale?: Sale): Promise<void> {
  // New sale creation
  if (!previousSale) {
    const effectKey = EffectKeys.created('sale', sale.id);
    if (await hasEffect(effectKey)) return;

    await appendEntityLog(EntityType.SALE, sale.id, LogEventType.CREATED, {
      type: sale.type,
      status: sale.status,
      counterpartyName: sale.counterpartyName,
      totals: {
        subtotal: sale.totals.subtotal,
        discountTotal: sale.totals.discountTotal,
        taxTotal: sale.totals.taxTotal,
        totalRevenue: sale.totals.totalRevenue
      },
      isNotPaid: sale.isNotPaid,
      isNotCharged: sale.isNotCharged
    });
    await markEffect(effectKey);

    // Character creation from emissary fields - when newCustomerName is provided
    if (sale.newCustomerName && !sale.customerId) {
      const characterEffectKey = EffectKeys.sideEffect('sale', sale.id, 'characterCreated');
      if (!(await hasEffect(characterEffectKey))) {
        console.log(`[onSaleUpsert] Creating character from sale emissary fields: ${sale.counterpartyName}`);
        const createdCharacter = await createCharacterFromSale(sale);
        if (createdCharacter) {
          // Update sale with the created character ID
          const updatedSale = { ...sale, customerId: createdCharacter.id };
          await upsertSale(updatedSale, { skipWorkflowEffects: true, skipLinkEffects: true });
          await markEffect(characterEffectKey);
          console.log(`[onSaleUpsert] ✅ Character created and sale updated: ${createdCharacter.name}`);
        }
      }
    }

    const isCharged =
      sale.status === 'CHARGED' && !sale.isNotPaid && !sale.isNotCharged;
    if (isCharged) {
      await processChargedSaleLines(sale);
    }

    await maybeCreateSaleSnapshot(sale);
    return;
  }

  // Status changes - PENDING (not paid/not charged) vs DONE (paid and charged)
  const wasPending = previousSale.isNotPaid || previousSale.isNotCharged;
  const nowPending = sale.isNotPaid || sale.isNotCharged;

  if (previousSale.status !== sale.status) {
    if (sale.status === 'CANCELLED') {
      await appendEntityLog(EntityType.SALE, sale.id, LogEventType.CANCELLED, {
        type: sale.type,
        status: sale.status,
        counterpartyName: sale.counterpartyName,
        totals: {
          subtotal: sale.totals.subtotal,
          discountTotal: sale.totals.discountTotal,
          taxTotal: sale.totals.taxTotal,
          totalRevenue: sale.totals.totalRevenue
        },
        cancelledAt: sale.cancelledAt || new Date().toISOString()
      });
    } else if (wasPending && !nowPending) {
      // Transitioned from PENDING to CHARGED (both paid and charged)
      await appendEntityLog(EntityType.SALE, sale.id, LogEventType.DONE, {
        type: sale.type,
        status: sale.status,
        counterpartyName: sale.counterpartyName,
        totals: {
          subtotal: sale.totals.subtotal,
          discountTotal: sale.totals.discountTotal,
          taxTotal: sale.totals.taxTotal,
          totalRevenue: sale.totals.totalRevenue
        },
        isNotPaid: sale.isNotPaid,
        isNotCharged: sale.isNotCharged,
        completedAt: new Date().toISOString()
      });

      // Points awarding - ONLY when sale transitions to CHARGED (both paid and charged)
      // Use sale.playerCharacterId directly as playerId (unified ID)
      if (sale.totals.totalRevenue > 0) {
        const pointsEffectKey = EffectKeys.sideEffect('sale', sale.id, 'pointsAwarded');
        if (!(await hasEffect(pointsEffectKey))) {
          console.log(`[onSaleUpsert] Awarding points from charged sale: ${sale.counterpartyName}`);
          const points = calculatePointsFromRevenue(sale.totals.totalRevenue);
          const playerId = sale.playerCharacterId || PLAYER_ONE_ID;
          await awardPointsToPlayer(playerId, points, sale.id, EntityType.SALE);
          await markEffect(pointsEffectKey);
          console.log(`[onSaleUpsert] ✅ Points awarded to player ${playerId} for charged sale: ${sale.counterpartyName}`);
        }
      }

      // Process sale lines when sale transitions to CHARGED
      await processChargedSaleLines(sale);
    } else if (!wasPending && nowPending) {
      // Reverted from DONE to PENDING (became unpaid or uncharged)
      await appendEntityLog(EntityType.SALE, sale.id, LogEventType.PENDING, {
        type: sale.type,
        status: sale.status,
        counterpartyName: sale.counterpartyName,
        totals: {
          subtotal: sale.totals.subtotal,
          discountTotal: sale.totals.discountTotal,
          taxTotal: sale.totals.taxTotal,
          totalRevenue: sale.totals.totalRevenue
        },
        isNotPaid: sale.isNotPaid,
        isNotCharged: sale.isNotCharged,
        pendingAt: new Date().toISOString()
      });
    }
  }

  // Collection detection - Dual detection: status OR flag change to COLLECTED
  const statusBecameCollected =
    sale.status === SaleStatus.COLLECTED &&
    (!previousSale || previousSale.status !== SaleStatus.COLLECTED);

  const flagBecameCollected =
    !!sale.isCollected && (!previousSale || !previousSale.isCollected);

  if (statusBecameCollected || flagBecameCollected) {
    const now = new Date();
    const adjustedNow = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const collectedAt = sale.collectedAt ?? adjustedNow;

    // Normalize both status and flag for consistency
    const normalizedSale = {
      ...sale,
      status: SaleStatus.COLLECTED,
      isCollected: true,
      collectedAt
    };

    // Check if sale was never CHARGED but has item lines - process them now
    const wasNeverCharged = previousSale?.status !== 'CHARGED' && sale.status !== 'CHARGED';
    const hasItems = sale.lines?.some(l => l.kind === 'item' || l.kind === 'bundle');
    if (wasNeverCharged && hasItems) {
      // Sale going directly to COLLECTED with items - process them first
      // This ensures items are marked SOLD even if sale skips CHARGED status
      await processChargedSaleLines(sale);
    }

    await appendEntityLog(EntityType.SALE, sale.id, LogEventType.COLLECTED, {
      type: sale.type,
      counterpartyName: sale.counterpartyName,
      totals: {
        subtotal: sale.totals.subtotal,
        discountTotal: sale.totals.discountTotal,
        taxTotal: sale.totals.taxTotal,
        totalRevenue: sale.totals.totalRevenue
      },
      collectedAt: collectedAt.toISOString()
    });
  }
  await maybeCreateSaleSnapshot(sale, previousSale);

  // COMPREHENSIVE UPDATE PROPAGATION - when sale properties change
  if (previousSale) {
    // Propagate to Financial Records
    if (hasRevenueChanged(sale, previousSale)) {
      console.log(`[onSaleUpsert] Propagating revenue changes to financial records: ${sale.counterpartyName}`);
      await updateFinancialRecordsFromSale(sale, previousSale);
    }

    // Propagate to Items (stock updates)
    if (hasLinesChanged(sale, previousSale)) {
      console.log(`[onSaleUpsert] Propagating line changes to items: ${sale.counterpartyName}`);
      await updateItemsFromSale(sale, previousSale);
    }

    // Propagate to Player (points delta from revenue)
    if (hasRevenueChanged(sale, previousSale)) {
      console.log(`[onSaleUpsert] Propagating revenue changes to player points: ${sale.counterpartyName}`);
      await updatePlayerPointsFromSource(EntityType.SALE, sale, previousSale);
    }
  }

  // Descriptive changes - update in-place
  for (const field of DESCRIPTIVE_FIELDS) {
    if ((previousSale as any)[field] !== (sale as any)[field]) {
      await updateEntityLogField(EntityType.SALE, sale.id, field, (previousSale as any)[field], (sale as any)[field]);
    }
  }
}

async function processChargedSaleLines(sale: Sale): Promise<void> {
  const linesProcessedKey = `sale:${sale.id}:linesProcessed`;
  if (await hasEffect(linesProcessedKey)) {
    return;
  }

  console.log(`[onSaleUpsert] Processing sale lines for charged sale: ${sale.counterpartyName}`);
  await processSaleLines(sale);
  await markEffect(linesProcessedKey);
  console.log(`[onSaleUpsert] ✅ Sale lines processed and effect marked: ${sale.counterpartyName}`);

  // Create ItemSnapshots for sold items (Archive-First approach)
  await createItemSnapshotsFromSale(sale);
}

async function maybeCreateSaleSnapshot(sale: Sale, previousSale?: Sale): Promise<void> {
  // Dual detection: status OR flag change to COLLECTED
  const statusBecameCollected =
    sale.status === SaleStatus.COLLECTED &&
    (!previousSale || previousSale.status !== SaleStatus.COLLECTED);

  const flagBecameCollected =
    !!sale.isCollected && (!previousSale || !previousSale.isCollected);

  if (!statusBecameCollected && !flagBecameCollected) {
    return;
  }

  const collectedAt = sale.collectedAt ?? new Date();
  const snapshotEffectKey = EffectKeys.sideEffect('sale', sale.id, `saleSnapshot:${formatMonthKey(collectedAt)}`);

  if (await hasEffect(snapshotEffectKey)) {
    return;
  }

  // Create SaleSnapshot using the new Archive-First approach
  await createSaleSnapshot(sale, collectedAt, sale.playerCharacterId || undefined);

  // Add to month-based collection index for efficient History Tab queries
  const monthKey = formatMonthKey(collectedAt);
  const { kvSAdd } = await import('@/data-store/kv');
  const collectedIndexKey = `index:sales:collected:${monthKey}`;
  await kvSAdd(collectedIndexKey, sale.id);

  await markEffect(snapshotEffectKey);
  console.log(`[maybeCreateSaleSnapshot] ✅ Created snapshot for collected sale ${sale.id}, added to index ${monthKey}`);
}

async function createItemSnapshotsFromSale(sale: Sale): Promise<void> {
  if (!sale.lines || sale.lines.length === 0) {
    return;
  }

  console.log(`[createItemSnapshotsFromSale] Creating snapshots for sold items in sale: ${sale.counterpartyName}`);

  for (const line of sale.lines) {
    if (line.kind !== 'item') continue;

    const effectKey = EffectKeys.sideEffect('sale', sale.id, `itemSnapshot:${line.lineId}`);
    if (await hasEffect(effectKey)) {
      continue;
    }

    const item = await getItemById(line.itemId);
    if (!item) {
      console.warn(`[createItemSnapshotsFromSale] Item ${line.itemId} not found for sale ${sale.id}, skipping snapshot`);
      continue;
    }

    // Create ItemSnapshot using the Archive-First approach
    await createItemSnapshot(item, line.quantity, sale);

    // Add to month-based sold index
    const soldAt = sale.saleDate || new Date();
    const monthKey = formatMonthKey(soldAt);
    const { kvSAdd } = await import('@/data-store/kv');
    const soldIndexKey = `index:items:sold:${monthKey}`;
    await kvSAdd(soldIndexKey, item.id);

    await markEffect(effectKey);
    console.log(`[createItemSnapshotsFromSale] ✅ Created snapshot for sold item ${item.name} (${line.quantity} units), added to sold index ${monthKey}`);
  }
}

/**
 * Remove sale effects when sale is deleted
 * Sales can have entries in multiple logs: sales, financials, character, items
 */
export async function removeSaleEffectsOnDelete(saleId: string): Promise<void> {
  try {
    console.log(`[removeSaleEffectsOnDelete] Starting cleanup for sale: ${saleId}`);

    // 1. Remove player points that were awarded by this sale (if points were badly given)
    await removePlayerPointsFromSale(saleId);

    // 2. Remove all Links related to this sale
    const saleLinks = await getLinksFor({ type: EntityType.SALE, id: saleId });
    console.log(`[removeSaleEffectsOnDelete] Found ${saleLinks.length} links to remove`);

    for (const link of saleLinks) {
      try {
        await removeLink(link.id);
        console.log(`[removeSaleEffectsOnDelete] ✅ Removed link: ${link.linkType}`);
      } catch (error) {
        console.error(`[removeSaleEffectsOnDelete] ❌ Failed to remove link ${link.id}:`, error);
      }
    }

    // 3. Clear effects registry
    await clearEffectsByPrefix(EntityType.SALE, saleId, 'sale:');
    await clearEffectsByPrefix(EntityType.SALE, saleId, 'pointsAwarded:');

    // Clear specific effects
    const { clearEffect } = await import('@/data-store/effects-registry');
    await clearEffect(EffectKeys.created('sale', saleId));
    await clearEffect(EffectKeys.sideEffect('sale', saleId, 'characterCreated'));
    await clearEffect(EffectKeys.sideEffect('sale', saleId, 'pointsAwarded'));

    // 4. Remove log entries from all relevant logs
    console.log(`[removeSaleEffectsOnDelete] Starting log entry removal for sale: ${saleId}`);

    // Remove from sales log
    const salesLogKey = buildLogKey(EntityType.SALE);
    const salesLog = (await kvGet<any[]>(salesLogKey)) || [];
    const filteredSalesLog = salesLog.filter(entry => entry.entityId !== saleId);
    if (filteredSalesLog.length !== salesLog.length) {
      await kvSet(salesLogKey, filteredSalesLog);
      console.log(`[removeSaleEffectsOnDelete] ✅ Removed ${salesLog.length - filteredSalesLog.length} entries from sales log`);
    }

    // Also check and remove from player log if this sale awarded points
    const sale = await getSaleById(saleId);
    if (sale && sale.totals.totalRevenue > 0) {
      const playerLogKey = buildLogKey(EntityType.PLAYER);
      const playerLog = (await kvGet<any[]>(playerLogKey)) || [];
      const filteredPlayerLog = playerLog.filter(entry => entry.sourceId !== saleId && entry.sourceSaleId !== saleId);
      if (filteredPlayerLog.length !== playerLog.length) {
        await kvSet(playerLogKey, filteredPlayerLog);
        console.log(`[removeSaleEffectsOnDelete] ✅ Removed ${playerLog.length - filteredPlayerLog.length} entries from player log`);
      }
    }

    // Check and remove from character log if this sale was purchased by a character
    const characterLogKey = buildLogKey(EntityType.CHARACTER);
    const characterLog = (await kvGet<any[]>(characterLogKey)) || [];
    const filteredCharacterLog = characterLog.filter(entry => entry.saleId !== saleId && entry.sourceSaleId !== saleId);
    if (filteredCharacterLog.length !== characterLog.length) {
      await kvSet(characterLogKey, filteredCharacterLog);
      console.log(`[removeSaleEffectsOnDelete] ✅ Removed ${characterLog.length - filteredCharacterLog.length} entries from character log`);
    }

    console.log(`[removeSaleEffectsOnDelete] ✅ Cleared effects, removed links, and removed log entries for sale ${saleId}`);
  } catch (error) {
    console.error('Error removing sale effects:', error);
  }
}

/**
 * Remove player points that were awarded by a specific sale
 * This is used when rolling back a sale that incorrectly awarded points
 */
async function removePlayerPointsFromSale(saleId: string): Promise<void> {
  try {
    console.log(`[removePlayerPointsFromSale] Removing points for sale: ${saleId}`);

    // Get the sale to find what points were awarded
    const sale = await getSaleById(saleId);

    if (!sale || sale.totals.totalRevenue <= 0) {
      console.log(`[removePlayerPointsFromSale] Sale ${saleId} has no revenue to remove points from`);
      return;
    }

    // Get the player from the sale (same logic as creation)
    const playerId = sale.playerCharacterId || PLAYER_ONE_ID;
    const player = await getPlayerById(playerId);

    if (!player) {
      console.log(`[removePlayerPointsFromSale] Player ${playerId} not found, skipping points removal`);
      return;
    }

    // Calculate points to remove based on sale revenue (1 Point = $100)
    const pointsToRemove = calculatePointsFromRevenue(sale.totals.totalRevenue);

    // Check if any points were actually awarded
    const hasPoints = (pointsToRemove.xp || 0) > 0 || (pointsToRemove.rp || 0) > 0 ||
      (pointsToRemove.fp || 0) > 0 || (pointsToRemove.hp || 0) > 0;

    if (!hasPoints) {
      console.log(`[removePlayerPointsFromSale] No points to remove from sale ${saleId} (revenue: ${sale.totals.totalRevenue})`);
      return;
    }

    // Remove the points from the player
    await removePointsFromPlayer(playerId, pointsToRemove);
    console.log(`[removePlayerPointsFromSale] ✅ Removed points from player: ${JSON.stringify(pointsToRemove)} (sale revenue: ${sale.totals.totalRevenue})`);

  } catch (error) {
    console.error(`[removePlayerPointsFromSale] ❌ Failed to remove player points for sale ${saleId}:`, error);
  }
}