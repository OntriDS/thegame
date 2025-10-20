// app/api/characters/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { v4 as uuid } from 'uuid';
import type { Character } from '@/types/entities';
import { getAllCharacters, upsertCharacter } from '@/data-store/datastore';
import { requireAdminAuth } from '@/lib/api-auth';

// Force dynamic rendering since this route accesses request cookies for auth
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const characters = await getAllCharacters();
  return NextResponse.json(characters);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await req.json()) as Character;
  const character: Character = { 
    ...body, 
    id: body.id || uuid(), 
    createdAt: body.createdAt ? new Date(body.createdAt) : new Date(), 
    updatedAt: new Date(), 
    links: body.links || [] 
  };
  const saved = await upsertCharacter(character);
  return NextResponse.json(saved);
}
