import { Task, TaskGroupV1, ExecutableTaskV1 } from '@/types/entities';
import { TaskStatus } from '@/types/enums';

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
  if (task.context?.recurrence?.isRecurrentGroup !== undefined) {
    return task.context.recurrence.isRecurrentGroup;
  }
  // Fallback to legacy
  return (task as any).isRecurrentGroup ?? false;
}

export function getTaskIsTemplate(task: Task): boolean {
  if (task.context?.recurrence?.isTemplate !== undefined) {
    return task.context.recurrence.isTemplate;
  }
  return (task as any).isTemplate ?? false;
}

export function getTaskFrequencyConfig(task: Task): any {
  if (task.context?.recurrence?.frequencyConfig !== undefined) {
    return task.context.recurrence.frequencyConfig;
  }
  return (task as any).frequencyConfig;
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
  if (isExecutableTaskV1(task)) {
    return task.progress?.percentage || 0;
  }
  return (task as any).progress || 0;
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
