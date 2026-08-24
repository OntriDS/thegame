import { Task, TaskGroupV1, ExecutableTaskV1 } from '@/types/entities';
import { TaskStatus, TaskType } from '@/types/enums';

/**
 * COMPATIBILITY SELECTORS 
 * These functions safely extract fields from a Task entity whether it is using the
 * legacy root structure (LegacyCompatibility) or the strict V1 Facet contexts.
 */

export function isTaskGroupV1(task: Task): task is TaskGroupV1 {
  return task.context !== undefined && task.status === TaskStatus.NONE;
}

export function isExecutableTaskV1(task: Task): task is ExecutableTaskV1 {
  return task.context !== undefined && task.status !== TaskStatus.NONE;
}

// -----------------------------------------------------------------------------
// RECURRENCE FACET
// -----------------------------------------------------------------------------

export function getTaskIsRecurrentGroup(task: Task): boolean {
  return task.type === TaskType.RECURRENT_GROUP;
}

export function getTaskIsTemplate(task: Task): boolean {
  return task.type === TaskType.RECURRENT_TEMPLATE;
}

export function getTaskFrequencyConfig(task: Task): any {
  if (task.context?.recurrence?.frequencyConfig !== undefined) {
    return task.context.recurrence.frequencyConfig;
  }
  return (task as any).frequencyConfig;
}

export function getTaskRecurrenceStart(task: Task): Date | string | null | undefined {
  return task.context?.recurrence?.recurrenceStart ?? (task as any).recurrenceStart;
}

export function getTaskRecurrenceEnd(task: Task): Date | string | null | undefined {
  return task.context?.recurrence?.recurrenceEnd ?? (task as any).recurrenceEnd;
}

export function getTaskLastSpawnedDate(task: Task): Date | string | null | undefined {
  return task.context?.recurrence?.lastSpawnedDate ?? (task as any).lastSpawnedDate;
}

export function getTaskDueDate(task: Task): Date | string | null | undefined {
  if (isExecutableTaskV1(task) && task.schedule?.dueDate) return task.schedule.dueDate;
  return (task as any).dueDate;
}

// -----------------------------------------------------------------------------
// SCHEDULE FACET / PROGRESS
// -----------------------------------------------------------------------------

export function getTaskScheduledStart(task: Task): Date | string | null | undefined {
  if (isExecutableTaskV1(task) && task.schedule?.scheduledStart) {
    return task.schedule.scheduledStart;
  }
  return (task as any).scheduledStart || (task as any).recurrenceStart;
}

export function getTaskScheduledEnd(task: Task): Date | string | null | undefined {
  if (isExecutableTaskV1(task) && task.schedule?.scheduledEnd) {
    return task.schedule.scheduledEnd;
  }
  return (task as any).scheduledEnd || (task as any).recurrenceEnd;
}

export function getTaskProgress(task: Task): number {
  const rawProgress = (task as any).progress;
  if (rawProgress && typeof rawProgress === 'object') {
    const percentage = Number(rawProgress.percentage);
    return Number.isFinite(percentage) ? percentage : 0;
  }
  const numericProgress = Number(rawProgress);
  return Number.isFinite(numericProgress) ? numericProgress : 0;
}

// -----------------------------------------------------------------------------
// ASSIGNMENT / OWNERSHIP
// -----------------------------------------------------------------------------

export function getTaskOwnerIds(task: Task): string[] {
  if (task.ownerIds && task.ownerIds.length > 0) {
    return task.ownerIds;
  }
  // Legacy fallback
  const legacyOwnerId = (task as any).ownerId;
  if (legacyOwnerId) {
    return Array.isArray(legacyOwnerId) ? legacyOwnerId : [legacyOwnerId];
  }
  return [];
}

/**
 * Task point recipient compatibility pointer. Task rewards belong to the
 * owner's Player relationship; rewardIntent has no beneficiary field.
 */
export function getTaskPlayerCharacterId(task: Task): string | null {
  return (task as any).playerCharacterId || getTaskOwnerIds(task)[0] || null;
}
