// lib/utils/recurrent-task-utils.ts
// Recurrent task management utilities

import { Task } from '@/types/entities';
import { TaskType, RecurrentFrequency, TaskStatus, TaskPriority, EntityType, LogEventType, FOUNDER_CHARACTER_ID } from '@/types/enums';
import { getAllTasks, upsertTask, getTasksByParentId, getTaskById } from '@/data-store/datastore';
import { hasEffect, markEffect } from '@/data-store/effects-registry';
import { appendEntityLog } from '@/workflows/entities-logging';
import { FrequencyConfig } from '@/components/ui/frequency-calendar';
import { v4 as uuid } from 'uuid';
import { formatDayMonth, formatDayMonthYear } from '@/lib/utils/date-utils';
import { ORDER_INCREMENT } from '@/lib/constants/app-constants';
import { isTaskHistoryTerminal } from '@/lib/utils/task-active-utils';
import { 
  toRecurrentUTC,
  fromRecurrentUTC,
  getNextWeekdayFromDate,
  addDaysUTC,
  addWeeksUTC,
  addMonthsUTC,
  getUTCCivilDayStartMs,
  utcCalendarDayKey,
} from './recurrent-date-utils';
import { validateSpawnOperation, getSafetyLimitDate, SpawnErrorCode } from './recurrent-validation';
import { toUTC } from './utc-utils';

const getTaskStatusLifecycleEvent = (status: string): LogEventType | null => {
  const normalizeStatusKey = (value: string): string =>
    value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');

  const statusEventMap: Partial<Record<string, LogEventType>> = {
    created: LogEventType.CREATED,
    on_hold: LogEventType.ON_HOLD,
    in_progress: LogEventType.IN_PROGRESS,
    finishing: LogEventType.FINISHING,
    done: LogEventType.DONE,
    collected: LogEventType.COLLECTED,
    failed: LogEventType.FAILED,
  };

  return statusEventMap[normalizeStatusKey(status)] || null;
};

// ============================================================================
// SECTION: JIT MODEL - Just-In-Time Instance Spawning
// ============================================================================

/**
 * Spawns the next single recurrent instance from a template.
 * Implements the JIT model: creates exactly one instance when manually triggered.
 *
 * @param template - The Recurrent Template to spawn from
 * @param forceDate - Optional specific date to force (for testing)
 * @returns The spawned instance, or null if no valid next occurrence
 */
