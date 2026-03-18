// app/api/auth/passphrase-login/check/route.ts
// Passphrase Auth Check Endpoint
// Verifies if user is authenticated via passphrase system

import { NextRequest, NextResponse } from 'next/server';
import { iamService } from '@/lib/iam-service';
import { CharacterRole } from '@/types/enums';


export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_session')?.value;
    const secret = process.env.ADMIN_SESSION_SECRET || '';

    if (!token || !secret) {
      return NextResponse.json(
        { authenticated: false, error: 'No credentials' },
        { status: 401 }
      );
    }

    const user = await iamService.verifyJWT(token);

    if (user && user.isActive) {
      const permissions = iamService.getPermissions(user);
      return NextResponse.json({
        authenticated: true,
        user,
        permissions: {
          isAdmin: permissions.hasRole('founder') || permissions.hasRole('admin'),
          roles: user.roles,
        },
      });
    } else {
      return NextResponse.json(
        { authenticated: false, error: 'Invalid session' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('[Passphrase Check] Error:', error);
    return NextResponse.json(
      { authenticated: false, error: 'Auth check failed' },
      { status: 500 }
    );
  }
}
