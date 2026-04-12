// app/api/auth/permissions/route.ts
// Multi-User Permissions Endpoint
// Returns role-based permission checks for authenticated user

import { NextRequest, NextResponse } from 'next/server';
import { iamService } from '@/lib/iam-service';
import { PermissionsResponse } from '@/types/auth-types';
import { CharacterRole } from '@/types/enums';

export const dynamic = 'force-dynamic';

type PermissionsPayload = {
  permissions: {
    isFounder: boolean;
    roles: string[];
  };
};

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('iam_session')?.value;

    if (!token) {
      return NextResponse.json<PermissionsResponse>(
        { can: () => false, hasRole: () => false, hasAnyRole: () => false },
        { status: 401 }
      );
    }

    // Verify the JWT token using centralized IAM service
    const user = await iamService.verifyJWT(token);

    if (!user) {
      return NextResponse.json<PermissionsResponse>(
        { can: () => false, hasRole: () => false, hasAnyRole: () => false },
        { status: 401 }
      );
    }

    // ✅ Get permissions for user using centralized IAM logic
    const permissions = iamService.getPermissions(user);
    
    return NextResponse.json<PermissionsPayload>({ 
      permissions: {
        isFounder: permissions.hasRole(CharacterRole.FOUNDER),
        roles: user.roles
      }
    });
  } catch (error) {
    console.error('[Permissions API] Error:', error);
    return NextResponse.json<PermissionsResponse>(
      { can: () => false, hasRole: () => false, hasAnyRole: () => false },
      { status: 500 }
    );
  }
}
