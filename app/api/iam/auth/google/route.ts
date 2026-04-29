import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { iamService } from '@/lib/iam-service';
import { upsertCharacter } from '@/data-store/datastore';
import { CharacterRole } from '@/types/enums';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    
    // 1. Verify Google ID Token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return NextResponse.json({ error: 'Invalid Google token' }, { status: 401 });
    }

    const email = payload.email.toLowerCase();
    const name = payload.name || 'User';

    // 2. Resolve or Provision User
    let account = await iamService.getAccountByEmail(email);
    let character;

    if (!account) {
      console.log(`[Google Auth] Provisioning new account for: ${email}`);
      
      // Create Character
      const newCharacter = await upsertCharacter({
        name: name,
        roles: [CharacterRole.CUSTOMER],
        contactEmail: email,
        isActive: true,
      } as any);

      // Create Account
      account = await iamService.createAccount({
        name: name,
        email: email,
      });

      // Link them
      await iamService.linkAccountToCharacter(account.id, newCharacter.id);
      character = newCharacter;
    } else {
      character = await iamService.resolveCharacterForAccount(account.id);
    }

    if (!character) {
      return NextResponse.json({ error: 'Failed to resolve character' }, { status: 500 });
    }

    // 3. Mint JWT Session
    const authUser = {
      userId: account.id, // required by some old logic
      accountId: account.id,
      username: account.name,
      email: account.email,
      characterId: character.id,
      roles: character.roles,
      isActive: account.isActive
    };

    const sessionToken = await iamService.generateJWT(authUser);

    // 4. Set Cookie and Return
    const response = NextResponse.json({
      success: true,
      user: authUser,
      token: sessionToken,
      next: '/admin' // Or whatever default is appropriate
    });

    response.cookies.set('iam_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    console.log(`[Google Auth API] ✅ Authentication successful for: ${email}`);
    return response;

  } catch (error) {
    console.error('[Google Auth API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
