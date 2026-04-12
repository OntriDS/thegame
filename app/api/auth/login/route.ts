import { NextResponse } from 'next/server';
import { iamService } from '@/lib/iam-service';

/**
 * Unified Login API Route
 * Handles Passphrase (Founder) and Email/Password (Team/Users)
 * Resolves via the single IAM Service and sets a unified session cookie.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Support 'email' natively, fallback to 'username' if the frontend hasn't been updated yet
    const { passphrase, email, username, password, rememberMe } = body;
    const loginEmail = email || username;

    let result;

    // 1. Route to appropriate authentication method
    if (passphrase) {
      console.log('[Login API] Attempting passphrase authentication');
      result = await iamService.authenticatePassphrase(passphrase);
    } 
    else if (loginEmail && password) {
      console.log(`[Login API] Attempting email/password authentication for: ${loginEmail}`);
      result = await iamService.authenticateEmailPassword(loginEmail, password);
    } 
    else {
      return NextResponse.json(
        { error: 'Either passphrase or email/password is required' },
        { status: 400 }
      );
    }

    // 2. Handle Authentication Failure
    if (!result.success || !result.token || !result.user) {
      return NextResponse.json(
        { error: result.error || 'Authentication failed' },
        { status: 401 }
      );
    }

    // 3. Configure Session Duration (7 days default, 30 days if remembered)
    const cookieMaxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7;

    const response = NextResponse.json({
      success: true,
      user: result.user,
      next: '/admin'
    });

  // 4. Set the SINGLE Canonical Auth Cookie
  response.cookies.set('iam_session', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: cookieMaxAge
    });

    console.log(`[Login API] ✅ Authentication successful for: ${result.user.email}`);
    return response;

  } catch (error: any) {
    console.error('[Login API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}