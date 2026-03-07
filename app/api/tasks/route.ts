// app/api/tasks/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { v4 as uuid } from 'uuid';
import type { Task } from '@/types/entities';
import { TaskType, TaskStatus, TaskPriority } from '@/types/enums';
import { getAllTasks, getActiveTasks, upsertTask, getTasksForMonth } from '@/data-store/datastore';
import { requireAdminAuth } from '@/lib/api-auth';

// Force dynamic rendering - this route accesses cookies
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const params = req.nextUrl.searchParams;
  const monthParam = params.get('month');
  const yearParam = params.get('year');

  const normalizeYear = (y: string | null): number | null => {
    if (!y) return null;
    const n = parseInt(y, 10);
    if (isNaN(n)) return null;
    // Accept YY or YYYY
    if (n < 100) return 2000 + n;
    return n;
  };

  const parseMonth = (m: string | null): number | null => {
    if (!m) return null;
    const n = parseInt(m, 10);
    if (isNaN(n) || n < 1 || n > 12) return null;
    return n;
  };

  const month = parseMonth(monthParam);
  const year = normalizeYear(yearParam);

  try {
    let data: Task[];
    if (month && year) {
      data = await getTasksForMonth(year, month);
    } else {
      // Default: Return ALL active tasks (not collected)
      // This supports the "Active Task Tree" view which is not time-bound
      data = await getActiveTasks();

      // AUTO-SEED: Ensure the "Automated Monthly Rewards Collection" task exists
      const hasAutomationTask = data.some(t => t.type === TaskType.AUTOMATION);
      if (!hasAutomationTask) {
        const seedAutomationTask: Task = {
          id: 'system-automation-monthly-collection',
          name: 'Automated Monthly Rewards Collection',
          description: 'This is a programmatic system automation. It runs securely in the background on its scheduled routine at the end of every month.',
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
        await upsertTask(seedAutomationTask);
        data.push(seedAutomationTask);
      }
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = (await req.json()) as Task;

    // Normalize frequencyConfig.customDays from strings to Date objects (JSON deserialization)
    let normalizedFrequencyConfig = body.frequencyConfig;
    if (normalizedFrequencyConfig?.customDays && Array.isArray(normalizedFrequencyConfig.customDays)) {
      normalizedFrequencyConfig = {
        ...normalizedFrequencyConfig,
        customDays: normalizedFrequencyConfig.customDays.map((day: any) => {
          if (day instanceof Date) {
            return day;
          }
          if (typeof day === 'string') {
            const date = new Date(day);
            return isNaN(date.getTime()) ? null : date;
          }
          return day;
        }).filter((day: any) => day instanceof Date && !isNaN(day.getTime())) as Date[]
      };
    }

    // Normalize stopsAfter.value if it's a date string
    if (normalizedFrequencyConfig?.stopsAfter?.type === 'date' && normalizedFrequencyConfig.stopsAfter.value) {
      if (typeof normalizedFrequencyConfig.stopsAfter.value === 'string') {
        const date = new Date(normalizedFrequencyConfig.stopsAfter.value);
        if (!isNaN(date.getTime())) {
          normalizedFrequencyConfig.stopsAfter.value = date;
        }
      }
    }

    const id = body.id || uuid();
    let parentId = body.parentId;

    // Explicitly block self-referential parent assignment (circular reference)
    if (parentId === id) {
      console.warn(`[API] Task ${id} attempted to become its own parent. Nullifying parentId.`);
      parentId = null;
    }

    const task = {
      ...body,
      id,
      parentId,
      links: body.links || [],
      createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
      updatedAt: new Date(),
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      doneAt: body.doneAt ? new Date(body.doneAt) : (body.status === TaskStatus.DONE ? new Date() : undefined),
      collectedAt: body.collectedAt ? new Date(body.collectedAt) : undefined,
      frequencyConfig: normalizedFrequencyConfig
    };
    const saved = await upsertTask(task);
    return NextResponse.json(saved);
  } catch (error) {
    console.error('[API] Error saving task:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save task' },
      { status: 500 }
    );
  }
}