export async function spawnNextRecurrentInstance(
  template: Task,
  forceDate?: Date
): Promise<Task | null> {
  // 1. Validate template using unified validation
  const validation = await validateSpawnOperation(template);
  if (!validation.isValid) {
    console.warn('[spawnNextRecurrentInstance] Validation failed:', validation.errorCode, validation.errorMessage);
    return null;
  }

  // 2. Get reference date
  // Priority: 1. lastSpawnedDate, 2. recurrenceStart, 3. fallback to dueDate or now
  const referenceDate = template.lastSpawnedDate 
    ? fromRecurrentUTC(template.lastSpawnedDate) 
    : (template.recurrenceStart 
        ? fromRecurrentUTC(template.recurrenceStart) 
        : fromRecurrentUTC(template.dueDate || new Date()));

  // 3. Calculate next occurrence based on frequency type
  const config = template.frequencyConfig!;
  let nextDate: Date;

  if (forceDate) {
    nextDate = toRecurrentUTC(forceDate);
  } else {
    switch (config.type) {
      case RecurrentFrequency.DAILY:
        nextDate = addDaysUTC(referenceDate, config.interval);
        break;

      case RecurrentFrequency.WEEKLY: {
        const effectiveDaysOfWeek =
          config.daysOfWeek && config.daysOfWeek.length > 0
            ? config.daysOfWeek
            : (config.customDays?.[0]
                ? [toUTC(config.customDays[0]).getUTCDay()]
                : []);

        if (effectiveDaysOfWeek.length > 0) {
          // Find next matching weekday
          // If we haven't spawned yet, we might want the VERY FIRST matching weekday 
          // including the start day if it matches.
          if (!template.lastSpawnedDate) {
            const startDay = referenceDate.getUTCDay();
            if (effectiveDaysOfWeek.includes(startDay)) {
              nextDate = new Date(referenceDate);
            } else {
              nextDate = getNextWeekdayFromDate(referenceDate, effectiveDaysOfWeek[0]);
            }
          } else {
            nextDate = getNextWeekdayFromDate(referenceDate, effectiveDaysOfWeek[0]);
          }
        } else {
          nextDate = addWeeksUTC(referenceDate, config.interval);
        }
        break;
      }

      case RecurrentFrequency.MONTHLY:
        nextDate = addMonthsUTC(referenceDate, config.interval);
        if (config.dayOfMonth) {
          // addMonthsUTC already clamps, but if they specified a DIFFERENT dayOfMonth 
          // than the start date, we should respect it.
          nextDate.setUTCDate(config.dayOfMonth);
          // Re-clamp if dayOfMonth was 31 and we hit Feb
          const { clampToValidUTC } = await import('./utc-utils');
          nextDate = clampToValidUTC(nextDate);
        }
        break;

      case RecurrentFrequency.CUSTOM: {
        const referenceSource =
          template.lastSpawnedDate ??
          template.recurrenceStart ??
          template.dueDate ??
          new Date();
        const refDayMs = getUTCCivilDayStartMs(
          referenceSource instanceof Date ? referenceSource : new Date(referenceSource)
        );
        const hasLastSpawn = Boolean(template.lastSpawnedDate);

        const customDates = (config.customDays || [])
          .map((d: any) => (d instanceof Date ? d : new Date(d)))
          .filter((d: Date) => !isNaN(d.getTime()))
          .sort((a: Date, b: Date) => getUTCCivilDayStartMs(a) - getUTCCivilDayStartMs(b));

        const candidate = customDates.find((d: Date) => {
          const dayMs = getUTCCivilDayStartMs(d);
          return hasLastSpawn ? dayMs > refDayMs : dayMs >= refDayMs;
        });
        if (candidate) {
          nextDate = toRecurrentUTC(candidate);
        } else {
          return null;
        }
        break;
      }

      case RecurrentFrequency.ALWAYS:
        nextDate = addDaysUTC(referenceDate, config.interval);
        break;

      case RecurrentFrequency.ONCE:
        // Use the reference date (template's dueDate or fallback) for exactly one instance
        nextDate = new Date(referenceDate);
        break;

      default:
        return null;
    }
  }

  // 4. Final safety limit check (double validation; inclusive end day)
  const safetyLimit = getSafetyLimitDate(template);
  if (
    safetyLimit &&
    getUTCCivilDayStartMs(nextDate) > getUTCCivilDayStartMs(safetyLimit)
  ) {
    console.warn('[spawnNextRecurrentInstance] Next occurrence exceeds safety limit');
    return null;
  }

  // 5. Idempotency check (prevent duplicate dates) — UTC calendar day only, not machine TZ
  const nextDateLocal = fromRecurrentUTC(nextDate);
  const nextDateKey = utcCalendarDayKey(nextDate);

  const existingInstances = await getTasksByParentId(template.id);
  const isDuplicate = existingInstances.some(t => {
    if (t.type !== TaskType.RECURRENT_INSTANCE || !t.dueDate) return false;
    return utcCalendarDayKey(t.dueDate) === nextDateKey;
  });

  if (isDuplicate) {
    console.warn('[spawnNextRecurrentInstance] Instance already exists for date:', nextDateKey);
    return null;
  }

  // 6. Derive scheduled times aligned to nextDate
  const templateStart = template.scheduledStart ? new Date(template.scheduledStart) : null;
  const templateEnd = template.scheduledEnd ? new Date(template.scheduledEnd) : null;
  let scheduledStart: Date | undefined;
  let scheduledEnd: Date | undefined;

  if (templateStart) {
    scheduledStart = new Date(nextDateLocal);
    scheduledStart.setHours(templateStart.getHours(), templateStart.getMinutes(), templateStart.getSeconds(), 0);
    const durationMs = templateEnd && templateStart ? templateEnd.getTime() - templateStart.getTime() : 0;
    if (durationMs > 0) {
      scheduledEnd = new Date(scheduledStart.getTime() + durationMs);
    }
  } else if (templateEnd) {
    scheduledEnd = new Date(nextDateLocal);
    scheduledEnd.setHours(templateEnd.getHours(), templateEnd.getMinutes(), templateEnd.getSeconds(), 0);
  }

  // 7. Spawn the instance
  const formattedDate = formatDayMonthYear(nextDateLocal);
  const instance: Task = {
    ...template,
    id: uuid(),
    name: `${template.name} \u2022 ${formattedDate}`,
    type: TaskType.RECURRENT_INSTANCE,
    dueDate: nextDateLocal,
    scheduledStart,
    scheduledEnd,
    parentId: template.id,
    isRecurrentGroup: false,
    isTemplate: false,
    frequencyConfig: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    order: nextDateLocal.getTime(),
    links: [],
    // Never inherit terminal / completion DNA from the template (breaks DONE logs, finrecs, archive).
    status: TaskStatus.CREATED,
    progress: 0,
    doneAt: undefined,
    collectedAt: undefined,
    isCollected: false,
    ownerId: template.ownerId || FOUNDER_CHARACTER_ID,
  };

  return instance;
}

