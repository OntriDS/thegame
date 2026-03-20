import { NextResponse, NextRequest } from 'next/server';
import { iamService } from '@/lib/iam-service';

/**
 * Password Reset Request API
 * Generates a reset token for the given email
 * In production, this would send an email with the reset link
 * For now, it returns the token directly for testing
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const result = await iamService.generatePasswordResetToken(email.trim().toLowerCase());

    if (!result.success) {
      // Don't reveal if account exists or not for security
      return NextResponse.json({
        success: false,
        message: 'If an account exists with this email, a reset token has been generated.',
        // For development/testing, return the token
        token: result.token // TODO: Remove this in production and send via email instead
      });
    }

    console.log(`[Password Reset] Reset token generated for ${email}: ${result.token}`);

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a reset token has been generated.',
      token: result.token // TODO: In production, send this via email instead
    });
  } catch (error: any) {
    console.error('[Password Reset Request] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}