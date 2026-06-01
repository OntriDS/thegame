import { getAllTasks } from '@/data-store/datastore';
export async function execute(parameters: any) {
  let tasks = await getAllTasks();
  if (parameters.filter?.status) {
    tasks = tasks.filter(t => String(t.status) === parameters.filter.status);
  }
  const limit = parameters.limit;
  const offset = parameters.offset || 0;
  let slice = tasks;
  if (offset > 0 || limit) {
    slice = tasks.slice(offset, limit ? offset + limit : undefined);
  }
  return { tasks: slice, count: slice.length, total: tasks.length, offset, limit, hasMore: limit ? offset + limit < tasks.length : false };
}