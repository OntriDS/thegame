import { NextResponse } from 'next/server';
import { iamService, CharacterRole } from '@/lib/iam-service';

/**
 * Role Granting API Route (Admin Only)
 * Grants the PLAYER role to a character and triggers evolution.
 * 
 * SECURITY: Requires ADMIN_ACCESS_KEY in header for now (Phase 3 simplified admin).
 */
export async function POST(req: Request) {
  try {
    const adminKey = req.headers.get('x-admin-key');
    if (!adminKey || adminKey !== process.env.ADMIN_ACCESS_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { characterId, role } = await req.json();

    if (!characterId || !role) {
      return NextResponse.json({ error: 'characterId and role are required' }, { status: 400 });
    }

    if (!Object.values(CharacterRole).includes(role as CharacterRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const character = await iamService.getCharacterById(characterId);
    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Assign roles (includes Evolution Trigger inside iamService)
    const newRoles = [...character.roles, role as CharacterRole];
    const updatedCharacter = await iamService.assignCharacterRoles(characterId, newRoles);

    return NextResponse.json({
      success: true,
      character: updatedCharacter
    });

  } catch (error: any) {
    console.error('[IAM] Role Grant Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
