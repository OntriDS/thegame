// @ts-nocheck
// workflows/entities-workflows/task.workflow.ts
// Task-specific workflow with state vs descriptive field detection

import { CharacterRole, EntityType, LogEventType, TaskStatus, TaskType, ItemStatus, WorkflowStatus } from '@/types/enums';
import type { CustomerCounterpartyRole, Task, WorkflowExecutionV1 } from '@/types/entities';
import { executeWorkflow } from '../coordinator';
import { appendEntityLog, updateEntityLeanFields, removeLogEntriesAcrossMonths } from '../entities-logging';
import { hasEffect, markEffect, clearEffect, clearEffectsByPrefix } from '@/data-store/effects-registry';
import { EffectKeys, buildMonthIndexKey, buildArchiveMonthsKey } from '@/data-store/keys';
import {
  getTaskById,
  getPlayerById,
  getAllTasks,
  upsertTask,
  getItemById,
  upsertItem,
  getItemsBySourceTaskId
} from '@/data-store/datastore';
import { upsertTask as repoUpsertTask } from '@/data-store/repositories/task.repo';
import { getLinksFor, removeLink } from '@/links/link-registry';
import { createItemFromTask, removeItemsCreatedByTask } from '../item-creation-utils';
import { awardPointsToPlayer, removePointsFromPlayer, stagePointsForPlayer, rewardPointsToPlayer, withdrawStagedPointsFromPlayer, unrewardPointsForPlayer } from '../points-rewards-utils';
import { createFinancialRecordFromTask, removeFinancialRecordsCreatedByTask } from '../financial-record-utils';
import { createCharacterFromTask } from '../character-creation-utils';
import { ensureCounterpartyRoleDatastore } from '@/lib/utils/character-role-sync-server';
import { getCategoryForTaskType } from '@/lib/utils/searchable-select-utils';
import { kvSRem } from '@/lib/utils/kv';
import { getTaskPlayerCharacterId } from '@/lib/compatibility/task-selectors';
import { resolveTaskOwnerPlayerId } from '../task-player-resolution';
import { deleteEffectClaim } from '@/lib/domain/effects/effect-claim-store';

// UTC: archive Redis keys use formatArchiveMonthKeyUTC only (see utc-utils.ts + utc-time-system.md).
import { getUTCNow, formatArchiveMonthKeyUTC, endOfMonthUTC } from '@/lib/utils/utc-utils';
import { parseDateToUTC } from '@/lib/utils/date-parsers';
import { getTaskArchiveMonthKeyUTC } from '@/lib/utils/task-archive-index-utils';

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
import { resolveCounterpartyForTask, withResolvedTaskCounterparty, getTaskCounterpartyId } from '../task-counterparty-resolution';

const STATE_FIELDS = ['status', 'progress', 'doneAt', 'collectedAt', 'siteId', 'targetSiteId'];

const resolveTaskOutputSite = (task: Task): string | null => {
  if (task.targetSiteId && task.targetSiteId !== 'none') return task.targetSiteId;
  if (task.siteId && task.siteId !== 'none') return task.siteId;
  return null;
};

/**
 * When a task exits pre-creation lifecycle, promote any task-created
 * in-progress items back to CREATED so the normal done/collected/failed
 * behavior remains unchanged for item lifecycle state.
 */
