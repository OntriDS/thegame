// workflows/update-propagation-utils.ts
// Comprehensive update propagation across ALL entity relationships

import type { Task, Item, Sale, FinancialRecord, Character, Player } from '@/types/entities';
import { EntityType } from '@/types/enums';
import { hasEffect, markEffect } from '@/data-store/effects-registry';
import {
  getFinancialsBySourceTaskId,
  getItemsBySourceTaskId,
  getItemsBySourceRecordId,
  getAllFinancials, upsertFinancial,
  getAllTasks, upsertTask,
  getAllItems, upsertItem,
  getAllPlayers, upsertPlayer,
  getAllCharacters, upsertCharacter
} from '@/data-store/datastore';

// ============================================================================
// TASK → FINANCIAL RECORD PROPAGATION
// ============================================================================

export async function updateFinancialRecordsFromTask(
  task: Task, 
  previousTask: Task
): Promise<void> {
  try {
    console.log(`[updateFinancialRecordsFromTask] Updating financial records for task: ${task.name}`);
    
    // OPTIMIZED: Only load financials created by this task (already filtered by index)
    const relatedRecords = await getFinancialsBySourceTaskId(task.id);
    
    for (const record of relatedRecords) {
      const updateKey = `updateFinancialFromTask:${task.id}:${record.id}:${task.updatedAt?.getTime()}`;
      
      if (await hasEffect(updateKey)) {
        console.log(`[updateFinancialRecordsFromTask] ⏭️ Already updated record: ${record.id}`);
        continue;
      }
      
      // Check if financial properties changed
      const financialPropsChanged = 
        task.cost !== previousTask.cost ||
        task.revenue !== previousTask.revenue ||
        task.isNotPaid !== previousTask.isNotPaid ||
        task.isNotCharged !== previousTask.isNotCharged ||
        task.name !== previousTask.name ||
        task.station !== previousTask.station;
      
      if (financialPropsChanged) {
        const updatedRecord = {
          ...record,
          cost: task.cost,
          revenue: task.revenue,
          isNotPaid: task.isNotPaid,
          isNotCharged: task.isNotCharged,
          name: task.name,
          station: task.station,
          updatedAt: new Date()
        };
        
        await upsertFinancial(updatedRecord);
        await markEffect(updateKey);
        
        console.log(`[updateFinancialRecordsFromTask] ✅ Updated financial record: ${record.id}`);
      }
    }
  } catch (error) {
    console.error(`[updateFinancialRecordsFromTask] Error updating financial records:`, error);
  }
}

// ============================================================================
// FINANCIAL RECORD → TASK PROPAGATION
// ============================================================================

export async function updateTasksFromFinancialRecord(
  record: FinancialRecord,
  previousRecord: FinancialRecord
): Promise<void> {
  try {
    console.log(`[updateTasksFromFinancialRecord] Updating tasks for financial record: ${record.name}`);
    
    // Find tasks that created this financial record
    const allTasks = await getAllTasks();
    const relatedTasks = allTasks.filter(task => task.id === record.sourceTaskId);
    
    for (const task of relatedTasks) {
      const updateKey = `updateTaskFromFinancial:${record.id}:${task.id}:${record.updatedAt?.getTime()}`;
      
      if (await hasEffect(updateKey)) {
        console.log(`[updateTasksFromFinancialRecord] ⏭️ Already updated task: ${task.id}`);
        continue;
      }
      
      // Check if financial properties changed
      const financialPropsChanged = 
        record.cost !== previousRecord.cost ||
        record.revenue !== previousRecord.revenue ||
        record.isNotPaid !== previousRecord.isNotPaid ||
        record.isNotCharged !== previousRecord.isNotCharged ||
        record.name !== previousRecord.name ||
        record.station !== previousRecord.station;
      
      if (financialPropsChanged) {
        const updatedTask = {
          ...task,
          cost: record.cost,
          revenue: record.revenue,
          isNotPaid: record.isNotPaid,
          isNotCharged: record.isNotCharged,
          name: record.name,
          station: record.station,
          updatedAt: new Date()
        };
        
        await upsertTask(updatedTask);
        await markEffect(updateKey);
        
        console.log(`[updateTasksFromFinancialRecord] ✅ Updated task: ${task.id}`);
      }
    }
  } catch (error) {
    console.error(`[updateTasksFromFinancialRecord] Error updating tasks:`, error);
  }
}

