import { Resend } from 'resend';
import PasswordResetEmail from '@/emails/password-reset';
import AccountVerificationEmail from '@/emails/account-verification';
import type { SendAccountVerificationParams, SendPasswordResetParams, EmailResult } from './types';

const resend = new Resend(process.env.RESEND_API_KEY ?? '');

function getFromAddress(): string {
  const fromName = process.env.RESEND_FROM_NAME || 'Akiles Ecosystem';
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!fromEmail) {
    throw new Error('RESEND_FROM_EMAIL is not configured');
  }
  return `${fromName} <${fromEmail}>`;
}

function getPublicAppUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_ECOSYSTEM_APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    throw new Error('NEXT_PUBLIC_ECOSYSTEM_APP_URL is not configured');
  }
  return appUrl.replace(/\/$/, '');
}

function toEmailResult(error: unknown): EmailResult {
  if (!error) return { success: false, error: 'Unknown email error' };
  if (error instanceof Error) {
    return { success: false, error: error.message };
  }
  return { success: false, error: 'Unknown email error' };
}

export async function sendPasswordResetEmail({
  email,
  userName,
  resetToken,
  expiresAt,
}: SendPasswordResetParams): Promise<EmailResult> {
  try {
    const resetLink = `${getPublicAppUrl()}/auth/reset-password?token=${encodeURIComponent(resetToken)}`;
    const result = await resend.emails.send({
      from: getFromAddress(),
      to: [email],
      subject: 'Reset Your Akiles Digital Universe Password',
      react: PasswordResetEmail({
        userName,
        resetLink,
        expiresAt: expiresAt.toLocaleString(),
      }),
    });
    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return {
      success: true,
      emailId: result.data?.id,
    };
  } catch (error) {
    return toEmailResult(error);
  }
}

export async function sendAccountVerificationEmail({
  email,
  userName,
  verificationToken,
  expiresAt,
}: SendAccountVerificationParams): Promise<EmailResult> {
  try {
    const verificationLink = `${getPublicAppUrl()}/auth/verify-email?token=${encodeURIComponent(verificationToken)}`;
    const result = await resend.emails.send({
      from: getFromAddress(),
      to: [email],
      subject: 'Verify Your Akiles Digital Universe Account',
      react: AccountVerificationEmail({
        userName,
        verificationLink,
        expiresAt: expiresAt.toLocaleString(),
      }),
    });
    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return {
      success: true,
      emailId: result.data?.id,
    };
  } catch (error) {
    return toEmailResult(error);
  }
}

export async function sendTestEmail(email: string): Promise<EmailResult> {
  try {
    const result = await resend.emails.send({
      from: getFromAddress(),
      to: [email],
      subject: 'Akiles Digital Universe - Test Email',
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h1 style="color: #000;">Test Email Successful!</h1>
          <p style="color: #333;">
            If you're seeing this, your Resend integration works.
          </p>
          <p style="color: #666; font-size: 12px;">
            Sent at: ${new Date().toISOString()}
          </p>
        </div>
      `,
    });
    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return {
      success: true,
      emailId: result.data?.id,
    };
  } catch (error) {
    return toEmailResult(error);
  }
}
