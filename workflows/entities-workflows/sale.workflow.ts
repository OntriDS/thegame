// workflows/entities-workflows/sale.workflow.ts
// Sale-specific workflow with CHARGED, CANCELLED, COLLECTED events

import type { Sale } from '@/types/entities';
import { appendEntityLog, updateEntityLogField } from '../entities-logging';
import { hasEffect, markEffect, clearEffectsByPrefix } from '@/data-store/effects-registry';
import { ClientAPI } from '@/lib/client-api';
import { awardPointsToPlayer, removePointsFromPlayer, calculatePointsFromRevenue, getMainPlayerId } from '../points-rewards-utils';
import { processSaleLines } from '../sale-line-utils';
import { 
  updateFinancialRecordsFromSale, 
  updateItemsFromSale, 
  updatePlayerPointsFromSource,
  hasRevenueChanged,
  hasLinesChanged
} from '../update-propagation-utils';

const STATE_FIELDS = ['status', 'isNotPaid', 'isNotCharged', 'isCollected', 'postedAt', 'doneAt', 'cancelledAt'];
const DESCRIPTIVE_FIELDS = ['counterpartyName', 'totals'];

export async function onSaleUpsert(sale: Sale, previousSale?: Sale): Promise<void> {
  // New sale creation
  if (!previousSale) {
    const effectKey = `sale:${sale.id}:created`;
    if (await hasEffect(effectKey)) return;
    
    await appendEntityLog('sale', sale.id, 'CREATED', { 
      type: sale.type,
      status: sale.status,
      counterpartyName: sale.counterpartyName,
      totalRevenue: sale.totals.totalRevenue
    });
    await markEffect(effectKey);
    
    // Points awarding - on sale creation with revenue
    if (sale.totals.totalRevenue > 0) {
      const pointsEffectKey = `sale:${sale.id}:pointsAwarded`;
      if (!(await hasEffect(pointsEffectKey))) {
        console.log(`[onSaleUpsert] Awarding points from sale revenue: ${sale.counterpartyName}`);
        const points = calculatePointsFromRevenue(sale.totals.totalRevenue);
        await awardPointsToPlayer(getMainPlayerId(), points, sale.id, 'sale');
        await markEffect(pointsEffectKey);
        console.log(`[onSaleUpsert] ✅ Points awarded and effect marked for sale: ${sale.counterpartyName}`);
      }
    }
    
    return;
  }
  
  // Status changes
  if (previousSale.status !== sale.status) {
    if (sale.status === 'CHARGED') {
      await appendEntityLog('sale', sale.id, 'CHARGED', {
        counterpartyName: sale.counterpartyName,
        totalRevenue: sale.totals.totalRevenue,
        chargedAt: new Date().toISOString()
      });
      
      // Process sale lines when sale is charged
      const linesProcessedKey = `sale:${sale.id}:linesProcessed`;
      if (!(await hasEffect(linesProcessedKey))) {
        console.log(`[onSaleUpsert] Processing sale lines for charged sale: ${sale.counterpartyName}`);
        await processSaleLines(sale);
        await markEffect(linesProcessedKey);
        console.log(`[onSaleUpsert] ✅ Sale lines processed and effect marked: ${sale.counterpartyName}`);
      }
    } else if (sale.status === 'CANCELLED') {
      await appendEntityLog('sale', sale.id, 'CANCELLED', {
        counterpartyName: sale.counterpartyName,
        cancelledAt: sale.cancelledAt || new Date().toISOString()
      });
    }
  }
  
  // Collection status - COLLECTED event
  if (!previousSale.isCollected && sale.isCollected) {
    await appendEntityLog('sale', sale.id, 'COLLECTED', {
      counterpartyName: sale.counterpartyName,
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
      await updatePlayerPointsFromSource('sale', sale, previousSale);
    }
  }
  
  // Descriptive changes - update in-place
  for (const field of DESCRIPTIVE_FIELDS) {
    if ((previousSale as any)[field] !== (sale as any)[field]) {
      await updateEntityLogField('sale', sale.id, field, (previousSale as any)[field], (sale as any)[field]);
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
    const saleLinks = await ClientAPI.getLinksFor({ type: 'sale', id: saleId });
    console.log(`[removeSaleEffectsOnDelete] Found ${saleLinks.length} links to remove`);
    
    for (const link of saleLinks) {
      try {
        await ClientAPI.removeLink(link.id);
        console.log(`[removeSaleEffectsOnDelete] ✅ Removed link: ${link.linkType}`);
      } catch (error) {
        console.error(`[removeSaleEffectsOnDelete] ❌ Failed to remove link ${link.id}:`, error);
      }
    }
    
    // 3. Clear effects registry
    await clearEffectsByPrefix('sale', saleId, 'sale:');
    await clearEffectsByPrefix('sale', saleId, 'pointsAwarded:');
    
    // 4. Remove log entries from all relevant logs
    console.log(`[removeSaleEffectsOnDelete] Starting log entry removal for sale: ${saleId}`);
    
    const removals = await Promise.all([
      ClientAPI.removeLogEntry('sales', saleId).then(r => { console.log(`[removeSaleEffectsOnDelete] Sales log removal result:`, r); return r; }).catch(e => ({ success: false, message: String(e) })),
      ClientAPI.removeLogEntry('financials', saleId).then(r => { console.log(`[removeSaleEffectsOnDelete] Financials log removal result:`, r); return r; }).catch(e => ({ success: false, message: String(e) })),
      ClientAPI.removeLogEntry('character', saleId).then(r => { console.log(`[removeSaleEffectsOnDelete] Character log removal result:`, r); return r; }).catch(e => ({ success: false, message: String(e) })),
      ClientAPI.removeLogEntry('items', saleId).then(r => { console.log(`[removeSaleEffectsOnDelete] Items log removal result:`, r); return r; }).catch(e => ({ success: false, message: String(e) })),
    ]);

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
    const sales = await ClientAPI.getSales();
    const sale = sales.find(s => s.id === saleId);
    
    if (!sale || sale.totals.totalRevenue <= 0) {
      console.log(`[removePlayerPointsFromSale] Sale ${saleId} has no revenue to remove points from`);
      return;
    }
    
    // Get the main player
    const mainPlayerId = getMainPlayerId();
    const players = await ClientAPI.getPlayers();
    const mainPlayer = players.find(p => p.id === mainPlayerId);
    
    if (!mainPlayer) {
      console.log(`[removePlayerPointsFromSale] Main player not found, skipping points removal`);
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
    await removePointsFromPlayer(mainPlayerId, pointsToRemove);
    console.log(`[removePlayerPointsFromSale] ✅ Removed points from player: ${JSON.stringify(pointsToRemove)} (sale revenue: ${sale.totals.totalRevenue})`);
    
  } catch (error) {
    console.error(`[removePlayerPointsFromSale] ❌ Failed to remove player points for sale ${saleId}:`, error);
  }
}