// ============================================================================
// TASK → ITEM PROPAGATION (Enhanced)
// ============================================================================

export async function updateItemsCreatedByTask(
  task: Task,
  previousTask: Task
): Promise<void> {
  try {
    console.log(`[updateItemsCreatedByTask] Updating items for task: ${task.name}`);
    
    // OPTIMIZED: Only load items created by this task (already filtered by index)
    const relatedItems = await getItemsBySourceTaskId(task.id);
    
    for (const item of relatedItems) {
      const updateKey = `updateItemFromTask:${task.id}:${item.id}:${task.updatedAt?.getTime()}`;
      
      if (await hasEffect(updateKey)) {
        console.log(`[updateItemsCreatedByTask] ⏭️ Already updated item: ${item.id}`);
        continue;
      }
      
      // Check if output properties changed
      const outputPropsChanged = 
        task.outputQuantity !== previousTask.outputQuantity ||
        task.outputItemName !== previousTask.outputItemName ||
        task.outputUnitCost !== previousTask.outputUnitCost ||
        task.outputItemPrice !== previousTask.outputItemPrice ||
        task.station !== previousTask.station;
      
      if (outputPropsChanged) {
        const updatedItem = {
          ...item,
          name: task.outputItemName || item.name,
          unitCost: task.outputUnitCost || item.unitCost,
          price: task.outputItemPrice || item.price,
          station: task.station || item.station,
          updatedAt: new Date()
        };
        
        // Update stock quantity if it changed
        if (task.outputQuantity !== previousTask.outputQuantity) {
          const quantityDiff = (task.outputQuantity || 0) - (previousTask.outputQuantity || 0);
          if (quantityDiff !== 0) {
            // Update the first stock point (or create one if none exists)
            if (updatedItem.stock && updatedItem.stock.length > 0) {
              updatedItem.stock[0].quantity += quantityDiff;
            } else {
            updatedItem.stock = [{
              siteId: task.siteId || 'default',
              quantity: quantityDiff
            }];
            }
          }
        }
        
        await upsertItem(updatedItem);
        await markEffect(updateKey);
        
        console.log(`[updateItemsCreatedByTask] ✅ Updated item: ${item.id}`);
      }
    }
  } catch (error) {
    console.error(`[updateItemsCreatedByTask] Error updating items:`, error);
  }
}

// ============================================================================
// FINANCIAL RECORD → ITEM PROPAGATION (Enhanced)
// ============================================================================

export async function updateItemsCreatedByRecord(
  record: FinancialRecord,
  previousRecord: FinancialRecord
): Promise<void> {
  try {
    console.log(`[updateItemsCreatedByRecord] Updating items for financial record: ${record.name}`);
    
    // OPTIMIZED: Only load items created by this record (already filtered by index)
    const relatedItems = await getItemsBySourceRecordId(record.id);
    
    for (const item of relatedItems) {
      const updateKey = `updateItemFromRecord:${record.id}:${item.id}:${record.updatedAt?.getTime()}`;
      
      if (await hasEffect(updateKey)) {
        console.log(`[updateItemsCreatedByRecord] ⏭️ Already updated item: ${item.id}`);
        continue;
      }
      
      // Check if output properties changed
      const outputPropsChanged = 
        record.outputQuantity !== previousRecord.outputQuantity ||
        record.outputItemName !== previousRecord.outputItemName ||
        record.outputUnitCost !== previousRecord.outputUnitCost ||
        record.outputItemPrice !== previousRecord.outputItemPrice ||
        record.station !== previousRecord.station;
      
      if (outputPropsChanged) {
        const updatedItem = {
          ...item,
          name: record.outputItemName || item.name,
          unitCost: record.outputUnitCost || item.unitCost,
          price: record.outputItemPrice || item.price,
          station: record.station || item.station,
          updatedAt: new Date()
        };
        
        // Update stock quantity if it changed
        if (record.outputQuantity !== previousRecord.outputQuantity) {
          const quantityDiff = (record.outputQuantity || 0) - (previousRecord.outputQuantity || 0);
          if (quantityDiff !== 0) {
            // Update the first stock point (or create one if none exists)
            if (updatedItem.stock && updatedItem.stock.length > 0) {
              updatedItem.stock[0].quantity += quantityDiff;
            } else {
              updatedItem.stock = [{
                siteId: record.siteId || 'default',
                quantity: quantityDiff
              }];
            }
          }
        }
        
        await upsertItem(updatedItem);
        await markEffect(updateKey);
        
        console.log(`[updateItemsCreatedByRecord] ✅ Updated item: ${item.id}`);
      }
    }
  } catch (error) {
    console.error(`[updateItemsCreatedByRecord] Error updating items:`, error);
  }
}

