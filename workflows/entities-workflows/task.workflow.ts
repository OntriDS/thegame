// workflows/entities-workflows/task.workflow.ts
// Task-specific workflow with state vs descriptive field detection

import { CharacterRole, EntityType, LogEventType, TaskStatus, TaskType, FOUNDER_CHARACTER_ID } from '@/types/enums';
import type { CustomerCounterpartyRole, Task } from '@/types/entities';
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
import { createFinancialRecordFromTask, removeFinancialRecordsCreatedByTask } from '../financial-record-utils';
import { createCharacterFromTask } from '../character-creation-utils';
import { ensureCounterpartyRoleDatastore } from '@/lib/utils/character-role-sync-server';
import { getCategoryForTaskType } from '@/lib/utils/searchable-select-utils';
import { kvSRem } from '@/lib/utils/kv';

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
import { resolveCounterpartyForTask, withResolvedTaskCounterparty } from '../task-counterparty-resolution';

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

/**
 * Map TaskStatus to LogEventType for status changes
 * Created and Done/Collected are handled separately in workflow
 */
const getStatusEvent = (taskStatus: TaskStatus): LogEventType => {
  const statusEventMap: Record<string, LogEventType> = {
    [TaskStatus.ON_HOLD]: LogEventType.ON_HOLD,
    [TaskStatus.IN_PROGRESS]: LogEventType.IN_PROGRESS,
    [TaskStatus.FINISHING]: LogEventType.FINISHING,
    [TaskStatus.FAILED]: LogEventType.FAILED,
  };

  return statusEventMap[taskStatus] || LogEventType.UPDATED;
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
    isCollected: false,
    collectedAt: undefined,
    doneAt,
  };

  if (previousTask) {
    const wasCollected =
      previousTask.status === TaskStatus.COLLECTED || previousTask.isCollected === true;
    const stagingKey = EffectKeys.sideEffect('task', task.id, 'pointsStaged');
    const pointsRewardedKey = EffectKeys.sideEffect('task', task.id, 'pointsRewarded');
    const playerRef = task.playerCharacterId || FOUNDER_CHARACTER_ID;

    if (wasCollected && task.rewards?.points) {
      if (await hasEffect(pointsRewardedKey)) {
        await unrewardPointsForPlayer(playerRef, task.rewards.points, task.id, EntityType.TASK);
        await clearEffect(pointsRewardedKey);
      } else if (await hasEffect(stagingKey)) {
        await withdrawStagedPointsFromPlayer(playerRef, task.rewards.points, task.id, EntityType.TASK);
        await clearEffect(stagingKey);
      }
      await removeLogEntriesAcrossMonths(
        EntityType.TASK,
        e => e.entityId === task.id && e.event === LogEventType.COLLECTED
      );
    } else if (previousTask.status === TaskStatus.DONE && task.rewards?.points && (await hasEffect(stagingKey))) {
      await withdrawStagedPointsFromPlayer(playerRef, task.rewards.points, task.id, EntityType.TASK);
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
    if (!skipForSpecialStatuses.includes(task.status)) {
      // Log status change with actual status as event type
      const statusEvent = getStatusEvent(task.status);

      await appendEntityLog(EntityType.TASK, task.id, statusEvent, {
        name: getSafeTaskNameForLogging(task),
        taskType: task.type,
        station: task.station,
        oldStatus: previousTask.status,
        newStatus: task.status,
        transition: `${previousTask.status} → ${task.status}`
      });
    }

    const isTerminalStatus = (s: TaskStatus) =>
      s === TaskStatus.DONE || s === TaskStatus.COLLECTED || s === TaskStatus.FAILED;

    // Uncomplete when leaving a success/collection terminal for an active (non-terminal) status — not when moving Done→Collected or to Failed
    if (
      (previousTask!.status === TaskStatus.DONE || previousTask!.status === TaskStatus.COLLECTED) &&
      !isTerminalStatus(task.status)
    ) {
      await uncompleteTask(task.id);
    }

    // Failed → active: same rollback path as uncomplete
    if (previousTask!.status === TaskStatus.FAILED && !isTerminalStatus(task.status)) {
      await uncompleteTask(task.id);
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
    }
  }

  const statusBecameCollected =
    outputsTask.status === TaskStatus.COLLECTED &&
    (!previousTask || previousTask.status !== TaskStatus.COLLECTED);
  const flagBecameCollected =
    !!outputsTask.isCollected && (!previousTask || !previousTask.isCollected);

  if (outputsTask.status !== TaskStatus.FAILED && (statusBecameCollected || flagBecameCollected)) {
    let collectedAtRaw = outputsTask.collectedAt;
    if (collectedAtRaw) {
      const collectedAtCandidate = collectedAtRaw instanceof Date ? collectedAtRaw : new Date(collectedAtRaw);
      collectedAtRaw = Number.isFinite(collectedAtCandidate.getTime()) ? collectedAtCandidate : undefined;
    }
    if (!collectedAtRaw) {
      collectedAtRaw = getUTCNow();
      await upsertTask(
        { ...outputsTask, isCollected: true, collectedAt: collectedAtRaw, status: TaskStatus.COLLECTED },
        { skipWorkflowEffects: true }
      );
    }
    const collectedAt = collectedAtRaw;

    if (outputsTask.status !== TaskStatus.COLLECTED) {
      const repaired: Task = {
        ...outputsTask,
        status: TaskStatus.COLLECTED,
        isCollected: true,
        collectedAt,
      };
      await upsertTask(repaired, { skipWorkflowEffects: true });
      taskForCounterparty = {
        ...taskForCounterparty,
        status: TaskStatus.COLLECTED,
        isCollected: true,
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

      const stagingEffectKey = EffectKeys.sideEffect('task', outputsTask.id, 'pointsStaged');

      if (outputsTask.rewards?.points && (await hasEffect(stagingEffectKey))) {
        const playerId = outputsTask.playerCharacterId || FOUNDER_CHARACTER_ID;
        await rewardPointsToPlayer(playerId, outputsTask.rewards.points, outputsTask.id, EntityType.TASK, collectedAt);
      }

      await markEffect(pointsRewardedEffectKey);

      await cascadeCollectionToChildren(taskForCounterparty, collectedAt);
    }
  }

  // Tasks are not physical entities; skip MOVED logging even if site references change.

  // Character creation from emissary fields - when newCustomerName is provided
  if (task.newCustomerName && !taskForCounterparty.customerCharacterId) {
    const effectKey = EffectKeys.sideEffect('task', task.id, 'characterCreated');
    if (!(await hasEffect(effectKey))) {
      const normalizedCustomerCharacterRole =
        taskForCounterparty.customerCharacterRole ??
        CharacterRole.CUSTOMER;
      const createdCharacter = await createCharacterFromTask(taskForCounterparty);
      if (createdCharacter) {
        // Update task with the created character ID
        const updatedTask = {
          ...taskForCounterparty,
          customerCharacterId: createdCharacter.id,
          customerCharacterRole: normalizedCustomerCharacterRole as CustomerCounterpartyRole
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

  // Side effects: Done, Collected, or Failed get items + financials; only Done/Collected stage points (not Failed)
  const terminalForOutputs =
    outputsTask.status === TaskStatus.DONE ||
    outputsTask.status === TaskStatus.COLLECTED ||
    outputsTask.status === TaskStatus.FAILED;
  const terminalForPointsStaging =
    outputsTask.status === TaskStatus.DONE || outputsTask.status === TaskStatus.COLLECTED;

  if (terminalForOutputs) {
    const sideEffects: Promise<void>[] = [];

    if (outputsTask.outputItemType && outputsTask.outputQuantity) {
      sideEffects.push(
        (async () => {
          const effectKey = EffectKeys.sideEffect('task', outputsTask.id, 'itemCreated');
          if (!(await hasEffect(effectKey))) {
            const createdItem = await createItemFromTask(outputsTask);
            if (createdItem) {
              await markEffect(effectKey);
            }
          }
        })()
      );
    }

    if (terminalForPointsStaging && outputsTask.rewards?.points) {
      sideEffects.push(
        (async () => {
          const stagingKey = EffectKeys.sideEffect('task', outputsTask.id, 'pointsStaged');
          const legacyKey = EffectKeys.sideEffect('task', outputsTask.id, 'pointsAwarded');

          if (!(await hasEffect(stagingKey)) && !(await hasEffect(legacyKey))) {
            const playerId = outputsTask.playerCharacterId || FOUNDER_CHARACTER_ID;
            await stagePointsForPlayer(playerId, outputsTask.rewards.points, outputsTask.id, EntityType.TASK);
            await markEffect(stagingKey);
          }
        })()
      );
    }

    if (outputsTask.cost || outputsTask.revenue || outputsTask.rewards?.points) {
      sideEffects.push(
        (async () => {
          const effectKey = EffectKeys.sideEffect('task', outputsTask.id, 'financialCreated');
          if (!(await hasEffect(effectKey))) {
            const createdFinancial = await createFinancialRecordFromTask(resolvedTaskForPropagation);
            if (createdFinancial) {
              console.log(
                `[onTaskUpsert] financialCreated resolvedCounterparty=${resolvedTaskForPropagation.customerCharacterId || 'null'}/` +
                  `${resolvedTaskForPropagation.customerCharacterRole || 'null'}/${resolvedCounterparty.source}`
              );
              await markEffect(effectKey);
              console.log(`[onTaskUpsert] ✅ Created/updated financial record ${createdFinancial.id} for task ${outputsTask.id}`);
            } else {
              console.log(`[onTaskUpsert] ⏭️ financialCreated skipped - createFinancialRecordFromTask returned null for task ${outputsTask.id}`);
            }
          } else {
            console.log(`[onTaskUpsert] ⏭️ financialCreated skipped - effect guard already set for task ${outputsTask.id}`);
          }
        })()
      );
    }

    await Promise.all(sideEffects);
  }

  // COMPREHENSIVE UPDATE PROPAGATION - when task properties change
  if (previousTask) {
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

  const counterpartyPresent = Boolean(resolvedTaskForPropagation.customerCharacterId && resolvedTaskForPropagation.customerCharacterRole);
  const counterpartyChanged =
    !resolvedPreviousTaskForPropagation ||
    resolvedPreviousTaskForPropagation.customerCharacterId !== resolvedTaskForPropagation.customerCharacterId ||
    resolvedPreviousTaskForPropagation.customerCharacterRole !== resolvedTaskForPropagation.customerCharacterRole;
  if (counterpartyPresent && counterpartyChanged) {
    await ensureCounterpartyRoleDatastore(
      resolvedTaskForPropagation.customerCharacterId,
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

  const getTaskArchiveMonth = (t: Task) => {
    let raw: Date | string | undefined;
    if (t.status === TaskStatus.COLLECTED) {
      raw = t.collectedAt || t.doneAt || t.createdAt;
    } else {
      raw = t.doneAt || t.createdAt;
    }
    if (raw == null) return null;
    const date = raw instanceof Date ? raw : parseDateToUTC(raw as string | number);
    return formatMonthKey(endOfMonthUTC(date));
  };

  const newMonth = isNowArchived ? getTaskArchiveMonth(outputsTask) : null;
  const oldMonth = wasArchived && previousTask ? getTaskArchiveMonth(previousTask) : null;

  if (isNowArchived || wasArchived) {
    const { kvSAdd, kvSRem } = await import('@/lib/utils/kv');
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
    if (
      task.status === TaskStatus.DONE ||
      task.status === TaskStatus.FAILED ||
      task.isCollected ||
      task.status === TaskStatus.COLLECTED
    ) {
      try {
        let snapshotDate = task.doneAt;
        if (!snapshotDate && task.collectedAt) snapshotDate = task.collectedAt;
        if (!snapshotDate && task.createdAt) snapshotDate = task.createdAt;

        if (snapshotDate) {
          const d =
            snapshotDate instanceof Date ? snapshotDate : parseDateToUTC(snapshotDate as string | number);
          const snapshotMonth = endOfMonthUTC(d);
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
    await clearEffect(EffectKeys.sideEffect('task', taskId, 'pointsStaged'));
    await clearEffect(EffectKeys.sideEffect('task', taskId, 'failedLogged'));
    // 3.5 Remove from archive index & clear snapshot effect
    try {
      const snapshotRaw = task.doneAt || task.collectedAt || task.createdAt || getUTCNow();
      const snapshotDate =
        snapshotRaw instanceof Date ? snapshotRaw : parseDateToUTC(snapshotRaw as string | number);
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
    const { formatMonthKey } = await import('@/lib/utils/date-display-utils');
    const { kvSAdd } = await import('@/lib/utils/kv');
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

