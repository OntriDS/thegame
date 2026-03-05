import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { getTaskById, getTasksForMonth } from '@/data-store/datastore';
import { kvSMembers } from '@/data-store/kv';
import { formatMonthKey } from '@/lib/utils/date-utils';
import { TaskStatus } from '@/types/enums';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    if (!(await requireAdminAuth(request))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get('month'); // 1-12
    const yearParam = searchParams.get('year');   // 2025

    if (!monthParam || !yearParam) {
        return NextResponse.json(
            { error: 'Missing month or year parameter' },
            { status: 400 }
        );
    }

    try {
        const month = parseInt(monthParam, 10);
        const year = parseInt(yearParam, 10);

        if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
            return NextResponse.json({ error: 'Invalid month or year' }, { status: 400 });
        }

        // Build month key (MM-YY format)
        const date = new Date(year, month - 1, 1);
        const monthKey = formatMonthKey(date);

        // Get collected task IDs from month index (efficient!)
        const collectedIndexKey = `index:tasks:collected:${monthKey}`;
        const taskIds = await kvSMembers(collectedIndexKey);


        // Fetch only those specific tasks
        const taskResults = await Promise.all(
            taskIds.map(async (id) => {
                const task = await getTaskById(id);
                return { id, task };
            })
        );

        // Filter out nulls (in case task was deleted)
        const validCollectedTasks = taskResults.filter(result => result.task !== null).map(result => result.task);

        // Fetch ACTIVE tasks for this month to grab 'DONE' tasks that aren't collected yet
        const activeTasksForMonth = await getTasksForMonth(year, month);
        const doneActiveTasks = activeTasksForMonth.filter(t => t.status === TaskStatus.DONE);

        // Merge Collected and Done tasks, then deduplicate by ID just in case
        const combinedTasks = [...validCollectedTasks, ...doneActiveTasks];
        const uniqueTasksMap = new Map();
        combinedTasks.forEach(t => {
            if (t && t.id) {
                uniqueTasksMap.set(t.id, t);
            }
        });

        return NextResponse.json(Array.from(uniqueTasksMap.values()));
    } catch (error) {
        console.error('[GET /api/tasks/history] Failed:', error);
        return NextResponse.json({ error: 'Failed to load task history' }, { status: 500 });
    }
}
