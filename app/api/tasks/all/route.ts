import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { getAllTasks } from '@/data-store/datastore';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    if (!(await requireAdminAuth(request))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Get all tasks without filtering (includes recurrent, automation, etc.)
        const tasks = await getAllTasks();

        return NextResponse.json(tasks);
    } catch (error) {
        console.error('[GET /api/tasks/all] Failed:', error);
        return NextResponse.json({ error: 'Failed to load all tasks' }, { status: 500 });
    }
}