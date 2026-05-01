// app/api/tasks/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { v4 as uuid } from 'uuid';
import type { Task } from '@/types/entities';
import { TaskType, TaskStatus, TaskPriority } from '@/types/enums';
import { getAllTasks, getActiveTasks, upsertTask, getTasksForMonth, getTaskById } from '@/data-store/datastore';
import { requireAdminAuth } from '@/lib/api-auth';
// UTC STANDARDIZATION: Using new UTC utilities
import { getUTCNow } from '@/lib/utils/utc-utils';
import { parseDateToUTC } from '@/lib/utils/date-parsers';

const normalizeCharacterId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

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
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { skipDuplicateCheck, ...taskData } = body as { skipDuplicateCheck?: boolean } & Record<string, unknown>;
    const taskBody = taskData as unknown as Task;
    const incomingTaskCharacterId = normalizeCharacterId((taskBody as { characterId?: string | null }).characterId);
    const characterId = incomingTaskCharacterId;

    const cleanTaskBody = { ...(taskBody as unknown as Record<string, unknown>) } as Record<string, unknown>;
    delete cleanTaskBody.customerCharacterId;

    // Normalize frequencyConfig.customDays to parsed UTC instants (preserve client civil day)
    let normalizedFrequencyConfig = taskBody.frequencyConfig;
    if (normalizedFrequencyConfig?.customDays && Array.isArray(normalizedFrequencyConfig.customDays)) {
      normalizedFrequencyConfig = {
        ...normalizedFrequencyConfig,
        customDays: normalizedFrequencyConfig.customDays.map((day: any) => {
          if (day instanceof Date) {
            return new Date(day.getTime());
          }
          if (typeof day === 'string') {
            try {
              return parseDateToUTC(day);
            } catch {
              return null;
            }
          }
          return day;
        }).filter((day: any) => day instanceof Date && !isNaN(day.getTime())) as Date[]
      };
    }

    if (normalizedFrequencyConfig?.stopsAfter?.type === 'date' && normalizedFrequencyConfig.stopsAfter.value) {
      try {
        const dateValue = typeof normalizedFrequencyConfig.stopsAfter.value === 'string'
          ? parseDateToUTC(normalizedFrequencyConfig.stopsAfter.value)
          : normalizedFrequencyConfig.stopsAfter.value;

        if (dateValue && !isNaN(dateValue.getTime())) {
          normalizedFrequencyConfig.stopsAfter.value = new Date(dateValue.getTime());
        }
      } catch {
        // Invalid date, leave as is
      }
    }

    const id = taskBody.id || uuid();
    let parentId = taskBody.parentId;

    // Explicitly block self-referential parent assignment (circular reference)
    if (parentId === id) {
      console.warn(`[API] Task ${id} attempted to become its own parent. Nullifying parentId.`);
      parentId = null;
    }

    const existingTask = taskBody.id ? await getTaskById(taskBody.id) : null;

    const task = {
      ...cleanTaskBody,
      id,
      parentId,
      links: taskBody.links || [],
      characterId: characterId || null,
      createdAt: taskBody.createdAt ? parseDateToUTC(taskBody.createdAt as Date | string | number | null | undefined) : getUTCNow(),
      updatedAt: getUTCNow(),
      dueDate: taskBody.dueDate ? parseDateToUTC(taskBody.dueDate) : undefined,
      doneAt: taskBody.doneAt
        ? parseDateToUTC(taskBody.doneAt)
        : existingTask?.doneAt || (taskBody.status === TaskStatus.DONE ? getUTCNow() : undefined),
      collectedAt: taskBody.collectedAt ? parseDateToUTC(taskBody.collectedAt) : undefined,
      frequencyConfig: normalizedFrequencyConfig
    } as unknown as Task;
    const saved = await upsertTask(task, { skipDuplicateCheck });
    return NextResponse.json(saved);
  } catch (error) {
    console.error('[API] Error saving task:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save task' },
      { status: 500 }
    );
  }
}


