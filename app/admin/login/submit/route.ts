// app/admin/login/submit/route.ts
import { NextResponse } from 'next/server';
import { iamService } from '@/lib/iam-service';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const formData = await req.formData();
  const passphrase = formData.get('passphrase')?.toString() ?? '';
  const remember = formData.get('remember')?.toString() === 'on';
  const next = (formData.get('next')?.toString() ?? '/admin') as string;

  try {
    const expiresIn = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7;
    const result = await iamService.authenticatePassphrase(passphrase);
    
    if (!result.success || !result.token || !result.user) {
      return NextResponse.redirect(new URL(`/admin/login?error=invalid&next=${encodeURIComponent(next)}`, req.url));
    }

    const res = NextResponse.redirect(new URL(next || '/admin', req.url), 303);
    res.cookies.set('admin_session', result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: expiresIn,
    });
    
    // Also set legacy auth_session for compatibility
    res.cookies.set('auth_session', result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: expiresIn,
    });

    return res;
  } catch (err) {
    console.error('Admin login configuration missing: ensure ADMIN_ACCESS_KEY and ADMIN_SESSION_SECRET are set.', err);
    return NextResponse.redirect(new URL(`/admin/login?error=config&next=${encodeURIComponent(next)}`, req.url));
  }
}