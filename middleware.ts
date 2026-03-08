// middleware.ts
// Hybrid Auth Middleware - Supports Both Passphrase and Username Systems
// Gradual transition approach - keeps passphrase working while adding username system

import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth';
import { AuthService } from '@/lib/auth-service';

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Allow non-admin paths
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Allow login page
  if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) {
    return NextResponse.next();
  }

  // ✅ CHECK BOTH AUTH SYSTEMS
  const passphraseToken = request.cookies.get('admin_session')?.value;
  const usernameToken = request.cookies.get('auth_session')?.value;

  const hasPassphraseToken = !!passphraseToken;
  const hasUsernameToken = !!usernameToken;

  console.log('[Middleware] Passphrase token:', hasPassphraseToken);
  console.log('[Middleware] Username token:', hasUsernameToken);

  // System 1: Passphrase Login (Your Current System)
  if (hasPassphraseToken) {
    try {
      const secret = process.env.ADMIN_SESSION_SECRET || '';

      if (!secret) {
        console.log('[Middleware] No passphrase secret - allow (temporary)');
        return NextResponse.next();
      }

      const verified = await verifyJwt(passphraseToken, secret);
      if (verified.valid) {
        console.log('[Middleware] ✅ Passphrase auth valid');
        return NextResponse.next();
      } else {
        console.log('[Middleware] ❌ Passphrase auth invalid');
        return NextResponse.redirect(new URL('/admin/login', request.url));
      }
    } catch (error) {
      console.error('[Middleware] Passphrase auth error:', error);
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // System 2: Username Login (New Multi-User System)
  if (hasUsernameToken) {
    try {
      const secret = process.env.ADMIN_SESSION_SECRET || '';

      if (!secret) {
        console.log('[Middleware] No username secret - allow (temporary)');
        return NextResponse.next();
      }

      const user = await AuthService.verifySession(usernameToken);
      if (user) {
        console.log('[Middleware] ✅ Username auth valid, user:', user.username);
        return NextResponse.next();
      } else {
        console.log('[Middleware] ❌ Username auth invalid');
        return NextResponse.redirect(new URL('/admin/login', request.url));
      }
    } catch (error) {
      console.error('[Middleware] Username auth error:', error);
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // No valid auth token - redirect to login
  const loginUrl = new URL('/admin/login', request.url);
  return NextResponse.redirect(loginUrl);
}
