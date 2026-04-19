import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { getTaskById } from '@/data-store/datastore';
import { kvSMembers } from '@/lib/utils/kv';
import { buildMonthIndexKey } from '@/data-store/keys';
import { formatArchiveMonthKeyUTCFromParts } from '@/lib/utils/utc-utils';
import type { Task } from '@/types/entities';
import { EntityType } from '@/types/enums';

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

        const monthKey = formatArchiveMonthKeyUTCFromParts(year, month);

        const collectedIndexKey = buildMonthIndexKey(EntityType.TASK, monthKey);
        const taskIds = await kvSMembers(collectedIndexKey);

        // The archive index IS the source of truth.
        // We deliberately do NOT re-filter by date fields here: ghost tasks that lack
        // collectedAt/doneAt would be silently dropped by such a filter even though
        // the repair tool correctly placed them in this month's index.
        const taskResults = await Promise.all(
            taskIds.map(async (id) => {
                const task = await getTaskById(id);
                return task;
            })
        );

        const tasks: Task[] = taskResults.filter((t): t is Task => t !== null);

        return NextResponse.json(tasks);
    } catch (error) {
        console.error('[GET /api/tasks/history] Failed:', error);
        return NextResponse.json({ error: 'Failed to load task history' }, { status: 500 });
    }
}