const normalizeTaskCreatedItemStatus = async (currentTask: Task, previousTask: Task): Promise<void> => {
  const wasPreprogress =
    previousTask.status === TaskStatus.IN_PROGRESS ||
    previousTask.status === TaskStatus.FINISHING;

  const isNowTerminalForItemLifecycle =
    currentTask.status === TaskStatus.DONE ||
    currentTask.status === TaskStatus.COLLECTED ||
    currentTask.status === TaskStatus.FAILED;

  if (!wasPreprogress || !isNowTerminalForItemLifecycle) return;

  const createdItems = await getItemsBySourceTaskId(currentTask.id);
  for (const item of createdItems) {
    if (item.status !== ItemStatus.IN_PROGRESS) continue;

    const normalizedItem = {
      ...item,
      status: ItemStatus.CREATED,
      updatedAt: getUTCNow()
    };
    await upsertItem(normalizedItem);
  }
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

/**
 * Map TaskStatus to LogEventType for status changes
 * Created and Done/Collected are handled separately in workflow
 */
const getStatusEvent = (taskStatus: TaskStatus): LogEventType | null => {
  const statusEventMap: Record<string, LogEventType> = {
    [TaskStatus.CREATED]: LogEventType.CREATED,
    [TaskStatus.ON_HOLD]: LogEventType.ON_HOLD,
    [TaskStatus.IN_PROGRESS]: LogEventType.IN_PROGRESS,
    [TaskStatus.FINISHING]: LogEventType.FINISHING,
    [TaskStatus.FAILED]: LogEventType.FAILED,
  };

  return statusEventMap[taskStatus] || null;
};

/**
 * Remove intermediate status entries when completing a task that was previously completed
 * Handles scenarios like DONE → FINISHING → DONE
 */
async function cleanUpIntermediateStatusTransitions(
  taskId: string,
  previousStatus: TaskStatus,
  newStatus: TaskStatus
): Promise<void> {
  // Check if this is re-completion after intermediate states
  const isRecompletionAfterIntermediate =
    (newStatus === TaskStatus.DONE || newStatus === TaskStatus.COLLECTED) &&
    (previousStatus !== TaskStatus.DONE && previousStatus !== TaskStatus.COLLECTED);

  if (isRecompletionAfterIntermediate) {
    // Find and remove intermediate status entries between last completion and now
    const { removeLogEntriesAcrossMonths } = await import('@/workflows/entities-logging');

    await removeLogEntriesAcrossMonths(EntityType.TASK, entry => {
      if (entry.entityId !== taskId) return false;

      // Remove intermediate status entries that occurred after DONE/COLLECTED
      const isIntermediateStatus = entry.event === LogEventType.ON_HOLD ||
                              entry.event === LogEventType.IN_PROGRESS ||
                              entry.event === LogEventType.FINISHING;
      const isCompletion = entry.event === LogEventType.DONE || entry.event === LogEventType.COLLECTED;

      // Handle specific idempotency: DONE → FINISHING → DONE (remove FINISHING, keep DONE)
      const shouldRemoveIntermediate = isIntermediateStatus && !isCompletion;
      const shouldKeepCompletion = isCompletion && !isIntermediateStatus;

      // Remove intermediate entries that came after a completion entry
      // Also handle DONE → FINISHING → DONE where FINISHING should be removed
      return shouldRemoveIntermediate;
    });
  }
}

/**
 * First transition into Failed: clear collection, reverse staged/rewarded points, FAILED log, persist normalized row.
 * Does not run when task was already Failed (idempotent re-save).
 */
async function normalizeTaskFailedState(task: Task, previousTask?: Task): Promise<Task> {
  const doneAtRaw = task.doneAt || previousTask?.doneAt || getUTCNow();
  const doneAt = doneAtRaw instanceof Date ? doneAtRaw : parseDateToUTC(doneAtRaw as string | number);

  const merged: Task = {
    ...task,
    status: TaskStatus.FAILED,
    
    collectedAt: undefined,
    doneAt,
  };

  if (previousTask) {
    const wasCollected =
      previousTask.status === TaskStatus.COLLECTED || previousTask.status === TaskStatus.COLLECTED;
    const stagingKey = EffectKeys.sideEffect('task', task.id, 'pointsStaged');
    const pointsRewardedKey = EffectKeys.sideEffect('task', task.id, 'pointsRewarded');
    const playerRef = await resolveTaskOwnerPlayerId(task);

    if (wasCollected && task.context?.rewardIntent?.points) {
      if (await hasEffect(pointsRewardedKey)) {
        if (playerRef) await unrewardPointsForPlayer(playerRef, task.context?.rewardIntent?.points, task.id, EntityType.TASK);
        await clearEffect(pointsRewardedKey);
      } else if (await hasEffect(stagingKey)) {
        if (playerRef) await withdrawStagedPointsFromPlayer(playerRef, task.context?.rewardIntent?.points, task.id, EntityType.TASK);
        await clearEffect(stagingKey);
      }
      await removeLogEntriesAcrossMonths(
        EntityType.TASK,
        e => e.entityId === task.id && e.event === LogEventType.COLLECTED
      );
    } else if (previousTask.status === TaskStatus.DONE && task.context?.rewardIntent?.points && (await hasEffect(stagingKey))) {
      if (playerRef) await withdrawStagedPointsFromPlayer(playerRef, task.context?.rewardIntent?.points, task.id, EntityType.TASK);
      await clearEffect(stagingKey);
    }
  }

  await clearEffect(EffectKeys.sideEffect('task', task.id, 'pointsAwarded'));

  const failedLoggedKey = EffectKeys.sideEffect('task', task.id, 'failedLogged');
  if (!(await hasEffect(failedLoggedKey))) {
    await appendEntityLog(
      EntityType.TASK,
      task.id,
      LogEventType.FAILED,
      {
        name: getSafeTaskNameForLogging(merged),
        taskType: merged.type,
        station: merged.station,
      },
      doneAt
    );
    await markEffect(failedLoggedKey);
  }

  await upsertTask(merged, { skipWorkflowEffects: true });
  return merged;
}

export async function onTaskUpsert(task: Task, previousTask?: Task): Promise<void> {
  let taskForCounterparty = task;
  let outputsTask: Task = task;

  const counterpartyResolutionLogPrefix = `[onTaskUpsert] Counterparty resolution (${task.id})`;

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

    // Return early ONLY if CREATED was already logged AND task is not terminal
    if (
      alreadyLoggedCreated &&
      task.status !== TaskStatus.DONE &&
      task.status !== TaskStatus.FAILED &&
      task.status !== TaskStatus.COLLECTED
    ) {
      return;
    }
    // Continue to DONE logging below if task is Done (whether CREATED just logged or was already there)
  }

  // Status changes - log actual status as event (not generic "Updated")
  if (previousTask && previousTask.status !== task.status) {

    // Clean up intermediate status transitions for idempotency
    await cleanUpIntermediateStatusTransitions(task.id, previousTask.status, task.status);

    // Skip generic status log for Done, Collected, Failed (FAILED logged in normalizeTaskFailedState)
    const skipForSpecialStatuses = [TaskStatus.DONE, TaskStatus.COLLECTED, TaskStatus.FAILED];
    if (!skipForSpecialStatuses.includes(task.status) && task.status !== TaskStatus.NONE) {
      // Log status change with actual status as event type
      const statusEvent = getStatusEvent(task.status);
      if (statusEvent !== null) {
        await appendEntityLog(EntityType.TASK, task.id, statusEvent, {
          name: getSafeTaskNameForLogging(task),
          taskType: task.type,
          station: task.station,
          oldStatus: previousTask.status,
          newStatus: task.status,
          transition: `${previousTask.status} → ${task.status}`
        });
      }
    }

    const isTerminalStatus = (s: TaskStatus) =>
      s === TaskStatus.DONE || s === TaskStatus.COLLECTED || s === TaskStatus.FAILED;

    // Uncomplete when leaving a success/collection terminal for an active (non-terminal) status — not when moving Done→Collected or to Failed
    if (
      (previousTask!.status === TaskStatus.DONE || previousTask!.status === TaskStatus.COLLECTED) &&
      !isTerminalStatus(task.status)
    ) {
      await uncompleteTask(task.id, previousTask);
    }

    // Failed → active: same rollback path as uncomplete
    if (previousTask!.status === TaskStatus.FAILED && !isTerminalStatus(task.status)) {
      await uncompleteTask(task.id, previousTask);
    }

  }

  if (task.status === TaskStatus.FAILED && (!previousTask || previousTask.status !== TaskStatus.FAILED)) {
    outputsTask = await normalizeTaskFailedState(task, previousTask);
    taskForCounterparty = outputsTask;
  }

  // Log DONE event - either when status changes to Done OR when creating a task that's already Done
  if (outputsTask.status === TaskStatus.DONE && outputsTask.doneAt) {
    // Use prior *status*, not doneAt: instances spawned from a completed template could carry a stray
    // template doneAt while still active, which incorrectly suppressed DONE logs and downstream effects.
    const wasAlreadyTerminalDoneLike =
      previousTask &&
      (previousTask.status === TaskStatus.DONE || previousTask.status === TaskStatus.COLLECTED);
    const shouldLogDone = !wasAlreadyTerminalDoneLike;
    if (shouldLogDone) {
      await appendEntityLog(EntityType.TASK, outputsTask.id, LogEventType.DONE, {
        name: getSafeTaskNameForLogging(outputsTask),
        taskType: outputsTask.type,
        station: outputsTask.station
      }, outputsTask.doneAt);

      // --- Shadow Workflow Coordinator ---
      const execution: WorkflowExecutionV1 = {
        workflowId: `task-done-${outputsTask.id}-${new Date(outputsTask.doneAt).getTime()}`,
        workflowType: 'task-completion',
        rootCommandId: `cmd-done-${outputsTask.id}`,
        state: WorkflowStatus.RUNNING,
        currentStep: 'init',
        completedSteps: [],
        attempts: 0,
        createdAt: getUTCNow(),
        updatedAt: getUTCNow()
      };
      
      // Completion effects are part of the Task command outcome. Await the
      // coordinator so Item creation and point staging cannot be abandoned
      // when the request finishes.
      await executeWorkflow(execution);
    }
  }

  const statusBecameCollected =
    outputsTask.status === TaskStatus.COLLECTED &&
    (!previousTask || previousTask.status !== TaskStatus.COLLECTED);
  const flagBecameCollected =
    false /* legacy removed */;

  if (outputsTask.status !== TaskStatus.FAILED && (statusBecameCollected || flagBecameCollected)) {
    let collectedAtRaw = outputsTask.collectedAt;
    if (collectedAtRaw) {
      const collectedAtCandidate = collectedAtRaw instanceof Date ? collectedAtRaw : new Date(collectedAtRaw);
      collectedAtRaw = Number.isFinite(collectedAtCandidate.getTime()) ? collectedAtCandidate : undefined;
    }
    if (!collectedAtRaw) {
      // Collection belongs to the task's completion month. This keeps direct
      // DONE -> COLLECTED transitions consistent with monthly close.
      collectedAtRaw = outputsTask.doneAt
        ? endOfMonthUTC(outputsTask.doneAt instanceof Date ? outputsTask.doneAt : new Date(outputsTask.doneAt as string))
        : getUTCNow();
      await upsertTask(
        { ...outputsTask,  collectedAt: collectedAtRaw, status: TaskStatus.COLLECTED },
        { skipWorkflowEffects: true }
      );
    }
    const collectedAt = collectedAtRaw;

    if (outputsTask.status !== TaskStatus.COLLECTED) {
      const repaired: Task = {
        ...outputsTask,
        status: TaskStatus.COLLECTED,
        
        collectedAt,
      };
      await upsertTask(repaired, { skipWorkflowEffects: true });
      taskForCounterparty = {
        ...taskForCounterparty,
        status: TaskStatus.COLLECTED,
        
        collectedAt,
      };
    }

    const pointsRewardedEffectKey = EffectKeys.sideEffect('task', outputsTask.id, 'pointsRewarded');

    if (!(await hasEffect(pointsRewardedEffectKey))) {
      await appendEntityLog(EntityType.TASK, outputsTask.id, LogEventType.COLLECTED, {
        name: getSafeTaskNameForLogging(outputsTask),
        taskType: outputsTask.type,
        station: outputsTask.station,
      }, collectedAt);

      if (outputsTask.context?.rewardIntent?.points) {
        const playerId = await resolveTaskOwnerPlayerId(outputsTask);
        if (!playerId) throw new Error(`Cannot vest Task points: owner has no Player (${outputsTask.id})`);
        await rewardPointsToPlayer(playerId, outputsTask.context?.rewardIntent?.points, outputsTask.id, EntityType.TASK, collectedAt);
      }

      await markEffect(pointsRewardedEffectKey);

      await cascadeCollectionToChildren(taskForCounterparty, collectedAt);
    }
  }

  // Tasks are not physical entities; skip MOVED logging even if site references change.

  // Character creation from emissary fields - when newCustomerName is provided
  const newCustomerName = task.context?.newCustomerName || task.newCustomerName;
  if (newCustomerName && !getTaskCounterpartyId(taskForCounterparty)) {
    const effectKey = EffectKeys.sideEffect('task', task.id, 'characterCreated');
    if (!(await hasEffect(effectKey))) {
      const normalizedCustomerCharacterRole =
        (taskForCounterparty as any).__counterparty?.role ??
        taskForCounterparty.context?.counterparty?.role ??
        taskForCounterparty.customerCharacterRole ??
        CharacterRole.CUSTOMER;
      const createdCharacter = await createCharacterFromTask(taskForCounterparty);
      if (createdCharacter) {
        // Update task with the created character ID
        const updatedTask = {
          ...taskForCounterparty,
          __counterparty: {
            id: createdCharacter.id,
            role: normalizedCustomerCharacterRole as CustomerCounterpartyRole,
          },
        };
        await upsertTask(updatedTask, { skipWorkflowEffects: true });
        taskForCounterparty = updatedTask;
        await markEffect(effectKey);
      }
    }
  }

  const resolvedCounterparty = await resolveCounterpartyForTask(taskForCounterparty);
  const resolvedTaskForPropagation = withResolvedTaskCounterparty(taskForCounterparty, resolvedCounterparty);

  let resolvedPreviousTaskForPropagation: Task | undefined;
  if (previousTask) {
    const resolvedPreviousCounterparty = await resolveCounterpartyForTask(previousTask);
    resolvedPreviousTaskForPropagation = withResolvedTaskCounterparty(previousTask, resolvedPreviousCounterparty);
    const previousCounterpartySummary = `${resolvedPreviousCounterparty.characterId || 'null'}/${resolvedPreviousCounterparty.characterRole || 'null'}/${resolvedPreviousCounterparty.source}`;
    console.log(`${counterpartyResolutionLogPrefix} previous -> ${previousCounterpartySummary}`);
  }

  console.log(
    `${counterpartyResolutionLogPrefix} current -> ${resolvedCounterparty.characterId || 'null'}/` +
      `${resolvedCounterparty.characterRole || 'null'}/${resolvedCounterparty.source}`
  );

  // Side effects: In-progress / Finishing pre-create items, while Done / Collected / Failed still handle financials + points.
  // (In-progress and Finishing remain active creation states for early item tracking.)
  const terminalForOutputs =
    outputsTask.status === TaskStatus.DONE ||
    outputsTask.status === TaskStatus.COLLECTED ||
    outputsTask.status === TaskStatus.FAILED;
  const terminalForItemCreation =
    terminalForOutputs ||
    outputsTask.status === TaskStatus.IN_PROGRESS ||
    outputsTask.status === TaskStatus.FINISHING;
  const terminalForPointsStaging =
    outputsTask.status === TaskStatus.DONE || outputsTask.status === TaskStatus.COLLECTED;

  // Synchrounous side-effects for points staging, item creation, and financials
  // have been fully removed in favor of the TaskCompletionProcessManager.

  // COMPREHENSIVE UPDATE PROPAGATION - when task properties change
  if (previousTask) {
    await normalizeTaskCreatedItemStatus(outputsTask, previousTask);

    if (hasFinancialPropsChanged(resolvedTaskForPropagation, resolvedPreviousTaskForPropagation || previousTask)) {
      await updateFinancialRecordsFromTask(resolvedTaskForPropagation, resolvedPreviousTaskForPropagation || previousTask);
    }

    if (hasOutputPropsChanged(outputsTask, previousTask)) {
      await updateItemsCreatedByTask(outputsTask, previousTask);
    }

    if (hasRewardsChanged(outputsTask, previousTask)) {
      await updatePlayerPointsFromSource(EntityType.TASK, outputsTask, previousTask);
    }

    if (outputsTask.type === TaskType.RECURRENT_TEMPLATE) {
      const statusChanged = previousTask.status !== outputsTask.status;

      if (statusChanged) {
        const skipCascade = (outputsTask as any)._skipCascade === true;

        if (skipCascade) {
        } else {
          const statusReverted =
            previousTask.status === TaskStatus.DONE &&
            outputsTask.status !== TaskStatus.DONE &&
            outputsTask.status !== TaskStatus.COLLECTED &&
            outputsTask.status !== TaskStatus.FAILED;

          if (statusReverted) {
            await uncascadeStatusFromInstances(outputsTask.id, outputsTask.status);
          } else {
            const undoneCount = await getUndoneInstancesCount(outputsTask.id, outputsTask.status);
            if (undoneCount > 0) {
              await cascadeStatusToInstances(outputsTask.id, outputsTask.status, previousTask.status);
            }
          }
        }
      }
    }
  }

  const counterpartyPresent = Boolean(resolvedTaskForPropagation.characterId && resolvedTaskForPropagation.customerCharacterRole);
  const counterpartyChanged =
    !resolvedPreviousTaskForPropagation ||
    resolvedPreviousTaskForPropagation.characterId !== resolvedTaskForPropagation.characterId ||
    resolvedPreviousTaskForPropagation.customerCharacterRole !== resolvedTaskForPropagation.customerCharacterRole;
  if (counterpartyPresent && counterpartyChanged) {
    await ensureCounterpartyRoleDatastore(
      resolvedTaskForPropagation.characterId,
      resolvedTaskForPropagation.customerCharacterRole
    );
  }

  // Lean identity fields changed — cascade patch ALL log entries across ALL months and events
  if (previousTask) {
    const leanFieldsChanged =
      previousTask.name !== outputsTask.name ||
      previousTask.type !== outputsTask.type ||
      previousTask.station !== outputsTask.station;

    if (leanFieldsChanged) {
      await updateEntityLeanFields(EntityType.TASK, outputsTask.id, {
        name: outputsTask.name,
        taskType: outputsTask.type || 'Unknown',
        station: outputsTask.station || 'Unknown',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Reactive Archive Indexing & Ghost Cleanup
  // Ensure the entity is correctly placed in the right month's sorted set.
  // We sweep all available months to completely eradicate Snapshot-era ghost duplicates.
  // ---------------------------------------------------------------------------
  const isNowArchived =
    outputsTask.status === TaskStatus.DONE ||
    outputsTask.status === TaskStatus.COLLECTED ||
    outputsTask.status === TaskStatus.FAILED;
  const wasArchived =
    previousTask &&
    (previousTask.status === TaskStatus.DONE ||
      previousTask.status === TaskStatus.COLLECTED ||
      previousTask.status === TaskStatus.FAILED);

  const newMonth = isNowArchived ? getTaskArchiveMonthKeyUTC(outputsTask) : null;
  const oldMonth = wasArchived && previousTask ? getTaskArchiveMonthKeyUTC(previousTask) : null;

  if (isNowArchived || wasArchived) {
    const { kvSAdd, kvSRem } = await import('@/lib/utils/kv');
    const { getAvailableArchiveMonths } = await import('@/data-store/datastore');

    const monthIndex = (m: string) => buildMonthIndexKey(EntityType.TASK, m);

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
    await deleteEffectClaim(EffectKeys.sideEffect('task', task.id, 'pointsStaged'));
    await deleteEffectClaim(EffectKeys.sideEffect('task', task.id, 'financialCreated'));
    await deleteEffectClaim(EffectKeys.sideEffect('task', task.id, 'itemCreated'));
    await clearEffectsByPrefix(EntityType.TASK, task.id, 'pointsLogged:');
    await clearEffectsByPrefix(EntityType.TASK, task.id, 'financialLogged:');

    // 6. Remove log entries across all months using the new helper
    await removeLogEntriesAcrossMonths(EntityType.TASK, entry => entry.entityId === task.id);

    await removeLogEntriesAcrossMonths(EntityType.PLAYER, entry =>
      entry.sourceId === task.id || entry.sourceTaskId === task.id
    );

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
    if (
      task.status === TaskStatus.DONE ||
      task.status === TaskStatus.FAILED  ||
      task.status === TaskStatus.COLLECTED
    ) {
      try {
        let snapshotDate = task.doneAt;
        if (!snapshotDate && task.collectedAt) snapshotDate = task.collectedAt;
        if (!snapshotDate && task.createdAt) snapshotDate = task.createdAt;

        if (snapshotDate) {
          const d =
            snapshotDate instanceof Date ? snapshotDate : parseDateToUTC(snapshotDate as string | number);
          const monthKey = formatArchiveMonthKeyUTC(d);
          if (monthKey) {
            await kvSRem(buildMonthIndexKey(EntityType.TASK, monthKey), task.id);
          }
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
    if (!task.context?.rewardIntent?.points) return;

    // Get the player from the task (same logic as creation)
    const playerId = await resolveTaskOwnerPlayerId(task);
    if (!playerId) return;
    const player = await getPlayerById(playerId);

    if (!player) return;

    // Check if any points were actually awarded
    const pointsToRemove = task.context?.rewardIntent?.points;
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
export async function uncompleteTask(taskId: string, previousTerminalTask?: Task): Promise<void> {
  try {
    // Get the task
    const task = await getTaskById(taskId);

    if (!task) return;

    const leftDoneOrCollected =
      previousTerminalTask &&
      (previousTerminalTask.status === TaskStatus.DONE ||
        previousTerminalTask.status === TaskStatus.COLLECTED);
    const leftFailed =
      previousTerminalTask && previousTerminalTask.status === TaskStatus.FAILED;

    // Persisted row may already have cleared doneAt when the user picked a pre-done status; use
    // previousTerminalTask from the workflow when we know we left a terminal state.
    if (!leftDoneOrCollected && !leftFailed) {
      if (!task.doneAt && !task.collectedAt) return;
    }

    const productionPlan = task.context?.productionPlan;
    const isNewItem = productionPlan?.isNewItem ?? task.isNewItem;
    if (!isNewItem && task.outputItemId) {
      const quantityToRemove = productionPlan?.outputQuantity ?? task.outputQuantity ?? 0;
      if (quantityToRemove > 0) {
        const existingItem = await getItemById(task.outputItemId);
        if (existingItem) {
          const preferredSiteId = resolveTaskOutputSite(task) || existingItem.stock?.[0]?.siteId || '';
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
    // 2.5 Tear down task-created financial records + FINANCIAL logs (mirrors delete cleanup)
    await removeFinancialRecordsCreatedByTask(taskId);
    await removeLogEntriesAcrossMonths(EntityType.FINANCIAL, (entry: { sourceTaskId?: string }) => entry.sourceTaskId === taskId);
    // 3. Clear effects registry entries
    await clearEffect(EffectKeys.sideEffect('task', taskId, 'itemCreated'));
    await clearEffect(EffectKeys.sideEffect('task', taskId, 'financialCreated'));
    await clearEffect(EffectKeys.sideEffect('task', taskId, 'pointsAwarded'));
    await clearEffect(EffectKeys.sideEffect('task', taskId, 'pointsRewarded')); // Clear the new effect key
    await clearEffect(EffectKeys.sideEffect('task', taskId, 'pointsStaged'));
    await clearEffect(EffectKeys.sideEffect('task', taskId, 'failedLogged'));
    // 3.5 Remove from archive index & clear snapshot effect
    try {
      const snapshotRaw =
        (previousTerminalTask &&
          (previousTerminalTask.collectedAt || previousTerminalTask.doneAt)) ||
        task.collectedAt ||
        task.doneAt ||
        task.createdAt ||
        getUTCNow();
      const snapshotDate =
        snapshotRaw instanceof Date ? snapshotRaw : parseDateToUTC(snapshotRaw as string | number);
      const monthKey = formatArchiveMonthKeyUTC(snapshotDate);

      if (monthKey) {
        await kvSRem(buildMonthIndexKey(EntityType.TASK, monthKey), task.id);
        await clearEffect(EffectKeys.sideEffect('task', taskId, `taskSnapshot:${monthKey}`));

        // Also check standard date-based key just in case (fallback)
        const nowKey = formatArchiveMonthKeyUTC(getUTCNow());
        if (nowKey && nowKey !== monthKey) {
          await kvSRem(buildMonthIndexKey(EntityType.TASK, nowKey), task.id);
        }
      }
    } catch (err) {
      console.error(`[uncompleteTask] Failed to remove from archive index:`, err);
    }

    // 4. Remove DONE and COLLECTED logs (Idempotency)
    // Instead of logging "UNCOMPLETED", we simply remove the entries that made it "complete"
    await removeLogEntriesAcrossMonths(EntityType.TASK, entry =>
      entry.entityId === taskId &&
      (entry.event === LogEventType.DONE ||
        entry.event === LogEventType.COLLECTED ||
        entry.event === LogEventType.FAILED)
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
    const { kvSAdd } = await import('@/lib/utils/kv');
    const { appendEntityLog } = await import('@/workflows/entities-logging');

    // Get all tasks to find children
    const allTasks = await getAllTasks();

    // Find all child instances of this parent
    const childInstances = allTasks.filter(task =>
      task.parentId === parentTask.id &&
      task.type === TaskType.RECURRENT_INSTANCE &&
      (!task.status !== TaskStatus.COLLECTED)
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
        if (childInstance.context?.rewardIntent?.points && await hasEffect(childStagingKey)) {
          const playerId = await resolveTaskOwnerPlayerId(childInstance);
          if (!playerId) throw new Error(`Cannot vest Task points: owner has no Player (${childInstance.id})`);
          await rewardPointsToPlayer(playerId, childInstance.context?.rewardIntent?.points, childInstance.id, EntityType.TASK, collectedAt);
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
  const isCollected = task.status === TaskStatus.COLLECTED ;
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


