import { NextResponse } from 'next/server';
import { iamService } from '@/lib/iam-service';

/**
 * Login API Route
 * Handles both passphrase authentication (for Founder/Team) and email/password authentication (for regular users).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { passphrase, username, password, rememberMe } = body;

    let result;

    // Route to appropriate authentication method based on request type
    if (passphrase) {
      // Passphrase login for Founder/Team
      console.log('[Login API] Attempting passphrase authentication');
      result = await iamService.authenticatePassphrase(passphrase);
    } else if (username && password) {
      // Email/password login for regular users
      console.log('[Login API] Attempting email/password authentication for:', username);
      result = await iamService.authenticateEmailPassword(username, password);
    } else {
      return NextResponse.json(
        { error: 'Either passphrase or username/password required' },
        { status: 400 }
      );
    }

    if (!result.success || !result.token || !result.user) {
      return NextResponse.json(
        { error: result.error || 'Authentication failed' },
        { status: 401 }
      );
    }

    // Calculate cookie expiry based on rememberMe preference
    const cookieMaxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24; // 30 days or 1 day

    // Set cookie with user info and permissions
    const response = NextResponse.json({
      success: true,
      user: result.user,
      next: '/admin'
    });

    response.cookies.set('admin_session', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: cookieMaxAge
    });

    // Also set legacy auth_session for compatibility
    response.cookies.set('auth_session', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: cookieMaxAge
    });

    console.log('[Login API] ✅ Authentication successful for:', result.user.username);
    return response;

  } catch (error: any) {
    console.error('[Login API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