/**
 * Updates a template's lastSpawnedDate field.
 */
export async function updateTemplateLastSpawnedDate(
  templateId: string,
  spawnDate: Date
): Promise<void> {
  const template = await getTaskById(templateId);
  if (!template) return;

  await upsertTask({
    ...template,
    lastSpawnedDate: toRecurrentUTC(spawnDate),
    updatedAt: new Date()
  }, { skipWorkflowEffects: true });
}

/**
 * Resets a template's spawn state.
 */
export async function resetTemplateSpawnState(templateId: string): Promise<void> {
  const template = await getTaskById(templateId);
  if (!template) return;

  await upsertTask({
    ...template,
    lastSpawnedDate: undefined,
    updatedAt: new Date()
  }, { skipWorkflowEffects: true });
}

/**
 * Checks if a template is eligible for spawning.
 */
export async function canSpawnMoreInstances(template: Task): Promise<boolean> {
  const result = await validateSpawnOperation(template);
  return result.isValid;
}

// ============================================================================
// Legacy bulk recurrence helpers (kept for potential future use)
// NOTE: These are not used by the current JIT spawn path and should not be
// called from new code without a clear migration strategy.
// ============================================================================

export interface RecurrentTaskConfig {
  type: RecurrentFrequency;
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  customDays?: Date[];
  stopsAfter?: {
    type: 'times' | 'date';
    value: number | Date;
  };
  repeatMode: 'after_done' | 'periodically';
}

/**
 * Creates a Recurrent Group (folder/container)
 */
export function createRecurrentGroup(
  name: string,
  description: string,
  station: string,
  parentId?: string | null
): Task {
  return {
    id: uuid(),
    name,
    description,
    type: TaskType.RECURRENT_GROUP,
    status: TaskStatus.CREATED,
    priority: TaskPriority.NORMAL,
    station: station as any,
    progress: 0,
    order: 0,
    parentId: parentId || null,
    isRecurrentGroup: true,
    isTemplate: false,
    cost: 0,
    revenue: 0,
    rewards: { points: { xp: 0, rp: 0, fp: 0, hp: 0 } },
    createdAt: new Date(),
    updatedAt: new Date(),
    isCollected: false,
    links: [], // initialize links array
    ownerId: FOUNDER_CHARACTER_ID,
  };
}

/**
 * Creates a Recurrent Template (sets frequency pattern)
 */
export function createRecurrentTemplate(
  name: string,
  description: string,
  station: string,
  parentId: string | null,
  frequencyConfig: FrequencyConfig
): Task {
  return {
    id: uuid(),
    name,
    description,
    type: TaskType.RECURRENT_TEMPLATE,
    status: TaskStatus.CREATED,
    priority: TaskPriority.NORMAL,
    station: station as any,
    progress: 0,
    order: 0,
    parentId,
    isRecurrentGroup: false,
    isTemplate: true,
    frequencyConfig,
    cost: 0,
    revenue: 0,
    rewards: { points: { xp: 0, rp: 0, fp: 0, hp: 0 } },
    createdAt: new Date(),
    updatedAt: new Date(),
    isCollected: false,
    links: [], // initialize links array
    ownerId: FOUNDER_CHARACTER_ID,
  };
}

/**
 * Spawns a Recurrent Instance from a template
 */
export function spawnRecurrentInstance(
  template: Task,
  dueDate: Date
): Task {
  const formattedDate = formatDayMonthYear(dueDate);
  const separator = ' \u2022 ';
  const instanceOrder = dueDate.getTime();
  return {
    ...template,
    id: uuid(),
    name: `${template.name}${separator}${formattedDate}`,
    type: TaskType.RECURRENT_INSTANCE,
    dueDate,
    parentId: template.id, // Instance points to its template
    isRecurrentGroup: false,
    isTemplate: false,
    frequencyConfig: undefined, // Instances don't have frequency config
    createdAt: new Date(),
    updatedAt: new Date(),
    order: instanceOrder,
    links: [], // new instance gets fresh links[]
    status: TaskStatus.CREATED,
    progress: 0,
    doneAt: undefined,
    collectedAt: undefined,
    isCollected: false,
    ownerId: template.ownerId || FOUNDER_CHARACTER_ID,
  };
}



