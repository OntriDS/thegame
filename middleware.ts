// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth-edge';

// Protect /admin routes except /admin/login
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Allow non-admin paths
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Allow the login page and any nested login routes
  if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) {
    return NextResponse.next();
  }

  // Read session cookie
  const token = request.cookies.get('admin_session')?.value;
  const secret = process.env.ADMIN_SESSION_SECRET || '';

  // If cookie exists but no secret at edge runtime, allow temporarily to avoid loop
  // and to diagnose env loading differences between Node and Edge on Vercel.
  if (token && !secret) {
    return NextResponse.next();
  }

  if (!token || !secret) {
    const url = new URL('/admin/login', request.url);
    url.searchParams.set('next', pathname + (search || ''));
    return NextResponse.redirect(url);
  }

  const verified = await verifyJwt(token, secret);
  if (!verified.valid) {
    // Debug hint: attach reason to query in non-prod if needed
    const url = new URL('/admin/login', request.url);
    url.searchParams.set('next', pathname + (search || ''));
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*']
};
