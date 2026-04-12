import { NextResponse, NextRequest } from 'next/server';
import { iamService, CharacterRole } from '@/lib/iam-service';
import { requireFounderAdminAuth, requireProvisioningM2MAuth } from '@/lib/api-auth';
import { getCharacterById } from '@/data-store/repositories/character.repo';

/**
 * Admin Accounts API — list + create accounts.
 * Characters come from the Game Data-Store; links via Rosetta Stone.
 */
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireFounderAdminAuth(req)) && !(await requireProvisioningM2MAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const accounts = await iamService.listAccounts();
    const enriched = await Promise.all(
      accounts.map(async (account) => {
        const character = await iamService.resolveCharacterForAccount(account.id);
        return {
          ...account,
          name: character?.name || account.name,
          character: character
            ? { id: character.id, name: character.name, roles: character.roles, accountId: character.accountId }
            : null,
        };
      })
    );

    const m2mApps = await iamService.listM2MApps();
    const m2mAccounts = m2mApps.map(app => ({
      id: app.appId,
      name: app.appId,
      email: `${app.appId}@m2m.system`,
      isActive: true,
      createdAt: app.createdAt,
      updatedAt: app.createdAt,
      type: 'm2m',
      character: { roles: [CharacterRole.AI_AGENT] },
    }));

    return NextResponse.json({
      accounts: [...enriched.filter(Boolean), ...m2mAccounts],
    });
  } catch (error: any) {
    console.error('[Admin Accounts API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireFounderAdminAuth(req)) && !(await requireProvisioningM2MAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, email, password, phone, characterId } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }
    if (!characterId) {
      return NextResponse.json({ error: 'characterId is required' }, { status: 400 });
    }

    const dsChar = await getCharacterById(characterId);
    if (!dsChar) {
      return NextResponse.json({ error: 'Character not found in Data-Store' }, { status: 400 });
    }

    const account = await iamService.createAccount({
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim(),
      password: password?.trim(),
    });

    await iamService.linkAccountToCharacter(account.id, characterId);

    return NextResponse.json({
      success: true,
      account: { ...account, characterId },
      character: { id: dsChar.id, name: dsChar.name, roles: dsChar.roles },
    });
  } catch (error: any) {
    console.error('[Admin Accounts API] Error creating account:', error);
    return NextResponse.json({ error: error.message || 'Failed to create account' }, { status: 500 });
  }
}
