import { NextResponse } from 'next/server';
import { iamService } from '@/lib/iam-service';
import { sendPasswordResetEmail } from '@/lib/email/resend-service';

/**
 * Password Reset Request API
 * Generates a reset token for the given email
 * Sends a password reset email and returns generic response.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    const account = await iamService.getAccountByEmail(email);
    if (account) {
      const result = await iamService.generatePasswordResetToken(email);
      if (result.success && result.token) {
        const emailResult = await sendPasswordResetEmail({
          email,
          userName: account.name || email.split('@')[0],
          resetToken: result.token,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        });
        if (!emailResult.success) {
          console.error('[Password Reset Request] Failed to send reset email:', emailResult.error);
          return NextResponse.json(
            { success: false, error: 'Unable to process reset request at this time. Please try again.' },
            { status: 502 }
          );
        }
      }
    }

    // Generic response avoids leaking account existence.
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a reset link has been sent.',
    });

  } catch (error: any) {
    console.error('[Password Reset Request] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}