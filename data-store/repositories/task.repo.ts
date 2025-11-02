// data-store/repositories/task.repo.ts
import type { Task } from '@/types/entities';
import { kvGet, kvMGet, kvSet, kvDel, kvSMembers, kvSAdd, kvSRem } from '@/data-store/kv';
import { buildDataKey, buildIndexKey } from '@/data-store/keys';
import { EntityType } from '@/types/enums';

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
  await kvSet(buildDataKey(ENTITY, task.id), task);
  await kvSAdd(buildIndexKey(ENTITY), task.id);
  return task;
}

export async function deleteTask(id: string): Promise<void> {
  const key = buildDataKey(ENTITY, id);
  const indexKey = buildIndexKey(ENTITY);
  
  await kvDel(key);
  await kvSRem(indexKey, id);
}


