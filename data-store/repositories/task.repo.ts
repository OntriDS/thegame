// data-store/repositories/task.repo.ts
import type { Task } from '@/types/entities';
import { kvGet, kvSet, kvDel, kvSMembers, kvSAdd } from '@/data-store/kv';
import { buildDataKey, buildIndexKey } from '@/data-store/keys';
import { EntityType } from '@/types/enums';

const ENTITY = EntityType.TASK;

export async function getTaskById(id: string): Promise<Task | null> {
  return await kvGet<Task>(buildDataKey(ENTITY, id));
}

export async function getAllTasks(): Promise<Task[]> {
  const ids = await kvSMembers(buildIndexKey(ENTITY));
  const rows = await Promise.all(ids.map(id => kvGet<Task>(buildDataKey(ENTITY, id))));
  return rows.filter(Boolean) as Task[];
}

export async function upsertTask(task: Task): Promise<Task> {
  await kvSet(buildDataKey(ENTITY, task.id), task);
  await kvSAdd(buildIndexKey(ENTITY), task.id);
  return task;
}

export async function deleteTask(id: string): Promise<void> {
  await kvDel(buildDataKey(ENTITY, id));
}


