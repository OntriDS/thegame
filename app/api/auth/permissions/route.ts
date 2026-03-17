// app/api/auth/permissions/route.ts
// Multi-User Permissions Endpoint
// Returns role-based permission checks for authenticated user

import { NextRequest, NextResponse } from 'next/server';
import { iamService } from '@/lib/iam-service';
import { PermissionsResponse } from '@/types/auth-types';


export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_session')?.value;

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

    // ✅ Get permissions for user
    // Note: iamService doesn't have a direct getPermissions object yet,
    // but we can check roles directly from the user object.
    const isAdmin = user.roles.includes('founder' as any) || user.roles.includes('admin' as any);
    
    return NextResponse.json({ 
      permissions: {
        isAdmin,
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