/**
 * Gets all tasks in a recurrent hierarchy
 */
export async function getRecurrentHierarchy(parentId: string): Promise<{
  parent: Task | null;
  templates: Task[];
  instances: Task[];
}> {
  const [parent, children] = await Promise.all([
    getTaskById(parentId),
    getTasksByParentId(parentId)
  ]);

  const templates = children.filter(t => t.isTemplate);
  const instances = children.filter(t => t.type === TaskType.RECURRENT_INSTANCE);

  return { parent, templates, instances };
}

/**
 * Archives completed instances (for monthly close)
 */
export async function archiveCompletedInstances(parentId: string): Promise<Task[]> {
  const children = await getTasksByParentId(parentId);
  const instances = children.filter((t: Task) =>
    t.type === TaskType.RECURRENT_INSTANCE &&
    (t.status === TaskStatus.DONE || t.status === TaskStatus.COLLECTED)
  );

  // Update instances to collected status (Archived)
  const updatedInstances = instances.map(instance => ({
    ...instance,
    status: TaskStatus.COLLECTED as any,
    isCollected: true,
    updatedAt: new Date()
  } as Task));

  await Promise.all(
    updatedInstances.map(updated => upsertTask(updated, { skipWorkflowEffects: true }))
  );

  return updatedInstances;
}


/** All tasks whose parent chain starts under `rootParentId` (direct and nested children). */
export async function getDescendantTasks(rootParentId: string): Promise<Task[]> {
  const out: Task[] = [];
  const walk = async (parentId: string) => {
    const children = await getTasksByParentId(parentId);
    for (const c of children) {
      out.push(c);
      await walk(c.id);
    }
  };
  await walk(rootParentId);
  return out;
}

/** Delete children before parents when removing an active subtree (only tasks in `active`). */
export function orderTasksForDeletion(active: Task[]): Task[] {
  const remaining = new Set(active.map((t) => t.id));
  const byId = new Map(active.map((t) => [t.id, t] as const));
  const order: Task[] = [];
  while (remaining.size > 0) {
    let picked: string | null = null;
    for (const id of remaining) {
      const hasChildStillInSet = [...remaining].some(
        (cid) => cid !== id && byId.get(cid)?.parentId === id
      );
      if (!hasChildStillInSet) {
        picked = id;
        break;
      }
    }
    if (!picked) {
      console.warn('[orderTasksForDeletion] Could not find leaf; breaking potential cycle');
      picked = [...remaining][0];
    }
    remaining.delete(picked);
    order.push(byId.get(picked)!);
  }
  return order;
}

/**
 * Before removing **any** parent task from storage (mission node, recurrent group, template, etc.):
 * - Done / Collected / isCollected descendants are never deleted; `parentId` is cleared (orphans for reparenting).
 * - If `cascadeDeleteActiveChildren` is false, all other descendants are orphaned the same way.
 * - If true, active descendants are removed via `removeTask` (deepest first); history-terminal rows are only orphaned.
 */
export async function prepareTaskSubtreeBeforeParentRemoval(
  root: Task,
  opts: { cascadeDeleteActiveChildren: boolean }
): Promise<void> {
  const descendants = await getDescendantTasks(root.id);
  if (descendants.length === 0) return;
  const terminal = descendants.filter(isTaskHistoryTerminal);
  const active = descendants.filter((t) => !isTaskHistoryTerminal(t));

  for (const t of terminal) {
    const fresh = await getTaskById(t.id);
    if (!fresh || fresh.parentId == null) continue;
    await upsertTask({ ...fresh, parentId: null }, { skipWorkflowEffects: true });
  }

  if (!opts.cascadeDeleteActiveChildren) {
    for (const t of active) {
      const fresh = await getTaskById(t.id);
      if (!fresh || fresh.parentId == null) continue;
      await upsertTask({ ...fresh, parentId: null }, { skipWorkflowEffects: true });
    }
    return;
  }

  const { removeTask } = await import('@/data-store/datastore');
  const ordered = orderTasksForDeletion(active);
  for (const t of ordered) {
    const still = await getTaskById(t.id);
    if (!still) continue;
    await removeTask(still.id, { cascadeDeleteActiveChildren: true });
  }
}

