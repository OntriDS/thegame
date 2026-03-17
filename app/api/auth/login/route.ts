import { NextResponse } from 'next/server';
import { iamService } from '@/lib/iam-service';

/**
 * Login API Route
 * Handles passphrase authentication for the Founder/Team.
 */
export async function POST(req: Request) {
  try {
    const { passphrase } = await req.json();

    if (!passphrase) {
      return NextResponse.json({ error: 'Passphrase required' }, { status: 400 });
    }

    const result = await iamService.authenticatePassphrase(passphrase);

    if (!result.success || !result.token) {
      return NextResponse.json({ error: result.error || 'Authentication failed' }, { status: 401 });
    }

    // Set cookie
    const response = NextResponse.json({
      success: true,
      user: result.user
    });

    response.cookies.set('admin_session', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    // Also set legacy auth_session for compatibility if needed
    response.cookies.set('auth_session', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24
    });

    return response;

  } catch (error: any) {
    console.error('[Auth] Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
