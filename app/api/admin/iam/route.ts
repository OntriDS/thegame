import { NextResponse, NextRequest } from 'next/server';
import { iamService } from '@/lib/iam-service';
import { kvSMembers } from '@/data-store/kv';
import { IAM_ACCOUNTS_INDEX } from '@/lib/keys';
import { getAllCharacters } from '@/data-store/repositories/character.repo';
import { getAllPlayers } from '@/data-store/repositories/player.repo';
import { CharacterRole } from '@/types/enums';

export const dynamic = 'force-dynamic';

/**
 * IAM System Console Data API (Admin Only)
 * Provides a snapshot of the Digital Universe Identity Layer.
 * Characters come from the Game Data-Store (single source of truth).
 */
export async function GET(req: NextRequest) {
  try {
    const adminKey = req.headers.get('x-admin-key');
    if (!adminKey || adminKey !== process.env.ADMIN_ACCESS_KEY) {
      const token = req.cookies.get('admin_session')?.value || req.cookies.get('auth_session')?.value;
      const user = token ? await iamService.verifyJWT(token) : null;

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized: Session invalid or expired' }, { status: 401 });
      }

      const hasPermission = user.roles.some((role) => String(role).toLowerCase() === CharacterRole.FOUNDER.toLowerCase());
      if (!hasPermission) {
        return NextResponse.json({ error: 'Unauthorized: Insufficient permissions' }, { status: 401 });
      }
    }

    const accountIds = await kvSMembers(IAM_ACCOUNTS_INDEX);
    const accounts = await Promise.all(accountIds.map(id => iamService.getAccountById(id)));

    const characters = await getAllCharacters();

    const players = await getAllPlayers();

    const m2mRaw = await iamService.listM2MApps();
    const systems = m2mRaw.map(({ appId, createdAt }) => ({ appId, createdAt }));

    return NextResponse.json({
      accounts: accounts.filter(Boolean),
      characters: characters.filter(Boolean),
      players: players.filter(Boolean),
      systems,
      stats: {
        totalAccounts: accounts.length,
        totalCharacters: characters.length,
        totalPlayers: players.length,
      },
    });
  } catch (error: any) {
    console.error('[IAM] Console API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
