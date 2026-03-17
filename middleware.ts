  // middleware.ts
// Stateless Edge Auth Middleware
// 0 Redis calls for Auth - Integrated Rate Limiting
 
import { NextRequest, NextResponse } from 'next/server';
import { iamService } from '@/lib/iam-service';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Rate Limiter
// Limit: 60 requests per minute per IP for general admin access
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

  // 2. Allow login page
  if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) {
    return NextResponse.next();
  }

  // 3. Extract tokens
  const passphraseToken = request.cookies.get('admin_session')?.value;
  const usernameToken = request.cookies.get('auth_session')?.value;
  
  const token = usernameToken || passphraseToken;

  if (!token) {
    console.log('[Middleware] No token found - redirecting to login');
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  try {
    // 4. CENTRALIZED IAM VERIFICATION
    const user = await iamService.verifyJWT(token);

    if (user && user.isActive) {
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

    console.log('[Middleware] ❌ Invalid or inactive session');
    return NextResponse.redirect(new URL('/admin/login', request.url));
  } catch (error) {
    console.error('[Middleware] 🔥 Critical Auth Error:', error);
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }
}
