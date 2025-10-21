// workflows/entities-workflows/financial.workflow.ts
// Financial-specific workflow with CHARGED, COLLECTED events

import { EntityType, LogEventType } from '@/types/enums';
import type { FinancialRecord } from '@/types/entities';
import { appendEntityLog, updateEntityLogField } from '../entities-logging';
import { hasEffect, markEffect, clearEffect, clearEffectsByPrefix } from '@/data-store/effects-registry';
import { ClientAPI } from '@/lib/client-api';
import { createItemFromRecord, removeItemsCreatedByRecord } from '../item-creation-utils';
import { awardPointsToPlayer, removePointsFromPlayer, awardJungleCoinsToCharacter, removeJungleCoinsFromCharacter, getMainPlayerId, getMainCharacterId } from '../points-rewards-utils';
import { 
  updateTasksFromFinancialRecord, 
  updateItemsCreatedByRecord, 
  updatePlayerPointsFromSource,
  updateCharacterJungleCoinsFromRecord,
  hasFinancialPropsChanged,
  hasOutputPropsChanged,
  hasRewardsChanged,
  hasJungleCoinsChanged
} from '../update-propagation-utils';

const STATE_FIELDS = ['isNotPaid', 'isNotCharged', 'isCollected'];
const DESCRIPTIVE_FIELDS = ['name', 'description', 'cost', 'revenue', 'jungleCoins', 'notes'];

export async function onFinancialUpsert(financial: FinancialRecord, previousFinancial?: FinancialRecord): Promise<void> {
  // New financial record creation
  if (!previousFinancial) {
    const effectKey = `financial:${financial.id}:created`;
    if (await hasEffect(effectKey)) return;
    
    await appendEntityLog(EntityType.FINANCIAL, financial.id, LogEventType.CREATED, { 
      name: financial.name, 
      type: financial.type,
      station: financial.station,
    });
    await markEffect(effectKey);
    
    // Item creation from emissary fields - on record creation
    if (financial.outputItemType && financial.outputQuantity) {
      const itemEffectKey = `financial:${financial.id}:itemCreated`;
      if (!(await hasEffect(itemEffectKey))) {
        console.log(`[onFinancialUpsert] Creating item from financial record emissary fields: ${financial.name}`);
        const createdItem = await createItemFromRecord(financial);
        if (createdItem) {
          await markEffect(itemEffectKey);
          console.log(`[onFinancialUpsert] ✅ Item created and effect marked: ${createdItem.name}`);
        }
      }
    }
    
    // Points awarding - on record creation with rewards
    if (financial.rewards?.points) {
      const pointsEffectKey = `financial:${financial.id}:pointsAwarded`;
      if (!(await hasEffect(pointsEffectKey))) {
        console.log(`[onFinancialUpsert] Awarding points from financial record: ${financial.name}`);
        await awardPointsToPlayer(getMainPlayerId(), {
          xp: financial.rewards.points.xp || 0,
          rp: financial.rewards.points.rp || 0,
          fp: financial.rewards.points.fp || 0,
          hp: financial.rewards.points.hp || 0
        }, financial.id, EntityType.FINANCIAL);
        await markEffect(pointsEffectKey);
        console.log(`[onFinancialUpsert] ✅ Points awarded and effect marked for record: ${financial.name}`);
      }
    }
    
    // Jungle coins awarding - on record creation
    if (financial.jungleCoins && financial.jungleCoins > 0) {
      const jungleCoinsEffectKey = `financial:${financial.id}:jungleCoinsAwarded`;
      if (!(await hasEffect(jungleCoinsEffectKey))) {
        console.log(`[onFinancialUpsert] Awarding jungle coins from financial record: ${financial.name}`);
        await awardJungleCoinsToCharacter(getMainCharacterId(), financial.jungleCoins, financial.id, EntityType.FINANCIAL);
        await markEffect(jungleCoinsEffectKey);
        console.log(`[onFinancialUpsert] ✅ Jungle coins awarded and effect marked for record: ${financial.name}`);
      }
    }
    
    return;
  }
  
  // Payment status changes - CHARGED event
  if (previousFinancial.isNotCharged && !financial.isNotCharged) {
    await appendEntityLog(EntityType.FINANCIAL, financial.id, LogEventType.CHARGED, {
      name: financial.name,
      revenue: financial.revenue,
      chargedAt: new Date().toISOString()
    });
  }
  
  // Collection status - COLLECTED event
  if (!previousFinancial.isCollected && financial.isCollected) {
    await appendEntityLog(EntityType.FINANCIAL, financial.id, LogEventType.COLLECTED, {
      name: financial.name,
      collectedAt: new Date().toISOString()
    });
  }
  
  // COMPREHENSIVE UPDATE PROPAGATION - when financial record properties change
  if (previousFinancial) {
    // Propagate to Tasks
    if (hasFinancialPropsChanged(financial, previousFinancial)) {
      console.log(`[onFinancialUpsert] Propagating financial changes to tasks: ${financial.name}`);
      await updateTasksFromFinancialRecord(financial, previousFinancial);
    }
    
    // Propagate to Items
    if (hasOutputPropsChanged(financial, previousFinancial)) {
      console.log(`[onFinancialUpsert] Propagating output changes to items: ${financial.name}`);
      await updateItemsCreatedByRecord(financial, previousFinancial);
    }
    
    // Propagate to Player (points delta)
    if (hasRewardsChanged(financial, previousFinancial)) {
      console.log(`[onFinancialUpsert] Propagating points changes to player: ${financial.name}`);
      await updatePlayerPointsFromSource(EntityType.FINANCIAL, financial, previousFinancial);
    }
    
    // Propagate to Character (jungle coins delta)
    if (hasJungleCoinsChanged(financial, previousFinancial)) {
      console.log(`[onFinancialUpsert] Propagating jungle coins changes to character: ${financial.name}`);
      await updateCharacterJungleCoinsFromRecord(financial, previousFinancial);
    }
  }
  
  // Descriptive changes - update in-place
  for (const field of DESCRIPTIVE_FIELDS) {
    if ((previousFinancial as any)[field] !== (financial as any)[field]) {
      await updateEntityLogField(EntityType.FINANCIAL, financial.id, field, (previousFinancial as any)[field], (financial as any)[field]);
    }
  }
}

