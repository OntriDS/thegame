// app/api/auth/logout/route.ts
// Multi-User Logout Endpoint
// Revokes session and clears auth cookie

import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('auth_session')?.value;

    if (!token) {
      console.log('[Logout API] No auth session found');
      const response = NextResponse.json({ success: true });
      response.cookies.delete('auth_session');
      return response;
    }

    // Verify token to get userId
    const verified = await authService.verifySession(token);

    if (!verified) {
      console.log('[Logout API] Invalid token, just clearing cookie');
      const response = NextResponse.json({ success: true });
      response.cookies.delete('auth_session');
      return response;
    }

    // ✅ Logout user
    await authService.logout(verified.userId);

    const response = NextResponse.json({ success: true });
    response.cookies.delete('auth_session');

    console.log('[Logout API] ✅ Logout successful');
    return response;
  } catch (error) {
    console.error('[Logout API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    );
  }
}
