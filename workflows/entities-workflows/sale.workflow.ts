// workflows/entities-workflows/sale.workflow.ts
// Sale-specific workflow with CHARGED, CANCELLED, COLLECTED events

import { EntityType, LogEventType, FOUNDER_CHARACTER_ID, SaleStatus, SaleType, ItemStatus } from '@/types/enums';
import type { Item, Sale } from '@/types/entities';
import { appendEntityLog, updateEntityLeanFields, removeLogEntriesAcrossMonths } from '../entities-logging';
import { hasEffect, markEffect, clearEffectsByPrefix } from '@/data-store/effects-registry';
import { EffectKeys } from '@/data-store/keys';
import { getLinksFor, removeLink } from '@/links/link-registry';
import { getPlayerById, getSaleById, getItemById, getFinancialsBySourceSaleId, removeFinancial, upsertItem } from '@/data-store/datastore';
import { stagePointsForPlayer, removePointsFromPlayer, rewardPointsToPlayer } from '../points-rewards-utils';
import { processSaleLines, ensureSoldItemEntities } from '../sale-line-utils';
import { updateFinancialRecordsFromSale, updateItemsFromSale, hasRevenueChanged, hasLinesChanged } from '../update-propagation-utils';
import { createCharacterFromSale } from '../character-creation-utils';
import { upsertSale } from '@/data-store/datastore';
import { formatMonthKey, calculateClosingDate } from '@/lib/utils/date-utils';
import { buildArchiveCollectionIndexKey, buildArchiveMonthsKey } from '@/data-store/keys';
import { getSaleLogDetails } from '@/lib/utils/sale-log-details';
import { entityHasLogEvent } from '@/lib/utils/entity-log-scan';

const STATE_FIELDS = ['status', 'isNotPaid', 'isNotCharged', 'isCollected', 'postedAt', 'doneAt', 'cancelledAt'];

function saleHasRewardPoints(sale: Sale): boolean {
  const p = sale.rewards?.points;
  if (!p) return false;
  return (p.xp || 0) > 0 || (p.rp || 0) > 0 || (p.fp || 0) > 0 || (p.hp || 0) > 0;
}

function saleHasChargedLog(saleId: string): Promise<boolean> {
  return entityHasLogEvent(EntityType.SALE, saleId, 'charged');
}

/**
 * Backfill missing CHARGED/COLLECTED rows from current sale state (idempotent).
 */
export async function ensureSaleLifecycleLogsForState(sale: Sale): Promise<void> {
  if (sale.status === SaleStatus.CANCELLED) return;

  const chargedOk =
    sale.status === SaleStatus.CHARGED && !sale.isNotPaid && !sale.isNotCharged;
  const isCollectedState = sale.status === SaleStatus.COLLECTED || sale.isCollected;
  const needsCharged = chargedOk || isCollectedState;

  if (needsCharged && !(await saleHasChargedLog(sale.id))) {
    const chargedAt = sale.chargedAt ? new Date(sale.chargedAt as Date) : undefined;
    const ts = sale.doneAt || chargedAt || sale.saleDate || sale.updatedAt || new Date();
    await appendEntityLog(EntityType.SALE, sale.id, LogEventType.CHARGED, getSaleLogDetails(sale), ts);
  }

  if (isCollectedState && !(await entityHasLogEvent(EntityType.SALE, sale.id, 'collected'))) {
    let defaultCollectedAt: Date;
    if (sale.saleDate) {
      defaultCollectedAt = calculateClosingDate(sale.saleDate);
    } else if (sale.createdAt) {
      defaultCollectedAt = calculateClosingDate(sale.createdAt);
    } else {
      defaultCollectedAt = calculateClosingDate(new Date());
    }
    const collectedAt = sale.collectedAt ? new Date(sale.collectedAt) : defaultCollectedAt;
    await appendEntityLog(
      EntityType.SALE,
      sale.id,
      LogEventType.COLLECTED,
      {
        ...getSaleLogDetails(sale),
        collectedAt: collectedAt.toISOString(),
      },
      collectedAt
    );
  }
}

