// app/api/players/[id]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getPlayerById, removePlayer } from '@/data-store/datastore';
import { requireAdminAuth } from '@/lib/api-auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminAuth(req))) return new NextResponse('Unauthorized', { status: 401 });
  const player = await getPlayerById(params.id);
  if (!player) return new NextResponse('Not Found', { status: 404 });
  return NextResponse.json(player);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminAuth(req))) return new NextResponse('Unauthorized', { status: 401 });
  await removePlayer(params.id);
  return new NextResponse(null, { status: 204 });
}
