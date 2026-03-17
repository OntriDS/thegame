// app/api/auth/logout/route.ts
// Multi-User Logout Endpoint
// Revokes session and clears auth cookie

import { NextRequest, NextResponse } from 'next/server';
import { iamService } from '@/lib/iam-service';


export async function POST(req: NextRequest) {
  try {
    const response = NextResponse.json({ success: true });
    
    // Clear both possible session cookies
    response.cookies.delete('auth_session');
    response.cookies.delete('admin_session');

    console.log('[Logout API] ✅ Logout successful (cookies cleared)');
    return response;
  } catch (error) {
    console.error('[Logout API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    );
  }
}
