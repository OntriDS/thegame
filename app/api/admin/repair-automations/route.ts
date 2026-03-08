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
        const data = await getActiveTasks();

        const systemAutomationTasks = [
            {
                id: 'system-automation-tasks-collection',
                name: 'Tasks Collection',
                description: 'Process to finalize monthly Task rewards and archive DONE records.',
            },
            {
                id: 'system-automation-sales-collection',
                name: 'Sales Collection',
                description: 'Process to finalize monthly Sales accounting and archive CHARGED records.',
            },
            {
                id: 'system-automation-financials-collection',
                name: 'Financials Collection',
                description: 'Process to finalize monthly Financial records and claim processing rewards.',
            },
            {
                id: 'system-automation-inventory-collection',
                name: 'Inventory Collection',
                description: 'Process to archive monthly Inventory status and sold item snapshots.',
            },
            {
                id: 'system-automation-all-collection',
                name: 'All Monthly Rewards Collection',
                description: 'Master process that triggers all collection automations sequentially.',
            }
        ];

        let createdCount = 0;
        let updatedCount = 0;

        for (const config of systemAutomationTasks) {
            const existingTask = data.find(t => t.id === config.id);

            if (!existingTask) {
                const seedTask: Task = {
                    id: config.id,
                    name: config.name,
                    description: config.description,
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
                await upsertTask(seedTask);
                createdCount++;
            } else if (existingTask.name !== config.name || existingTask.description !== config.description) {
                const updatedTask = {
                    ...existingTask,
                    name: config.name,
                    description: config.description,
                    updatedAt: new Date()
                };
                await upsertTask(updatedTask);
                updatedCount++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Repair Complete. Created ${createdCount} tasks, Updated ${updatedCount} tasks.`,
            stats: { createdCount, updatedCount }
        });

    } catch (error: any) {
        console.error('[Repair Automations API] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
