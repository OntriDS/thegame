// workflows/update-propagation-utils.ts
// Comprehensive update propagation across ALL entity relationships

import type { Task, Item, Sale, FinancialRecord, Character, Player } from '@/types/entities';
import { EntityType, PLAYER_ONE_ID } from '@/types/enums';
import { hasEffect, markEffect } from '@/data-store/effects-registry';
import { getFinancialsBySourceTaskId, getFinancialsBySourceSaleId, upsertFinancial } from '@/data-store/datastore';
import { getItemsBySourceTaskId, getItemsBySourceRecordId, getItemById, upsertItem } from '@/data-store/datastore';
import { getTaskById, upsertTask } from '@/data-store/datastore';
import { getPlayerById, upsertPlayer } from '@/data-store/datastore';
import { getAllCharacters, upsertCharacter } from '@/data-store/datastore';

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
    
    // Find task that created this financial record
    if (!record.sourceTaskId) {
      console.log(`[updateTasksFromFinancialRecord] No sourceTaskId, skipping`);
      return;
    }
    
    const task = await getTaskById(record.sourceTaskId);
    if (!task) {
      console.log(`[updateTasksFromFinancialRecord] Task ${record.sourceTaskId} not found, skipping`);
      return;
    }
    
    // Create array with single task for compatibility with rest of code
    const relatedTasks = [task];
    
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
    const relatedRecords = await getFinancialsBySourceSaleId(sale.id);
    
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
        const item = await getItemById(line.itemId);
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
    
    // Find the player (using PLAYER_ONE_ID for V0.1)
    const playerId = PLAYER_ONE_ID;
    const player = await getPlayerById(playerId);
    
    if (!player) {
      console.warn(`[updatePlayerPointsFromSource] Player ${playerId} not found`);
      return;
    }
    
    const updateKey = `updatePlayerPoints:${sourceType}:${newSource.id}:${player.id}:${newSource.updatedAt?.getTime()}`;
    
    if (await hasEffect(updateKey)) {
      console.log(`[updatePlayerPointsFromSource] ⏭️ Already updated player: ${player.id}`);
      return;
    }
    
    // Update player points and totalPoints
    const updatedPlayer = {
      ...player,
      points: {
        xp: (player.points?.xp || 0) + pointsDelta.xp,
        rp: (player.points?.rp || 0) + pointsDelta.rp,
        fp: (player.points?.fp || 0) + pointsDelta.fp,
        hp: (player.points?.hp || 0) + pointsDelta.hp
      },
      totalPoints: {
        xp: (player.totalPoints?.xp || 0) + pointsDelta.xp,
        rp: (player.totalPoints?.rp || 0) + pointsDelta.rp,
        fp: (player.totalPoints?.fp || 0) + pointsDelta.fp,
        hp: (player.totalPoints?.hp || 0) + pointsDelta.hp
      },
      updatedAt: new Date()
    };
    
    await upsertPlayer(updatedPlayer);
    await markEffect(updateKey);
    
    // If this is a task update, also update the log entries
    if (sourceType === EntityType.TASK) {
      const { logPlayerUpdateFromTask } = await import('./entities-workflows/player.workflow');
      await logPlayerUpdateFromTask(newSource, oldSource);
    }
    
    console.log(`[updatePlayerPointsFromSource] ✅ Updated player points: ${player.id}`);
  } catch (error) {
    console.error(`[updatePlayerPointsFromSource] Error updating player points:`, error);
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

export function hasRevenueChanged(newEntity: any, oldEntity: any): boolean {
  return (newEntity.totals?.totalRevenue || 0) !== (oldEntity.totals?.totalRevenue || 0);
}

export function hasLinesChanged(newEntity: any, oldEntity: any): boolean {
  return JSON.stringify(newEntity.lines) !== JSON.stringify(oldEntity.lines);
}
