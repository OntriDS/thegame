// app/api/tasks/[id]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getTaskById, removeTask } from '@/data-store/datastore';
import { requireAdminAuth } from '@/lib/api-auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminAuth(req))) return new NextResponse('Unauthorized', { status: 401 });
  const t = await getTaskById(params.id);
  if (!t) return new NextResponse('Not Found', { status: 404 });
  return NextResponse.json(t);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminAuth(req))) return new NextResponse('Unauthorized', { status: 401 });
  await removeTask(params.id);
  return new NextResponse(null, { status: 204 });
}


