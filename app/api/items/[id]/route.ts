// app/api/items/[id]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getItemById, removeItem } from '@/data-store/datastore';
import { requireAdminAuth } from '@/lib/api-auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminAuth(req))) return new NextResponse('Unauthorized', { status: 401 });
  const item = await getItemById(params.id);
  if (!item) return new NextResponse('Not Found', { status: 404 });
  return NextResponse.json(item);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminAuth(req))) return new NextResponse('Unauthorized', { status: 401 });
  await removeItem(params.id);
  return new NextResponse(null, { status: 204 });
}
