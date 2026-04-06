// lib/utils/recurrent-task-utils.ts
// Recurrent task management utilities

import { Task } from '@/types/entities';
import { TaskType, RecurrentFrequency, TaskStatus, EntityType, LogEventType } from '@/types/enums';
import { getAllTasks, upsertTask, getTasksByParentId, getTaskById } from '@/data-store/datastore';
import { hasEffect, markEffect } from '@/data-store/effects-registry';
import { appendEntityLog } from '@/workflows/entities-logging';
import { FrequencyConfig } from '@/components/ui/frequency-calendar';
import { v4 as uuid } from 'uuid';
import { formatDayMonth } from '@/lib/utils/date-utils';
import { ORDER_INCREMENT } from '@/lib/constants/app-constants';
import { isTaskHistoryTerminal } from '@/lib/utils/task-active-utils';
import {
  toRecurrentUTC,
  fromRecurrentUTC,
  isSameRecurrentDate,
  isNextOccurrence,
  getNextWeekdayFromDate,
  isWithinSafetyLimit,
  addDaysUTC,
  addWeeksUTC,
  addMonthsUTC,
  validateFrequencyConfig
} from './recurrent-date-utils';
import { addDays, addWeeks, addMonths } from 'date-fns';

// ============================================================================
// SECTION: JIT MODEL - Just-In-Time Instance Spawning
// ============================================================================

/**
 * Spawns the next single recurrent instance from a template.
 * Implements the JIT model: creates exactly one instance when manually triggered.
 * Reads template's recurrence rules and lastSpawnedDate to calculate next occurrence.
 *
 * @param template - The Recurrent Template to spawn from
 * @param forceDate - Optional specific date to force (for testing)
 * @returns The spawned instance, or null if no valid next occurrence
 */
