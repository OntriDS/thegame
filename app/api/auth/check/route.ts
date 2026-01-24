import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth-edge';

// Force dynamic rendering since this route accesses request cookies
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_session')?.value;
    const secret = process.env.ADMIN_SESSION_SECRET;

    // Debug logging for production troubleshooting

    if (!token || !secret) {
      return NextResponse.json({ authenticated: false, error: 'Missing credentials' }, { status: 401 });
    }

    const verified = await verifyJwt(token, secret);

    if (!verified.valid) {
      return NextResponse.json({ authenticated: false, error: 'Invalid token' }, { status: 401 });
    }

    return NextResponse.json({ authenticated: true, user: verified.payload });
  } catch (error) {
    console.error('[Auth Check] Error:', error);
    return NextResponse.json({ authenticated: false, error: 'Auth check failed' }, { status: 401 });
  }
}