// ============================================================================
// SALE → FINANCIAL RECORD PROPAGATION
// ============================================================================

export async function updateFinancialRecordsFromSale(
  sale: Sale,
  previousSale: Sale
): Promise<void> {
  try {
    console.log(`[updateFinancialRecordsFromSale] Updating financial records for sale: ${sale.name}`);
    
    // Find financial records created from this sale
    const allFinancials = await getAllFinancials();
    const relatedRecords = allFinancials.filter(record => record.sourceSaleId === sale.id);
    
    for (const record of relatedRecords) {
      const updateKey = `updateFinancialFromSale:${sale.id}:${record.id}:${sale.updatedAt?.getTime()}`;
      
      if (await hasEffect(updateKey)) {
        console.log(`[updateFinancialRecordsFromSale] ⏭️ Already updated record: ${record.id}`);
        continue;
      }
      
      // Check if revenue properties changed
      const revenuePropsChanged = 
        sale.totals?.totalRevenue !== previousSale.totals?.totalRevenue ||
        sale.isNotPaid !== previousSale.isNotPaid ||
        sale.status !== previousSale.status;
      
      if (revenuePropsChanged) {
        const updatedRecord = {
          ...record,
          revenue: sale.totals?.totalRevenue || 0,
          isNotPaid: sale.isNotPaid,
          isNotCharged: sale.status !== 'CHARGED',
          updatedAt: new Date()
        };
        
        await upsertFinancial(updatedRecord);
        await markEffect(updateKey);
        
        console.log(`[updateFinancialRecordsFromSale] ✅ Updated financial record: ${record.id}`);
      }
    }
  } catch (error) {
    console.error(`[updateFinancialRecordsFromSale] Error updating financial records:`, error);
  }
}

// ============================================================================
// SALE → ITEM PROPAGATION (Stock Updates)
// ============================================================================

export async function updateItemsFromSale(
  sale: Sale,
  previousSale: Sale
): Promise<void> {
  try {
    console.log(`[updateItemsFromSale] Updating items for sale: ${sale.name}`);
    
    // Check if sale lines changed
    const linesChanged = 
      sale.lines?.length !== previousSale.lines?.length ||
      JSON.stringify(sale.lines) !== JSON.stringify(previousSale.lines);
    
    if (!linesChanged) {
      console.log(`[updateItemsFromSale] No line changes detected`);
      return;
    }
    
    // Process each sale line
    for (const line of sale.lines || []) {
      if (line.kind === 'item' && 'itemId' in line && line.itemId) {
        const updateKey = `updateItemFromSale:${sale.id}:${line.itemId}:${sale.updatedAt?.getTime()}`;
        
        if (await hasEffect(updateKey)) {
          console.log(`[updateItemsFromSale] ⏭️ Already updated item: ${line.itemId}`);
          continue;
        }
        
        // Get the item
        const allItems = await getAllItems();
        const item = allItems.find(i => i.id === line.itemId);
        if (!item) {
          console.warn(`[updateItemsFromSale] Item not found: ${line.itemId}`);
          continue;
        }
        
        // Update quantity sold
        const updatedItem = {
          ...item,
          quantitySold: (item.quantitySold || 0) + (line.quantity || 0),
          updatedAt: new Date()
        };
        
        await upsertItem(updatedItem);
        await markEffect(updateKey);
        
        console.log(`[updateItemsFromSale] ✅ Updated item: ${line.itemId}`);
      }
    }
  } catch (error) {
    console.error(`[updateItemsFromSale] Error updating items:`, error);
  }
}

