import { NextResponse } from 'next/server';
import { iamService, CharacterRole } from '@/lib/iam-service';

/**
 * TEMPORARY API Route for IAM System Genesis
 * Creates the Founder account, character, and player.
 * 
 * SECURITY: Requires ADMIN_ACCESS_KEY in the request body.
 * DELETE THIS FILE AFTER USE.
 */
export async function POST(req: Request) {
  try {
    const { passphrase } = await req.json();

    if (!passphrase || passphrase !== process.env.ADMIN_ACCESS_KEY) {
      return NextResponse.json({ error: 'Unauthorized genesis' }, { status: 401 });
    }

    console.log('[IAM Gen] Starting genesis sequence...');

    // 1. Create Founder Account
    const founderAccount = await iamService.createAccount({
      name: 'Akiles',
      email: process.env.FOUNDER_EMAIL || 'akiles@digital-universe.com',
      passphraseFlag: true, // Founder uses passphrase
    });
    console.log('[IAM Gen] ✅ Account created:', founderAccount.id);

    // 2. Create Founder Character
    const founderCharacter = await iamService.createCharacter(founderAccount.id, {
      name: 'Akiles Founder',
      roles: [CharacterRole.FOUNDER, CharacterRole.ADMIN, CharacterRole.TEAM, CharacterRole.PLAYER],
      profile: {
        bio: 'Creator of Digital Universe',
      }
    });
    console.log('[IAM Gen] ✅ Character created:', founderCharacter.id);

    // 3. Create Player Entity
    const founderPlayer = await iamService.createPlayer(founderCharacter.id);
    console.log('[IAM Gen] ✅ Player created:', founderPlayer.id);

    return NextResponse.json({
      success: true,
      message: 'IAM Genesis complete!',
      data: {
        accountId: founderAccount.id,
        characterId: founderCharacter.id,
        playerId: founderPlayer.id
      }
    });

  } catch (error: any) {
    console.error('[IAM Gen] Error during genesis:', error);
    return NextResponse.json({ 
      error: 'Genesis failed', 
      details: error.message 
    }, { status: 500 });
  }
}
