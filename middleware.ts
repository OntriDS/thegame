// middleware.ts
// Stateless Edge Auth Middleware
// 0 Redis calls - Peak Performance & Bandwidth Protection

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth-service';

export const config = {
  runtime: 'edge', // Officially enable Edge Runtime
  matcher: ['/admin/:path*'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow login page
  if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) {
    return NextResponse.next();
  }

  // 2. Extract tokens
  const passphraseToken = request.cookies.get('admin_session')?.value;
  const usernameToken = request.cookies.get('auth_session')?.value;
  
  const token = usernameToken || passphraseToken;

  if (!token) {
    console.log('[Middleware] No token found - redirecting to login');
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  try {
    // 3. STATLESS VERIFICATION (Zero Redis)
    // We pass 'true' for stateless mode to avoid any KV calls in the Edge runtime
    const user = await AuthService.verifySession(token, true);

    if (user && user.isActive) {
      // console.log(`[Middleware] ✅ Authorized: ${user.username}`);
      return NextResponse.next();
    }

    console.log('[Middleware] ❌ Invalid or inactive session');
    return NextResponse.redirect(new URL('/admin/login', request.url));
  } catch (error) {
    console.error('[Middleware] 🔥 Critical Auth Error:', error);
    // On error, we fail safe and redirect to login
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }
}
