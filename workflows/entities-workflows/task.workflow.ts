// workflows/entities-workflows/task.workflow.ts
// Task-specific workflow with state vs descriptive field detection

import { EntityType } from '@/types/enums';
import type { Task } from '@/types/entities';
import { appendEntityLog, updateEntityLogField } from '../entities-logging';
import { hasEffect, markEffect, clearEffect, clearEffectsByPrefix } from '@/data-store/effects-registry';
import { ClientAPI } from '@/lib/client-api';
import { getAllTasks, getAllPlayers } from '@/data-store/datastore';
import { getLinksFor, removeLink } from '@/links/link-registry';
import { createItemFromTask, removeItemsCreatedByTask } from '../item-creation-utils';
import { awardPointsToPlayer, removePointsFromPlayer, getMainPlayerId } from '../points-rewards-utils';
import { createFinancialRecordFromTask, updateFinancialRecordFromTask, removeFinancialRecordsCreatedByTask } from '../financial-record-utils';
import { 
  updateFinancialRecordsFromTask, 
  updateItemsCreatedByTask, 
  updatePlayerPointsFromSource,
  hasFinancialPropsChanged,
  hasOutputPropsChanged,
  hasRewardsChanged
} from '../update-propagation-utils';

const STATE_FIELDS = ['status', 'progress', 'doneAt', 'collectedAt', 'siteId', 'targetSiteId'];
const DESCRIPTIVE_FIELDS = ['name', 'description', 'cost', 'revenue', 'rewards', 'priority'];

export async function onTaskUpsert(task: Task, previousTask?: Task): Promise<void> {
  // New task creation
  if (!previousTask) {
    const effectKey = `task:${task.id}:created`;
    if (await hasEffect(effectKey)) return;
    
    await appendEntityLog('task', task.id, 'CREATED', { 
      name: task.name, 
      status: task.status,
      station: task.station 
    });
    await markEffect(effectKey);
    return;
  }
  
  // State changes - append new log
  if (previousTask.status !== task.status) {
    console.log(`[onTaskUpsert] Task status changed: ${previousTask.status} → ${task.status}`);
    
    // Log status change with transition context
    await appendEntityLog('task', task.id, 'STATUS_CHANGED', {
      oldStatus: previousTask.status,
      newStatus: task.status,
      name: task.name,
      transition: `${previousTask.status} → ${task.status}`,
      changedAt: new Date().toISOString()
    });
    
    // Handle uncompletion (Done → Other status)
    if (previousTask.status === 'Done' && task.status !== 'Done' && task.status !== 'Collected') {
      console.log(`[onTaskUpsert] Task uncompleted: ${task.name} (${previousTask.status} → ${task.status})`);
      
      // Uncomplete the task and remove effects
      await uncompleteTask(task.id);
    }
  }
  
  if (!previousTask.doneAt && task.doneAt) {
    await appendEntityLog('task', task.id, 'DONE', {
      name: task.name,
      doneAt: task.doneAt
    });
  }
  
  if (!previousTask.collectedAt && task.collectedAt) {
    await appendEntityLog('task', task.id, 'COLLECTED', {
      name: task.name,
      collectedAt: task.collectedAt
    });
  }
  
  // Site changes - MOVED event
  if (previousTask.siteId !== task.siteId || previousTask.targetSiteId !== task.targetSiteId) {
    await appendEntityLog('task', task.id, 'MOVED', {
      name: task.name,
      oldSiteId: previousTask.siteId,
      newSiteId: task.siteId,
      oldTargetSiteId: previousTask.targetSiteId,
      newTargetSiteId: task.targetSiteId
    });
  }
  
  // Item creation from emissary fields - when task is completed
  if (task.outputItemType && task.outputQuantity && task.status === 'Done') {
    const effectKey = `task:${task.id}:itemCreated`;
    if (!(await hasEffect(effectKey))) {
      console.log(`[onTaskUpsert] Creating item from task emissary fields: ${task.name}`);
      const createdItem = await createItemFromTask(task);
      if (createdItem) {
        await markEffect(effectKey);
        console.log(`[onTaskUpsert] ✅ Item created and effect marked: ${createdItem.name}`);
      }
    }
  }
  
  // Points awarding - when task is completed with rewards
  if (task.status === 'Done' && task.rewards?.points) {
    const effectKey = `task:${task.id}:pointsAwarded`;
    if (!(await hasEffect(effectKey))) {
      console.log(`[onTaskUpsert] Awarding points from task completion: ${task.name}`);
      await awardPointsToPlayer(getMainPlayerId(), task.rewards.points, task.id, 'task');
      await markEffect(effectKey);
      console.log(`[onTaskUpsert] ✅ Points awarded and effect marked for task: ${task.name}`);
    }
  }
  
  // Financial record creation from task - when task has cost or revenue
  if (task.cost || task.revenue) {
    const effectKey = `task:${task.id}:financialCreated`;
    if (!(await hasEffect(effectKey))) {
      console.log(`[onTaskUpsert] Creating financial record from task: ${task.name}`);
      const createdFinancial = await createFinancialRecordFromTask(task);
      if (createdFinancial) {
        await markEffect(effectKey);
        console.log(`[onTaskUpsert] ✅ Financial record created and effect marked: ${createdFinancial.name}`);
      }
    }
  }
  
  // COMPREHENSIVE UPDATE PROPAGATION - when task properties change
  if (previousTask) {
    // Propagate to Financial Records
    if (hasFinancialPropsChanged(task, previousTask)) {
      console.log(`[onTaskUpsert] Propagating financial changes from task: ${task.name}`);
      await updateFinancialRecordsFromTask(task, previousTask);
    }
    
    // Propagate to Items
    if (hasOutputPropsChanged(task, previousTask)) {
      console.log(`[onTaskUpsert] Propagating output changes from task: ${task.name}`);
      await updateItemsCreatedByTask(task, previousTask);
    }
    
    // Propagate to Player (points delta)
    if (hasRewardsChanged(task, previousTask)) {
      console.log(`[onTaskUpsert] Propagating points changes from task: ${task.name}`);
      await updatePlayerPointsFromSource('task', task, previousTask);
    }
  }
  
  // Descriptive changes - update in-place
  for (const field of DESCRIPTIVE_FIELDS) {
    if ((previousTask as any)[field] !== (task as any)[field]) {
      await updateEntityLogField('task', task.id, field, (previousTask as any)[field], (task as any)[field]);
    }
  }
}

