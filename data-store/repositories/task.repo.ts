// data-store/repositories/task.repo.ts
import type { Task } from '@/types/entities';
import { kvGet, kvMGet, kvSet, kvDel, kvSMembers, kvSAdd, kvSRem } from '@/data-store/kv';
import { buildDataKey, buildIndexKey, buildTaskChildrenKey } from '@/data-store/keys';
import { EntityType } from '@/types/enums';
import { formatMonthKey } from '@/lib/utils/date-utils';

const ENTITY = EntityType.TASK;

export async function getTaskById(id: string): Promise<Task | null> {
  const raw = await kvGet<Task | string>(buildDataKey(ENTITY, id));
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as Task;
      return parsed ?? null;
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
        try { return JSON.parse(t) as Task; } catch { return null; }
      }
      return t as Task;
    })
    .filter((task): task is Task => task !== null);
  return normalized;
}

/**
 * Get tasks by parent ID using the parent-child index
 */
export async function getTasksByParentId(parentId: string): Promise<Task[]> {
  const indexKey = buildTaskChildrenKey(parentId);
  const ids = await kvSMembers(indexKey);
  if (ids.length === 0) return [];

  const keys = ids.map(id => buildDataKey(ENTITY, id));
  const tasks = await kvMGet<Task | string>(keys);
  
  return tasks
    .map(t => {
      if (t === null || t === undefined) return null;
      if (typeof t === 'string') {
        try { return JSON.parse(t) as Task; } catch { return null; }
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

  // Maintain parent-child index
  if (task.parentId) {
    await kvSAdd(buildTaskChildrenKey(task.parentId), task.id);
  }

  // Handle parent change: remove from old parent's index
  if (previous && previous.parentId && previous.parentId !== task.parentId) {
    await kvSRem(buildTaskChildrenKey(previous.parentId), task.id);
  }

  return task;
}

export async function deleteTask(id: string): Promise<void> {
  const key = buildDataKey(ENTITY, id);
  const indexKey = buildIndexKey(ENTITY);
  
  const existing = await kvGet<Task>(key);
  if (existing && existing.parentId) {
    await kvSRem(buildTaskChildrenKey(existing.parentId), id);
  }
  
  await kvDel(key);
  await kvSRem(indexKey, id);
}


