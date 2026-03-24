// app/api/auth/check/route.ts
// Multi-User Auth Check Endpoint
// Returns authenticated user info with permissions

import { NextRequest, NextResponse } from 'next/server';
import { iamService } from '@/lib/iam-service';
import { AuthCheckResponse } from '@/types/auth-types';


export async function GET(request: NextRequest) {
  try {
    // Check for both legacy and multi-user cookies
    const token = request.cookies.get('auth_session')?.value || request.cookies.get('admin_session')?.value;

    if (!token) {
      return NextResponse.json<AuthCheckResponse>(
        { authenticated: false, error: 'No session token' },
        { status: 401 }
      );
    }

    // Verify the JWT token using centralized IAM service
    const user = await iamService.verifyJWT(token);

    if (!user) {
      return NextResponse.json<AuthCheckResponse>(
        { authenticated: false, error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    // ✅ Get permissions for user
    const permissions = iamService.getPermissions(user);

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
