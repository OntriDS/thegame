// app/api/auth/check/route.ts
// Multi-User Auth Check Endpoint
// Returns authenticated user info with permissions

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth-service';
import { AuthCheckResponse, PermissionsResponse } from '@/types/auth-types';


export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_session')?.value;

    if (!token) {
      return NextResponse.json<AuthCheckResponse>(
        { authenticated: false, error: 'No session token' },
        { status: 401 }
      );
    }

    // ✅ Verify session and get user info
    const user = await AuthService.verifySession(token);

    if (!user) {
      return NextResponse.json<AuthCheckResponse>(
        { authenticated: false, error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    // ✅ Get permissions for user
    const permissions = AuthService.getPermissions(user);

    console.log('[Auth Check API] ✅ Authenticated:', user.username, 'Roles:', user.roles);

    return NextResponse.json<AuthCheckResponse>({
      authenticated: true,
      user,
      permissions,
    });
  } catch (error) {
    console.error('[Auth Check API] Error:', error);
    return NextResponse.json<AuthCheckResponse>(
      { authenticated: false, error: 'Auth check failed' },
      { status: 500 }
    );
  }
}
