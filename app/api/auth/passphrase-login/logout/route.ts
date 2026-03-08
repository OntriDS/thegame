// app/api/auth/passphrase-login/logout/route.ts
// Passphrase Logout Endpoint
// Clears passphrase auth session

import { NextRequest, NextResponse } from 'next/server';


export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true });
    response.cookies.delete('admin_session');

    console.log('[Passphrase Logout] ✅ Logout successful');
    return response;
  } catch (error) {
    console.error('[Passphrase Logout] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    );
  }
}
