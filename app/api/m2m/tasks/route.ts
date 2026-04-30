import { NextResponse, NextRequest } from 'next/server';
import { iamService } from '@/lib/iam-service';
import { TaskStatus, TaskType, EntityType } from '@/types/enums';
import { getActiveTasks, getTaskById, upsertTask } from '@/data-store/datastore';
import type { Task } from '@/types/entities';

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

    if (!ownerId) {
      return NextResponse.json(
        { success: false, error: 'ownerId is required' },
        { status: 400 },
      );
    }

    // Fetch active tasks and filter by owner
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
    const { id, status, progress, description, characterId, siteId, priority, cost, revenue, ownerId } = body;

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
    if (task.type === TaskType.RECURRENT_TEMPLATE && (description || cost || revenue || priority || ownerId)) {
       return NextResponse.json(
        { success: false, error: 'Recurrent templates are not editable. Edit instances instead.' },
        { status: 403 },
      );
    }

    const updatedTask: Task = {
      ...task,
      ...(status ? { status: status as TaskStatus } : {}),
      ...(progress !== undefined ? { progress: Number(progress) } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(characterId !== undefined ? { characterId } : {}),
      ...(siteId !== undefined ? { siteId } : {}),
      ...(priority !== undefined ? { priority } : {}),
      ...(cost !== undefined ? { cost: Number(cost) } : {}),
      ...(revenue !== undefined ? { revenue: Number(revenue) } : {}),
      ...(ownerId !== undefined ? { ownerId } : {}),
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
