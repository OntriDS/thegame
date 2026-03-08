// app/api/auth/passphrase-login/route.ts
// Passphrase Login Endpoint (Kept Separate for Hybrid Approach)
// Maintains your current working passphrase login system

import { NextResponse, NextRequest } from 'next/server';
import { generateJwt, verifyJwt, getRequiredEnv } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const playerId = formData.get('playerId')?.toString() ?? '';
  const passphrase = formData.get('passphrase')?.toString() ?? '';
  const remember = formData.get('remember')?.toString() === 'on';
  const next = (formData.get('next')?.toString() ?? '/admin') as string;

  try {
    console.log(`[Passphrase Login] Attempting login for Player: ${playerId}`);

    const secret = getRequiredEnv('ADMIN_SESSION_SECRET');
    let authenticated = false;
    let userData = { sub: playerId, role: 'admin' };

    // 1. LEGACY/CREATOR FALLBACK
    const adminKey = getRequiredEnv('ADMIN_ACCESS_KEY');
    if (playerId === 'player-one' && passphrase === adminKey) {
      console.log('[Passphrase Login] Using legacy admin fallback');
      authenticated = true;
      userData = { sub: 'player-one', role: 'admin' };
    }
    // 2. ACCOUNT-BASED VERIFICATION
    else {
      const { kvGet } = await import('@/data-store/kv');
      const { buildAccountKey } = await import('@/data-store/keys');
      const bcrypt = await import('bcryptjs');
      const { CharacterRole } = await import('@/types/enums');

      const account = await kvGet<any>(buildAccountKey(playerId));
      if (account) {
        const match = await bcrypt.compare(passphrase, account.passwordHash);
        if (match) {
          console.log('[Passphrase Login] Account verification successful');
          authenticated = true;
          userData = { sub: account.id, role: 'admin' };
        }
      }
    }

    if (!authenticated) {
      console.log('[Passphrase Login] Invalid credentials');
      return NextResponse.redirect(new URL(`/admin/login?error=invalid&next=${encodeURIComponent(next)}`, req.url));
    }

    const expiresIn = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7;
    const token = await generateJwt(
      userData,
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