export async function spawnNextRecurrentInstance(
  template: Task,
  forceDate?: Date
): Promise<Task | null> {
  // 1. Validate template has frequencyConfig
  if (template.type !== TaskType.RECURRENT_TEMPLATE || !template.frequencyConfig) {
    console.warn('[spawnNextRecurrentInstance] Invalid template:', template.id);
    return null;
  }

  // 2. Validate frequency configuration
  const validation = validateFrequencyConfig(template.frequencyConfig);
  if (!validation.isValid) {
    console.warn('[spawnNextRecurrentInstance] Invalid frequency config:', validation.error);
    return null;
  }

  // 3. Get reference date (lastSpawnedDate or fallback to template.dueDate)
  const referenceDate = template.lastSpawnedDate ? fromRecurrentUTC(template.lastSpawnedDate) : fromRecurrentUTC(template.dueDate || new Date());

  // 4. Calculate next occurrence based on frequency type
  const config = template.frequencyConfig;
  let nextDate: Date;

  switch (config.type) {
    case RecurrentFrequency.ONCE:
      console.warn('[spawnNextRecurrentInstance] Cannot spawn from ONCE template');
      return null;

    case RecurrentFrequency.DAILY:
      nextDate = addDaysUTC(referenceDate, config.interval);
      break;

    case RecurrentFrequency.WEEKLY:
      nextDate = addWeeksUTC(referenceDate, config.interval);
      if (config.daysOfWeek && config.daysOfWeek.length > 0) {
        // Find next matching weekday
        nextDate = getNextWeekdayFromDate(referenceDate, config.daysOfWeek[0]);
      }
      break;

    case RecurrentFrequency.MONTHLY:
      nextDate = addMonthsUTC(referenceDate, config.interval);
      if (config.dayOfMonth) {
        // Set to specific day of month
        const targetDay = config.dayOfMonth;
        const daysInMonth = new Date(nextDate).getUTCDate(); // Get days in resulting month
        const clampedDay = Math.min(targetDay, daysInMonth); // Clamp to month end
        nextDate.setUTCDate(clampedDay);
      }
      break;

    case RecurrentFrequency.CUSTOM:
      if (config.customDays && config.customDays.length > 0) {
        // Normalize to Date objects and sort chronologically
        const normalizedCustomDays = config.customDays
          .map((d: any) => d instanceof Date ? d : new Date(d))
          .filter((d: Date) => !isNaN(d.getTime()));

        const customDatesUTC = normalizedCustomDays.map((d: Date) => toRecurrentUTC(d));
        customDatesUTC.sort((a: Date, b: Date) => a.getTime() - b.getTime());

        // Focus: If no lastSpawnedDate exists, start with the first custom date.
        // Otherwise, find the next custom date strictly after the referenceDate.
        const nextCustom = template.lastSpawnedDate
          ? customDatesUTC.find((d: Date) => isNextOccurrence(d, referenceDate))
          : customDatesUTC[0];

        if (nextCustom) {
          nextDate = nextCustom;
        } else {
          console.warn('[spawnNextRecurrentInstance] No next custom date found');
          return null;
        }
      } else {
        console.warn('[spawnNextRecurrentInstance] No custom days configured');
        return null;
      }
      break;

    case RecurrentFrequency.ALWAYS:
      // For ALWAYS, use interval as days between instances
      nextDate = addDaysUTC(referenceDate, config.interval);
      break;

    default:
      console.warn('[spawnNextRecurrentInstance] Unknown frequency type:', config.type);
      return null;
  }

  // 5. Apply force date if provided (for testing purposes)
  if (forceDate) {
    nextDate = toRecurrentUTC(forceDate);
  }

  // Convert the calculated UTC midnight date back to Local Midnight date for storage/display
  nextDate = fromRecurrentUTC(nextDate);

  // 6. Check safety limit
  // For CUSTOM frequencies, the array itself acts as the limit unless stopsAfter.date is defined.
  // We ignore template.dueDate for CUSTOM because the UI often sets it to the start date, inadvertently acting as a block.
  let safetyLimit: Date | null = null;
  if (config.type === RecurrentFrequency.CUSTOM) {
    if (config.stopsAfter && config.stopsAfter.type === 'date' && config.stopsAfter.value) {
      safetyLimit = fromRecurrentUTC(
        config.stopsAfter.value instanceof Date 
          ? config.stopsAfter.value 
          : new Date(config.stopsAfter.value)
      );
    }
  } else {
    safetyLimit = template.dueDate ? fromRecurrentUTC(template.dueDate) : null;
  }

  if (safetyLimit && !isWithinSafetyLimit(nextDate, safetyLimit)) {
    console.warn('[spawnNextRecurrentInstance] Next occurrence exceeds safety limit:', nextDate);
    return null;
  }

  // 7. Check for existing instance with same due date (idempotency)
  // Instead of timezone-sensitive epochs, we use absolute string dates YYYY-MM-DD for comparison.
  const existingInstances = await getTasksByParentId(template.id);
  const existingDueDatesArray = existingInstances
      .filter(t => t.type === TaskType.RECURRENT_INSTANCE)
      .map(t => t.dueDate)
      .filter(d => d !== undefined);
      
  const existingDueDates = new Set(
    existingDueDatesArray.map(d => {
      const dateObj = d instanceof Date ? d : new Date(d as string);
      return `${dateObj.getFullYear()}-${dateObj.getMonth()}-${dateObj.getDate()}`;
    })
  );

  const nextDateKey = `${nextDate.getFullYear()}-${nextDate.getMonth()}-${nextDate.getDate()}`;
  if (existingDueDates.has(nextDateKey)) {
    console.warn('[spawnNextRecurrentInstance] Instance already exists for date:', nextDate);
    return null;
  }

  // 8. Derive scheduled times aligned to nextDate
  const templateStart = template.scheduledStart ? new Date(template.scheduledStart) : null;
  const templateEnd = template.scheduledEnd ? new Date(template.scheduledEnd) : null;
  let scheduledStart: Date | undefined;
  let scheduledEnd: Date | undefined;

  if (templateStart) {
    scheduledStart = new Date(nextDate);
    scheduledStart.setHours(
      templateStart.getHours(),
      templateStart.getMinutes(),
      templateStart.getSeconds(),
      0
    );
    const durationMs =
      templateEnd && templateStart
        ? templateEnd.getTime() - templateStart.getTime()
        : null;
    if (durationMs && durationMs > 0) {
      scheduledEnd = new Date(scheduledStart.getTime() + durationMs);
    }
  } else if (templateEnd) {
    scheduledEnd = new Date(nextDate);
    scheduledEnd.setHours(
      templateEnd.getHours(),
      templateEnd.getMinutes(),
      templateEnd.getSeconds(),
      0
    );
  }

  // 9. Spawn the instance
  const formattedDate = formatDayMonth(nextDate);
  const separator = ' \u2022 ';
  const instanceOrder = nextDate.getTime();
  const instance: Task = {
    ...template,
    id: uuid(),
    name: `${template.name}${separator}${formattedDate}`,
    type: TaskType.RECURRENT_INSTANCE,
    dueDate: nextDate,
    scheduledStart,
    scheduledEnd,
    parentId: template.id, // Instance points to its template
    isRecurrentGroup: false,
    isTemplate: false,
    frequencyConfig: undefined, // Instances don't have frequency config
    createdAt: new Date(),
    updatedAt: new Date(),
    order: instanceOrder,
    links: [] // Fresh links array for new instance
  };

  return instance;
}

