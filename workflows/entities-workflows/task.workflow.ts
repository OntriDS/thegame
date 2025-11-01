// workflows/entities-workflows/task.workflow.ts
// Task-specific workflow with state vs descriptive field detection

import { EntityType, LogEventType, TaskType, PLAYER_ONE_ID } from '@/types/enums';
import type { Task } from '@/types/entities';
import { appendEntityLog, updateEntityLogField } from '../entities-logging';
import { hasEffect, markEffect, clearEffect, clearEffectsByPrefix } from '@/data-store/effects-registry';
import { EffectKeys } from '@/data-store/keys';
import { getPlayerConversionRates, getPersonalAssets, savePersonalAssets } from '@/data-store/datastore';
import { getAllTasks } from '@/data-store/repositories/task.repo';
import { getAllPlayers } from '@/data-store/repositories/player.repo';
import { getLinksFor, removeLink } from '@/links/link-registry';
import { createItemFromTask, removeItemsCreatedByTask } from '../item-creation-utils';
import { awardPointsToPlayer, removePointsFromPlayer } from '../points-rewards-utils';
import { createFinancialRecordFromTask, updateFinancialRecordFromTask, removeFinancialRecordsCreatedByTask } from '../financial-record-utils';
import { createCharacterFromTask } from '../character-creation-utils';
import { upsertTask } from '@/data-store/datastore';
import { DEFAULT_POINTS_CONVERSION_RATES } from '@/lib/constants/financial-constants';
import type { PointsConversionRates } from '@/lib/constants/financial-constants';
import { getCategoryForTaskType } from '@/lib/utils/searchable-select-utils';
import { kvGet, kvSet } from '@/data-store/kv';
import { buildLogKey } from '@/data-store/keys';
import { 
  updateFinancialRecordsFromTask, 
  updateItemsCreatedByTask, 
  updatePlayerPointsFromSource,
  hasFinancialPropsChanged,
  hasOutputPropsChanged,
  hasRewardsChanged
} from '../update-propagation-utils';
import { 
  handleTemplateInstanceCreation,
  deleteTemplateCascade,
  cascadeStatusToInstances,
  uncascadeStatusFromInstances,
  getUndoneInstancesCount
} from '@/lib/utils/recurrent-task-utils';

const STATE_FIELDS = ['status', 'progress', 'doneAt', 'collectedAt', 'siteId', 'targetSiteId'];
const DESCRIPTIVE_FIELDS = ['name', 'description', 'cost', 'revenue', 'rewards', 'priority'];

