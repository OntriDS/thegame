// workflows/entities-workflows/sale.workflow.ts
// Sale-specific workflow with CHARGED, CANCELLED, COLLECTED events

import { EntityType, LogEventType, PLAYER_ONE_ID, SaleStatus, SaleType } from '@/types/enums';
import type { Item, Sale } from '@/types/entities';
import { appendEntityLog, updateEntityLogField, removeLogEntriesAcrossMonths } from '../entities-logging';
import { hasEffect, markEffect, clearEffectsByPrefix } from '@/data-store/effects-registry';
import { EffectKeys } from '@/data-store/keys';
import { getLinksFor, removeLink } from '@/links/link-registry';
import { getPlayerById, getSaleById, getItemById, getFinancialsBySourceSaleId, removeFinancial, upsertItem } from '@/data-store/datastore';
import { stagePointsForPlayer, removePointsFromPlayer, calculatePointsFromRevenue } from '../points-rewards-utils';
import { processSaleLines, ensureSoldItemEntities } from '../sale-line-utils';
import { updateFinancialRecordsFromSale, updateItemsFromSale, updatePlayerPointsFromSource, hasRevenueChanged, hasLinesChanged } from '../update-propagation-utils';
import { createCharacterFromSale } from '../character-creation-utils';
import { upsertSale } from '@/data-store/datastore';
import { formatMonthKey, calculateClosingDate } from '@/lib/utils/date-utils';

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
      counterpartyName: sale.counterpartyName || 'Walk-in Customer',
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
        const createdCharacter = await createCharacterFromSale(sale);
        if (createdCharacter) {
          // Update sale with the created character ID
          const updatedSale = { ...sale, customerId: createdCharacter.id };
          await upsertSale(updatedSale, { skipWorkflowEffects: true, skipLinkEffects: true });
          await markEffect(characterEffectKey);
        }
      }
    }

    // Wait for all side effects to complete
    // await Promise.all(sideEffects); // If we had parallel side effects

    // NEW FINANCIAL RECORD CREATION
    // This looks for missing financial records (standard or booth) and creates them
    // Logic is now centralized in updateFinancialRecordsFromSale (handling new sales when previousSale is undefined)
    await updateFinancialRecordsFromSale(sale, undefined);

    const isCharged =
      sale.status === 'CHARGED' && !sale.isNotPaid && !sale.isNotCharged;
    if (isCharged) {
      await processChargedSaleLines(sale);
    }

    return;
  }

  // Status changes - PENDING (not paid/not charged) vs DONE (paid and charged)
  const wasPending = previousSale!.isNotPaid || previousSale!.isNotCharged;
  const nowPending = sale.isNotPaid || sale.isNotCharged;

  if (previousSale.status !== sale.status) {
    if (sale.status === 'CANCELLED') {
      await appendEntityLog(EntityType.SALE, sale.id, LogEventType.CANCELLED, {
        type: sale.type,
        status: sale.status,
        counterpartyName: sale.counterpartyName || 'Walk-in Customer',
        totals: {
          subtotal: sale.totals.subtotal,
          discountTotal: sale.totals.discountTotal,
          taxTotal: sale.totals.taxTotal,
          totalRevenue: sale.totals.totalRevenue
        },
        cancelledAt: sale.cancelledAt || new Date().toISOString()
      });
      // Transitioned from PENDING to CHARGED (both paid and charged)
      const chargedAt = new Date().toISOString();

      // Update the sale object with chargedAt
      (sale as any).chargedAt = new Date(chargedAt);

      await appendEntityLog(EntityType.SALE, sale.id, LogEventType.DONE, {
        type: sale.type,
        status: sale.status,
        counterpartyName: sale.counterpartyName || 'Walk-in Customer',
        totals: {
          subtotal: sale.totals.subtotal,
          discountTotal: sale.totals.discountTotal,
          taxTotal: sale.totals.taxTotal,
          totalRevenue: sale.totals.totalRevenue
        },
        isNotPaid: sale.isNotPaid,
        isNotCharged: sale.isNotCharged,
        completedAt: chargedAt,
        chargedAt
      });

      // Points awarding - ONLY when sale transitions to CHARGED (both paid and charged)
      // Use sale.playerCharacterId directly as playerId (unified ID)
      if (sale.totals.totalRevenue > 0) {
        // Use 'pointsStaged' key to distinguish from legacy 'pointsAwarded'
        const pointsEffectKey = EffectKeys.sideEffect('sale', sale.id, 'pointsStaged');
        if (!(await hasEffect(pointsEffectKey))) {
          const points = calculatePointsFromRevenue(sale.totals.totalRevenue);
          const playerId = sale.playerCharacterId || PLAYER_ONE_ID;
          await stagePointsForPlayer(playerId, points, sale.id, EntityType.SALE);
          await markEffect(pointsEffectKey);
        }
      }

      // Process sale lines when sale transitions to CHARGED
      await processChargedSaleLines(sale);
    } else if (!wasPending && nowPending) {
      // Reverted from DONE to PENDING (became unpaid or uncharged)
      await appendEntityLog(EntityType.SALE, sale.id, LogEventType.PENDING, {
        type: sale.type,
        status: sale.status,
        counterpartyName: sale.counterpartyName || 'Walk-in Customer',
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
    // User requirement: collectedAt should be the last day of the sale's month
    // Snap-to-Month Logic
    // FIX: Prefer existing dates over "Now" to ensure historical accuracy (e.g. Jan sale collected in Feb)
    let defaultCollectedAt: Date;

    if (sale.saleDate) {
      defaultCollectedAt = calculateClosingDate(sale.saleDate);
    } else if (sale.createdAt) {
      defaultCollectedAt = calculateClosingDate(sale.createdAt);
    } else {
      const now = new Date();
      // Adjust to CR time (UTC-6) roughly for "Today" fallback
      const adjustedNow = new Date(now.getTime() - 6 * 60 * 60 * 1000);
      defaultCollectedAt = calculateClosingDate(adjustedNow);
    }

    const collectedAt = sale.collectedAt ?? defaultCollectedAt;

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

  // COMPREHENSIVE UPDATE PROPAGATION - when sale properties change
  if (previousSale) {
    // Check if relevant financial drivers changed (Revenue, Fee, Associate, etc)
    const hasFinancialDriversChanged =
      hasRevenueChanged(sale, previousSale) ||
      sale.boothFee !== previousSale.boothFee ||
      sale.associateId !== previousSale.associateId ||
      sale.partnerId !== previousSale.partnerId ||
      sale.customerId !== previousSale.customerId;

    // Propagate to Financial Records
    if (hasFinancialDriversChanged) {
      await updateFinancialRecordsFromSale(sale, previousSale);

      // [FIX] Update Sale Cost with Payout Amount (for Booth-Sales)
      // This ensures "Sale Log" shows correct Profit (Revenue - Cost)
      if (sale.type === SaleType.BOOTH) {
        const { calculateAssociatePayout } = await import('@/workflows/financial-record-utils');
        const payout = await calculateAssociatePayout(sale);

        // If calculated payout differs from current cost, update it
        if (payout >= 0 && Math.abs((sale.totals.totalCost || 0) - payout) > 0.01) {
          const updatedSaleWithCost = {
            ...sale,
            totals: {
              ...sale.totals,
              totalCost: payout
            }
          };
          // Skip workflow interactions to prevent infinite loops, but allow simple persistence
          await upsertSale(updatedSaleWithCost, { skipWorkflowEffects: true, skipLinkEffects: true });
        }
      }
    }

    // Propagate to Items (stock updates)
    if (hasLinesChanged(sale, previousSale)) {
      await updateItemsFromSale(sale, previousSale);
    }

    // Propagate to Player (points delta from revenue)
    if (hasRevenueChanged(sale, previousSale)) { // Player points ONLY care about Revenue
      await updatePlayerPointsFromSource(EntityType.SALE, sale, previousSale);
    }
  }

  // Descriptive changes - update in-place
  if (previousSale) {
    for (const field of DESCRIPTIVE_FIELDS) {
      if ((previousSale as any)[field] !== (sale as any)[field]) {
        await updateEntityLogField(EntityType.SALE, sale.id, field, (previousSale as any)[field], (sale as any)[field]);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Reactive Archive Indexing & Ghost Cleanup
  // Ensure the entity is correctly placed in the right month's sorted set.
  // We sweep all available months to completely eradicate Snapshot-era ghost duplicates.
  // ---------------------------------------------------------------------------
  const isNowArchived = sale.status === SaleStatus.COLLECTED || sale.isCollected;
  const wasArchived = previousSale && (previousSale.status === SaleStatus.COLLECTED || previousSale.isCollected);

  const getArchiveMonth = (s: Sale) => {
    // User requirement: collectedAt should be the last day of the sale's month
    const sDate = s.saleDate ? new Date(s.saleDate) : (s.createdAt ? new Date(s.createdAt) : new Date());
    const date = s.collectedAt ?? calculateClosingDate(sDate);
    return date ? formatMonthKey(calculateClosingDate(date)) : null;
  };

  const newMonth = isNowArchived ? getArchiveMonth(sale) : null;
  const oldMonth = wasArchived ? getArchiveMonth(previousSale!) : null;

  if (newMonth !== oldMonth || (!newMonth && oldMonth)) {
    const { kvSAdd, kvSRem } = await import('@/data-store/kv');
    const { getAvailableArchiveMonths } = await import('@/data-store/datastore');
    const { buildArchiveMonthsKey } = await import('@/data-store/keys');

    // BULLETPROOF CLEANUP: Remove from ALL other months to fix legacy ghost duplicates
    const allMonths = await getAvailableArchiveMonths();
    for (const m of allMonths) {
      if (m !== newMonth) {
        await kvSRem(`index:sales:collected:${m}`, sale.id);
      }
    }

    if (newMonth) {
      await kvSAdd(`index:sales:collected:${newMonth}`, sale.id);
      await kvSAdd(buildArchiveMonthsKey(), newMonth);

      // The sale record's existence in the index and its inherent dates are the single source of truth.
    }
  }

  // =========================================================================
  // ENSURE SOLD ITEM ENTITIES (Unconditional, Idempotent)
  // This runs on EVERY upsert - both new and resaved sales.
  // It creates Sold Item entities so they appear in Sold Items tab + Archive.
  // The function has its own idempotency per lineId, so calling it repeatedly is safe.
  // =========================================================================
  const isSaleCharged = !sale.isNotPaid && !sale.isNotCharged;
  const hasItemLines = sale.lines?.some(l => l.kind === 'item' || l.kind === 'bundle');
  if (isSaleCharged && hasItemLines) {
    await ensureSoldItemEntities(sale);
  }
}

async function processChargedSaleLines(sale: Sale): Promise<void> {
  const linesProcessedKey = `sale:${sale.id}:linesProcessed`;
  if (await hasEffect(linesProcessedKey)) {
    return;
  }

  await processSaleLines(sale);
  await markEffect(linesProcessedKey);
}

/**
 * Remove sale effects when sale is deleted
 * Sales can have entries in multiple logs: sales, financials, character, items
 */
export async function removeSaleEffectsOnDelete(saleId: string): Promise<void> {
  try {

    // 0. Revert Inventory (Restore Stock)
    await revertSaleInventory(saleId);

    // 1. Remove player points that were awarded by this sale (if points were badly given)
    await removePlayerPointsFromSale(saleId);

    // 2. Remove all Links related to this sale
    const saleLinks = await getLinksFor({ type: EntityType.SALE, id: saleId });

    for (const link of saleLinks) {
      try {
        await removeLink(link.id);
      } catch (error) {
        console.error(`[removeSaleEffectsOnDelete] ❌ Failed to remove link ${link.id}:`, error);
      }
    }

    // 2.5 Remove associated Financial Records
    const financialRecords = await getFinancialsBySourceSaleId(saleId);

    for (const record of financialRecords) {
      try {
        await removeFinancial(record.id);
      } catch (error) {
        console.error(`[removeSaleEffectsOnDelete] ❌ Failed to remove financial record ${record.id}:`, error);
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

    // 4. Remove log entries from all relevant monthly lists

    // Remove from sales log
    await removeLogEntriesAcrossMonths(EntityType.SALE, entry => entry.entityId === saleId);

    // Also check and remove from player log if this sale awarded points
    const sale = await getSaleById(saleId);
    if (sale && sale.totals.totalRevenue > 0) {
      await removeLogEntriesAcrossMonths(EntityType.PLAYER, entry => entry.sourceId === saleId || entry.sourceSaleId === saleId);
    }

    // Check and remove from character log if this sale was purchased by a character
    await removeLogEntriesAcrossMonths(EntityType.CHARACTER, entry => entry.saleId === saleId || entry.sourceSaleId === saleId);

    // Remove from ITEM Logs (Lifecycle events)
    await removeLogEntriesAcrossMonths(EntityType.ITEM, entry => entry.sourceSaleId === saleId || entry.saleId === saleId);

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

    // Get the sale to find what points were awarded
    const sale = await getSaleById(saleId);

    if (!sale || sale.totals.totalRevenue <= 0) {
      return;
    }

    // Get the player from the sale (same logic as creation)
    const playerId = sale.playerCharacterId || PLAYER_ONE_ID;
    const player = await getPlayerById(playerId);

    if (!player) {
      return;
    }

    // Calculate points to remove based on sale revenue (1 Point = $100)
    const pointsToRemove = calculatePointsFromRevenue(sale.totals.totalRevenue);

    // Check if any points were actually awarded
    const hasPoints = (pointsToRemove.xp || 0) > 0 || (pointsToRemove.rp || 0) > 0 ||
      (pointsToRemove.fp || 0) > 0 || (pointsToRemove.hp || 0) > 0;

    if (!hasPoints) {
      return;
    }

    // Remove the points from the player
    await removePointsFromPlayer(playerId, pointsToRemove);

  } catch (error) {
    console.error(`[removePlayerPointsFromSale] ❌ Failed to remove player points for sale ${saleId}:`, error);
  }
}

/**
 * Revert inventory changes from a sale
 * - Restores stock to the original item
 * - Resets soldAt if no stock remains sold
 */
async function revertSaleInventory(saleId: string): Promise<void> {
  try {
    const sale = await getSaleById(saleId);
    if (!sale || !sale.lines) return;

    for (const line of sale.lines) {
      if (line.kind !== 'item' && line.kind !== 'bundle') continue;

      const itemId = (line as any).itemId;
      const quantityToRestore = (line as any).quantity || 0;

      if (!itemId || quantityToRestore <= 0) continue;

      const item = await getItemById(itemId);
      if (!item) {
        console.warn(`[revertSaleInventory] Item ${itemId} not found, cannot restore stock.`);
        continue;
      }


      // 1. Restore Stock Point
      // We look for a stock point matching the sale's site, or default to the first one available
      const targetSiteId = sale.siteId || item.stock?.[0]?.siteId || 'default';

      let updatedStock = item.stock ? [...item.stock] : [];
      const stockPointIndex = updatedStock.findIndex(sp => sp.siteId === targetSiteId);

      if (stockPointIndex >= 0) {
        updatedStock[stockPointIndex] = {
          ...updatedStock[stockPointIndex],
          quantity: updatedStock[stockPointIndex].quantity + quantityToRestore
        };
      } else {
        // Create new stock point if it doesn't exist (e.g. if it was fully consumed and removed, though usually we keep at 0)
        updatedStock.push({
          siteId: targetSiteId,
          quantity: quantityToRestore
        });
      }

      // 2. Update Quantity Sold
      const newQuantitySold = Math.max(0, (item.quantitySold || 0) - quantityToRestore);

      // 3. Reset Lifecycle fields if "unsold"
      const updatedItem = {
        ...item,
        stock: updatedStock,
        quantitySold: newQuantitySold,
        // If it was marked sold but now isn't, maybe clear soldAt?
        // But soldAt tracks "first sale". We might want to keep it or clear it.
        // Safer to clear if quantitySold goes back to 0.
        soldAt: newQuantitySold === 0 ? undefined : item.soldAt,
        updatedAt: new Date()
      };

      await upsertItem(updatedItem);
    }
  } catch (error) {
    console.error(`[revertSaleInventory] ❌ Failed to revert inventory for sale ${saleId}:`, error);
  }
}