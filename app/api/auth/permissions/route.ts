// app/api/auth/permissions/route.ts
// Multi-User Permissions Endpoint
// Returns role-based permission checks for authenticated user

import { NextRequest, NextResponse } from 'next/server';
import { iamService } from '@/lib/iam-service';
import { AuthPermissionsPayload } from '@/types/auth-types';

export const dynamic = 'force-dynamic';

type PermissionsPayload = {
  permissions: AuthPermissionsPayload;
};

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('iam_session')?.value;

    if (!token) {
      return NextResponse.json<PermissionsPayload>(
        { permissions: { roles: [] } },
        { status: 401 }
      );
    }

    // Verify the JWT token using centralized IAM service
    const user = await iamService.verifyJWT(token);

    if (!user) {
      return NextResponse.json<PermissionsPayload>(
        { permissions: { roles: [] } },
        { status: 401 }
      );
    }

    // ✅ Get permissions for user using centralized IAM logic
    return NextResponse.json<PermissionsPayload>({ 
      permissions: {
        roles: user.roles,
      }
    });
  } catch (error) {
    console.error('[Permissions API] Error:', error);
    return NextResponse.json<PermissionsPayload>(
      { permissions: { roles: [] } },
      { status: 500 }
    );
  }
}
