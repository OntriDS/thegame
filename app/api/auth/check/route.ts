import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth-edge';

// Force dynamic rendering since this route accesses request cookies
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_session')?.value;
    const secret = process.env.ADMIN_SESSION_SECRET || '';

    if (!token || !secret) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const verified = await verifyJwt(token, secret);
    
    if (!verified.valid) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({ authenticated: true, user: verified.payload });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
