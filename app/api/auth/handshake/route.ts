import { NextResponse } from 'next/server';
import { iamService } from '@/lib/iam-service';

/**
 * Handshake Consumption API Route
 * Consumes a single-use token to issue a local session.
 */
export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    // Consume token (Audience is 'thegame')
    const user = await iamService.consumeHandshakeToken(token, 'thegame');

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired handshake token' }, { status: 401 });
    }

    // Success! Generate local JWT and set cookie
    const localToken = await iamService.generateJWT(user);

    const response = NextResponse.json({ success: true, user });

  response.cookies.set('iam_session', localToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24
    });

    return response;

  } catch (error: any) {
    console.error('[Auth] Handshake error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
