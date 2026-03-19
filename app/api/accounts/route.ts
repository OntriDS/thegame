// app/api/accounts/route.ts
// IAM-backed Accounts CRUD so email/password login and permissions work immediately.
import { NextResponse, NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { iamService, CharacterRole } from '@/lib/iam-service';
import type { Account } from '@/types/entities';

export const dynamic = 'force-dynamic';

async function toUiAccount(iamAccount: Awaited<ReturnType<typeof iamService.getAccountById>>, opts?: { type?: string }) {
  const type = opts?.type;

  // For non-M2M accounts, we need a character payload so the UI can show roles and badges.
  let character: any = null;
  if (iamAccount?.id && type !== 'm2m') {
    const char = iamAccount.characterId
      ? await iamService.getCharacterById(iamAccount.characterId)
      : await iamService.getCharacterByAccountId(iamAccount.id);
      character = char
        ? {
            ...char, // Include all fields to satisfy Character interface
            id: char.id,
            name: char.name,
            roles: char.roles,
            accountId: char.accountId,
          }
        : null;
  }

  const ui: any = {
    id: iamAccount?.id,
    name: iamAccount?.name,
    email: iamAccount?.email,
    phone: iamAccount?.phone,
    isActive: iamAccount?.isActive ?? true,
    isVerified: iamAccount?.isVerified ?? false,
    // DS Account requires these fields; fill minimal defaults.
    passwordHash: '', // never send hashed password back to the UI
    sessionToken: undefined,
    loginAttempts: (iamAccount as any)?.loginAttempts ?? 0,
    verificationToken: undefined,
    resetToken: undefined,
    resetTokenExpiry: undefined,
    privacySettings: {
      showEmail: false,
      showPhone: false,
      showRealName: true,
    },
    characterId: type === 'm2m' ? '' : (iamAccount?.characterId || character?.id || ''),
    playerId: undefined,
    lastActiveAt: new Date(iamAccount?.updatedAt || Date.now()),
    links: [],
    character,
    type,
    createdAt: new Date(iamAccount?.createdAt || Date.now()),
    updatedAt: new Date(iamAccount?.updatedAt || Date.now()),
  };

  return ui as Account;
}

export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const iamAccounts = await iamService.listAccounts();
    const accounts = await Promise.all(iamAccounts.map(acc => toUiAccount(acc)));

    // M2M "accounts" so the Accounts table shows systems too.
    const m2mApps = await iamService.listM2MApps();
    const m2mAccounts = m2mApps.map(app => ({
      id: app.appId,
      name: app.appId,
      email: `${app.appId}@m2m.system`,
      phone: undefined,
      isActive: true,
      isVerified: true,
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
      characterId: '',
      playerId: undefined,
      lastActiveAt: new Date(app.createdAt),
      links: [],
      character: {
        id: 'system',
        name: app.appId,
        roles: [CharacterRole.AI_AGENT],
        accountId: 'system',
        // Provide missing required Character fields for UI summary
        description: 'System-managed M2M Application',
        achievementsCharacter: [],
        purchasedAmount: 0,
        inventory: [],
        playerId: 'system',
        lastActiveAt: new Date(app.createdAt),
        isActive: true,
        createdAt: new Date(app.createdAt),
        updatedAt: new Date(app.createdAt),
        links: [],
      },
      type: 'm2m',
      createdAt: new Date(app.createdAt),
      updatedAt: new Date(app.createdAt),
    })) as Account[];

    return NextResponse.json([...accounts, ...m2mAccounts]);
  } catch (error: any) {
    console.error('[Accounts API] IAM GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      id,
      name,
      email,
      phone,
      password,
      isActive,
      isVerified,
      characterId,
    } = body || {};

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }
    if (!characterId) {
      return NextResponse.json({ error: 'characterId is required (select a character)' }, { status: 400 });
    }

    const existing = id ? await iamService.getAccountById(id) : null;

    if (!existing) {
      // New account: IAM generates the real UUID id.
      const created = await iamService.createAccount({
        name: String(name),
        email: String(email),
        phone: phone ? String(phone) : undefined,
        password: typeof password === 'string' && password.trim() ? password.trim() : undefined,
      });

      // Apply activation flags if provided.
      if (isActive !== undefined || isVerified !== undefined) {
        await iamService.updateAccount(created.id, {
          isActive: isActive !== undefined ? !!isActive : undefined,
          isVerified: isVerified !== undefined ? !!isVerified : undefined,
        });
      }

      await iamService.assignCharacterToAccount(created.id, String(characterId));

      const updated = await iamService.getAccountById(created.id);
      return NextResponse.json(updated);
    }

    // Update existing account.
    await iamService.updateAccount(existing.id, {
      name: String(name),
      email: String(email),
      phone: phone !== undefined ? (phone ? String(phone) : undefined) : undefined,
      password: typeof password === 'string' && password.trim() ? password.trim() : undefined,
      isActive: isActive !== undefined ? !!isActive : undefined,
      isVerified: isVerified !== undefined ? !!isVerified : undefined,
    });

    await iamService.assignCharacterToAccount(existing.id, String(characterId));

    const updated = await iamService.getAccountById(existing.id);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('[Accounts API] IAM POST error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save account' }, { status: 500 });
  }
}
