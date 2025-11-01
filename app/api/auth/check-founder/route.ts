import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import type { Character } from '@/types/entities';

// Force dynamic rendering since this route accesses request cookies
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Auth already verified by requireAdminAuth middleware
    if (!(await requireAdminAuth(request))) {
      return NextResponse.json({ isAuthorized: false, error: 'Unauthorized' }, { status: 401 });
    }

    // V0.1 Simple check: authenticated admin = Player One = FOUNDER
    const { kvGet } = await import('@/data-store/kv');
    const { buildDataKey } = await import('@/data-store/keys');
    const { PLAYER_ONE_ID, CharacterRole } = await import('@/types/enums');
    
    const characterData = await kvGet<any>(buildDataKey('character', PLAYER_ONE_ID));
    const character = characterData as Character;
    
    const isAuthorized = character?.roles?.includes(CharacterRole.FOUNDER);
    
    return NextResponse.json({
      isAuthorized,
      characterId: isAuthorized ? PLAYER_ONE_ID : undefined
    });
  } catch (error) {
    console.error('[Auth Check Founder] Error:', error);
    return NextResponse.json({ isAuthorized: false, error: 'Auth check failed' }, { status: 500 });
  }
}