export async function onTaskUpsert(task: Task, previousTask?: Task): Promise<void> {
  // New task creation
  if (!previousTask) {
    const effectKey = EffectKeys.created('task', task.id);
    const alreadyLoggedCreated = await hasEffect(effectKey);
    
    if (!alreadyLoggedCreated) {
      // Minimal, event-specific payload for CREATED
      await appendEntityLog(EntityType.TASK, task.id, LogEventType.CREATED, { 
        name: task.name,
        taskType: task.type,
        station: task.station,
        priority: task.priority,
        sourceSaleId: task.sourceSaleId,
        dueDate: task.dueDate,
        frequencyConfig: task.frequencyConfig,
        _logOrder: 0
      });
      await markEffect(effectKey);
    }

    // Recurrent Template instance spawning - when template is created
    if (task.type === TaskType.RECURRENT_TEMPLATE) {
      const instancesEffectKey = EffectKeys.sideEffect('task', task.id, 'instancesGenerated');
      if (!(await hasEffect(instancesEffectKey))) {
        console.log(`[onTaskUpsert] Generating instances for new template: ${task.name}`);
        const instances = await handleTemplateInstanceCreation(task);
        await markEffect(instancesEffectKey);
        console.log(`[onTaskUpsert] ✅ Generated ${instances.length} instances for template`);
      }
    }

    // Return early ONLY if CREATED was already logged AND task is NOT Done
    // This prevents duplicates but allows Done tasks to proceed to DONE logging
    if (alreadyLoggedCreated && task.status !== 'Done') {
      return;
    }
    // Continue to DONE logging below if task is Done (whether CREATED just logged or was already there)
  }
  
  // State changes - append new log
  if (previousTask && previousTask.status !== task.status) {
    console.log(`[onTaskUpsert] Task status changed: ${previousTask.status} → ${task.status}`);
    
    // Skip UPDATED logging for special status changes - they have their own events:
    // - Done → DONE event (logged below)
    // - Collected → COLLECTED event (logged below)
    const skipUpdatedForStatuses = ['Done', 'Collected'];
    if (!skipUpdatedForStatuses.includes(task.status)) {
      // Log status change with transition context (using UPDATED event)
      await appendEntityLog(EntityType.TASK, task.id, LogEventType.UPDATED, {
        name: task.name,
        taskType: task.type,
        station: task.station,
        priority: task.priority,
        oldStatus: previousTask!.status,
        newStatus: task.status,
        transition: `${previousTask!.status} → ${task.status}`,
        changedAt: new Date().toISOString()
      });
    }
    
    // Handle uncompletion (Done → Other status)
    if (previousTask!.status === 'Done' && task.status !== 'Done' && task.status !== 'Collected') {
      console.log(`[onTaskUpsert] Task uncompleted: ${task.name} (${previousTask!.status} → ${task.status})`);
      
      // Uncomplete the task and remove effects
      await uncompleteTask(task.id);
    }

  }
  
  // Log DONE event - either when status changes to Done OR when creating a task that's already Done
  if (task.status === 'Done' && task.doneAt) {
    const shouldLogDone = !previousTask || !previousTask.doneAt;
    if (shouldLogDone) {
      await appendEntityLog(EntityType.TASK, task.id, LogEventType.DONE, {
        name: task.name,
        taskType: task.type,
        station: task.station,
        priority: task.priority,
        sourceSaleId: task.sourceSaleId,
        dueDate: task.dueDate,
        frequencyConfig: task.frequencyConfig,
        doneAt: task.doneAt,
        _logOrder: 1
      });
    }
  }
  
  if (previousTask && !previousTask.collectedAt && task.collectedAt) {
    await appendEntityLog(EntityType.TASK, task.id, LogEventType.COLLECTED, {
      name: task.name,
      taskType: task.type,
      station: task.station,
      priority: task.priority,
      collectedAt: task.collectedAt
    });
  }
  
  // Site changes - MOVED event
  if (previousTask && (previousTask.siteId !== task.siteId || previousTask.targetSiteId !== task.targetSiteId)) {
    await appendEntityLog(EntityType.TASK, task.id, LogEventType.MOVED, {
      name: task.name,
      taskType: task.type,
      station: task.station,
      oldSiteId: previousTask!.siteId,
      newSiteId: task.siteId,
      oldTargetSiteId: previousTask!.targetSiteId,
      newTargetSiteId: task.targetSiteId
    });
  }
  
  // Character creation from emissary fields - when newCustomerName is provided
  if (task.newCustomerName && !task.customerCharacterId) {
    const effectKey = EffectKeys.sideEffect('task', task.id, 'characterCreated');
    if (!(await hasEffect(effectKey))) {
      console.log(`[onTaskUpsert] Creating character from task emissary fields: ${task.name}`);
      const createdCharacter = await createCharacterFromTask(task);
      if (createdCharacter) {
        // Update task with the created character ID
        const updatedTask = { ...task, customerCharacterId: createdCharacter.id };
        await upsertTask(updatedTask, { skipWorkflowEffects: true });
        await markEffect(effectKey);
        console.log(`[onTaskUpsert] ✅ Character created and task updated: ${createdCharacter.name}`);
      }
    }
  }
  
  // Item creation from emissary fields - when task is completed
  if (task.outputItemType && task.outputQuantity && task.status === 'Done') {
    const effectKey = EffectKeys.sideEffect('task', task.id, 'itemCreated');
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
  // Use task.playerCharacterId directly as playerId (they're the same now with unified 'creator' ID)
  if (task.status === 'Done' && task.rewards?.points) {
    const effectKey = EffectKeys.sideEffect('task', task.id, 'pointsAwarded');
    if (!(await hasEffect(effectKey))) {
      console.log(`[onTaskUpsert] Awarding points from task completion: ${task.name}`);
      const playerId = task.playerCharacterId || PLAYER_ONE_ID;
      await awardPointsToPlayer(playerId, task.rewards.points, task.id, EntityType.TASK);
      await markEffect(effectKey);
      console.log(`[onTaskUpsert] ✅ Points awarded to player ${playerId} for task: ${task.name}`);
    }
  }
  
  // Financial record creation from task - when task is completed (Done) with cost, revenue, or rewards
  if (task.status === 'Done' && (task.cost || task.revenue || task.rewards?.points)) {
    const effectKey = EffectKeys.sideEffect('task', task.id, 'financialCreated');
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
      await updatePlayerPointsFromSource(EntityType.TASK, task, previousTask);
    }

    // Recurrent Template instance spawning - when template frequency or due date changes
    if (task.type === TaskType.RECURRENT_TEMPLATE) {
      const frequencyChanged = JSON.stringify(previousTask.frequencyConfig) !== JSON.stringify(task.frequencyConfig);
      const dueDateChanged = previousTask.dueDate?.getTime() !== task.dueDate?.getTime();
      
      if (frequencyChanged || dueDateChanged) {
        const instancesEffectKey = EffectKeys.sideEffect('task', task.id, 'instancesGenerated');
        if (!(await hasEffect(instancesEffectKey))) {
          console.log(`[onTaskUpsert] Regenerating instances for template: ${task.name} (frequency/due date changed)`);
          const instances = await handleTemplateInstanceCreation(task);
          await markEffect(instancesEffectKey);
          console.log(`[onTaskUpsert] ✅ Regenerated ${instances.length} instances for template`);
        }
      }

      // Detect template status reversal (uncascade)
      const statusReverted = previousTask.status === 'Done' && task.status !== 'Done';
      
      if (statusReverted) {
        console.log(`[onTaskUpsert] Template status reverted, uncascading instances: ${task.name}`);
        const { reverted } = await uncascadeStatusFromInstances(task.id, task.status);
        console.log(`[onTaskUpsert] ✅ Reverted ${reverted.length} instances to ${task.status}`);
      }
    }
  }
  
  // Descriptive changes - update in-place (only when there is a previous task to compare)
  if (previousTask) {
    for (const field of DESCRIPTIVE_FIELDS) {
      if ((previousTask as any)[field] !== (task as any)[field]) {
        await updateEntityLogField(EntityType.TASK, task.id, field, (previousTask as any)[field], (task as any)[field]);
      }
    }
  }
}

