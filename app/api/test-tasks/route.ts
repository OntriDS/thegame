import { NextResponse } from 'next/server';
import { getActiveTasks } from '@/data-store/datastore';

export const dynamic = 'force-dynamic';

export async function GET() {
  const tasks = await getActiveTasks();
  const tasksWithParent = tasks.filter(t => t.parentId);
  return NextResponse.json({
    total: tasks.length,
    withParent: tasksWithParent.length,
    sample: tasksWithParent.length > 0 ? { id: tasksWithParent[0].id, parentId: tasksWithParent[0].parentId } : null
  });
}