/**
 * Remove financial record effects when record is deleted
 * Financial records can have entries in multiple logs: financials, character, player, items
 */
export async function removeRecordEffectsOnDelete(recordId: string): Promise<void> {
  try {
    console.log(`[removeRecordEffectsOnDelete] Starting cleanup for record: ${recordId}`);
    
    // 1. Remove items created by this record
    await removeItemsCreatedByRecord(recordId);
    
    // 2. Remove player points that were awarded by this record (if points were badly given)
    await removePlayerPointsFromRecord(recordId);
    
    // 3. Remove jungle coins that were awarded by this record
    await removeJungleCoinsFromRecord(recordId);
    
    // 4. Remove all Links related to this record
    const recordLinks = await ClientAPI.getLinksFor({ type: EntityType.FINANCIAL, id: recordId });
    console.log(`[removeRecordEffectsOnDelete] Found ${recordLinks.length} links to remove`);
    
    for (const link of recordLinks) {
      try {
        await ClientAPI.removeLink(link.id);
        console.log(`[removeRecordEffectsOnDelete] ✅ Removed link: ${link.linkType}`);
      } catch (error) {
        console.error(`[removeRecordEffectsOnDelete] ❌ Failed to remove link ${link.id}:`, error);
      }
    }
    
    // 5. Clear effects registry
    await clearEffect(`financial:${recordId}:created`);
    await clearEffect(`financial:${recordId}:itemCreated`);
    await clearEffect(`financial:${recordId}:pointsAwarded`);
    await clearEffect(`financial:${recordId}:jungleCoinsAwarded`);
    await clearEffectsByPrefix(EntityType.FINANCIAL, recordId, 'pointsLogged:');
    await clearEffectsByPrefix(EntityType.FINANCIAL, recordId, 'financialLogged:');
    
    // 6. Remove log entries from all relevant logs
    console.log(`[removeRecordEffectsOnDelete] Starting log entry removal for record: ${recordId}`);
    
    const removals = await Promise.all([
      ClientAPI.removeLogEntry(EntityType.FINANCIAL, recordId).then(r => { console.log(`[removeRecordEffectsOnDelete] Financials log removal result:`, r); return r; }).catch(e => ({ success: false, message: String(e) })),
      ClientAPI.removeLogEntry(EntityType.CHARACTER, recordId).then(r => { console.log(`[removeRecordEffectsOnDelete] Character log removal result:`, r); return r; }).catch(e => ({ success: false, message: String(e) })),
      ClientAPI.removeLogEntry(EntityType.PLAYER, recordId).then(r => { console.log(`[removeRecordEffectsOnDelete] Player log removal result:`, r); return r; }).catch(e => ({ success: false, message: String(e) })),
      ClientAPI.removeLogEntry(EntityType.ITEM, recordId).then(r => { console.log(`[removeRecordEffectsOnDelete] Items log removal result:`, r); return r; }).catch(e => ({ success: false, message: String(e) })),
    ]);

    console.log(`[removeRecordEffectsOnDelete] All removal results:`, removals);
    const failed = removals.filter(r => !r.success);
    if (failed.length > 0) {
      console.error('[removeRecordEffectsOnDelete] Some log removals failed:', failed);
    } else {
      console.log(`[removeRecordEffectsOnDelete] ✅ All log entries removed successfully for record: ${recordId}`);
    }
    
    console.log(`[removeRecordEffectsOnDelete] ✅ Cleared effects, removed links, deleted created items, and removed log entries for record ${recordId}`);
  } catch (error) {
    console.error('Error removing record effects:', error);
  }
}