/** Precision repair: append CHARGED log when sale is charged/collected but row is missing. */
export async function ensureSaleChargedLog(saleId: string): Promise<{
  success: boolean;
  noop?: boolean;
  error?: string;
}> {
  const sale = await getSaleById(saleId);
  if (!sale) return { success: false, error: `Sale not found: ${saleId}` };
  if (sale.status === SaleStatus.CANCELLED) {
    return { success: false, error: 'Sale is cancelled.' };
  }
  const chargedOk =
    sale.status === SaleStatus.CHARGED && !sale.isNotPaid && !sale.isNotCharged;
  const isCollectedState = sale.status === SaleStatus.COLLECTED || sale.isCollected;
  const needsCharged = chargedOk || isCollectedState;
  if (!needsCharged) {
    return {
      success: false,
      error: 'Sale is not charged (paid) or collected; CHARGED log not implied.',
    };
  }
  if (await saleHasChargedLog(saleId)) {
    return { success: true, noop: true };
  }
  const chargedAt = sale.chargedAt ? new Date(sale.chargedAt as Date) : undefined;
  const ts = sale.doneAt || chargedAt || sale.saleDate || sale.updatedAt || new Date();
  await appendEntityLog(EntityType.SALE, sale.id, LogEventType.CHARGED, getSaleLogDetails(sale), ts);
  return { success: true };
}

/** Precision repair: append COLLECTED log if sale is collected and row is missing. */
export async function ensureSaleCollectedLog(saleId: string): Promise<{
  success: boolean;
  noop?: boolean;
  error?: string;
}> {
  const sale = await getSaleById(saleId);
  if (!sale) return { success: false, error: `Sale not found: ${saleId}` };
  const isCollectedState = sale.status === SaleStatus.COLLECTED || sale.isCollected;
  if (!isCollectedState) {
    return { success: false, error: 'Sale is not in collected state (status/isCollected).' };
  }
  if (await entityHasLogEvent(EntityType.SALE, saleId, 'collected')) {
    return { success: true, noop: true };
  }
  let defaultCollectedAt: Date;
  if (sale.saleDate) {
    defaultCollectedAt = calculateClosingDate(sale.saleDate);
  } else if (sale.createdAt) {
    defaultCollectedAt = calculateClosingDate(sale.createdAt);
  } else {
    defaultCollectedAt = calculateClosingDate(new Date());
  }
  const collectedAt = sale.collectedAt ? new Date(sale.collectedAt) : defaultCollectedAt;
  await appendEntityLog(
    EntityType.SALE,
    sale.id,
    LogEventType.COLLECTED,
    {
      ...getSaleLogDetails(sale),
      collectedAt: collectedAt.toISOString(),
    },
    collectedAt
  );
  return { success: true };
}

/** @deprecated Use ensureSaleCollectedLog */
export const ensureSaleCollectedLifecycleLog = ensureSaleCollectedLog;

