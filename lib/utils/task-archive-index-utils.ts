import type { Task } from '@/types/entities';
import { TaskStatus } from '@/types/enums';
import { parseDateToUTC } from '@/lib/utils/date-parsers';
import { formatArchiveMonthKeyUTC, getUTCNow } from '@/lib/utils/utc-utils';

/**
 * Month bucket `MM-yy` for reactive task archive indexing — must match
 * `getTaskArchiveMonth` in `task.workflow.ts` (UTC calendar fields only).
 */
export function getTaskArchiveMonthKeyUTC(task: Task): string | null {
  let raw: Date | string | undefined;
  if (task.status === TaskStatus.COLLECTED) {
    raw = task.collectedAt || task.doneAt || task.createdAt;
  } else {
    raw = task.doneAt || task.createdAt;
  }
  if (raw == null) return null;
  const date = raw instanceof Date ? raw : parseDateToUTC(raw as string | number);
  if (!Number.isFinite(date.getTime())) return null;
  const key = formatArchiveMonthKeyUTC(date);
  return key || null;
}

/**
 * Heal terminal tasks missing canonical archive dates (legacy / partial rows).
 * Prefer {@link getTaskArchiveMonthKeyUTC} first.
 */
export function fallbackTaskCompletedArchiveMonthKeyUTC(task: Task): string {
  let date: Date | null = null;
  if (task.collectedAt) date = new Date(task.collectedAt);
  else if (task.doneAt) date = new Date(task.doneAt);
  else if (task.dueDate) date = new Date(task.dueDate);
  else if (task.scheduledStart) date = new Date(task.scheduledStart);
  else if (task.updatedAt) date = new Date(task.updatedAt);
  else if (task.createdAt) date = new Date(task.createdAt);
  else date = getUTCNow();

  if (isNaN(date.getTime())) date = getUTCNow();
  return formatArchiveMonthKeyUTC(date);
}

export function resolveTaskCompletedArchiveMonthKeyUTC(task: Task): string {
  return getTaskArchiveMonthKeyUTC(task) ?? fallbackTaskCompletedArchiveMonthKeyUTC(task);
}