// ============================================================================
// SOFT DELETE PROTOCOL - Status-based deletion with origin tracking
// ============================================================================

/**
 * Cascades status change from template to its instances
 */
export async function cascadeStatusToInstances(
  templateId: string,
  newStatus: string,
  oldStatus: string
): Promise<{ updated: Task[], count: number }> {
  // Check effects registry to prevent duplicate cascade operations
  const effectKey = `task:${templateId}:cascadeStatus:${newStatus}`;
  if (await hasEffect(effectKey)) {
    console.log(`[cascadeStatusToInstances] Cascade already applied for template ${templateId} to ${newStatus}`);
    return { updated: [], count: 0 };
  }

  const children = await getTasksByParentId(templateId);
  const instances = children.filter((t: Task) =>
    t.type === TaskType.RECURRENT_INSTANCE &&
    t.status !== newStatus // Only update instances that don't already have the target status
  );

  const updatedInstances = instances.map(instance => ({
    ...instance,
    status: newStatus as any,
    updatedAt: new Date()
  } as Task));

  await Promise.all(
    updatedInstances.map(async (updated) => {
      await upsertTask(updated, { skipWorkflowEffects: true });

      // Log status change for each instance with cascade context
      const oldStatus = instances.find(i => i.id === updated.id)?.status;
      const cascadeStatusEvent = getTaskStatusLifecycleEvent(newStatus);
      if (cascadeStatusEvent) {
        await appendEntityLog(EntityType.TASK, updated.id, cascadeStatusEvent, {
          oldStatus,
          newStatus: newStatus,
          name: updated.name,
          cascadedFrom: templateId,
          transition: `${oldStatus} → ${newStatus}`,
          changedAt: new Date().toISOString()
        });
      }
    })
  );

  // Mark effect to prevent duplicate operations
  await markEffect(effectKey);
  console.log(`[cascadeStatusToInstances] ✅ Cascaded ${updatedInstances.length} instances to ${newStatus}`);

  return { updated: updatedInstances, count: updatedInstances.length };
}

/**
 * Gets count of instances that are not at the target status
 */
export async function getUndoneInstancesCount(templateId: string, targetStatus: string): Promise<number> {
  const children = await getTasksByParentId(templateId);
  return children.filter(t =>
    t.type === TaskType.RECURRENT_INSTANCE &&
    t.status !== targetStatus
  ).length;
}

/**
 * Reverses cascade status change from template to its instances (uncascade)
 */
export async function uncascadeStatusFromInstances(
  templateId: string,
  revertToStatus: string
): Promise<{ reverted: Task[], count: number }> {
  // Check effects registry to prevent duplicate uncascade operations
  const effectKey = `task:${templateId}:uncascadeStatus:${revertToStatus}`;
  if (await hasEffect(effectKey)) {
    console.log(`[uncascadeStatusFromInstances] Uncascade already applied for template ${templateId} to ${revertToStatus}`);
    return { reverted: [], count: 0 };
  }

  const children = await getTasksByParentId(templateId);
  const instances = children.filter(t =>
    t.type === TaskType.RECURRENT_INSTANCE &&
    t.status !== revertToStatus // Only revert instances that don't already have the target status
  );

  const revertedInstances = instances.map(instance => ({
    ...instance,
    status: revertToStatus as any,
    updatedAt: new Date()
  } as Task));

  await Promise.all(
    revertedInstances.map(async (updated) => {
      await upsertTask(updated, { skipWorkflowEffects: true });

      // Log status reversal for each instance with uncascade context
      const oldStatus = instances.find(i => i.id === updated.id)?.status;
      const uncascadeStatusEvent = getTaskStatusLifecycleEvent(revertToStatus);
      if (uncascadeStatusEvent) {
        await appendEntityLog(EntityType.TASK, updated.id, uncascadeStatusEvent, {
          oldStatus,
          newStatus: revertToStatus,
          name: updated.name,
          uncascadedFrom: templateId,
          transition: `${oldStatus} → ${revertToStatus}`,
          changedAt: new Date().toISOString()
        });
      }
    })
  );

  // Mark effect to prevent duplicate operations
  await markEffect(effectKey);
  console.log(`[uncascadeStatusFromInstances] ✅ Reverted ${revertedInstances.length} instances to ${revertToStatus}`);

  return { reverted: revertedInstances, count: revertedInstances.length };
}