/**
 * Remove task effects when task is deleted
 * Tasks can have entries in multiple logs: tasks, financials, character, player, items
 */
export async function removeTaskLogEntriesOnDelete(taskId: string): Promise<void> {
  try {
    console.log(`[removeTaskLogEntriesOnDelete] Starting cleanup for task: ${taskId}`);
    
    // 1. Remove items created by this task
    await removeItemsCreatedByTask(taskId);
    
    // 2. Remove financial records created by this task
    await removeFinancialRecordsCreatedByTask(taskId);
    
    // 3. Remove player points that were awarded by this task (if points were badly given)
    await removePlayerPointsFromTask(taskId);
    
    // 3. Remove all Links related to this task
    const taskLinks = await getLinksFor({ type: EntityType.TASK, id: taskId });
    console.log(`[removeTaskLogEntriesOnDelete] Found ${taskLinks.length} links to remove`);
    
    for (const link of taskLinks) {
      try {
        await removeLink(link.id);
        console.log(`[removeTaskLogEntriesOnDelete] ✅ Removed link: ${link.linkType}`);
      } catch (error) {
        console.error(`[removeTaskLogEntriesOnDelete] ❌ Failed to remove link ${link.id}:`, error);
      }
    }
    
    // 4. Clear effects registry
    await clearEffect(`task:${taskId}:created`);
    await clearEffect(`task:${taskId}:itemCreated`);
    await clearEffect(`task:${taskId}:financialCreated`);
    await clearEffect(`task:${taskId}:pointsAwarded`);
    await clearEffectsByPrefix('task', taskId, 'pointsLogged:');
    await clearEffectsByPrefix('task', taskId, 'financialLogged:');
    
    // 5. Remove log entries from all relevant logs
    // Note: Log removal is handled client-side via API calls
    // Server-side log removal would require implementing removeLogEntry in entities-logging.ts
    console.log(`[removeTaskLogEntriesOnDelete] Log entry removal handled client-side for task: ${taskId}`);
    
    console.log(`[removeTaskLogEntriesOnDelete] ✅ Cleared effects, removed links for task ${taskId}`);
  } catch (error) {
    console.error('Error removing task effects:', error);
  }
}

