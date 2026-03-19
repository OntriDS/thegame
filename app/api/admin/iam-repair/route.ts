import { NextResponse } from 'next/server';
import { iamService } from '@/lib/iam-service';
import { CharacterRole } from '@/types/enums';
import { kvSet } from '@/data-store/kv';
import { buildAccountByEmailKey } from '@/lib/keys';

/**
 * IAM Repair — re-links Founder account ↔ character and ensures email mapping.
 *
 * - **POST** `{ "passphrase": "<ADMIN_ACCESS_KEY>" }` — preferred (secret not in URL).
 * - **GET** `?passphrase=` — convenient in browser; passphrase may appear in history/logs — rotate key after use.
 */
async function runRepair(passphrase: string | undefined): Promise<NextResponse> {
  const adminKey = process.env.ADMIN_ACCESS_KEY;

  if (!adminKey || passphrase !== adminKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accounts = await iamService.listAccounts();
  if (accounts.length === 0) {
    return NextResponse.json({ error: 'No IAM accounts found' }, { status: 404 });
  }

  const characters = await iamService.listCharacters();
  if (characters.length === 0) {
    return NextResponse.json({ error: 'No IAM characters found' }, { status: 404 });
  }

  const passphraseAccounts = accounts.filter(a => a.passphraseFlag);
  let founderAccount = passphraseAccounts.length === 1 ? passphraseAccounts[0] : null;
  if (!founderAccount && accounts.length === 1) founderAccount = accounts[0];
  if (!founderAccount) {
    return NextResponse.json(
      { error: 'Founder account not found (ambiguous). Set FOUNDER_EMAIL to disambiguate.' },
      { status: 400 }
    );
  }

  const founderCharacters = characters.filter(c => c.roles?.includes(CharacterRole.FOUNDER));
  let founderCharacter = founderCharacters.length === 1 ? founderCharacters[0] : null;
  if (!founderCharacter && characters.length === 1) founderCharacter = characters[0];
  if (!founderCharacter) {
    return NextResponse.json({ error: 'Founder character not found (ambiguous).' }, { status: 400 });
  }

  await iamService.assignCharacterToAccount(founderAccount.id, founderCharacter.id);
  await kvSet(buildAccountByEmailKey(founderAccount.email), { accountId: founderAccount.id });

  return NextResponse.json({
    success: true,
    accountId: founderAccount.id,
    characterId: founderCharacter.id,
    email: founderAccount.email,
  });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const passphrase =
      url.searchParams.get('passphrase') ??
      url.searchParams.get('key') ??
      undefined;
    return await runRepair(passphrase ?? undefined);
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
          {
            error:
              'Invalid JSON. Send {"passphrase":"..."} or open GET /api/admin/iam-repair?passphrase=YOUR_KEY in the browser (less safe).',
          },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        {
          error:
            'Missing body. Use POST with JSON {"passphrase":"..."} or GET ?passphrase=...',
        },
        { status: 400 }
      );
    }

    return await runRepair(passphrase);
  } catch (error: any) {
    console.error('[IAM Repair POST] Error:', error);
    return NextResponse.json({ error: error.message || 'IAM repair failed' }, { status: 500 });
  }
}
