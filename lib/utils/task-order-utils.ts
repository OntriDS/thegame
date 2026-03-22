import { ORDER_INCREMENT } from '@/lib/constants/app-constants';
import type { Task } from '@/types/entities';

/**
 * Next sort key for a task among siblings (same parentId), matching Control Room drag-drop
 * (ORDER_INCREMENT steps and midpoints between neighbors).
 */
export function computeNextSiblingOrder(
  allTasks: Task[],
  parentId: string | null | undefined,
  excludeTaskId?: string
): number {
  const p = parentId ?? null;
  const siblings = allTasks.filter(
    (t) => (t.parentId ?? null) === p && (!excludeTaskId || t.id !== excludeTaskId)
  );
  let max = 0;
  for (const t of siblings) {
    const o = Number(t.order);
    if (!Number.isNaN(o) && o > max) max = o;
  }
  return max + ORDER_INCREMENT;
}
