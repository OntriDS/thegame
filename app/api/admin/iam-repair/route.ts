import { NextResponse } from 'next/server';
import { iamService } from '@/lib/iam-service';
import { CharacterRole } from '@/types/enums';
import { kvSet } from '@/data-store/kv';
import { buildAccountByEmailKey } from '@/lib/keys';

/**
 * IAM Repair Endpoint
 * Re-links the single Founder account and character, and ensures email mapping exists.
 */
export async function POST(req: Request) {
  try {
    const { passphrase } = await req.json();
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

    // Find the founder account.
    const passphraseAccounts = accounts.filter(a => a.passphraseFlag);
    let founderAccount = passphraseAccounts.length === 1 ? passphraseAccounts[0] : null;
    if (!founderAccount && accounts.length === 1) founderAccount = accounts[0];
    if (!founderAccount) {
      return NextResponse.json({ error: 'Founder account not found (ambiguous). Set FOUNDER_EMAIL to disambiguate.' }, { status: 400 });
    }

    // Find the founder character (prefer FOUNDER role).
    const founderCharacters = characters.filter(c => c.roles?.includes(CharacterRole.FOUNDER));
    let founderCharacter = founderCharacters.length === 1 ? founderCharacters[0] : null;
    if (!founderCharacter && characters.length === 1) founderCharacter = characters[0];
    if (!founderCharacter) {
      return NextResponse.json({ error: 'Founder character not found (ambiguous).' }, { status: 400 });
    }

    await iamService.assignCharacterToAccount(founderAccount.id, founderCharacter.id);

    // Ensure email mapping exists for the founder account.
    await kvSet(buildAccountByEmailKey(founderAccount.email), { accountId: founderAccount.id });

    return NextResponse.json({
      success: true,
      accountId: founderAccount.id,
      characterId: founderCharacter.id,
      email: founderAccount.email,
    });
  } catch (error: any) {
    console.error('[IAM Repair] Error:', error);
    return NextResponse.json({ error: error.message || 'IAM repair failed' }, { status: 500 });
  }
}
