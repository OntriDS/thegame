// workflows/entities-workflows/task.workflow.ts
// Task-specific workflow with state vs descriptive field detection

import { EntityType, LogEventType, TaskStatus, TaskType, PLAYER_ONE_ID } from '@/types/enums';
import type { Task } from '@/types/entities';
import { appendEntityLog, updateEntityLogField } from '../entities-logging';
import { hasEffect, markEffect, clearEffect, clearEffectsByPrefix } from '@/data-store/effects-registry';
import { EffectKeys } from '@/data-store/keys';
import {
  getPlayerConversionRates,
  getTaskById,
  getPlayerById,
  getAllTasks,
  upsertTask,
  getItemById,
  upsertItem
} from '@/data-store/datastore';
import { upsertTask as repoUpsertTask } from '@/data-store/repositories/task.repo';
import { getLinksFor, removeLink } from '@/links/link-registry';
import { createItemFromTask, removeItemsCreatedByTask } from '../item-creation-utils';
import { awardPointsToPlayer, removePointsFromPlayer, stagePointsForPlayer, rewardPointsToPlayer, withdrawStagedPointsFromPlayer, unrewardPointsForPlayer } from '../points-rewards-utils';
import { createFinancialRecordFromTask, updateFinancialRecordFromTask, removeFinancialRecordsCreatedByTask } from '../financial-record-utils';
import { createCharacterFromTask } from '../character-creation-utils';
import { DEFAULT_POINTS_CONVERSION_RATES } from '@/lib/constants/financial-constants';
import type { PointsConversionRates } from '@/lib/constants/financial-constants';
import { getCategoryForTaskType } from '@/lib/utils/searchable-select-utils';
import { kvGet, kvSet, kvSRem } from '@/data-store/kv';
import { buildLogKey } from '@/data-store/keys';
import { formatMonthKey, calculateClosingDate } from '@/lib/utils/date-utils';
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
  deleteGroupCascade,
  cascadeStatusToInstances,
  uncascadeStatusFromInstances,
  getUndoneInstancesCount
} from '@/lib/utils/recurrent-task-utils';

const STATE_FIELDS = ['status', 'progress', 'doneAt', 'collectedAt', 'siteId', 'targetSiteId'];
const DESCRIPTIVE_FIELDS = ['name', 'description', 'cost', 'revenue', 'rewards', 'priority'];

