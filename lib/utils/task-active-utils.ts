import type { Task } from '@/types/entities';
import { TaskStatus } from '@/types/enums';

/** Done or Collected — mission finished (points collection is a separate Collected status). */
export function isTaskCompleted(task: Task): boolean {
  return task.status === TaskStatus.DONE || task.status === TaskStatus.COLLECTED;
}

/** Shown on the Control Room active board: any status before Done. */
export function isTaskActive(task: Task): boolean {
  return !isTaskCompleted(task);
}
