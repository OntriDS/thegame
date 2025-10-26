// app/api/tasks/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { v4 as uuid } from 'uuid';
import type { Task } from '@/types/entities';
import { getAllTasks, upsertTask } from '@/data-store/datastore';
import { requireAdminAuth } from '@/lib/api-auth';

// Force dynamic rendering - this route accesses cookies
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const tasks = await getAllTasks();
  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    const body = (await req.json()) as Task;
    const task = {
      ...body,
      id: body.id || uuid(),
      links: body.links || [],
      createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
      updatedAt: new Date(),
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      doneAt: body.doneAt ? new Date(body.doneAt) : (body.status === 'Done' ? new Date() : undefined),
      collectedAt: body.collectedAt ? new Date(body.collectedAt) : undefined
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


