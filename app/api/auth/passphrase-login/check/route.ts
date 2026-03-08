// app/api/auth/passphrase-login/check/route.ts
// Passphrase Auth Check Endpoint
// Verifies if user is authenticated via passphrase system

import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth';
import { CharacterRole } from '@/types/enums';

export const runtime = 'force-dynamic';

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

    const verified = await verifyJwt(token, secret);

    if (verified.valid) {
      return NextResponse.json({
        authenticated: true,
        user: {
          userId: 'admin',
          username: 'Akiles',
          email: '',
          roles: [CharacterRole.FOUNDER, CharacterRole.PLAYER],
          isActive: true,
        },
        permissions: {
          can: () => true, // FOUNDER has full access
          hasRole: (role: string) => [CharacterRole.FOUNDER, CharacterRole.PLAYER].includes(role),
          hasAnyRole: () => true,
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