export async function onSaleUpsert(sale: Sale, previousSale?: Sale): Promise<void> {
  // New sale creation
  if (!previousSale) {
    const effectKey = EffectKeys.created('sale', sale.id);
    if (await hasEffect(effectKey)) return;

    await appendEntityLog(EntityType.SALE, sale.id, LogEventType.CREATED, getSaleLogDetails(sale), sale.saleDate || sale.createdAt);
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
      sale.status === SaleStatus.CHARGED && !sale.isNotPaid && !sale.isNotCharged;
    if (isCharged) {
      await processChargedSaleLines(sale);
      if (saleHasRewardPoints(sale)) {
        const stagingKey = EffectKeys.sideEffect('sale', sale.id, 'pointsStaged');
        if (!(await hasEffect(stagingKey))) {
          const playerId = sale.playerCharacterId || FOUNDER_CHARACTER_ID;
          await stagePointsForPlayer(
            playerId,
            sale.rewards!.points,
            sale.id,
            EntityType.SALE,
            sale.saleDate || sale.createdAt || new Date()
          );
          await markEffect(stagingKey);
        }
      }
    }

    return;
  }

  // Status changes - PENDING (not paid/not charged) vs CHARGED (paid and charged)
  const wasPending = previousSale!.isNotPaid || previousSale!.isNotCharged;
  const nowPending = sale.isNotPaid || sale.isNotCharged;
  const becameFullyPaid = wasPending && !nowPending;

  if (previousSale.status !== sale.status && sale.status === SaleStatus.CANCELLED) {
    await appendEntityLog(
      EntityType.SALE,
      sale.id,
      LogEventType.CANCELLED,
      getSaleLogDetails(sale),
      sale.cancelledAt || sale.saleDate || new Date()
    );
  } else if (sale.status !== SaleStatus.CANCELLED && (becameFullyPaid || (previousSale.status !== sale.status && sale.status === SaleStatus.CHARGED && !nowPending))) {
    const chargedAt = sale.chargedAt ? new Date(sale.chargedAt) : new Date();
    (sale as any).chargedAt = chargedAt;

    const chargedLoggedKey = EffectKeys.sideEffect('sale', sale.id, 'saleDoneLogged');
    if (!(await hasEffect(chargedLoggedKey))) {
      await appendEntityLog(
        EntityType.SALE,
        sale.id,
        LogEventType.CHARGED,
        getSaleLogDetails(sale),
        sale.doneAt || chargedAt
      );
      await markEffect(chargedLoggedKey);
    }

    if (saleHasRewardPoints(sale)) {
      const stagingKey = EffectKeys.sideEffect('sale', sale.id, 'pointsStaged');
      if (!(await hasEffect(stagingKey))) {
        const playerId = sale.playerCharacterId || FOUNDER_CHARACTER_ID;
        await stagePointsForPlayer(
          playerId,
          sale.rewards!.points,
          sale.id,
          EntityType.SALE,
          sale.saleDate || chargedAt
        );
        await markEffect(stagingKey);
      }
    }

    await processChargedSaleLines(sale);
  } else if (!wasPending && nowPending) {
    await appendEntityLog(EntityType.SALE, sale.id, LogEventType.PENDING, getSaleLogDetails(sale), sale.saleDate || new Date());
  }

  // Collection detection - Dual detection: status OR flag change to COLLECTED (mirror task.workflow)
  const statusBecameCollected =
    sale.status === SaleStatus.COLLECTED &&
    (!previousSale || previousSale.status !== SaleStatus.COLLECTED);

  const flagBecameCollected =
    !!sale.isCollected && (!previousSale || !previousSale.isCollected);

  if (statusBecameCollected || flagBecameCollected) {
    let defaultCollectedAt: Date;

    if (sale.saleDate) {
      defaultCollectedAt = calculateClosingDate(sale.saleDate);
    } else if (sale.createdAt) {
      defaultCollectedAt = calculateClosingDate(sale.createdAt);
    } else {
      const now = new Date();
      const adjustedNow = new Date(now.getTime() - 6 * 60 * 60 * 1000);
      defaultCollectedAt = calculateClosingDate(adjustedNow);
    }

    const collectedAt = sale.collectedAt ?? defaultCollectedAt;

    const wasNeverCharged = previousSale?.status !== SaleStatus.CHARGED && sale.status !== SaleStatus.CHARGED;
    const hasItems = sale.lines?.some(l => l.kind === 'item' || l.kind === 'bundle');
    if (wasNeverCharged && hasItems) {
      await processChargedSaleLines(sale);
    }

    const saleCollectedLoggedKey = EffectKeys.sideEffect('sale', sale.id, 'saleCollectedLogged');
    if (!(await hasEffect(saleCollectedLoggedKey))) {
      await appendEntityLog(
        EntityType.SALE,
        sale.id,
        LogEventType.COLLECTED,
        {
          ...getSaleLogDetails(sale),
          collectedAt: collectedAt.toISOString()
        },
        collectedAt
      );
      await markEffect(saleCollectedLoggedKey);
    }

    const pointsRewardedEffectKey = EffectKeys.sideEffect('sale', sale.id, 'pointsRewarded');
    if (!(await hasEffect(pointsRewardedEffectKey))) {
      const stagingEffectKey = EffectKeys.sideEffect('sale', sale.id, 'pointsStaged');
      if (saleHasRewardPoints(sale) && (await hasEffect(stagingEffectKey))) {
        const playerId = sale.playerCharacterId || FOUNDER_CHARACTER_ID;
        await rewardPointsToPlayer(
          playerId,
          sale.rewards!.points,
          sale.id,
          EntityType.SALE,
          collectedAt
        );
      }
      await markEffect(pointsRewardedEffectKey);
    }
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

    // Sale player points: staged/rewarded only via explicit sale.rewards + effects (task parity). No revenue deltas.
  }

  // Lean identity fields changed — cascade patch ALL log entries across ALL months and events
  if (previousSale) {
    const oldDetails = getSaleLogDetails(previousSale);
    const newDetails = getSaleLogDetails(sale);

    const leanFieldsChanged =
      oldDetails.name !== newDetails.name ||
      oldDetails.type !== newDetails.type ||
      oldDetails.station !== newDetails.station ||
      oldDetails.cost !== newDetails.cost ||
      oldDetails.revenue !== newDetails.revenue ||
      oldDetails.siteId !== newDetails.siteId;

    if (leanFieldsChanged) {
      await updateEntityLeanFields(EntityType.SALE, sale.id, newDetails);
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

    // Remove this sale from every archive month except the computed target month
    const allMonths = await getAvailableArchiveMonths();
    for (const m of allMonths) {
      if (m !== newMonth) {
        await kvSRem(buildArchiveCollectionIndexKey('sales', m), sale.id);
      }
    }

    if (newMonth) {
      await kvSAdd(buildArchiveCollectionIndexKey('sales', newMonth), sale.id);
      await kvSAdd(buildArchiveMonthsKey(), newMonth);

      // ── Log Sync ──────────────────────────────────────────────────────────
      // When an archived sale is re-saved for data correction (no status change),
      // no COLLECTED log event fires above. We must ensure the correct
      // entry exists in the target month's log and carries updated fields.
      const { getEntityLogs, removeLogEntriesAcrossMonths } = await import('../entities-logging');
      await removeLogEntriesAcrossMonths(EntityType.SALE, (entry: any) => {
        if (entry.entityId !== sale.id) return false;
        const ev = String(entry.event ?? entry.status ?? '').toLowerCase();
        return ev === 'collected' || ev === 'charged';
      });

      const collectedAt = sale.collectedAt || calculateClosingDate(sale.saleDate || new Date());

      const chargedOk =
        sale.status !== SaleStatus.CANCELLED && !sale.isNotPaid && !sale.isNotCharged;
      if (chargedOk) {
        const ts = sale.doneAt || (sale as { chargedAt?: Date }).chargedAt || sale.saleDate || new Date();
        await appendEntityLog(
          EntityType.SALE,
          sale.id,
          LogEventType.CHARGED,
          getSaleLogDetails(sale),
          ts
        );
      }

      await appendEntityLog(EntityType.SALE, sale.id, LogEventType.COLLECTED, getSaleLogDetails(sale), collectedAt);
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

  if (previousSale) {
    await ensureSaleLifecycleLogsForState(sale);
  }
}

async function processChargedSaleLines(sale: Sale): Promise<void> {
  const linesProcessedKey = EffectKeys.sideEffect('sale', sale.id, 'linesProcessed');
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
    await clearEffect(EffectKeys.sideEffect('sale', saleId, 'saleCollectedLogged'));
    await clearEffect(EffectKeys.sideEffect('sale', saleId, 'saleDoneLogged'));
    await clearEffect(EffectKeys.sideEffect('sale', saleId, 'pointsRewarded'));
    await clearEffect(EffectKeys.sideEffect('sale', saleId, 'pointsStaged'));

    // 4. Remove log entries from all relevant monthly lists

    // Remove from sales log
    await removeLogEntriesAcrossMonths(EntityType.SALE, entry => entry.entityId === saleId);

    // Also check and remove from player log if this sale awarded points
    const sale = await getSaleById(saleId);
    if (sale && saleHasRewardPoints(sale)) {
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
    const sale = await getSaleById(saleId);

    if (!sale || !saleHasRewardPoints(sale)) {
      return;
    }

    const playerId = sale.playerCharacterId || FOUNDER_CHARACTER_ID;
    const player = await getPlayerById(playerId);

    if (!player) {
      return;
    }

    const pointsToRemove = sale.rewards!.points;

    const hasPoints =
      (pointsToRemove.xp || 0) > 0 ||
      (pointsToRemove.rp || 0) > 0 ||
      (pointsToRemove.fp || 0) > 0 ||
      (pointsToRemove.hp || 0) > 0;

    if (!hasPoints) {
      return;
    }

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
        // If it was marked sold but now isn't, clear soldAt
        soldAt: newQuantitySold === 0 ? undefined : item.soldAt,
        // When reversing a clone item, it must go back to active inventory if fully unsold
        status: newQuantitySold === 0 ? ItemStatus.FOR_SALE : item.status,
        updatedAt: new Date()
      };

      await upsertItem(updatedItem);
    }
  } catch (error) {
    console.error(`[revertSaleInventory] ❌ Failed to revert inventory for sale ${saleId}:`, error);
  }
}
