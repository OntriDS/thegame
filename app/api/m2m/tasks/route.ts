import { NextResponse, NextRequest } from 'next/server';
import { iamService } from '@/lib/iam-service';
import { TaskStatus, TaskType } from '@/types/enums';
import { getActiveTasks, getAllTasks, getTaskById, upsertTask } from '@/data-store/datastore';
import type { Task } from '@/types/entities';
import { getUTCNow } from '@/lib/utils/utc-utils';
import { parseDateToUTC } from '@/lib/utils/date-parsers';

/**
 * M2M Tasks API Endpoint
 * Requires M2M Bearer token authentication
 */
async function verifyM2MRequest(request: NextRequest): Promise<NextResponse | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Missing Bearer token' },
      { status: 401 },
    );
  }

  const token = authHeader.substring(7);
  const verification = await iamService.verifyM2MToken(token);
  if (!verification.valid) {
    return NextResponse.json(
      { success: false, error: 'Invalid or expired M2M token' },
      { status: 401 },
    );
  }

  if (verification.appId !== 'akiles-ecosystem') {
    return NextResponse.json(
      { success: false, error: 'Forbidden: Only akiles-ecosystem can access tasks' },
      { status: 403 },
    );
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const authFailure = await verifyM2MRequest(request);
    if (authFailure) return authFailure;

    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get('ownerId');
    const includeDoneThisMonth = searchParams.get('includeDoneThisMonth') === 'true';

    if (!ownerId) {
      return NextResponse.json(
        { success: false, error: 'ownerId is required' },
        { status: 400 },
      );
    }

    // Optional done count for current month
    let doneThisMonth = 0;
    if (includeDoneThisMonth) {
      const now = getUTCNow();
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
      const allTasks = await getAllTasks();
      const doneTaskIds = new Set<string>();
      allTasks.forEach((task) => {
        if (task.ownerId !== ownerId) return;
        if (task.status !== TaskStatus.DONE) return;
        if (typeof task.progress === 'number' && task.progress < 100) return;

        if (!task.doneAt) return;
        const doneDate = new Date(task.doneAt);
        if (!Number.isFinite(doneDate.getTime())) return;
        if (Number.isNaN(doneDate.getTime())) return;

        if (doneDate < monthStart || doneDate >= nextMonthStart) return;

        doneTaskIds.add(task.id);
        return;
      });

      doneThisMonth = doneTaskIds.size;
    }

    const activeTasks = await getActiveTasks();
    const assignedTasks = activeTasks.filter(t => 
      t.ownerId === ownerId && 
      t.status !== TaskStatus.COLLECTED
    );

    // Enrich assigned tasks with parent names if they exist
    const tasksWithParentNames = assignedTasks.map(task => {
      if (task.parentId) {
        const parent = activeTasks.find(t => t.id === task.parentId);
        if (parent) {
          return { ...task, parentName: parent.name };
        }
      }
      return task;
    });

    return NextResponse.json({
      success: true,
      tasks: tasksWithParentNames,
      doneThisMonth,
    });
  } catch (error) {
    console.error('[M2M Tasks GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authFailure = await verifyM2MRequest(request);
    if (authFailure) return authFailure;

    const body = await request.json();
    const {
      id,
      status,
      progress,
      description,
      name,
      characterId,
      siteId,
      priority,
      cost,
      revenue,
      ownerId,
      doneAt: rawDoneAt,
      collectedAt: rawCollectedAt,
    } = body;

    const normalizedStatus = typeof status === 'string' ? (status as TaskStatus) : undefined;
    if (name !== undefined && typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid name value' },
        { status: 400 },
      );
    }

    if (name !== undefined && name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Task name cannot be empty' },
        { status: 400 },
      );
    }

    if (normalizedStatus === TaskStatus.COLLECTED) {
      return NextResponse.json(
        { success: false, error: 'AKILES ecosystem cannot set task status to COLLECTED. Use TheGame reward flow.' },
        { status: 400 },
      );
    }

    if (rawCollectedAt !== undefined) {
      return NextResponse.json(
        { success: false, error: 'AKILES ecosystem cannot modify collectedAt. Collection is handled by TheGame.' },
        { status: 400 },
      );
    }

    let explicitDoneAt: Date | undefined = undefined;
    let explicitCollectedAt: Date | undefined = undefined;

    const parseDateInput = (value: any): Date | undefined => {
      if (value === undefined) return undefined;
      if (value === null || value === '') return undefined;
      try {
        return parseDateToUTC(value);
      } catch (error) {
        return undefined;
      }
    };

    if (rawDoneAt !== undefined) {
      explicitDoneAt = parseDateInput(rawDoneAt);
      if (explicitDoneAt === undefined && rawDoneAt !== null) {
        return NextResponse.json(
          { success: false, error: 'Invalid doneAt value' },
          { status: 400 },
        );
      }
    }

    if (rawCollectedAt !== undefined) {
      explicitCollectedAt = parseDateInput(rawCollectedAt);
      if (explicitCollectedAt === undefined && rawCollectedAt !== null) {
        return NextResponse.json(
          { success: false, error: 'Invalid collectedAt value' },
          { status: 400 },
        );
      }
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Task ID is required' },
        { status: 400 },
      );
    }

    const task = await getTaskById(id);
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 },
      );
    }

    // Templates cannot be edited directly (except maybe status, but user says templates are not suppose to be editable)
    if (task.type === TaskType.RECURRENT_TEMPLATE && (name || description || cost || revenue || priority || ownerId)) {
       return NextResponse.json(
        { success: false, error: 'Recurrent templates are not editable. Edit instances instead.' },
        { status: 403 },
      );
    }

    const nextStatus = normalizedStatus || task.status;
    const isTerminalStatus = (value?: TaskStatus) =>
      value === TaskStatus.DONE ||
      value === TaskStatus.COLLECTED ||
      value === TaskStatus.FAILED;
    const isRevertingFromTerminal =
      isTerminalStatus(task.status) && Boolean(status) && !isTerminalStatus(nextStatus);

    const preserveDoneAt =
      !status
        ? task.doneAt
        : isRevertingFromTerminal
          ? undefined
          : isTerminalStatus(nextStatus)
            ? (task.doneAt ?? getUTCNow())
            : task.doneAt;

    const preserveCollectedAt =
      !status
        ? task.collectedAt
        : isRevertingFromTerminal
          ? undefined
          : nextStatus === TaskStatus.COLLECTED
            ? (task.collectedAt ?? getUTCNow())
            : task.collectedAt;

    const incomingDoneAt = explicitDoneAt;
    const incomingCollectedAt = explicitCollectedAt;

    const nextDoneAt = rawDoneAt !== undefined ? incomingDoneAt : preserveDoneAt;
    const nextCollectedAt = rawCollectedAt !== undefined ? incomingCollectedAt : preserveCollectedAt;
    const nextProgress = progress !== undefined ? Number(progress) : isRevertingFromTerminal ? 0 : task.progress;

    const updatedTask: Task = {
      ...task,
      ...(status ? { status: nextStatus } : {}),
      ...(nextProgress !== undefined ? { progress: nextProgress } : {}),
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(characterId !== undefined ? { characterId } : {}),
      ...(siteId !== undefined ? { siteId } : {}),
      ...(priority !== undefined ? { priority } : {}),
      ...(cost !== undefined ? { cost: Number(cost) } : {}),
      ...(revenue !== undefined ? { revenue: Number(revenue) } : {}),
      ...(ownerId !== undefined ? { ownerId } : {}),
      ...(rawDoneAt !== undefined || status ? { doneAt: nextDoneAt } : {}),
      ...(rawCollectedAt !== undefined || status ? { collectedAt: nextCollectedAt } : {}),
      ...(isRevertingFromTerminal ? { isCollected: false } : {}),
      updatedAt: new Date(),
    };

    const saved = await upsertTask(updatedTask);

    return NextResponse.json({
      success: true,
      task: saved,
    });
  } catch (error) {
    console.error('[M2M Tasks PATCH] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
