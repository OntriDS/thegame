// app/api/init/player-one/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { ensurePlayerOne } from '@/lib/game-mechanics/player-one-init';
import { 
  getAllPlayers, 
  getAllCharacters, 
  upsertPlayer, 
  upsertCharacter 
} from '@/data-store/datastore';

// Force dynamic rendering - this route accesses cookies
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Ensure Player One exists using the updated function
    await ensurePlayerOne(
      getAllPlayers,
      getAllCharacters,
      () => Promise.resolve([]), // getAccounts - not implemented yet
      upsertPlayer,
      upsertCharacter,
      () => Promise.resolve({} as any), // upsertAccount - not implemented yet
      false, // force
      { skipLogging: false }
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Player One initialization completed' 
    });
  } catch (error) {
    console.error('[Init API] Failed to ensure Player One:', error);
    return NextResponse.json(
      { error: 'Failed to initialize Player One' }, 
      { status: 500 }
    );
  }
}
