// app/api/characters/[id]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getCharacterById, removeCharacter } from '@/data-store/datastore';
import { requireAdminAuth } from '@/lib/api-auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminAuth(req))) return new NextResponse('Unauthorized', { status: 401 });
  const character = await getCharacterById(params.id);
  if (!character) return new NextResponse('Not Found', { status: 404 });
  return NextResponse.json(character);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminAuth(req))) return new NextResponse('Unauthorized', { status: 401 });
  await removeCharacter(params.id);
  return new NextResponse(null, { status: 204 });
}