/**
 * Updates a template's lastSpawnedDate field.
 * Called after successfully spawning an instance to track recurrence cycle.
 *
 * @param templateId - The template's ID to update
 * @param spawnDate - The date of the spawned instance
 */
export async function updateTemplateLastSpawnedDate(
  templateId: string,
  spawnDate: Date
): Promise<void> {
  const template = await getTaskById(templateId);
  if (!template) {
    console.warn('[updateTemplateLastSpawnedDate] Template not found:', templateId);
    return;
  }

  const updatedTemplate: Task = {
    ...template,
    lastSpawnedDate: spawnDate,
    updatedAt: new Date()
  };

  await upsertTask(updatedTemplate, { skipWorkflowEffects: true });
  console.log('[updateTemplateLastSpawnedDate] Updated lastSpawnedDate for template:', templateId, spawnDate);
}

/**
 * Resets a template's spawn state when frequency configuration changes.
 * Clears lastSpawnedDate so next spawn calculates from template.dueDate.
 *
 * @param templateId - The template's ID to reset
 */
export async function resetTemplateSpawnState(templateId: string): Promise<void> {
  const template = await getTaskById(templateId);
  if (!template) {
    console.warn('[resetTemplateSpawnState] Template not found:', templateId);
    return;
  }

  const updatedTemplate: Task = {
    ...template,
    lastSpawnedDate: undefined, // Reset to undefined so next spawn starts from dueDate
    updatedAt: new Date()
  };

  await upsertTask(updatedTemplate, { skipWorkflowEffects: true });
  console.log('[resetTemplateSpawnState] Reset spawn state for template:', templateId);
}

/**
 * Checks if a template is eligible for spawning (has valid frequency config and not exceeded safety limit).
 *
 * @param template - The template to check
 * @returns true if template can spawn more instances
 */
export async function canSpawnMoreInstances(template: Task): Promise<boolean> {
  if (template.type !== TaskType.RECURRENT_TEMPLATE || !template.frequencyConfig) {
    return false;
  }

  const config = template.frequencyConfig;

  // For CUSTOM, check if we've exhausted all dates
  if (config.type === RecurrentFrequency.CUSTOM) {
    // Also check stopsAfter times
    if (config.stopsAfter && config.stopsAfter.type === 'times') {
      const existingCount = (await getTasksByParentId(template.id)).filter(t => t.type === TaskType.RECURRENT_INSTANCE).length;
      if (existingCount >= (config.stopsAfter.value as number)) {
        return false;
      }
    }

    if (!config.customDays || config.customDays.length === 0) {
      return false;
    }
    
    // Sort and normalize dates just like spawn logic
    const normalizedCustomDays = config.customDays
      .map((d: any) => d instanceof Date ? d : new Date(d))
      .filter((d: Date) => !isNaN(d.getTime()));
    const customDatesUTC = normalizedCustomDays.map((d: Date) => toRecurrentUTC(d));
    customDatesUTC.sort((a: Date, b: Date) => a.getTime() - b.getTime());

    const referenceDate = template.lastSpawnedDate 
      ? fromRecurrentUTC(template.lastSpawnedDate) 
      : fromRecurrentUTC(template.dueDate || new Date());
      
    // If lastSpawnedDate exists, find next. If not, pick first.
    const nextCustom = template.lastSpawnedDate
      ? customDatesUTC.find((d: Date) => isNextOccurrence(d, referenceDate))
      : customDatesUTC[0];

    // If there's no custom date left strictly after referenceDate, we cannot spawn.
    if (!nextCustom) {
      return false;
    }

    // Check custom stopsAfter date limit
    if (config.stopsAfter && config.stopsAfter.type === 'date' && config.stopsAfter.value) {
      const limit = fromRecurrentUTC(
        config.stopsAfter.value instanceof Date 
          ? config.stopsAfter.value 
          : new Date(config.stopsAfter.value)
      );
      const candidateLocal = fromRecurrentUTC(nextCustom);
      if (candidateLocal.getTime() > limit.getTime()) {
        return false;
      }
    }

    return true; // Valid custom date exists and is within limits
  }

  // STANDARD safety limit for all other frequencies (DAILY, WEEKLY, MONTHLY)
  const safetyLimit = template.dueDate ? fromRecurrentUTC(template.dueDate) : null;
  if (!safetyLimit) {
    if (config.type === RecurrentFrequency.ALWAYS) {
      return true;
    }
    // All other types have safety limits, so check lastSpawnedDate
  }

  const lastSpawned = template.lastSpawnedDate ? fromRecurrentUTC(template.lastSpawnedDate) : null;
  if (lastSpawned && safetyLimit && lastSpawned.getTime() >= safetyLimit.getTime()) {
    return false;
  }

  return true;
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
    status: 'Not Started' as any, // Will be updated when we add the new status
    priority: 'Normal' as any,
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
    links: [] // initialize links array
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
    status: 'Not Started' as any,
    priority: 'Normal' as any,
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
    links: [] // initialize links array
  };
}

