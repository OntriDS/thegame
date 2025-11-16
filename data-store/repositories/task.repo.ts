// data-store/repositories/task.repo.ts
import type { Task } from '@/types/entities';
import { kvGet, kvMGet, kvSet, kvDel, kvSMembers, kvSAdd, kvSRem } from '@/data-store/kv';
import { buildDataKey, buildIndexKey, buildMonthIndexKey } from '@/data-store/keys';
import { EntityType } from '@/types/enums';
import { formatMonthKey } from '@/lib/utils/date-utils';

const ENTITY = EntityType.TASK;

export async function getTaskById(id: string): Promise<Task | null> {
  return await kvGet<Task>(buildDataKey(ENTITY, id));
}

export async function getAllTasks(): Promise<Task[]> {
  const indexKey = buildIndexKey(ENTITY);
  const ids = await kvSMembers(indexKey);
  if (ids.length === 0) return [];
  
  const keys = ids.map(id => buildDataKey(ENTITY, id));
  const tasks = await kvMGet<Task>(keys);
  return tasks.filter((task): task is Task => task !== null && task !== undefined);
}

export async function upsertTask(task: Task): Promise<Task> {
  const key = buildDataKey(ENTITY, task.id);
  const previous = await kvGet<Task>(key);

  await kvSet(key, task);
  await kvSAdd(buildIndexKey(ENTITY), task.id);

  // Maintain month index (collectedAt -> doneAt -> createdAt)
  const currentDate = (task as any).collectedAt || (task as any).doneAt || task.createdAt;
  if (currentDate) {
    const currentMonthKey = formatMonthKey(currentDate);
    await kvSAdd(buildMonthIndexKey(ENTITY, currentMonthKey), task.id);
  }

  if (previous) {
    const prevDate = (previous as any).collectedAt || (previous as any).doneAt || previous.createdAt;
    if (prevDate) {
      const prevMonthKey = formatMonthKey(prevDate);
      const currMonthKey = currentDate ? formatMonthKey(currentDate) : prevMonthKey;
      if (prevMonthKey !== currMonthKey) {
        await kvSRem(buildMonthIndexKey(ENTITY, prevMonthKey), task.id);
      }
    }
  }

  return task;
}

export async function deleteTask(id: string): Promise<void> {
  const key = buildDataKey(ENTITY, id);
  const indexKey = buildIndexKey(ENTITY);

  const existing = await kvGet<Task>(key);
  if (existing) {
    const prevDate = (existing as any).collectedAt || (existing as any).doneAt || existing.createdAt;
    if (prevDate) {
      const prevMonthKey = formatMonthKey(prevDate);
      await kvSRem(buildMonthIndexKey(ENTITY, prevMonthKey), id);
    }
  }
  
  await kvDel(key);
  await kvSRem(indexKey, id);
}


