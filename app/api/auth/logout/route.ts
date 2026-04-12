import { NextResponse } from 'next/server';

/**
 * Unified Logout API Route
 * Revokes the session by clearing the authentication cookies.
 */
export async function POST() {
  try {
    const response = NextResponse.json({ success: true, next: '/admin/login' });
    
    // Clear the canonical auth cookie
    response.cookies.delete('iam_session');

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