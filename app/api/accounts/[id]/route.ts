import { NextResponse, NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { iamService } from '@/lib/iam-service';
import type { Account } from '@/types/entities';

export const dynamic = 'force-dynamic';

async function toUiAccount(iamAccount: NonNullable<Awaited<ReturnType<typeof iamService.getAccountById>>>): Promise<Account> {
  let character: any = null;
  const char = await iamService.resolveCharacterForAccount(iamAccount.id);
  if (char) {
    character = {
      id: char.id,
      name: char.name,
      roles: char.roles,
      accountId: char.accountId,
      playerId: char.playerId,
    };
  }

  return {
    id: iamAccount.id,
    name: iamAccount.name,
    email: iamAccount.email,
    phone: (iamAccount as any).phone,
    isActive: iamAccount.isActive,
    isVerified: iamAccount.isVerified,
    passwordHash: '',
    sessionToken: undefined,
    loginAttempts: 0,
    verificationToken: undefined,
    resetToken: undefined,
    resetTokenExpiry: undefined,
    privacySettings: { showEmail: false, showPhone: false, showRealName: true },
    characterId: iamAccount.characterId || character?.id || '',
    playerId: iamAccount.playerId || character?.playerId || '',
    lastActiveAt: new Date(iamAccount.updatedAt || Date.now()),
    links: [],
    character,
    type: undefined,
    createdAt: new Date(iamAccount.createdAt || Date.now()),
    updatedAt: new Date(iamAccount.updatedAt || Date.now()),
  } as Account;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminAuth(req))) return new NextResponse('Unauthorized', { status: 401 });
  const account = await iamService.getAccountById(params.id);
  if (!account) return new NextResponse('Not Found', { status: 404 });
  return NextResponse.json(await toUiAccount(account));
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminAuth(req))) return new NextResponse('Unauthorized', { status: 401 });
  await iamService.disableAccount(params.id);
  return new NextResponse(null, { status: 204 });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminAuth(req))) return new NextResponse('Unauthorized', { status: 401 });

  try {
    const body = await req.json();
    const { password } = body;

    if (!password) {
      return new NextResponse('Password is required', { status: 400 });
    }

    if (password.length < 6) {
      return new NextResponse('Password must be at least 6 characters', { status: 400 });
    }

    const updatedAccount = await iamService.updateAccount(params.id, { password });

    return new NextResponse.json({
      success: true,
      account: await toUiAccount(updatedAccount)
    });
  } catch (error: any) {
    console.error('[Account API] Error updating account:', error);
    return new NextResponse(error.message || 'Failed to update account', { status: 500 });
  }
}
