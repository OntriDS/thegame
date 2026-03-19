import { NextResponse, NextRequest } from 'next/server';
import { v4 as uuid } from 'uuid';
import { requireAdminAuth } from '@/lib/api-auth';
import { CHARACTER_ROLE_TYPES } from '@/types/enums';
import { getAllCharacters, upsertCharacter } from '@/data-store/datastore';
import type { Character } from '@/types/entities';

export const dynamic = 'force-dynamic';

const SPECIAL_ROLES = new Set(CHARACTER_ROLE_TYPES.SPECIAL as readonly string[]);

/**
 * GET /api/characters
 * Returns characters from the Game Data-Store.
 * If ?filter=special, only characters with at least one SPECIAL role are returned.
 * The Accounts modal should always use ?filter=special.
 */
export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const filter = req.nextUrl.searchParams.get('filter');
  let characters = await getAllCharacters();

  if (filter === 'special') {
    characters = characters.filter(c =>
      c.roles?.some(role => SPECIAL_ROLES.has(role as string))
    );
  }

  return NextResponse.json(characters);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as Character;
    const character = {
      ...body,
      id: body.id || uuid(),
      links: body.links || [],
      createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
      updatedAt: new Date(),
      lastActiveAt: body.lastActiveAt ? new Date(body.lastActiveAt) : new Date(),
    };
    const saved = await upsertCharacter(character);
    return NextResponse.json(saved);
  } catch (error: any) {
    console.error('[API] Error saving character:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save character' },
      { status: 500 }
    );
  }
}