const resolveTaskOutputSite = (task: Task): string | null => {
  if (task.targetSiteId && task.targetSiteId !== 'none') return task.targetSiteId;
  if (task.siteId && task.siteId !== 'none') return task.siteId;
  return null;
};

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
        const instances = await handleTemplateInstanceCreation(task);
        await markEffect(instancesEffectKey);
      }
    }

    // Return early ONLY if CREATED was already logged AND task is NOT Done
    // This prevents duplicates but allows Done tasks to proceed to DONE logging
    if (alreadyLoggedCreated && task.status !== TaskStatus.DONE) {
      return;
    }
    // Continue to DONE logging below if task is Done (whether CREATED just logged or was already there)
  }

  // State changes - append new log
  if (previousTask && previousTask.status !== task.status) {

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

    // Handle uncompletion (Done/Collected → Other status)
    if ((previousTask!.status === TaskStatus.DONE || previousTask!.status === TaskStatus.COLLECTED) && task.status !== TaskStatus.DONE && task.status !== TaskStatus.COLLECTED) {

      // Uncomplete the task and remove effects
      await uncompleteTask(task.id);
    }

  }

  // Log DONE event - either when status changes to Done OR when creating a task that's already Done
  if (task.status === TaskStatus.DONE && task.doneAt) {
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

  const statusBecameCollected =
    task.status === TaskStatus.COLLECTED &&
    (!previousTask || previousTask.status !== TaskStatus.COLLECTED);
  const flagBecameCollected =
    !!task.isCollected && (!previousTask || !previousTask.isCollected);

  if (statusBecameCollected || flagBecameCollected) {
    let collectedAt = task.collectedAt;
    if (!collectedAt) {
      collectedAt = new Date();
      // Ensure the collectedAt timestamp is saved if it was missing
      await repoUpsertTask({ ...task, isCollected: true, collectedAt, status: TaskStatus.COLLECTED });
    }

    const pointsRewardedEffectKey = EffectKeys.sideEffect('task', task.id, 'pointsRewarded');

    if (!(await hasEffect(pointsRewardedEffectKey))) {
      // Log COLLECTED event (Points Claimed)
      await appendEntityLog(EntityType.TASK, task.id, LogEventType.COLLECTED, {
        name: task.name,
        taskType: task.type,
        station: task.station,
        priority: task.priority,
        collectedAt: collectedAt.toISOString()
      });

      // Reward points if rewards exist AND they were staged (prevents double-counting legacy tasks)
      const stagingEffectKey = EffectKeys.sideEffect('task', task.id, 'pointsStaged');

      if (task.rewards?.points && await hasEffect(stagingEffectKey)) {
        const playerId = task.playerCharacterId || PLAYER_ONE_ID;
        await rewardPointsToPlayer(playerId, task.rewards.points, task.id, EntityType.TASK);
      }

      await markEffect(pointsRewardedEffectKey);

      // Cascade collection to child instances (only marks them as collected to reward points)
      await cascadeCollectionToChildren(task, collectedAt);
    }
  }

  // Tasks are not physical entities; skip MOVED logging even if site references change.

  // Character creation from emissary fields - when newCustomerName is provided
  if (task.newCustomerName && !task.customerCharacterId) {
    const effectKey = EffectKeys.sideEffect('task', task.id, 'characterCreated');
    if (!(await hasEffect(effectKey))) {
      const createdCharacter = await createCharacterFromTask(task);
      if (createdCharacter) {
        // Update task with the created character ID
        const updatedTask = { ...task, customerCharacterId: createdCharacter.id };
        await upsertTask(updatedTask, { skipWorkflowEffects: true });
        await markEffect(effectKey);
      }
    }
  }

  // PARALLEL SIDE EFFECTS - when task is completed (Done or Collected)
  // Run all independent side effects concurrently for 60-70% performance improvement
  if (task.status === TaskStatus.DONE || task.status === TaskStatus.COLLECTED) {
    const sideEffects: Promise<void>[] = [];

    // Item creation from emissary fields
    if (task.outputItemType && task.outputQuantity) {
      sideEffects.push(
        (async () => {
          const effectKey = EffectKeys.sideEffect('task', task.id, 'itemCreated');
          if (!(await hasEffect(effectKey))) {
            const createdItem = await createItemFromTask(task);
            if (createdItem) {
              await markEffect(effectKey);
            }
          }
        })()
      );
    }

    // Points awarding - when task is completed with rewards
    // Use task.playerCharacterId directly as playerId (they're the same now with unified 'creator' ID)
    if (task.rewards?.points) {
      sideEffects.push(
        (async () => {
          (async () => {
            // Use 'pointsStaged' key to distinguish from legacy 'pointsAwarded'
            const stagingKey = EffectKeys.sideEffect('task', task.id, 'pointsStaged');
            const legacyKey = EffectKeys.sideEffect('task', task.id, 'pointsAwarded');

            if (!(await hasEffect(stagingKey)) && !(await hasEffect(legacyKey))) {
              const playerId = task.playerCharacterId || PLAYER_ONE_ID;
              await stagePointsForPlayer(playerId, task.rewards.points, task.id, EntityType.TASK);
              await markEffect(stagingKey);
            }
          })()
        })()
      );
    }

    // Financial record creation from task
    if (task.cost || task.revenue || task.rewards?.points) {
      sideEffects.push(
        (async () => {
          const effectKey = EffectKeys.sideEffect('task', task.id, 'financialCreated');
          if (!(await hasEffect(effectKey))) {
            const createdFinancial = await createFinancialRecordFromTask(task);
            if (createdFinancial) {
              await markEffect(effectKey);
            }
          }
        })()
      );
    }

    // Wait for all side effects to complete
    await Promise.all(sideEffects);
  }

  // COMPREHENSIVE UPDATE PROPAGATION - when task properties change
  if (previousTask) {
    // Propagate to Financial Records
    if (hasFinancialPropsChanged(task, previousTask)) {
      await updateFinancialRecordsFromTask(task, previousTask);
    }

    // Propagate to Items
    if (hasOutputPropsChanged(task, previousTask)) {
      await updateItemsCreatedByTask(task, previousTask);
    }

    // Propagate to Player (points delta)
    if (hasRewardsChanged(task, previousTask)) {
      await updatePlayerPointsFromSource(EntityType.TASK, task, previousTask);
    }

    // Recurrent Template instance spawning - when template frequency or due date changes
    if (task.type === TaskType.RECURRENT_TEMPLATE) {
      const frequencyChanged = JSON.stringify(previousTask.frequencyConfig) !== JSON.stringify(task.frequencyConfig);
      const dueDateChanged = previousTask.dueDate?.getTime() !== task.dueDate?.getTime();

      if (frequencyChanged || dueDateChanged) {
        const instancesEffectKey = EffectKeys.sideEffect('task', task.id, 'instancesGenerated');
        if (!(await hasEffect(instancesEffectKey))) {
          const instances = await handleTemplateInstanceCreation(task);
          await markEffect(instancesEffectKey);
        }
      }

      // Handle status changes for Recurrent Templates
      const statusChanged = previousTask.status !== task.status;

      if (statusChanged) {
        // Check if user requested to skip cascading (via temporary metadata)
        const skipCascade = (task as any)._skipCascade === true;

        if (skipCascade) {
        } else {
          // Detect template status reversal (uncascade)
          const statusReverted = previousTask.status === TaskStatus.DONE && task.status !== TaskStatus.DONE;

          if (statusReverted) {
            const { reverted } = await uncascadeStatusFromInstances(task.id, task.status);
          } else {
            // Forward cascade: cascade status to instances
            const undoneCount = await getUndoneInstancesCount(task.id, task.status);
            if (undoneCount > 0) {
              const { updated } = await cascadeStatusToInstances(task.id, task.status, previousTask.status);
            }
          }
        }
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

  // ---------------------------------------------------------------------------
  // Reactive Archive Indexing & Ghost Cleanup
  // Ensure the entity is correctly placed in the right month's sorted set.
  // We sweep all available months to completely eradicate Snapshot-era ghost duplicates.
  // ---------------------------------------------------------------------------
  const isNowArchived = task.status === TaskStatus.DONE || task.status === TaskStatus.COLLECTED;
  const wasArchived = previousTask && (previousTask.status === TaskStatus.DONE || previousTask.status === TaskStatus.COLLECTED);

  const getTaskArchiveMonth = (t: Task) => {
    const date = t.status === TaskStatus.COLLECTED ? (t.collectedAt || t.doneAt || t.createdAt) : (t.doneAt || t.createdAt);
    return date ? formatMonthKey(calculateClosingDate(date)) : null;
  };

  const newMonth = isNowArchived ? getTaskArchiveMonth(task) : null;
  const oldMonth = wasArchived ? getTaskArchiveMonth(previousTask) : null;

  if (isNowArchived || wasArchived) {
    const { kvSAdd, kvSRem } = await import('@/data-store/kv');
    const { getAvailableArchiveMonths } = await import('@/data-store/datastore');
    const { buildArchiveMonthsKey } = await import('@/data-store/keys');

    // BULLETPROOF CLEANUP: Remove from ALL other months to fix legacy ghost duplicates
    // We run this unconditionally to ensure no task is left behind in a wrong index
    const allMonths = await getAvailableArchiveMonths();
    await Promise.all(
      allMonths.map(async (m) => {
        if (m !== newMonth) {
          await kvSRem(`index:tasks:collected:${m}`, task.id);
        }
      })
    );

    if (newMonth) {
      await kvSAdd(`index:tasks:collected:${newMonth}`, task.id);
      await kvSAdd(buildArchiveMonthsKey(), newMonth);
    }
  } // The task's existence in the index and its inherent dates are the single source of truth.
}

/**
 * Remove task effects when task is deleted
 * Tasks can have entries in multiple logs: tasks, financials, character, player, items
 */
export async function removeTaskLogEntriesOnDelete(task: Task): Promise<void> {
  try {
    // Handle recurrent template cascade deletion
    if (task.type === TaskType.RECURRENT_TEMPLATE || task.type === TaskType.RECURRENT_GROUP) {
      // Get all tasks that will be deleted (template/group + instances + child templates)
      const tasks = await getAllTasks();
      let toDelete: Task[] = [];

      if (task.type === TaskType.RECURRENT_TEMPLATE) {
        // Delete template + its instances
        toDelete = tasks.filter(t =>
          t.id === task.id ||
          (t.parentId === task.id && t.type === TaskType.RECURRENT_INSTANCE)
        );
      } else if (task.type === TaskType.RECURRENT_GROUP) {
        // Collect all tasks that will be deleted (before deletion) for log cleanup
        // This includes nested groups, templates, and instances
        toDelete = [task];

        // Recursive function to collect all descendants
        const collectDescendants = (parentId: string) => {
          const childGroups = tasks.filter((t: Task) =>
            t.parentId === parentId && t.type === TaskType.RECURRENT_GROUP
          );
          const childTemplates = tasks.filter((t: Task) =>
            t.parentId === parentId && t.type === TaskType.RECURRENT_TEMPLATE
          );

          childGroups.forEach(g => {
            toDelete.push(g);
            collectDescendants(g.id); // Recursively process nested groups
          });
          childTemplates.forEach(t => {
            toDelete.push(t);
            const templateInstances = tasks.filter((i: Task) =>
              i.parentId === t.id && i.type === TaskType.RECURRENT_INSTANCE
            );
            toDelete.push(...templateInstances);
          });
        };

        collectDescendants(task.id);
      }

      // Delete all tasks first
      const deletedCount = task.type === TaskType.RECURRENT_TEMPLATE
        ? await deleteTemplateCascade(task.id)
        : await deleteGroupCascade(task.id);
      // Now clean up logs for ALL deleted tasks
      const taskIds = toDelete.map(t => t.id);
      // Remove from tasks log for all deleted tasks
      const tasksLogKey = buildLogKey(EntityType.TASK);
      const tasksLog = (await kvGet<any[]>(tasksLogKey)) || [];
      const filteredTasksLog = tasksLog.filter(entry => !taskIds.includes(entry.entityId));
      if (filteredTasksLog.length !== tasksLog.length) {
        await kvSet(tasksLogKey, filteredTasksLog);
      }

      // Clean up other logs (player, items, financials, character) for all deleted tasks
      for (const deletedTask of toDelete) {
        // Check and remove from player log
        if (deletedTask.rewards?.points) {
          const playerLogKey = buildLogKey(EntityType.PLAYER);
          const playerLog = (await kvGet<any[]>(playerLogKey)) || [];
          const filteredPlayerLog = playerLog.filter(entry =>
            entry.sourceId !== deletedTask.id && entry.sourceTaskId !== deletedTask.id
          );
          if (filteredPlayerLog.length !== playerLog.length) {
            await kvSet(playerLogKey, filteredPlayerLog);
          }
        }

        // Check and remove from items log
        const itemsLogKey = buildLogKey(EntityType.ITEM);
        const itemsLog = (await kvGet<any[]>(itemsLogKey)) || [];
        const filteredItemsLog = itemsLog.filter(entry => entry.sourceTaskId !== deletedTask.id);
        if (filteredItemsLog.length !== itemsLog.length) {
          await kvSet(itemsLogKey, filteredItemsLog);
        }

        // Check and remove from financials log
        const financialsLogKey = buildLogKey(EntityType.FINANCIAL);
        const financialsLog = (await kvGet<any[]>(financialsLogKey)) || [];
        const filteredFinancialsLog = financialsLog.filter(entry => entry.sourceTaskId !== deletedTask.id);
        if (filteredFinancialsLog.length !== financialsLog.length) {
          await kvSet(financialsLogKey, filteredFinancialsLog);
        }

        // Check and remove from character log
        const characterLogKey = buildLogKey(EntityType.CHARACTER);
        const characterLog = (await kvGet<any[]>(characterLogKey)) || [];
        const filteredCharacterLog = characterLog.filter(entry =>
          entry.taskId !== deletedTask.id && entry.sourceTaskId !== deletedTask.id
        );
        if (filteredCharacterLog.length !== characterLog.length) {
          await kvSet(characterLogKey, filteredCharacterLog);
        }
      }

      return;
    }

    // 1. Remove items created by this task
    await removeItemsCreatedByTask(task.id);

    // 2. Remove financial records created by this task
    await removeFinancialRecordsCreatedByTask(task.id);

    // 3. Remove player points that were awarded by this task (if points were badly given)
    await removePlayerPointsFromTask(task);

    // 3. Remove all Links related to this task
    const taskLinks = await getLinksFor({ type: EntityType.TASK, id: task.id });
    for (const link of taskLinks) {
      try {
        await removeLink(link.id);
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
      }
    }

    // Check and remove from items log if this task created items
    const itemsLogKey = buildLogKey(EntityType.ITEM);
    const itemsLog = (await kvGet<any[]>(itemsLogKey)) || [];
    const filteredItemsLog = itemsLog.filter(entry => entry.sourceTaskId !== task.id);
    if (filteredItemsLog.length !== itemsLog.length) {
      await kvSet(itemsLogKey, filteredItemsLog);
    }

    // Check and remove from financials log if this task created financial records
    const financialsLogKey = buildLogKey(EntityType.FINANCIAL);
    const financialsLog = (await kvGet<any[]>(financialsLogKey)) || [];
    const filteredFinancialsLog = financialsLog.filter(entry => entry.sourceTaskId !== task.id);
    if (filteredFinancialsLog.length !== financialsLog.length) {
      await kvSet(financialsLogKey, filteredFinancialsLog);
    }

    // Check and remove from character log if this task was requested by a character
    const characterLogKey = buildLogKey(EntityType.CHARACTER);
    const characterLog = (await kvGet<any[]>(characterLogKey)) || [];
    const filteredCharacterLog = characterLog.filter(entry => entry.taskId !== task.id && entry.sourceTaskId !== task.id);
    if (filteredCharacterLog.length !== characterLog.length) {
      await kvSet(characterLogKey, filteredCharacterLog);
    }

    // 6. Remove from archive index (if applicable)
    if (task.status === TaskStatus.DONE || task.isCollected || task.status === TaskStatus.COLLECTED) {
      try {
        let snapshotDate = task.doneAt;
        if (!snapshotDate && task.collectedAt) snapshotDate = task.collectedAt;
        if (!snapshotDate && task.createdAt) snapshotDate = task.createdAt;

        if (snapshotDate) {
          const snapshotMonth = calculateClosingDate(snapshotDate);
          const monthKey = formatMonthKey(snapshotMonth);
          const archiveIndexKey = `index:tasks:collected:${monthKey}`;
          await kvSRem(archiveIndexKey, task.id);
        }
      } catch (err) {
        console.error(`[removeTaskLogEntriesOnDelete] Failed to clean up archive index`, err);
      }
    }

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
    if (!task.rewards?.points) return;

    // Get the player from the task (same logic as creation)
    const playerId = task.playerCharacterId || PLAYER_ONE_ID;
    const player = await getPlayerById(playerId);

    if (!player) return;

    // Check if any points were actually awarded
    const pointsToRemove = task.rewards.points;
    const hasPoints = (pointsToRemove.xp || 0) > 0 || (pointsToRemove.rp || 0) > 0 ||
      (pointsToRemove.fp || 0) > 0 || (pointsToRemove.hp || 0) > 0;

    if (!hasPoints) return;

    // NOTE: We do NOT remove J$ here because:
    // - J$ is only created when points are EXPLICITLY exchanged for J$ (via exchange flow)
    // - Points awarded by tasks are NOT automatically converted to J$
    // - If points were exchanged, that created a FinancialRecord with exchangeType 'POINTS_TO_J$'
    // - Those FinancialRecords are the source of truth for J$, not personalAssets
    // - If we need to reverse a points exchange, we should reverse the FinancialRecord, not modify personalAssets
    await removePointsFromPlayer(playerId, pointsToRemove);
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

  return totalJ$;
}

/**
 * Get current conversion rates, or use defaults if fetch fails
 * This ensures the function always has rates to work with
 */
async function getConversionRatesOrDefault(): Promise<PointsConversionRates> {
  try {
    const rates = await getPlayerConversionRates();
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
    // Get the task
    const task = await getTaskById(taskId);

    if (!task) return;

    // Check if task was previously completed (has doneAt)
    if (!task.doneAt) return;

    if (!task.isNewItem && task.outputItemId) {
      const quantityToRemove = task.outputQuantity || 0;
      if (quantityToRemove > 0) {
        const existingItem = await getItemById(task.outputItemId);
        if (existingItem) {
          const preferredSiteId = resolveTaskOutputSite(task) || existingItem.stock?.[0]?.siteId || 'hq';
          const updatedStock = Array.isArray(existingItem.stock)
            ? existingItem.stock.map(stockPoint => ({ ...stockPoint }))
            : [];

          const stockIndex = updatedStock.findIndex(stockPoint => stockPoint.siteId === preferredSiteId);
          if (stockIndex >= 0) {
            const newQuantity = updatedStock[stockIndex].quantity - quantityToRemove;
            if (newQuantity <= 0) {
              updatedStock.splice(stockIndex, 1);
            } else {
              updatedStock[stockIndex] = { ...updatedStock[stockIndex], quantity: newQuantity };
            }

            const updatedItem = {
              ...existingItem,
              stock: updatedStock,
              updatedAt: new Date()
            };

            await upsertItem(updatedItem);
          } else {
            console.warn(`[uncompleteTask] Expected stock point ${preferredSiteId} not found when reverting existing item ${existingItem.id}`);
          }
        } else {
          console.warn(`[uncompleteTask] Existing item ${task.outputItemId} not found while reverting task ${task.id}`);
        }
      }
    }

    // 1. Remove items created by this task
    await removeItemsCreatedByTask(taskId);
    // 2. Remove points awarded by this task
    await removePlayerPointsFromTask(task);
    // 3. Clear effects registry entries
    await clearEffect(EffectKeys.sideEffect('task', taskId, 'itemCreated'));
    await clearEffect(EffectKeys.sideEffect('task', taskId, 'financialCreated'));
    await clearEffect(EffectKeys.sideEffect('task', taskId, 'pointsAwarded'));
    await clearEffect(EffectKeys.sideEffect('task', taskId, 'pointsRewarded')); // Clear the new effect key
    // 3.5 Remove from archive index & clear snapshot effect
    try {
      let snapshotDate = task.doneAt || task.collectedAt || task.createdAt || new Date();
      const snapshotMonth = calculateClosingDate(snapshotDate);
      const monthKey = formatMonthKey(snapshotMonth);

      const archiveIndexKey = `index:tasks:collected:${monthKey}`;
      await kvSRem(archiveIndexKey, task.id);
      await clearEffect(EffectKeys.sideEffect('task', taskId, `taskSnapshot:${monthKey}`));

      // Also check standard date-based key just in case (fallback)
      const nowKey = formatMonthKey(calculateClosingDate(new Date()));
      if (nowKey !== monthKey) {
        // Best effort cleanup if date logic shifted
        await kvSRem(`index:tasks:collected:${nowKey}`, task.id);
      }
    } catch (err) {
      console.error(`[uncompleteTask] Failed to remove from archive index:`, err);
    }

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

/**
 * Cascade collection to all child instances when a parent is collected
 * Ensures complete collection workflow for parent-child hierarchies
 */
async function cascadeCollectionToChildren(parentTask: Task, collectedAt: Date): Promise<void> {
  try {
    console.log(`[cascadeCollectionToChildren] Starting collection cascade from parent: ${parentTask.name}`);

    // Import functions we need
    const { getAllTasks, upsertTask } = await import('@/data-store/datastore');
    const { hasEffect, markEffect } = await import('@/data-store/effects-registry');
    const { formatMonthKey } = await import('@/lib/utils/date-utils');
    const { kvSAdd } = await import('@/data-store/kv');
    const { appendEntityLog } = await import('@/workflows/entities-logging');

    // Get all tasks to find children
    const allTasks = await getAllTasks();

    // Find all child instances of this parent
    const childInstances = allTasks.filter(task =>
      task.parentId === parentTask.id &&
      task.type === TaskType.RECURRENT_INSTANCE &&
      (!task.isCollected || task.status !== TaskStatus.COLLECTED)
    );

    if (childInstances.length === 0) {
      console.log(`[cascadeCollectionToChildren] No collectable child instances found for parent: ${parentTask.name}`);
      return;
    }

    console.log(`[cascadeCollectionToChildren] Found ${childInstances.length} child instances to collect`);

    // Collect each child instance
    for (const childInstance of childInstances) {
      const childEffectKey = `task:${childInstance.id}:collectionCascaded:${parentTask.id}`;
      const childPointsRewardedEffectKey = EffectKeys.sideEffect('task', childInstance.id, 'pointsRewarded');

      if (!(await hasEffect(childEffectKey))) {
        // Create child snapshot for Archive Vault
        const normalizedChild: Task = {
          ...childInstance,
          isCollected: true,
          collectedAt,
          status: TaskStatus.COLLECTED
        };

        // 1. We no longer CREATE a snapshot here, it's created on parent completion
        // We only mark the record as collected to trigger point rewarding if applicable

        // 2. Log COLLECTED event for child
        await appendEntityLog(EntityType.TASK, childInstance.id, LogEventType.COLLECTED, {
          name: childInstance.name,
          taskType: childInstance.type,
          station: childInstance.station,
          priority: childInstance.priority,
          collectedAt: collectedAt.toISOString(),
          cascadedFrom: parentTask.id
        });

        // 3. Reward points if child has rewards and points were staged
        const childStagingKey = EffectKeys.sideEffect('task', childInstance.id, 'pointsStaged');
        if (childInstance.rewards?.points && await hasEffect(childStagingKey)) {
          const playerId = childInstance.playerCharacterId || PLAYER_ONE_ID;
          await rewardPointsToPlayer(playerId, childInstance.rewards.points, childInstance.id, EntityType.TASK);
        }

        // 4. Update child task with collection data
        await upsertTask(normalizedChild);

        // Mark cascade effect to prevent duplicates
        await markEffect(childEffectKey);
        await markEffect(childPointsRewardedEffectKey); // Mark points as rewarded for the child

        console.log(`[cascadeCollectionToChildren] ✅ Cascaded collection for child: ${childInstance.name}`);
      }
    }

    console.log(`[cascadeCollectionToChildren] ✅ Collection cascade completed from parent: ${parentTask.name}`);

  } catch (error) {
    console.error(`[cascadeCollectionToChildren] ❌ Failed to cascade collection from parent ${parentTask.name}:`, error);
    // Don't throw error - parent collection should still succeed even if cascade fails
  }
}