/**
 * Remove player points that were awarded by a specific financial record
 * This is used when rolling back a record that incorrectly awarded points
 */
async function removePlayerPointsFromRecord(recordId: string): Promise<void> {
  try {
    console.log(`[removePlayerPointsFromRecord] Removing points for record: ${recordId}`);
    
    // Get the record to find what points were awarded
    const records = await ClientAPI.getFinancialRecords();
    const record = records.find(r => r.id === recordId);
    
    if (!record || !record.rewards?.points) {
      console.log(`[removePlayerPointsFromRecord] Record ${recordId} has no points to remove`);
      return;
    }
    
    // Get the main player
    const mainPlayerId = getMainPlayerId();
    const players = await ClientAPI.getPlayers();
    const mainPlayer = players.find(p => p.id === mainPlayerId);
    
    if (!mainPlayer) {
      console.log(`[removePlayerPointsFromRecord] Main player not found, skipping points removal`);
      return;
    }
    
    // Check if any points were actually awarded
    const pointsToRemove = record.rewards.points;
    const hasPoints = (pointsToRemove.xp || 0) > 0 || (pointsToRemove.rp || 0) > 0 || 
                     (pointsToRemove.fp || 0) > 0 || (pointsToRemove.hp || 0) > 0;
    
    if (!hasPoints) {
      console.log(`[removePlayerPointsFromRecord] No points to remove from record ${recordId}`);
      return;
    }
    
    // Remove the points from the player
    await removePointsFromPlayer(mainPlayerId, {
      xp: pointsToRemove.xp || 0,
      rp: pointsToRemove.rp || 0,
      fp: pointsToRemove.fp || 0,
      hp: pointsToRemove.hp || 0
    });
    console.log(`[removePlayerPointsFromRecord] ✅ Removed points from player: ${JSON.stringify(pointsToRemove)}`);
    
  } catch (error) {
    console.error(`[removePlayerPointsFromRecord] ❌ Failed to remove player points for record ${recordId}:`, error);
  }
}

/**
 * Remove jungle coins that were awarded by a specific financial record
 * This is used when rolling back a record that incorrectly awarded jungle coins
 */
async function removeJungleCoinsFromRecord(recordId: string): Promise<void> {
  try {
    console.log(`[removeJungleCoinsFromRecord] Removing jungle coins for record: ${recordId}`);
    
    // Get the record to find what jungle coins were awarded
    const records = await ClientAPI.getFinancialRecords();
    const record = records.find(r => r.id === recordId);
    
    if (!record || !record.jungleCoins || record.jungleCoins <= 0) {
      console.log(`[removeJungleCoinsFromRecord] Record ${recordId} has no jungle coins to remove`);
      return;
    }
    
    // Get the main character
    const mainCharacterId = getMainCharacterId();
    const characters = await ClientAPI.getCharacters();
    const mainCharacter = characters.find(c => c.id === mainCharacterId);
    
    if (!mainCharacter) {
      console.log(`[removeJungleCoinsFromRecord] Main character not found, skipping jungle coins removal`);
      return;
    }
    
    // Remove the jungle coins from the character
    await removeJungleCoinsFromCharacter(mainCharacterId, record.jungleCoins);
    console.log(`[removeJungleCoinsFromRecord] ✅ Removed ${record.jungleCoins} jungle coins from character`);
    
  } catch (error) {
    console.error(`[removeJungleCoinsFromRecord] ❌ Failed to remove jungle coins for record ${recordId}:`, error);
  }
}