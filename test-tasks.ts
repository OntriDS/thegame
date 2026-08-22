import { getActiveTasks } from './data-store/datastore';

async function test() {
  const tasks = await getActiveTasks();
  const tasksWithParent = tasks.filter(t => t.parentId);
  console.log('Total active tasks:', tasks.length);
  console.log('Tasks with parentId:', tasksWithParent.length);
  if (tasksWithParent.length > 0) {
    console.log('Sample task with parent:', tasksWithParent[0].id, 'parent:', tasksWithParent[0].parentId);
  }
  process.exit(0);
}

test();