/**
 * Remove task effects when task is deleted
 * Tasks can have entries in multiple logs: tasks, financials, character, player, items
 */
export async function removeTaskLogEntriesOnDelete(task: Task): Promise<void> {
  try {
    console.log(`[removeTaskLogEntriesOnDelete] Starting cleanup for task: ${task.id}`);
    
    // Handle recurrent template cascade deletion
    if (task.type === TaskType.RECURRENT_TEMPLATE) {
      console.log(`[removeTaskLogEntriesOnDelete] Cascading delete for template: ${task.name}`);
      const deletedCount = await deleteTemplateCascade(task.id);
      console.log(`[removeTaskLogEntriesOnDelete] ✅ Cascade deleted ${deletedCount} tasks`);
      return; // Skip normal deletion flow
    }
    
    // 1. Remove items created by this task
    await removeItemsCreatedByTask(task.id);
    
    // 2. Remove financial records created by this task
    await removeFinancialRecordsCreatedByTask(task.id);
    
    // 3. Remove player points that were awarded by this task (if points were badly given)
    await removePlayerPointsFromTask(task);
    
    // 3. Remove all Links related to this task
    const taskLinks = await getLinksFor({ type: EntityType.TASK, id: task.id });
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
    await clearEffect(EffectKeys.created('task', task.id));
    await clearEffect(EffectKeys.sideEffect('task', task.id, 'characterCreated'));
    await clearEffect(EffectKeys.sideEffect('task', task.id, 'itemCreated'));
    await clearEffect(EffectKeys.sideEffect('task', task.id, 'financialCreated'));
    await clearEffect(EffectKeys.sideEffect('task', task.id, 'pointsAwarded'));
    await clearEffectsByPrefix(EntityType.TASK, task.id, 'pointsLogged:');
    await clearEffectsByPrefix(EntityType.TASK, task.id, 'financialLogged:');
    
    // 5. Remove log entries from all relevant logs
    console.log(`[removeTaskLogEntriesOnDelete] Removing log entries for task: ${task.id}`);
    
    // Remove from tasks log
    const tasksLogKey = buildLogKey(EntityType.TASK);
    const tasksLog = (await kvGet<any[]>(tasksLogKey)) || [];
    const filteredTasksLog = tasksLog.filter(entry => entry.entityId !== task.id);
    if (filteredTasksLog.length !== tasksLog.length) {
      await kvSet(tasksLogKey, filteredTasksLog);
      console.log(`[removeTaskLogEntriesOnDelete] ✅ Removed ${tasksLog.length - filteredTasksLog.length} entries from tasks log`);
    }
    
    // Also check and remove from player log if this task awarded points
    if (task.rewards?.points) {
      const playerLogKey = buildLogKey(EntityType.PLAYER);
      const playerLog = (await kvGet<any[]>(playerLogKey)) || [];
      const filteredPlayerLog = playerLog.filter(entry => entry.sourceId !== task.id && entry.sourceTaskId !== task.id);
      if (filteredPlayerLog.length !== playerLog.length) {
        await kvSet(playerLogKey, filteredPlayerLog);
        console.log(`[removeTaskLogEntriesOnDelete] ✅ Removed ${playerLog.length - filteredPlayerLog.length} entries from player log`);
      }
    }
    
    // Check and remove from items log if this task created items
    const itemsLogKey = buildLogKey(EntityType.ITEM);
    const itemsLog = (await kvGet<any[]>(itemsLogKey)) || [];
    const filteredItemsLog = itemsLog.filter(entry => entry.sourceTaskId !== task.id);
    if (filteredItemsLog.length !== itemsLog.length) {
      await kvSet(itemsLogKey, filteredItemsLog);
      console.log(`[removeTaskLogEntriesOnDelete] ✅ Removed ${itemsLog.length - filteredItemsLog.length} entries from items log`);
    }
    
    // Check and remove from financials log if this task created financial records
    const financialsLogKey = buildLogKey(EntityType.FINANCIAL);
    const financialsLog = (await kvGet<any[]>(financialsLogKey)) || [];
    const filteredFinancialsLog = financialsLog.filter(entry => entry.sourceTaskId !== task.id);
    if (filteredFinancialsLog.length !== financialsLog.length) {
      await kvSet(financialsLogKey, filteredFinancialsLog);
      console.log(`[removeTaskLogEntriesOnDelete] ✅ Removed ${financialsLog.length - filteredFinancialsLog.length} entries from financials log`);
    }
    
    console.log(`[removeTaskLogEntriesOnDelete] ✅ Cleared effects, removed links, and removed log entries for task ${task.id}`);
  } catch (error) {
    console.error('Error removing task effects:', error);
  }
}

