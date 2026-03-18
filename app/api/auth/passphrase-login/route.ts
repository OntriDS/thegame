import { NextResponse, NextRequest } from 'next/server';
import { iamService } from '@/lib/iam-service';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  // Note: we'll ignore playerId and just use the passphrase for the Founder
  const passphrase = formData.get('passphrase')?.toString() ?? '';
  const remember = formData.get('remember')?.toString() === 'on';
  const next = (formData.get('next')?.toString() ?? '/admin') as string;

  try {
    console.log(`[Passphrase Login] Attempting unified IAM login`);

    const authResult = await iamService.authenticatePassphrase(passphrase);

    if (!authResult.success || !authResult.token) {
      console.log('[Passphrase Login] Invalid credentials or IAM error:', authResult.error);
      return NextResponse.json({ error: authResult.error || 'Invalid credentials' }, { status: 401 });
    }

    const expiresIn = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7;
    
    const res = NextResponse.json({ success: true, next: next || '/admin' });
    
    // Set the standardized IAM token in the admin_session cookie
    res.cookies.set('admin_session', authResult.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: expiresIn,
    });

    console.log('[Passphrase Login] ✅ Unified Login successful');
    return res;
  } catch (err: any) {
    console.error('[Passphrase Login] Error:', err);
    return NextResponse.json({ error: 'Authentication service error', details: err.message }, { status: 500 });
  }
}
