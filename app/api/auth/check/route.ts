import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth-edge';

// Force dynamic rendering since this route accesses request cookies
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_session')?.value;
    const secret = process.env.ADMIN_SESSION_SECRET;

    // Debug logging for production troubleshooting
    console.log('[Auth Check] Token present:', !!token);
    console.log('[Auth Check] Secret present:', !!secret);
    console.log('[Auth Check] Secret length:', secret?.length || 0);

    if (!token || !secret) {
      console.log('[Auth Check] Missing token or secret');
      return NextResponse.json({ authenticated: false, error: 'Missing credentials' }, { status: 401 });
    }

    const verified = await verifyJwt(token, secret);

    if (!verified.valid) {
      console.log('[Auth Check] Token verification failed:', verified.reason);
      return NextResponse.json({ authenticated: false, error: 'Invalid token' }, { status: 401 });
    }

    console.log('[Auth Check] Authentication successful');
    return NextResponse.json({ authenticated: true, user: verified.payload });
  } catch (error) {
    console.error('[Auth Check] Error:', error);
    return NextResponse.json({ authenticated: false, error: 'Auth check failed' }, { status: 401 });
  }
}