/**
 * Remove player points that were awarded by a specific task
 * This is used when rolling back a task that incorrectly awarded points
 */
async function removePlayerPointsFromTask(taskId: string): Promise<void> {
  try {
    console.log(`[removePlayerPointsFromTask] Removing points for task: ${taskId}`);
    
    // Get the task to find what points were awarded
    const tasks = await getAllTasks();
    const task = tasks.find(t => t.id === taskId);
    
    if (!task || !task.rewards?.points) {
      console.log(`[removePlayerPointsFromTask] Task ${taskId} has no points to remove`);
      return;
    }
    
    // Get the main player
    const mainPlayerId = getMainPlayerId();
    const players = await getAllPlayers();
    const mainPlayer = players.find(p => p.id === mainPlayerId);
    
    if (!mainPlayer) {
      console.log(`[removePlayerPointsFromTask] Main player not found, skipping points removal`);
      return;
    }
    
    // Check if any points were actually awarded
    const pointsToRemove = task.rewards.points;
    const hasPoints = (pointsToRemove.xp || 0) > 0 || (pointsToRemove.rp || 0) > 0 || 
                     (pointsToRemove.fp || 0) > 0 || (pointsToRemove.hp || 0) > 0;
    
    if (!hasPoints) {
      console.log(`[removePlayerPointsFromTask] No points to remove from task ${taskId}`);
      return;
    }
    
    // Remove the points from the player
    await removePointsFromPlayer(mainPlayerId, pointsToRemove);
    console.log(`[removePlayerPointsFromTask] ✅ Removed points from player: ${JSON.stringify(pointsToRemove)}`);
    
  } catch (error) {
    console.error(`[removePlayerPointsFromTask] ❌ Failed to remove player points for task ${taskId}:`, error);
  }
}

/**
 * Uncomplete a task and remove effects
 * This function handles when a task status changes back from Done
 * Reverses all side effects that were applied during completion
 */
export async function uncompleteTask(taskId: string): Promise<void> {
  try {
    console.log(`[uncompleteTask] Uncompleting task: ${taskId}`);
    
    // Get the task
    const tasks = await getAllTasks();
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) {
      console.log(`[uncompleteTask] Task ${taskId} not found`);
      return;
    }
    
    // Check if task was previously completed (has doneAt)
    if (!task.doneAt) {
      console.log(`[uncompleteTask] Task ${taskId} was not completed, nothing to uncomplete`);
      return;
    }
    
    console.log(`[uncompleteTask] Reversing completion for task: ${task.name}`);
    
    // 1. Remove items created by this task
    await removeItemsCreatedByTask(taskId);
    console.log(`[uncompleteTask] ✅ Removed items created by task`);
    
    // 2. Remove points awarded by this task
    await removePlayerPointsFromTask(taskId);
    console.log(`[uncompleteTask] ✅ Removed points awarded by task`);
    
    // 3. Clear effects registry entries
    await clearEffect(`task:${taskId}:itemCreated`);
    await clearEffect(`task:${taskId}:pointsAwarded`);
    console.log(`[uncompleteTask] ✅ Cleared effects registry entries`);
    
    // 4. Log UNCOMPLETED event
    await appendEntityLog('task', taskId, 'UNCOMPLETED', {
      name: task.name,
      previousStatus: 'Done',
      uncompletedAt: new Date().toISOString()
    });
    console.log(`[uncompleteTask] ✅ Logged UNCOMPLETED event`);
    
    console.log(`[uncompleteTask] ✅ Successfully uncompleted task: ${task.name}`);
    
  } catch (error) {
    console.error(`[uncompleteTask] ❌ Failed to uncomplete task ${taskId}:`, error);
    throw error;
  }
}
