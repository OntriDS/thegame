// middleware.ts
// Stateless Edge Auth Middleware
// 0 Redis calls for Auth - Integrated Rate Limiting
 
import { NextRequest, NextResponse } from 'next/server';
import { iamService } from '@/lib/iam-service';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { CharacterRole } from '@/types/enums';

// Initialize Rate Limiter: 60 requests per minute per IP
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.fixedWindow(60, '1 m'),
  analytics: false,
  prefix: 'thegame:ratelimit',
});

export const config = {
  matcher: ['/admin/:path*'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === '/admin/login' || pathname.startsWith('/admin/login/');

  // 1. Rate Limiting (Edge Compatible)
  const ip = request.ip || '127.0.0.1';
  const { success, limit, reset, remaining } = await ratelimit.limit(`ratelimit_admin_${ip}`);
  
  if (!success) {
    console.warn(`[Middleware] ⚠️ Rate limit exceeded for IP: ${ip}`);
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString(),
      },
    });
  }

  // 2. Extract Token (SINGLE SOURCE OF TRUTH)
  const sessionCookie = request.cookies.get('auth_session')?.value;
  
  // Support Bearer Token for M2M (Pixelbrain) / API access
  const authHeader = request.headers.get('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  
  const token = bearerToken || sessionCookie;

  // 3. No Token Flow
  if (!token) {
    if (isLoginPage) return NextResponse.next(); // Let them see the login page
    
    console.log('[Middleware] No token found - redirecting to login');
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // 4. Token Verification Flow
  try {
    const user = await iamService.verifyJWT(token);

    if (user && user.isActive) {
    const founderRole = CharacterRole.FOUNDER.toLowerCase();
    const isFounder = Array.isArray(user.roles)
      ? user.roles.some((role) => String(role).toLowerCase() === founderRole)
        : false;

      const isFounderOnlySection =
        pathname.startsWith('/admin/accounts') ||
        pathname.startsWith('/admin/iam');

      // Accounts and IAM Console are intentionally founder-only
      if (isFounderOnlySection && !isFounder) {
        console.log('[Middleware] Non-founder user blocked from founder-only section:', {
          accountId: user.accountId,
          roles: user.roles,
          pathname,
        });
        return NextResponse.redirect(new URL('/admin/control-room', request.url));
      }
      
      // UX WIN: If they are already logged in, don't let them sit on the login page!
      if (isLoginPage) {
        return NextResponse.redirect(new URL('/admin', request.url));
      }

      // 5. Inject Headers for downstream consistency
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-account-id', user.accountId);
      requestHeaders.set('x-user-roles', JSON.stringify(user.roles));

      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });

      // Add headers for observability
      response.headers.set('X-RateLimit-Remaining', remaining.toString());
      return response;
    }

    // Invalid or inactive user
    console.log('[Middleware] ❌ Invalid or inactive session');
    
    // If they are on the login page with a BAD cookie, let them stay to log in again, but clear the bad cookie
    if (isLoginPage) {
      const response = NextResponse.next();
      response.cookies.delete('auth_session');
      return response;
    }

    // Otherwise, redirect to login and clear the bad cookie
    const response = NextResponse.redirect(new URL('/admin/login', request.url));
    response.cookies.delete('auth_session');
    return response;

  } catch (error) {
    console.error('[Middleware] 🔥 Critical Auth Error:', error);
    if (isLoginPage) return NextResponse.next();
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }
}