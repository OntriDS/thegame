// app/api/auth/permissions/route.ts
// Multi-User Permissions Endpoint
// Returns role-based permission checks for authenticated user

import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
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

    // ✅ Verify session and get user
    const user = await authService.verifySession(token);

    if (!user) {
      return NextResponse.json<PermissionsResponse>(
        { can: () => false, hasRole: () => false, hasAnyRole: () => false },
        { status: 401 }
      );
    }

    // ✅ Get permissions for user
    const permissions = authService.getPermissions(user);

    console.log('[Permissions API] ✅ Permissions loaded for:', user.username);

    return NextResponse.json<PermissionsResponse>(permissions);
  } catch (error) {
    console.error('[Permissions API] Error:', error);
    return NextResponse.json<PermissionsResponse>(
      { can: () => false, hasRole: () => false, hasAnyRole: () => false },
      { status: 500 }
    );
  }
}