// ============================================================================
// TASK/FINANCIAL/SALE → PLAYER PROPAGATION (Points Delta)
// ============================================================================

export async function updatePlayerPointsFromSource(
  sourceType: EntityType.TASK | EntityType.FINANCIAL | EntityType.SALE,
  newSource: any,
  oldSource: any
): Promise<void> {
  try {
    console.log(`[updatePlayerPointsFromSource] Updating player points from ${sourceType}: ${newSource.name}`);
    
    // Calculate points delta
    let pointsDelta = { xp: 0, rp: 0, fp: 0, hp: 0 };
    
    if (sourceType === EntityType.TASK || sourceType === EntityType.FINANCIAL) {
      const newPoints = newSource.rewards?.points || { xp: 0, rp: 0, fp: 0, hp: 0 };
      const oldPoints = oldSource.rewards?.points || { xp: 0, rp: 0, fp: 0, hp: 0 };
      
      pointsDelta = {
        xp: (newPoints.xp || 0) - (oldPoints.xp || 0),
        rp: (newPoints.rp || 0) - (oldPoints.rp || 0),
        fp: (newPoints.fp || 0) - (oldPoints.fp || 0),
        hp: (newPoints.hp || 0) - (oldPoints.hp || 0)
      };
    } else if (sourceType === EntityType.SALE) {
      // Calculate points from revenue (simplified)
      const newRevenue = newSource.totals?.totalRevenue || 0;
      const oldRevenue = oldSource.totals?.totalRevenue || 0;
      const revenueDelta = newRevenue - oldRevenue;
      
      // Convert revenue to points (simplified calculation)
      pointsDelta = {
        xp: Math.floor(revenueDelta * 0.1),
        rp: Math.floor(revenueDelta * 0.05),
        fp: Math.floor(revenueDelta * 0.03),
        hp: Math.floor(revenueDelta * 0.02)
      };
    }
    
    // Skip if no points change
    if (pointsDelta.xp === 0 && pointsDelta.rp === 0 && pointsDelta.fp === 0 && pointsDelta.hp === 0) {
      console.log(`[updatePlayerPointsFromSource] No points change detected`);
      return;
    }
    
    // Find the player (assuming single player for now)
    const players = await getAllPlayers();
    const player = players[0]; // Simplified - in real system, find by source relationship
    
    if (!player) {
      console.warn(`[updatePlayerPointsFromSource] No player found`);
      return;
    }
    
    const updateKey = `updatePlayerPoints:${sourceType}:${newSource.id}:${player.id}:${newSource.updatedAt?.getTime()}`;
    
    if (await hasEffect(updateKey)) {
      console.log(`[updatePlayerPointsFromSource] ⏭️ Already updated player: ${player.id}`);
      return;
    }
    
    // Update player points
    const updatedPlayer = {
      ...player,
      points: {
        xp: (player.points?.xp || 0) + pointsDelta.xp,
        rp: (player.points?.rp || 0) + pointsDelta.rp,
        fp: (player.points?.fp || 0) + pointsDelta.fp,
        hp: (player.points?.hp || 0) + pointsDelta.hp
      },
      updatedAt: new Date()
    };
    
    await upsertPlayer(updatedPlayer);
    await markEffect(updateKey);
    
    console.log(`[updatePlayerPointsFromSource] ✅ Updated player points: ${player.id}`);
  } catch (error) {
    console.error(`[updatePlayerPointsFromSource] Error updating player points:`, error);
  }
}

