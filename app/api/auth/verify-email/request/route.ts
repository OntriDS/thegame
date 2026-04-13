import { NextRequest, NextResponse } from 'next/server';
import { iamService } from '@/lib/iam-service';
import { sendAccountVerificationEmail } from '@/lib/email/resend-service';

function getNormalizedEmail(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  const payload = body as { email?: unknown };
  return typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = getNormalizedEmail(body);

    if (!email) {
      return NextResponse.json({ success: false, message: 'Email is required' }, { status: 400 });
    }

    const account = await iamService.getAccountByEmail(email);
    if (!account) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists, a verification email has been sent.',
      });
    }

    const tokenResult = await iamService.generateEmailVerificationToken(email);
    if (!tokenResult.success || !tokenResult.token || !tokenResult.expiresAt) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists, a verification email has been sent.',
      });
    }

    const emailResult = await sendAccountVerificationEmail({
      email,
      userName: account.name || email.split('@')[0],
      verificationToken: tokenResult.token,
      expiresAt: new Date(tokenResult.expiresAt),
    });
    if (!emailResult.success) {
      console.error('[Verify Email Request] Failed to send verification email:', emailResult.error);
      return NextResponse.json(
        { success: false, error: 'Unable to send verification email. Please try again.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists, a verification email has been sent.',
    });
  } catch (error) {
    console.error('[Verify Email Request] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