/**
 * Spawns a Recurrent Instance from a template
 */
export function spawnRecurrentInstance(
  template: Task,
  dueDate: Date
): Task {
  const formattedDate = formatDayMonth(dueDate);
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
    links: [] // new instance gets fresh links[]
  };
}

/**
 * Calculates next due dates for a template based on frequency
 * Supports both simple recurrent respawning and template instance creation
 */
export function calculateNextDueDates(
  template: Task,
  startDate: Date = new Date(),
  count: number = 12,
  safetyLimit?: Date // Template's dueDate as safety limit
): Date[] {
  if (!template.frequencyConfig) {
    return [];
  }

  const dueDates: Date[] = [];
  let currentDate: Date;
  const config = template.frequencyConfig;

  // Normalize customDays to Date objects (defensive check - they might be strings from JSON)
  let normalizedCustomDays: Date[] = [];
  if (config.customDays && Array.isArray(config.customDays)) {
    normalizedCustomDays = config.customDays.map((day: any) => {
      if (day instanceof Date) {
        return day;
      }
      if (typeof day === 'string') {
        const date = new Date(day);
        return isNaN(date.getTime()) ? null : date;
      }
      return day;
    }).filter((day: any) => day instanceof Date && !isNaN(day.getTime())) as Date[];
    normalizedCustomDays.sort((a, b) => a.getTime() - b.getTime());
  }

  // Use starting day from customDays if available, otherwise use startDate
  if (normalizedCustomDays.length > 0) {
    currentDate = new Date(normalizedCustomDays[0]);
  } else {
    currentDate = new Date(startDate);
  }

  // Use template's dueDate as safety limit if provided
  const endDate = safetyLimit || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year default

  for (let i = 0; i < count && currentDate <= endDate; i++) {
    // Check if current date is beyond safety limit BEFORE adding
    if (currentDate > endDate) {
      break;
    }

    dueDates.push(new Date(currentDate));

    // Move to next occurrence based on frequency type
    switch (config.type) {
      case RecurrentFrequency.DAILY:
        currentDate = addDays(currentDate, config.interval || 1);
        break;
      case RecurrentFrequency.WEEKLY:
        currentDate = addWeeks(currentDate, config.interval || 1);
        break;
      case RecurrentFrequency.MONTHLY:
        currentDate = addMonths(currentDate, config.interval || 1);
        break;
      case RecurrentFrequency.CUSTOM:
        // For custom frequency, use the normalized custom days
        if (normalizedCustomDays.length > 0) {
          // Find next custom day
          const nextCustomDay = normalizedCustomDays.find((day: Date) => day.getTime() > currentDate.getTime());
          if (nextCustomDay) {
            currentDate = new Date(nextCustomDay);
          } else {
            // No more custom days, break
            break;
          }
        } else {
          // No custom days defined, break
          break;
        }
        break;
      case RecurrentFrequency.ONCE:
        // Only one occurrence
        break;
      case RecurrentFrequency.ALWAYS:
        // Continuous - create instances up to safety limit
        currentDate = addDays(currentDate, config.interval || 1);
        break;
      default:
        break;
    }
  }

  return dueDates;
}

/**
 * Spawns instances for a template up to a certain date
 * Uses template's dueDate as safety limit to prevent infinite tasks
 */
