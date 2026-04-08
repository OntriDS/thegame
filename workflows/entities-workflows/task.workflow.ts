// workflows/entities-workflows/task.workflow.ts
// Task-specific workflow with state vs descriptive field detection

import { EntityType, LogEventType, TaskStatus, TaskType, FOUNDER_CHARACTER_ID } from '@/types/enums';
import type { Task } from '@/types/entities';
import { appendEntityLog, updateEntityLeanFields, removeLogEntriesAcrossMonths } from '../entities-logging';
import { hasEffect, markEffect, clearEffect, clearEffectsByPrefix } from '@/data-store/effects-registry';
import { EffectKeys, buildArchiveCollectionIndexKey, buildArchiveMonthsKey } from '@/data-store/keys';
import {
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
import { getCategoryForTaskType } from '@/lib/utils/searchable-select-utils';
import { kvSRem } from '@/data-store/kv';

// UTC STANDARDIZATION: Using new UTC utilities
import { formatMonthKey } from '@/lib/utils/date-display-utils';
import { getUTCNow, endOfMonthUTC } from '@/lib/utils/utc-utils';
import { parseDateToUTC } from '@/lib/utils/date-parsers';

import {
  updateFinancialRecordsFromTask,
  updateItemsCreatedByTask,
  updatePlayerPointsFromSource,
  hasFinancialPropsChanged,
  hasOutputPropsChanged,
  hasRewardsChanged
} from '../update-propagation-utils';
import {
  cascadeStatusToInstances,
  uncascadeStatusFromInstances,
  getUndoneInstancesCount
} from '@/lib/utils/recurrent-task-utils';

const STATE_FIELDS = ['status', 'progress', 'doneAt', 'collectedAt', 'siteId', 'targetSiteId'];

const resolveTaskOutputSite = (task: Task): string | null => {
  if (task.targetSiteId && task.targetSiteId !== 'none') return task.targetSiteId;
  if (task.siteId && task.siteId !== 'none') return task.siteId;
  return null;
};

/**
 * Get a safe task name for logging - prevents "Unknown" entries
 * Returns the task name if valid, or a fallback based on task type
 */
const getSafeTaskNameForLogging = (task: Task): string => {
  if (task.name && task.name.trim()) {
    return task.name.trim();
  }

  // Fallback based on task type to provide meaningful context
  const fallbacks: Record<string, string> = {
    'Mission': 'Untitled Mission',
    'Goal': 'Untitled Goal',
    'Assignment': 'Untitled Assignment',
    'Milestone': 'Untitled Milestone',
    'Mission Group': 'Mission Group',
    'Recurrent Template': 'Untitled Recurrent Template',
    'Recurrent Instance': 'Untitled Task Instance',
    'Recurrent Group': 'Recurrent Group',
    'Automation': 'Untitled Automation Task'
  };

  return fallbacks[task.type] || 'Untitled Task';
};

export async function onTaskUpsert(task: Task, previousTask?: Task): Promise<void> {
  // New task creation
  if (!previousTask) {
    const effectKey = EffectKeys.created('task', task.id);
    const alreadyLoggedCreated = await hasEffect(effectKey);

    if (!alreadyLoggedCreated) {
      // Minimal, event-specific payload for CREATED
      await appendEntityLog(EntityType.TASK, task.id, LogEventType.CREATED, {
        name: getSafeTaskNameForLogging(task),
        taskType: task.type,
        station: task.station
      }, task.createdAt);
      await markEffect(effectKey);
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
        name: getSafeTaskNameForLogging(task),
        taskType: task.type,
        station: task.station,
        oldStatus: previousTask!.status,
        newStatus: task.status,
        transition: `${previousTask!.status} → ${task.status}`
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
        name: getSafeTaskNameForLogging(task),
        taskType: task.type,
        station: task.station
      }, task.doneAt);
    }
  }

  const statusBecameCollected =
    task.status === TaskStatus.COLLECTED &&
    (!previousTask || previousTask.status !== TaskStatus.COLLECTED);
  const flagBecameCollected =
    !!task.isCollected && (!previousTask || !previousTask.isCollected);

  if (statusBecameCollected || flagBecameCollected) {
    let collectedAtRaw = task.collectedAt;
    if (collectedAtRaw) {
      const collectedAtCandidate = collectedAtRaw instanceof Date ? collectedAtRaw : new Date(collectedAtRaw);
      collectedAtRaw = Number.isFinite(collectedAtCandidate.getTime()) ? collectedAtCandidate : undefined;
    }
    if (!collectedAtRaw) {
      collectedAtRaw = getUTCNow();
      // Ensure the collectedAt timestamp is saved if it was missing
      await upsertTask({ ...task, isCollected: true, collectedAt: collectedAtRaw, status: TaskStatus.COLLECTED }, { skipWorkflowEffects: true });
    }
    const collectedAt = collectedAtRaw;

    const pointsRewardedEffectKey = EffectKeys.sideEffect('task', task.id, 'pointsRewarded');

    if (!(await hasEffect(pointsRewardedEffectKey))) {
      // Log COLLECTED event (Points Claimed)
      await appendEntityLog(EntityType.TASK, task.id, LogEventType.COLLECTED, {
        name: getSafeTaskNameForLogging(task),
        taskType: task.type,
        station: task.station
      }, collectedAt);

      // Reward points if rewards exist AND they were staged (prevents double-counting legacy tasks)
      const stagingEffectKey = EffectKeys.sideEffect('task', task.id, 'pointsStaged');

      if (task.rewards?.points && await hasEffect(stagingEffectKey)) {
        const playerId = task.playerCharacterId || FOUNDER_CHARACTER_ID;
        await rewardPointsToPlayer(playerId, task.rewards.points, task.id, EntityType.TASK, collectedAt);
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
              const playerId = task.playerCharacterId || FOUNDER_CHARACTER_ID;
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

    // Recurrent Template status changes (no auto instance creation here; JIT spawn-only model)
    if (task.type === TaskType.RECURRENT_TEMPLATE) {
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

  // Lean identity fields changed — cascade patch ALL log entries across ALL months and events
  if (previousTask) {
    const leanFieldsChanged =
      previousTask.name !== task.name ||
      previousTask.type !== task.type ||
      previousTask.station !== task.station;

    if (leanFieldsChanged) {
      await updateEntityLeanFields(EntityType.TASK, task.id, {
        name: task.name,
        taskType: task.type || 'Unknown',
        station: task.station || 'Unknown',
      });
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
    return date ? formatMonthKey(endOfMonthUTC(date)) : null;
  };

  const newMonth = isNowArchived ? getTaskArchiveMonth(task) : null;
  const oldMonth = wasArchived ? getTaskArchiveMonth(previousTask) : null;

  if (isNowArchived || wasArchived) {
    const { kvSAdd, kvSRem } = await import('@/data-store/kv');
    const { getAvailableArchiveMonths } = await import('@/data-store/datastore');

    const monthIndex = (m: string) => buildArchiveCollectionIndexKey('tasks', m);

    // Sweep months we know about + previous/next bucket so ghosts are removed even when
    // thegame:archive:months is incomplete (common cause of wrong-month history rows).
    const allMonths = await getAvailableArchiveMonths();
    const monthsToSweep = new Set<string>(allMonths);
    if (oldMonth) monthsToSweep.add(oldMonth);
    if (newMonth) monthsToSweep.add(newMonth);

    await Promise.all(
      [...monthsToSweep].map(async (m) => {
        if (m !== newMonth) {
          await kvSRem(monthIndex(m), task.id);
        }
      })
    );

    if (newMonth) {
      await kvSAdd(monthIndex(newMonth), task.id);
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
    // Import the cross-month cleanup helper
    const { removeLogEntriesAcrossMonths } = await import('../entities-logging');

    // Any parent task subtree is handled in removeTask (orphan done/collected + active, or cascade-delete active only) before this runs.

    // 1. Remove items created by this task
    await removeItemsCreatedByTask(task.id);

    // 2. Remove financial records created by this task
    await removeFinancialRecordsCreatedByTask(task.id);

    // 3. Remove player points that were awarded by this task
    await removePlayerPointsFromTask(task);

    // 4. Remove all Links related to this task
    const taskLinks = await getLinksFor({ type: EntityType.TASK, id: task.id });
    for (const link of taskLinks) {
      try {
        await removeLink(link.id);
      } catch (error) {
        console.error(`[removeTaskLogEntriesOnDelete] ❌ Failed to remove link ${link.id}:`, error);
      }
    }

    // 5. Clear effects registry
    await clearEffect(EffectKeys.created('task', task.id));
    await clearEffect(EffectKeys.sideEffect('task', task.id, 'characterCreated'));
    await clearEffect(EffectKeys.sideEffect('task', task.id, 'itemCreated'));
    await clearEffect(EffectKeys.sideEffect('task', task.id, 'financialCreated'));
    await clearEffect(EffectKeys.sideEffect('task', task.id, 'pointsAwarded'));
    await clearEffectsByPrefix(EntityType.TASK, task.id, 'pointsLogged:');
    await clearEffectsByPrefix(EntityType.TASK, task.id, 'financialLogged:');

    // 6. Remove log entries across all months using the new helper
    await removeLogEntriesAcrossMonths(EntityType.TASK, entry => entry.entityId === task.id);

    if (task.rewards?.points) {
      await removeLogEntriesAcrossMonths(EntityType.PLAYER, entry =>
        entry.sourceId === task.id || entry.sourceTaskId === task.id
      );
    }

    await removeLogEntriesAcrossMonths(EntityType.ITEM, entry =>
      entry.sourceTaskId === task.id
    );

    await removeLogEntriesAcrossMonths(EntityType.FINANCIAL, entry =>
      entry.sourceTaskId === task.id
    );

    await removeLogEntriesAcrossMonths(EntityType.CHARACTER, entry =>
      entry.taskId === task.id || entry.sourceTaskId === task.id
    );

    // 7. Remove from archive index (if applicable)
    if (task.status === TaskStatus.DONE || task.isCollected || task.status === TaskStatus.COLLECTED) {
      try {
        let snapshotDate = task.doneAt;
        if (!snapshotDate && task.collectedAt) snapshotDate = task.collectedAt;
        if (!snapshotDate && task.createdAt) snapshotDate = task.createdAt;

        if (snapshotDate) {
          const snapshotMonth = endOfMonthUTC(snapshotDate);
          const monthKey = formatMonthKey(snapshotMonth);
          await kvSRem(buildArchiveCollectionIndexKey('tasks', monthKey), task.id);
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
    const playerId = task.playerCharacterId || FOUNDER_CHARACTER_ID;
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
              updatedAt: getUTCNow()
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
      let snapshotDate = task.doneAt || task.collectedAt || task.createdAt || getUTCNow();
      const snapshotMonth = endOfMonthUTC(snapshotDate);
      const monthKey = formatMonthKey(snapshotMonth);

      await kvSRem(buildArchiveCollectionIndexKey('tasks', monthKey), task.id);
      await clearEffect(EffectKeys.sideEffect('task', taskId, `taskSnapshot:${monthKey}`));

      // Also check standard date-based key just in case (fallback)
      const nowKey = formatMonthKey(endOfMonthUTC(getUTCNow()));
      if (nowKey !== monthKey) {
        await kvSRem(buildArchiveCollectionIndexKey('tasks', nowKey), task.id);
      }
    } catch (err) {
      console.error(`[uncompleteTask] Failed to remove from archive index:`, err);
    }

    // 4. Remove DONE and COLLECTED logs (Idempotency)
    // Instead of logging "UNCOMPLETED", we simply remove the entries that made it "complete"
    const removedCount = await removeLogEntriesAcrossMonths(EntityType.TASK, entry =>
      entry.entityId === taskId &&
      (entry.event === LogEventType.DONE || entry.event === LogEventType.COLLECTED)
    );

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

    // Import functions we need
    const { getAllTasks, upsertTask } = await import('@/data-store/datastore');
    const { hasEffect, markEffect } = await import('@/data-store/effects-registry');
    const { formatMonthKey } = await import('@/lib/utils/date-display-utils');
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

      return;
    }

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
        }, collectedAt);

        // 3. Reward points if child has rewards and points were staged
        const childStagingKey = EffectKeys.sideEffect('task', childInstance.id, 'pointsStaged');
        if (childInstance.rewards?.points && await hasEffect(childStagingKey)) {
          const playerId = childInstance.playerCharacterId || FOUNDER_CHARACTER_ID;
          await rewardPointsToPlayer(playerId, childInstance.rewards.points, childInstance.id, EntityType.TASK, collectedAt);
        }

        // 4. Update child task with collection data
        await upsertTask(normalizedChild);

        // Mark cascade effect to prevent duplicates
        await markEffect(childEffectKey);
        await markEffect(childPointsRewardedEffectKey); // Mark points as rewarded for the child
      }
    }

  } catch (error) {
    console.error(`[cascadeCollectionToChildren] ❌ Failed to cascade collection from parent ${parentTask.name}:`, error);
    // Don't throw error - parent collection should still succeed even if cascade fails
  }
}

async function taskHasLifecycleEvent(taskId: string, eventLower: string): Promise<boolean> {
  const { getEntityLogMonths, getEntityLogs } = await import('../entities-logging');
  const months = await getEntityLogMonths(EntityType.TASK);
  const mmYyNow = (() => {
    const n = getUTCNow();
    return `${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getFullYear()).slice(-2)}`;
  })();
  const monthSet = new Set<string>([mmYyNow, ...months]);
  for (const m of monthSet) {
    const logs = await getEntityLogs(EntityType.TASK, { month: m });
    if (logs.some((e: any) => e.entityId === taskId && String(e.event ?? e.status ?? '').toLowerCase() === eventLower)) {
      return true;
    }
  }
  return false;
}

/** Precision repair: append TASK DONE log when missing (task must be Done or Collected with doneAt). */
export async function ensureTaskDoneLog(taskId: string): Promise<{
  success: boolean;
  noop?: boolean;
  error?: string;
}> {
  const task = await getTaskById(taskId);
  if (!task) return { success: false, error: `Task not found: ${taskId}` };
  const isDoneLike = task.status === TaskStatus.DONE || task.status === TaskStatus.COLLECTED;
  if (!isDoneLike) {
    return { success: false, error: 'Task is not Done or Collected.' };
  }
  if (!task.doneAt) {
    return { success: false, error: 'Task has no doneAt; set completion date first.' };
  }
  if (await taskHasLifecycleEvent(taskId, 'done')) {
    return { success: true, noop: true };
  }
  await appendEntityLog(
    EntityType.TASK,
    task.id,
    LogEventType.DONE,
    {
      name: task.name,
      taskType: task.type,
      station: task.station,
    },
    task.doneAt
  );
  return { success: true };
}

/** Precision repair: append TASK COLLECTED log when missing. */
export async function ensureTaskCollectedLog(taskId: string): Promise<{
  success: boolean;
  noop?: boolean;
  error?: string;
}> {
  const task = await getTaskById(taskId);
  if (!task) return { success: false, error: `Task not found: ${taskId}` };
  const isCollected = task.status === TaskStatus.COLLECTED || task.isCollected;
  if (!isCollected) {
    return { success: false, error: 'Task is not in collected state (status/isCollected).' };
  }
  if (await taskHasLifecycleEvent(taskId, 'collected')) {
    return { success: true, noop: true };
  }
  const collectedAt = task.collectedAt ? new Date(task.collectedAt) : getUTCNow();
  await appendEntityLog(
    EntityType.TASK,
    task.id,
    LogEventType.COLLECTED,
    {
      name: task.name,
      taskType: task.type,
      station: task.station,
    },
    collectedAt
  );
  return { success: true };
}
