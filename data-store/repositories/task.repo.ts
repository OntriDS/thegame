// data-store/repositories/task.repo.ts
import type { Task } from '@/types/entities';
import { kvGet, kvMGet, kvSet, kvDel, kvSMembers, kvSAdd, kvSRem } from '@/lib/utils/kv';
import { buildDataKey, buildIndexKey, buildTaskActiveIndexKey, buildTaskChildrenKey, buildMonthIndexKey } from '@/data-store/keys';
import { EntityType } from '@/types/enums';
import { isTaskActive, isTaskCompleted } from '@/lib/utils/task-active-utils';
import { resolveTaskCompletedArchiveMonthKeyUTC } from '@/lib/utils/task-archive-index-utils';

const ENTITY = EntityType.TASK;

export async function getTaskById(id: string): Promise<Task | null> {
  const raw = await kvGet<Task | string>(buildDataKey(ENTITY, id));
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as Task;
      return parsed;
    } catch {
      return null;
    }
  }
  return raw as Task;
}

/**
 * Get all tasks - SPECIAL CASE ONLY
 * Use: Recurrent task template processing, AI analysis, bulk operations
 * Performance Impact: Loads entire dataset into memory
 * Alternative: Use getTasksForMonth(year, month) for UI components
 */
export async function getAllTasks(): Promise<Task[]> {
  const indexKey = buildIndexKey(ENTITY);
  const ids = await kvSMembers(indexKey);
  if (ids.length === 0) return [];

  const keys = ids.map(id => buildDataKey(ENTITY, id));
  const tasks = await kvMGet<Task | string>(keys);
  const normalized = tasks
    .map(t => {
      if (t === null || t === undefined) return null;
      if (typeof t === 'string') {
        try {
          const parsed = JSON.parse(t) as Task;
          return parsed;
        } catch {
          return null;
        }
      }
      return t as Task;
    })
    .filter((task): task is Task => task !== null);
  return normalized;
}

/**
 * Get tasks by parent ID using the canonical TASK_TASK links
 */
export async function getTasksByParentId(parentId: string): Promise<Task[]> {
  const { getLinksFor } = await import('@/links/link-registry');
  const links = await getLinksFor({ type: EntityType.TASK, id: parentId });
  const childIds = links
    .filter(l => l.linkType === 'TASK_TASK' && l.target.type === EntityType.TASK && l.target.id === parentId)
    .map(l => l.source.id);

  if (childIds.length === 0) return [];

  const keys = childIds.map(id => buildDataKey(ENTITY, id));
  const tasks = await kvMGet<Task | string>(keys);
  
  return tasks
    .map(t => {
      if (t === null || t === undefined) return null;
      if (typeof t === 'string') {
        try {
          const parsed = JSON.parse(t) as Task;
          return parsed;
        } catch {
          return null;
        }
      }
      return t as Task;
    })
    .filter((task): task is Task => task !== null);
}

export async function upsertTask(task: Task): Promise<Task> {
  const key = buildDataKey(ENTITY, task.id);
  const previous = await kvGet<Task>(key);

  await kvSet(key, task);
  await kvSAdd(buildIndexKey(ENTITY), task.id);

  // The legacy task:children:parentId index is no longer maintained here.
  // TASK_TASK links are the canonical source of truth for hierarchy.

  const activeKey = buildTaskActiveIndexKey();
  if (isTaskActive(task)) {
    await kvSAdd(activeKey, task.id);
  } else {
    await kvSRem(activeKey, task.id);
  }

  // Maintain month index for terminal/history tasks only.
  const monthKeyForTask = isTaskCompleted(task) ? resolveTaskCompletedArchiveMonthKeyUTC(task) : null;
  if (monthKeyForTask) {
    await kvSAdd(buildMonthIndexKey(ENTITY, monthKeyForTask), task.id);
  }

  if (previous) {
    const prevMonthKey = resolveTaskCompletedArchiveMonthKeyUTC(previous as Task);
    if (prevMonthKey && prevMonthKey !== monthKeyForTask) {
      await kvSRem(buildMonthIndexKey(ENTITY, prevMonthKey), task.id);
    }
  }

  return task;
}

export async function deleteTask(id: string): Promise<void> {
  const key = buildDataKey(ENTITY, id);
  const indexKey = buildIndexKey(ENTITY);
  
  const existing = await kvGet<Task>(key);
  // TASK_TASK links cleanup happens in datastore/workflows.
  
  await kvDel(key);
  await kvSRem(indexKey, id);
  await kvSRem(buildTaskActiveIndexKey(), id);
}



