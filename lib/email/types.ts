export interface SendPasswordResetParams {
  email: string;
  userName: string;
  resetToken: string;
  expiresAt: Date;
}

export interface SendAccountVerificationParams {
  email: string;
  userName: string;
  verificationToken: string;
  expiresAt: Date;
}

export interface EmailResult {
  success: boolean;
  error?: string;
  emailId?: string;
}
