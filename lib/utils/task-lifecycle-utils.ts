import type { Task } from '@/types/entities';

/**
 * Read Task lifecycle timestamps canonically while legacy root aliases are
 * still accepted at process boundaries. New persistence must use lifecycle.
 */
export const getTaskDoneAt = (task: Task | null | undefined) =>
  (task as any)?.lifecycle?.doneAt ?? (task as any)?.doneAt;

export const getTaskCollectedAt = (task: Task | null | undefined) =>
  (task as any)?.lifecycle?.collectedAt ?? (task as any)?.collectedAt;

export const withTaskLifecycle = (
  task: Task,
  patch: { doneAt?: unknown; collectedAt?: unknown },
): Task => {
  const lifecycle = { ...((task as any).lifecycle || {}) } as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(patch, 'doneAt')) {
    if (patch.doneAt == null) delete lifecycle.doneAt;
    else lifecycle.doneAt = patch.doneAt;
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'collectedAt')) {
    if (patch.collectedAt == null) delete lifecycle.collectedAt;
    else lifecycle.collectedAt = patch.collectedAt;
  }
  const result: Record<string, unknown> = { ...task, lifecycle };
  delete result.doneAt;
  delete result.collectedAt;
  return result as unknown as Task;
};
