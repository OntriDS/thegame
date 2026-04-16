// app/api/auth/check/route.ts
// Multi-User Auth Check Endpoint
// Returns authenticated user info with permissions

import { NextRequest, NextResponse } from 'next/server';
import { iamService } from '@/lib/iam-service';
import { AuthCheckPayload } from '@/types/auth-types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('iam_session')?.value;

    if (!token) {
      return NextResponse.json<AuthCheckPayload>(
        { authenticated: false, user: null, permissions: null, error: 'No session token' },
        { status: 401 }
      );
    }

    // Verify the JWT token using centralized IAM service
    const user = await iamService.verifyJWT(token);

    if (!user) {
      return NextResponse.json<AuthCheckPayload>(
        { authenticated: false, user: null, permissions: null, error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    const permissions = {
      roles: user.roles,
    };

    return NextResponse.json<AuthCheckPayload>({
      authenticated: true,
      user,
      permissions,
    });
  } catch (error) {
    console.error('[Auth Check API] Error:', error);
    return NextResponse.json<AuthCheckPayload>(
      { authenticated: false, user: null, permissions: null, error: 'Auth check failed' },
      { status: 500 }
    );
  }
}
