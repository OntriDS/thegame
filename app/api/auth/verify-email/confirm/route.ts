import { NextRequest, NextResponse } from 'next/server';
import { iamService } from '@/lib/iam-service';

function getNormalizedToken(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  const payload = body as { token?: unknown };
  return typeof payload.token === 'string' ? payload.token.trim() : '';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = getNormalizedToken(body);

    if (!token) {
      return NextResponse.json({ success: false, error: 'Verification token is required' }, { status: 400 });
    }

    const result = await iamService.confirmEmailVerificationToken(token);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Could not verify email' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      accountId: result.accountId,
    });
  } catch (error) {
    console.error('[Verify Email Confirm] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
