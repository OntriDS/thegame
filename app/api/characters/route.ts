import { NextResponse, NextRequest } from 'next/server';
import { v4 as uuid } from 'uuid';
import { requireAdminAuth } from '@/lib/api-auth';
import { iamService } from '@/lib/iam-service';
import { CharacterRole } from '@/types/enums';
import { characterHasSpecialRole, normalizeCharacterRoles } from '@/lib/character-roles';
import { getAllCharacters, getCharacterById, upsertCharacter } from '@/data-store/datastore';
import type { Character } from '@/types/entities';

export const dynamic = 'force-dynamic';

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
    characters = characters.filter(c => characterHasSpecialRole(c.roles));
  }

  return NextResponse.json(characters);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token =
    req.headers.get('Authorization')?.startsWith('Bearer ')
      ? req.headers.get('Authorization')!.substring(7).trim()
      : req.cookies.get('auth_session')?.value || req.cookies.get('admin_session')?.value;

  try {
    const body = (await req.json()) as Character;
    const tokenUser = token ? await iamService.verifyJWT(token) : null;

    if (!tokenUser || !tokenUser.isActive) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isFounder = tokenUser.roles.includes(CharacterRole.FOUNDER);
    const normalizedIncomingRoles = normalizeCharacterRoles(body.roles);
    const existingCharacter = body.id ? await getCharacterById(body.id) : null;
    const existingRoles = existingCharacter ? existingCharacter.roles : [];

    const rolesCanChange =
      normalizedIncomingRoles.length === existingRoles.length &&
      new Set(existingRoles).size === new Set(normalizedIncomingRoles).size &&
      normalizedIncomingRoles.every(role => existingRoles.includes(role));

    if (!isFounder && !rolesCanChange) {
      return NextResponse.json(
        { error: 'Forbidden: Only founders can change character roles' },
        { status: 403 }
      );
    }

    const character = {
      ...body,
      roles: normalizedIncomingRoles,
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