/**
 * Remove player points that were awarded by a specific task
 * This is used when rolling back a task that incorrectly awarded points
 */
async function removePlayerPointsFromTask(task: Task): Promise<void> {
  try {
    console.log(`[removePlayerPointsFromTask] Starting removal of points AND J$ for task: ${task.id}`);
    
    if (!task.rewards?.points) {
      console.log(`[removePlayerPointsFromTask] Task ${task.id} has no points to remove`);
      return;
    }
    
    // Get the player from the task (same logic as creation)
    const playerId = task.playerCharacterId || PLAYER_ONE_ID;
    const players = await getAllPlayers();
    const player = players.find(p => p.id === playerId);
    
    if (!player) {
      console.log(`[removePlayerPointsFromTask] Player ${playerId} not found, skipping removal`);
      return;
    }
    
    // Check if any points were actually awarded
    const pointsToRemove = task.rewards.points;
    const hasPoints = (pointsToRemove.xp || 0) > 0 || (pointsToRemove.rp || 0) > 0 || 
                     (pointsToRemove.fp || 0) > 0 || (pointsToRemove.hp || 0) > 0;
    
    if (!hasPoints) {
      console.log(`[removePlayerPointsFromTask] No points to remove from task ${task.id}`);
      return;
    }
    
    console.log(`[removePlayerPointsFromTask] Task "${task.name}" awarded: XP:${pointsToRemove.xp || 0}, RP:${pointsToRemove.rp || 0}, FP:${pointsToRemove.fp || 0}, HP:${pointsToRemove.hp || 0}`);
    
    // STEP 1: Calculate potential J$ from these points
    const conversionRates = await getConversionRatesOrDefault();
    const potentialJ$ = calculateJ$FromPoints(pointsToRemove, conversionRates);
    
    console.log(`[removePlayerPointsFromTask] These points could convert to ${potentialJ$.toFixed(2)} J$`);
    
    // STEP 2: Remove J$ from personal assets FIRST (if any was converted)
    try {
      const personalAssets = await getPersonalAssets();
      const currentJ$ = personalAssets?.personalJ$ || 0;
      
      console.log(`[removePlayerPointsFromTask] Player currently has ${currentJ$.toFixed(2)} J$`);
      
      // Calculate J$ to remove (can't remove more than player has)
      const j$ToRemove = Math.min(potentialJ$, currentJ$);
      
      if (j$ToRemove > 0) {
        console.log(`[removePlayerPointsFromTask] Removing ${j$ToRemove.toFixed(2)} J$ from personal assets`);
        
        // Update personal assets
        const updatedAssets = {
          ...personalAssets,
          personalJ$: Math.max(0, currentJ$ - j$ToRemove)
        };
        
        await savePersonalAssets(updatedAssets);
        
        // Log the J$ removal
        await appendEntityLog(
          EntityType.PLAYER,
          playerId,
          LogEventType.UPDATED,
          {
            name: player.name,
            jungleCoinsRemoved: j$ToRemove,
            reason: 'Task deletion - J$ rollback',
            sourceTaskId: task.id,
            taskName: task.name,
            description: `Removed ${j$ToRemove.toFixed(2)} J$ due to task deletion: ${task.name}`
          }
        );
        
        console.log(`[removePlayerPointsFromTask] ✅ Successfully removed ${j$ToRemove.toFixed(2)} J$ from personal assets`);
      } else {
        console.log(`[removePlayerPointsFromTask] No J$ to remove (player has ${currentJ$.toFixed(2)} J$)`);
      }
    } catch (error) {
      console.error(`[removePlayerPointsFromTask] ⚠️ Failed to remove J$:`, error);
      // Continue with points removal even if J$ removal fails
    }
    
    // STEP 3: Remove the points from the player
    console.log(`[removePlayerPointsFromTask] Now removing points from player...`);
    await removePointsFromPlayer(playerId, pointsToRemove);
    console.log(`[removePlayerPointsFromTask] ✅ Successfully removed points: XP:${pointsToRemove.xp || 0}, RP:${pointsToRemove.rp || 0}, FP:${pointsToRemove.fp || 0}, HP:${pointsToRemove.hp || 0}`);
    
  } catch (error) {
    console.error(`[removePlayerPointsFromTask] ❌ FAILED to remove player points/J$ for task ${task.id}:`, error);
    throw error; // Re-throw to see the error in console
  }
}