export function spawnInstancesForTemplate(
  template: Task,
  endDate?: Date // Optional end date, defaults to template's dueDate
): Task[] {
  // Use template's dueDate as safety limit if no endDate provided
  const safetyLimit = endDate || template.dueDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  const dueDates = calculateNextDueDates(template, new Date(), 12, safetyLimit);
  const instances: Task[] = [];

  for (const dueDate of dueDates) {
    if (dueDate <= safetyLimit) {
      instances.push(spawnRecurrentInstance(template, dueDate));
    }
  }

  return instances;
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

/**
 * Handles template instance creation when a template is saved
 * This function should be called when a Recurrent Template is created or updated
 */
export async function handleTemplateInstanceCreation(template: Task): Promise<Task[]> {
  if (template.type !== TaskType.RECURRENT_TEMPLATE) {
    return [];
  }

  // Require template to have a due date for safety limit
  if (!template.dueDate) {
    console.warn(`Template "${template.name}" has no due date. Cannot create instances without safety limit.`);
    return [];
  }

  // Normalize frequencyConfig.customDays to Date objects (defensive check - they might be strings from JSON)
  let normalizedTemplate = { ...template };
  if (normalizedTemplate.frequencyConfig?.customDays && Array.isArray(normalizedTemplate.frequencyConfig.customDays)) {
    normalizedTemplate.frequencyConfig = {
      ...normalizedTemplate.frequencyConfig,
      customDays: normalizedTemplate.frequencyConfig.customDays.map((day: any) => {
        if (day instanceof Date) {
          return day;
        }
        if (typeof day === 'string') {
          const date = new Date(day);
          return isNaN(date.getTime()) ? null : date;
        }
        return day;
      }).filter((day: any) => day instanceof Date && !isNaN(day.getTime())) as Date[]
    };
  }

  // Get existing instances for this template
  const existingInstances = (await getTasksByParentId(template.id))
    .filter((t: Task) => t.type === TaskType.RECURRENT_INSTANCE)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  await Promise.all(
    existingInstances.map((instance, index) => {
      const desiredOrder = (index + 1) * ORDER_INCREMENT;
      if ((instance.order || 0) !== desiredOrder) {
        return upsertTask({ ...instance, order: desiredOrder }, { skipWorkflowEffects: true });
      }
      return Promise.resolve();
    })
  );

  // Generate new instances based on template's frequency
  const newInstances = spawnInstancesForTemplate(normalizedTemplate);

  // Filter out instances that already exist (by due date)
  const existingDueDates = new Set(existingInstances.map((i: Task) => i.dueDate?.getTime()));
  const uniqueNewInstances = newInstances.filter(
    (instance: Task) => !existingDueDates.has(instance.dueDate?.getTime())
  );

  // Save new instances with sequential order appended after existing ones
  let nextIndex = existingInstances.length;
  const uniqueNewInstancesWithOrder = uniqueNewInstances.map(instance => {
    nextIndex += 1;
    return { ...instance, order: nextIndex * ORDER_INCREMENT } as Task;
  });

  await Promise.all(
    uniqueNewInstancesWithOrder.map(instance => upsertTask(instance, { skipWorkflowEffects: true }))
  );

  return uniqueNewInstancesWithOrder;
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
      await appendEntityLog(EntityType.TASK, updated.id, LogEventType.UPDATED, {
        oldStatus: instances.find(i => i.id === updated.id)?.status, // Get old status from memory
        newStatus: newStatus,
        name: updated.name,
        cascadedFrom: templateId,
        transition: `${instances.find(i => i.id === updated.id)?.status} → ${newStatus}`,
        changedAt: new Date().toISOString()
      });
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
      await appendEntityLog(EntityType.TASK, updated.id, LogEventType.UPDATED, {
        oldStatus: instances.find(i => i.id === updated.id)?.status,
        newStatus: revertToStatus,
        name: updated.name,
        uncascadedFrom: templateId,
        transition: `${instances.find(i => i.id === updated.id)?.status} → ${revertToStatus}`,
        changedAt: new Date().toISOString()
      });
    })
  );

  // Mark effect to prevent duplicate operations
  await markEffect(effectKey);
  console.log(`[uncascadeStatusFromInstances] ✅ Reverted ${revertedInstances.length} instances to ${revertToStatus}`);

  return { reverted: revertedInstances, count: revertedInstances.length };
}