// ============================================================================
// FINANCIAL → CHARACTER PROPAGATION (Jungle Coins Delta)
// ============================================================================

export async function updateCharacterJungleCoinsFromRecord(
  record: FinancialRecord,
  previousRecord: FinancialRecord
): Promise<void> {
  try {
    console.log(`[updateCharacterJungleCoinsFromRecord] Updating character jungle coins for record: ${record.name}`);
    
    // Calculate jungle coins delta
    const newJungleCoins = record.jungleCoins || 0;
    const oldJungleCoins = previousRecord.jungleCoins || 0;
    const jungleCoinsDelta = newJungleCoins - oldJungleCoins;
    
    if (jungleCoinsDelta === 0) {
      console.log(`[updateCharacterJungleCoinsFromRecord] No jungle coins change detected`);
      return;
    }
    
    // Find characters related to this financial record
    const allCharacters = await getAllCharacters();
    const relatedCharacters = allCharacters.filter(char => 
      char.id === record.customerCharacterId
    );
    
    for (const character of relatedCharacters) {
      const updateKey = `updateCharacterJungleCoins:${record.id}:${character.id}:${record.updatedAt?.getTime()}`;
      
      if (await hasEffect(updateKey)) {
        console.log(`[updateCharacterJungleCoinsFromRecord] ⏭️ Already updated character: ${character.id}`);
        continue;
      }
      
      // Update character jungle coins
      const updatedCharacter = {
        ...character,
        jungleCoins: (character.jungleCoins || 0) + jungleCoinsDelta,
        updatedAt: new Date()
      };
      
      await upsertCharacter(updatedCharacter);
      await markEffect(updateKey);
      
      console.log(`[updateCharacterJungleCoinsFromRecord] ✅ Updated character jungle coins: ${character.id}`);
    }
  } catch (error) {
    console.error(`[updateCharacterJungleCoinsFromRecord] Error updating character jungle coins:`, error);
  }
}

// ============================================================================
// PROPERTY CHANGE DETECTION HELPERS
// ============================================================================

export function hasFinancialPropsChanged(newEntity: any, oldEntity: any): boolean {
  return (
    newEntity.cost !== oldEntity.cost ||
    newEntity.revenue !== oldEntity.revenue ||
    newEntity.isNotPaid !== oldEntity.isNotPaid ||
    newEntity.isNotCharged !== oldEntity.isNotCharged ||
    newEntity.name !== oldEntity.name ||
    newEntity.station !== oldEntity.station
  );
}

export function hasOutputPropsChanged(newEntity: any, oldEntity: any): boolean {
  return (
    newEntity.outputQuantity !== oldEntity.outputQuantity ||
    newEntity.outputItemName !== oldEntity.outputItemName ||
    newEntity.outputUnitCost !== oldEntity.outputUnitCost ||
    newEntity.outputItemPrice !== oldEntity.outputItemPrice ||
    newEntity.station !== oldEntity.station
  );
}

export function hasRewardsChanged(newEntity: any, oldEntity: any): boolean {
  const newRewards = newEntity.rewards?.points || { xp: 0, rp: 0, fp: 0, hp: 0 };
  const oldRewards = oldEntity.rewards?.points || { xp: 0, rp: 0, fp: 0, hp: 0 };
  
  return (
    newRewards.xp !== oldRewards.xp ||
    newRewards.rp !== oldRewards.rp ||
    newRewards.fp !== oldRewards.fp ||
    newRewards.hp !== oldRewards.hp
  );
}

export function hasJungleCoinsChanged(newEntity: any, oldEntity: any): boolean {
  return (newEntity.jungleCoins || 0) !== (oldEntity.jungleCoins || 0);
}

export function hasRevenueChanged(newEntity: any, oldEntity: any): boolean {
  return (newEntity.totals?.totalRevenue || 0) !== (oldEntity.totals?.totalRevenue || 0);
}

export function hasLinesChanged(newEntity: any, oldEntity: any): boolean {
  return JSON.stringify(newEntity.lines) !== JSON.stringify(oldEntity.lines);
}
