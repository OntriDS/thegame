import type { Task } from '@/types/entities';
import { TaskStatus } from '@/types/enums';

/** Matches getActiveTasks in datastore: in Control Room until Collected. */
export function isTaskActive(task: Task): boolean {
  return !task.isCollected && task.status !== TaskStatus.COLLECTED;
}
