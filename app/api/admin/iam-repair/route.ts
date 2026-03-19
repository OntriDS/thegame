import { NextResponse } from 'next/server';
import { iamService } from '@/lib/iam-service';
import { CharacterRole, FOUNDER_CHARACTER_ID } from '@/types/enums';
import { kvSet } from '@/data-store/kv';
import { buildAccountByEmailKey } from '@/lib/keys';
import { getAllCharacters } from '@/data-store/repositories/character.repo';

/**
 * IAM Repair — re-links the Founder IAM account to the Founder
 * Data-Store character via ACCOUNT_CHARACTER Rosetta Stone link.
 *
 * GET  ?passphrase=KEY  (browser)
 * POST {"passphrase":"KEY"}
 */
async function runRepair(passphrase: string | undefined): Promise<NextResponse> {
  const adminKey = process.env.ADMIN_ACCESS_KEY;
  if (!adminKey || passphrase !== adminKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Find or create founder IAM account (repair vs genesis)
  let genesisCreated = false;
  const accounts = await iamService.listAccounts();
  let founderAccount: Awaited<ReturnType<typeof iamService.getAccountById>>;

  if (accounts.length === 0) {
    const founderEmail = process.env.FOUNDER_EMAIL?.trim().toLowerCase();
    if (!founderEmail) {
      return NextResponse.json(
        {
          error:
            'Empty IAM: set FOUNDER_EMAIL in env, then call iam-repair again to create the Genesis founder account.',
        },
        { status: 500 }
      );
    }

    console.log('[IAM Repair] GENESIS: no iam:index:accounts — creating founder IAM account');
    const displayName = process.env.FOUNDER_DISPLAY_NAME?.trim() || 'Founder';
    const created = await iamService.createAccount({
      name: displayName,
      email: founderEmail,
      passphraseFlag: true,
    });
    founderAccount = await iamService.updateAccount(created.id, { isVerified: true });
    genesisCreated = true;
  } else {
    const passphraseAccounts = accounts.filter(a => a.passphraseFlag);
    founderAccount =
      passphraseAccounts.length === 1 ? passphraseAccounts[0] : null;
    if (!founderAccount && accounts.length === 1) founderAccount = accounts[0];
    if (!founderAccount) {
      return NextResponse.json(
        { error: 'Founder account not found (ambiguous). Set FOUNDER_EMAIL to disambiguate.' },
        { status: 400 }
      );
    }
  }

  if (!founderAccount) {
    return NextResponse.json({ error: 'Founder account could not be resolved' }, { status: 500 });
  }

  // 2. Find founder character in the Game Data-Store
  const dsCharacters = await getAllCharacters();
  if (dsCharacters.length === 0) {
    return NextResponse.json(
      { error: 'No characters found in Data-Store (thegame:data:character:*).' },
      { status: 404 }
    );
  }

  let founderCharacter = dsCharacters.find(c => c.id === FOUNDER_CHARACTER_ID) ?? null;
  if (!founderCharacter) {
    const byRole = dsCharacters.filter(c => c.roles?.includes(CharacterRole.FOUNDER));
    founderCharacter = byRole.length === 1 ? byRole[0] : null;
  }
  if (!founderCharacter && dsCharacters.length === 1) {
    founderCharacter = dsCharacters[0];
  }
  if (!founderCharacter) {
    return NextResponse.json(
      { error: `Founder character not found. Expected id=${FOUNDER_CHARACTER_ID} or a single FOUNDER-role character.` },
      { status: 400 }
    );
  }

  // 3. Link account → character via Rosetta Stone
  await iamService.linkAccountToCharacter(founderAccount.id, founderCharacter.id);

  // 4. Ensure email mapping
  await kvSet(buildAccountByEmailKey(founderAccount.email), { accountId: founderAccount.id });

  return NextResponse.json({
    success: true,
    genesis: genesisCreated,
    accountId: founderAccount.id,
    characterId: founderCharacter.id,
    email: founderAccount.email,
    message: genesisCreated
      ? 'Genesis IAM account created and linked to founder character. Set a password in Admin → Accounts if you use email login.'
      : 'Founder account linked to founder character.',
  });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const passphrase = url.searchParams.get('passphrase') ?? url.searchParams.get('key') ?? undefined;
    return await runRepair(passphrase);
  } catch (error: any) {
    console.error('[IAM Repair GET] Error:', error);
    return NextResponse.json({ error: error.message || 'IAM repair failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const text = await req.text();
    let passphrase: string | undefined;

    if (text.trim()) {
      try {
        const body = JSON.parse(text) as { passphrase?: string };
        passphrase = body.passphrase;
      } catch {
        return NextResponse.json(
          { error: 'Invalid JSON. Send {"passphrase":"..."} or GET ?passphrase=YOUR_KEY' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Missing body. Use POST {"passphrase":"..."} or GET ?passphrase=...' },
        { status: 400 }
      );
    }

    return await runRepair(passphrase);
  } catch (error: any) {
    console.error('[IAM Repair POST] Error:', error);
    return NextResponse.json({ error: error.message || 'IAM repair failed' }, { status: 500 });
  }
}