/**
 * Calculate maximum J$ value that could be obtained from given points
 * Uses current conversion rates to determine the J$ equivalent
 */
function calculateJ$FromPoints(
  points: { xp?: number; rp?: number; fp?: number; hp?: number },
  rates: PointsConversionRates
): number {
  const xpJ$ = (points.xp || 0) / rates.xpToJ$;
  const rpJ$ = (points.rp || 0) / rates.rpToJ$;
  const fpJ$ = (points.fp || 0) / rates.fpToJ$;
  const hpJ$ = (points.hp || 0) / rates.hpToJ$;
  
  const totalJ$ = xpJ$ + rpJ$ + fpJ$ + hpJ$;
  
  console.log(`[calculateJ$FromPoints] XP:${points.xp || 0}→${xpJ$.toFixed(2)}J$, RP:${points.rp || 0}→${rpJ$.toFixed(2)}J$, FP:${points.fp || 0}→${fpJ$.toFixed(2)}J$, HP:${points.hp || 0}→${hpJ$.toFixed(2)}J$ = ${totalJ$.toFixed(2)}J$ total`);
  
  return totalJ$;
}

/**
 * Get current conversion rates, or use defaults if fetch fails
 * This ensures the function always has rates to work with
 */
async function getConversionRatesOrDefault(): Promise<PointsConversionRates> {
  try {
    const rates = await getPlayerConversionRates();
    console.log(`[getConversionRatesOrDefault] Using current rates:`, rates);
    return rates;
  } catch (error) {
    console.warn('[getConversionRatesOrDefault] Failed to get conversion rates, using defaults:', error);
    return DEFAULT_POINTS_CONVERSION_RATES;
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
    await removePlayerPointsFromTask(task);
    console.log(`[uncompleteTask] ✅ Removed points awarded by task`);
    
    // 3. Clear effects registry entries
    await clearEffect(EffectKeys.sideEffect('task', taskId, 'itemCreated'));
    await clearEffect(EffectKeys.sideEffect('task', taskId, 'financialCreated'));
    await clearEffect(EffectKeys.sideEffect('task', taskId, 'pointsAwarded'));
    console.log(`[uncompleteTask] ✅ Cleared effects registry entries (itemCreated, financialCreated, pointsAwarded)`);
    
    // 4. Log UNCOMPLETED event
    await appendEntityLog(EntityType.TASK, taskId, LogEventType.UNCOMPLETED, {
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
