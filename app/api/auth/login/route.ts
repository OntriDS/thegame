// app/api/auth/login/route.ts
// Multi-User Login Endpoint
// Supports username/email login with proper user management

import { NextResponse, NextRequest } from 'next/server';
import { LoginRequest, LoginResponse } from '@/types/auth-types';
import { AuthService } from '@/lib/auth-service';


export async function POST(req: NextRequest) {
  try {
    const body: LoginRequest = await req.json();
    const { username, password, rememberMe } = body;

    console.log('[Login API] Attempting login for:', username);

    // ✅ Use AuthService (single source of truth)
    const session = await AuthService.login(username, password, rememberMe);

    const cookieOptions = {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7, // 30 days or 7 days
    };

    const response = NextResponse.json<LoginResponse>({
      success: true,
      user: session.user,
    });
    response.cookies.set('auth_session', session.token, cookieOptions);

    console.log('[Login API] ✅ Login successful');
    return response;
  } catch (error) {
    console.error('[Login API] Error:', error);
    return NextResponse.json<LoginResponse>(
      { success: false, error: error instanceof Error ? error.message : 'Login failed' },
      { status: 500 }
    );
  }
}
