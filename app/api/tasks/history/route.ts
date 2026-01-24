import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { getTaskById } from '@/data-store/datastore';
import { kvSMembers } from '@/data-store/kv';
import { formatMonthKey } from '@/lib/utils/date-utils';

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
        const validTasks = taskResults.filter(result => result.task !== null).map(result => result.task);


        return NextResponse.json(validTasks);
    } catch (error) {
        console.error('[GET /api/tasks/history] Failed:', error);
        return NextResponse.json({ error: 'Failed to load task history' }, { status: 500 });
    }
}
