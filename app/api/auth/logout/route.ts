import { NextResponse } from 'next/server';

/**
 * Unified Logout API Route
 * Revokes the session by clearing the authentication cookies.
 */
export async function POST() {
  try {
    const response = NextResponse.json({ success: true, next: '/admin/login' });
    
    // 1. Clear the canonical auth cookie
    response.cookies.delete('auth_session');

    // 2. Legacy Cleanup: Sweep away the old ghost cookie 
    // (Prevents caching issues for users who logged in before the IAM migration)
    response.cookies.delete('admin_session');

    console.log('[Logout API] ✅ Logout successful (cookies cleared)');
    return response;

  } catch (error) {
    console.error('[Logout API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error during logout' },
      { status: 500 }
    );
  }
}