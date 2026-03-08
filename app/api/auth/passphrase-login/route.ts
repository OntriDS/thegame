// app/api/auth/passphrase-login/route.ts
// Passphrase Login Endpoint (Kept Separate for Hybrid Approach)
// Maintains your current working passphrase login system

import { NextResponse, NextRequest } from 'next/server';
import { generateJwt, verifyJwt, getRequiredEnv } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const passphrase = formData.get('passphrase')?.toString() ?? '';
  const remember = formData.get('remember')?.toString() === 'on';
  const next = (formData.get('next')?.toString() ?? '/admin') as string;

  try {
    console.log('[Passphrase Login] Attempting login');

    // Your existing passphrase system
    const expected = getRequiredEnv('ADMIN_ACCESS_KEY');
    const secret = getRequiredEnv('ADMIN_SESSION_SECRET');

    if (passphrase !== expected) {
      console.log('[Passphrase Login] Invalid passphrase');
      return NextResponse.redirect(new URL(`/admin/login?error=invalid&next=${encodeURIComponent(next)}`, req.url));
    }

    const expiresIn = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7;
    const token = await generateJwt(
      { sub: 'admin', role: 'admin' }, // ✅ KEEP EXISTING JWT STRUCTURE
      secret,
      expiresIn
    );

    const res = NextResponse.redirect(new URL(next || '/admin', req.url), 303);
    res.cookies.set('admin_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: expiresIn,
    });

    console.log('[Passphrase Login] ✅ Login successful');
    return res;
  } catch (err) {
    console.error('[Passphrase Login] Error:', err);
    return NextResponse.redirect(new URL(`/admin/login?error=config&next=${encodeURIComponent(next)}`, req.url));
  }
}
