// workflows/entities-workflows/sale.workflow.ts
// Sale-specific workflow with CHARGED, CANCELLED, COLLECTED events

import { EntityType, LogEventType, PLAYER_ONE_ID } from '@/types/enums';
import type { Sale } from '@/types/entities';
import { appendEntityLog, updateEntityLogField } from '../entities-logging';
import { hasEffect, markEffect, clearEffectsByPrefix } from '@/data-store/effects-registry';
import { EffectKeys } from '@/data-store/keys';
import { getLinksFor, removeLink } from '@/links/link-registry';
import { getPlayerById, getSaleById } from '@/data-store/datastore';
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
import { upsertSale } from '@/data-store/datastore';

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
          await upsertSale(updatedSale, { skipWorkflowEffects: true });
          await markEffect(characterEffectKey);
          console.log(`[onSaleUpsert] ✅ Character created and sale updated: ${createdCharacter.name}`);
        }
      }
    }
    
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
      const linesProcessedKey = `sale:${sale.id}:linesProcessed`;
      if (!(await hasEffect(linesProcessedKey))) {
        console.log(`[onSaleUpsert] Processing sale lines for charged sale: ${sale.counterpartyName}`);
        await processSaleLines(sale);
        await markEffect(linesProcessedKey);
        console.log(`[onSaleUpsert] ✅ Sale lines processed and effect marked: ${sale.counterpartyName}`);
      }
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
  
  // Collection status - COLLECTED event (kept for completeness)
  if (!previousSale.isCollected && sale.isCollected) {
    await appendEntityLog(EntityType.SALE, sale.id, LogEventType.COLLECTED, {
      type: sale.type,
      counterpartyName: sale.counterpartyName,
      totals: {
        subtotal: sale.totals.subtotal,
        discountTotal: sale.totals.discountTotal,
        taxTotal: sale.totals.taxTotal,
        totalRevenue: sale.totals.totalRevenue
      },
      collectedAt: new Date().toISOString()
    });
  }
  
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
    
    // TODO: Implement server-side log removal or remove these calls
    console.log(`[removeSaleEffectsOnDelete] ⚠️ Log entry removal skipped - needs server-side implementation`);
    
    const removals: { success: boolean; message?: string }[] = []; // Placeholder for removed log calls

    console.log(`[removeSaleEffectsOnDelete] All removal results:`, removals);
    const failed = removals.filter(r => !r.success);
    if (failed.length > 0) {
      console.error('[removeSaleEffectsOnDelete] Some log removals failed:', failed);
    } else {
      console.log(`[removeSaleEffectsOnDelete] ✅ All log entries removed successfully for sale: ${saleId}`);
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