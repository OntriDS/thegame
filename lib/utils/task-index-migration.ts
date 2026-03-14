// lib/utils/task-index-migration.ts
import { getAllTasks } from '@/data-store/datastore';
import { kvSAdd } from '@/data-store/kv';
import { buildTaskChildrenKey } from '@/data-store/keys';

/**
 * Rebuilds the parent-child index for all tasks.
 * This should be run once to populate the index for existing data.
 */
export async function rebuildTaskParentChildIndex() {
  console.log('[Migration] Starting parent-child index rebuild...');
  const tasks = await getAllTasks();
  let count = 0;

  for (const task of tasks) {
    if (task.parentId) {
      await kvSAdd(buildTaskChildrenKey(task.parentId), task.id);
      count++;
    }
  }

  console.log(`[Migration] Finished. Indexed ${count} parent-child relationships.`);
  return { indexedCount: count, totalTasks: tasks.length };
}
