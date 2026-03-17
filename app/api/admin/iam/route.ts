import { NextResponse } from 'next/server';
import { iamService, CharacterRole } from '@/lib/iam-service';
import { kvSMembers, kvGet } from '@/data-store/kv';
import { IAM_ACCOUNTS_INDEX, IAM_CHARACTERS_INDEX, IAM_PLAYERS_INDEX, buildM2MKey } from '@/lib/keys';

/**
 * IAM System Console Data API (Admin Only)
 * Provides a Snapshot of the Digital Universe Identity Layer.
 */
export async function GET(req: Request) {
  try {
    const adminKey = req.headers.get('x-admin-key');
    if (!adminKey || adminKey !== process.env.ADMIN_ACCESS_KEY) {
      // Also allow if they have a valid admin session cookie
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      const token = cookieStore.get('admin_session')?.value;
      const user = token ? await iamService.verifyJWT(token) : null;
      
      if (!user || (!user.roles.includes(CharacterRole.FOUNDER) && !user.roles.includes(CharacterRole.ADMIN))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // 1. Fetch Accounts
    const accountIds = await kvSMembers(IAM_ACCOUNTS_INDEX);
    const accounts = await Promise.all(accountIds.map(id => iamService.getAccountById(id)));

    // 2. Fetch Characters
    const characterIds = await kvSMembers(IAM_CHARACTERS_INDEX);
    const characters = await Promise.all(characterIds.map(id => iamService.getCharacterById(id)));

    // 3. Fetch Players
    const playerIds = await kvSMembers(IAM_PLAYERS_INDEX);
    const players = await Promise.all(playerIds.map(id => iamService.getPlayerById(id)));

    // 4. Fetch M2M (Systems) - Currently we scan known IDs or just list pixelbrain if it exists
    const systems = [];
    const pixelbrainM2M = await kvGet(buildM2MKey('pixelbrain'));
    if (pixelbrainM2M) systems.push(pixelbrainM2M);

    return NextResponse.json({
      accounts: accounts.filter(Boolean),
      characters: characters.filter(Boolean),
      players: players.filter(Boolean),
      systems,
      stats: {
        totalAccounts: accounts.length,
        totalCharacters: characters.length,
        totalPlayers: players.length
      }
    });

  } catch (error: any) {
    console.error('[IAM] Console API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
