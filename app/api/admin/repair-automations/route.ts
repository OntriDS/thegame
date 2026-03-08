import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import type { Task } from '@/types/entities';
import { TaskType, TaskStatus, TaskPriority } from '@/types/enums';
import { getActiveTasks, upsertTask } from '@/data-store/datastore';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    if (!(await requireAdminAuth(request))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { getActiveTasks, upsertTask, removeTask } = await import('@/data-store/datastore');
        const data = await getActiveTasks();

        // 1. DEEP CLEANUP: Delete every possible variant to ensure no ghosts remain in the tree
        const legacyIds = [
            'system-automation-tasks-collection',
            'system-automation-sales-collection',
            'system-automation-financials-collection',
            'system-automation-inventory-collection',
            'system-automation-all-collection',
            'system-automation-monthly-collection',
            'system-automation-rewards-collection',
            'system-automation-monthly-rewards' // delete existing target to force fresh creation
        ];

        for (const id of legacyIds) {
            try {
                await removeTask(id);
            } catch (e) { }
        }

        // 2. UNIFIED SEED: Create the single "Monthly Rewards Collection" task
        const masterTask: Task = {
            id: 'system-automation-monthly-rewards',
            name: 'Monthly Rewards Collection',
            description: 'Centralized system process to finalize and collect all monthly rewards.',
            type: TaskType.AUTOMATION,
            status: TaskStatus.CREATED,
            priority: TaskPriority.NORMAL,
            station: 'Control Room' as any,
            progress: 0,
            order: 0,
            parentId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            links: [],
            isNotCharged: false,
            isNotPaid: false,
            isCollected: false,
            cost: 0,
            revenue: 0,
            rewards: { points: { xp: 0, rp: 0, fp: 0, hp: 0 } }
        };

        await upsertTask(masterTask);

        return NextResponse.json({
            success: true,
            message: `Deep Cleanup Complete. All legacy nodes removed. Only 'Monthly Rewards Collection' remains.`,
            stats: { cleaned: legacyIds.length, current: 1 }
        });

    } catch (error: any) {
        console.error('[Repair Automations API] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
