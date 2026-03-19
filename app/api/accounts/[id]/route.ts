// app/api/accounts/[id]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { iamService } from '@/lib/iam-service';
import type { Account } from '@/types/entities';

// Force dynamic rendering - this route accesses cookies
export const dynamic = 'force-dynamic';

async function toUiAccount(iamAccount: Awaited<ReturnType<typeof iamService.getAccountById>>): Promise<Account> {
  let character: any = null;
  if (iamAccount?.id) {
    const char =
      iamAccount.characterId
        ? await iamService.getCharacterById(iamAccount.characterId)
        : await iamService.getCharacterByAccountId(iamAccount.id);
    character = char
      ? {
          id: char.id,
          name: char.name,
          roles: char.roles,
          accountId: char.accountId,
        }
      : null;
  }

  return {
    id: iamAccount!.id,
    name: iamAccount!.name,
    email: iamAccount!.email,
    phone: (iamAccount as any).phone,
    isActive: iamAccount!.isActive,
    isVerified: iamAccount!.isVerified,
    passwordHash: '',
    sessionToken: undefined,
    loginAttempts: 0,
    verificationToken: undefined,
    resetToken: undefined,
    resetTokenExpiry: undefined,
    privacySettings: {
      showEmail: false,
      showPhone: false,
      showRealName: true,
    },
    characterId: iamAccount!.characterId || character?.id || '',
    playerId: undefined,
    lastActiveAt: new Date(iamAccount!.updatedAt || Date.now()),
    links: [],
    character,
    type: undefined,
    createdAt: new Date(iamAccount!.createdAt || Date.now()),
    updatedAt: new Date(iamAccount!.updatedAt || Date.now()),
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

  // Disable account in IAM so it cannot be used for future logins.
  await iamService.disableAccount(params.id);

  return new NextResponse(null, { status: 204 });
}


