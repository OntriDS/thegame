import type { Task } from '@/types/entities';
import { TaskStatus } from '@/types/enums';

/** Done or Collected — mission finished (points collection is a separate Collected status). */
export function isTaskCompleted(task: Task): boolean {
  return task.status === TaskStatus.DONE || task.status === TaskStatus.COLLECTED;
}

/**
 * History-safe row: done, collected, or explicitly marked collected.
 * Deleting a **parent** task must never hard-remove these — only clear `parentId` (orphan) so History stays intact.
 * Active child tasks are only removed when the user explicitly opts in to cascade delete.
 */
export function isTaskHistoryTerminal(task: Task): boolean {
  if (task.isCollected) return true;
  return task.status === TaskStatus.DONE || task.status === TaskStatus.COLLECTED;
}

/** Shown on the Control Room active board: any status before Done. */
export function isTaskActive(task: Task): boolean {
  return !isTaskCompleted(task);
}
