// lib/utils/task-index-migration.ts
import { getAllTasks } from '@/data-store/datastore';
import { kvSAdd } from '@/lib/utils/kv';
import { buildTaskChildrenKey } from '@/data-store/keys';

/**
 * Rebuilds the parent-child index for all tasks.
 * This should be run once to populate the index for existing data.
 */
export async function rebuildTaskParentChildIndex() {
  console.log('[Migration] Starting parent-child index rebuild...');
  const tasks = await getAllTasks();
  let indexedCount = 0;

  const tasksWithParents = tasks.filter(t => t.parentId);
  
  // Processing in chunks to avoid overloading the network/CPU
  const CHUNK_SIZE = 50;
  for (let i = 0; i < tasksWithParents.length; i += CHUNK_SIZE) {
    const chunk = tasksWithParents.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map(task => kvSAdd(buildTaskChildrenKey(task.parentId!), task.id))
    );
    indexedCount += chunk.length;
    console.log(`[Migration] Indexed ${indexedCount}/${tasksWithParents.length} relations...`);
  }

  console.log(`[Migration] Finished. Indexed ${indexedCount} parent-child relationships.`);
  return { indexedCount, totalTasks: tasks.length };
}

