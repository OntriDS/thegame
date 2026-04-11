import type { Task } from '@/types/entities';
import { TaskStatus } from '@/types/enums';

/** Terminal task: no longer on the Active board (Done, Collected, or Failed). */
export function isTaskCompleted(task: Task): boolean {
  return (
    task.status === TaskStatus.DONE ||
    task.status === TaskStatus.COLLECTED ||
    task.status === TaskStatus.FAILED
  );
}

/**
 * History-safe row: done, collected, failed, or explicitly marked collected.
 * Deleting a **parent** task must never hard-remove these — only clear `parentId` (orphan) so History stays intact.
 * Active child tasks are only removed when the user explicitly opts in to cascade delete.
 */
export function isTaskHistoryTerminal(task: Task): boolean {
  if (task.isCollected) return true;
  return (
    task.status === TaskStatus.DONE ||
    task.status === TaskStatus.COLLECTED ||
    task.status === TaskStatus.FAILED
  );
}

/** Shown on the Control Room active board: any status before Done. */
export function isTaskActive(task: Task): boolean {
  return !isTaskCompleted(task);
}
