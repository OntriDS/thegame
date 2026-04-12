/**
 * Accounts API  (IAM-backed, Rosetta-Stone linked)
 *
 * GET  — list all IAM accounts (+ M2M apps) with their linked DS characters.
 * POST — create or update an IAM account and link it to a DS character.
 */
import { NextResponse, NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { iamService, CharacterRole } from '@/lib/iam-service';
import { getCharacterById } from '@/data-store/repositories/character.repo';
import type { Account } from '@/types/entities';

export const dynamic = 'force-dynamic';

// ── helpers ──────────────────────────────────────────────────────

async function toUiAccount(
  iamAccount: NonNullable<Awaited<ReturnType<typeof iamService.getAccountById>>>,
  opts?: { type?: string }
) {
  const type = opts?.type;

  let character: any = null;
  if (iamAccount.id && type !== 'm2m') {
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
  }

  return {
    id: iamAccount.id,
    name: iamAccount.name,
    email: iamAccount.email,
    phone: iamAccount.phone,
    isActive: iamAccount.isActive ?? true,
    isVerified: iamAccount.isVerified ?? false,
    passwordHash: iamAccount.passwordHash || '',
    sessionToken: undefined,
    loginAttempts: 0,
    verificationToken: undefined,
    resetToken: undefined,
    resetTokenExpiry: undefined,
    privacySettings: { showEmail: false, showPhone: false, showRealName: true },
    characterId: type === 'm2m' ? '' : (iamAccount.characterId || character?.id || ''),
    playerId:
      type === 'm2m'
        ? ''
        : iamAccount.playerId || (character as any)?.playerId || '',
    lastActiveAt: new Date(iamAccount.updatedAt || Date.now()),
    links: [],
    character,
    type,
    createdAt: new Date(iamAccount.createdAt || Date.now()),
    updatedAt: new Date(iamAccount.updatedAt || Date.now()),
  } as Account;
}

// ── GET ──────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const iamAccounts = await iamService.listAccounts();
    const accounts = await Promise.all(iamAccounts.map(acc => toUiAccount(acc)));

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
      privacySettings: { showEmail: false, showPhone: false, showRealName: true },
      characterId: '',
      playerId: undefined,
      lastActiveAt: new Date(app.createdAt),
      links: [],
      character: {
        id: 'system',
        name: app.appId,
        roles: [CharacterRole.AI_AGENT],
        accountId: 'system',
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
    console.error('[Accounts API] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }
}

// ── POST  (create / update) ─────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, name, email, phone, password, isActive, isVerified, characterId } = body || {};

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }
    if (!characterId) {
      return NextResponse.json({ error: 'characterId is required (select a character)' }, { status: 400 });
    }

    const dsChar = await getCharacterById(characterId);
    if (!dsChar) {
      return NextResponse.json({ error: 'Selected character does not exist in the Data-Store' }, { status: 400 });
    }

    const existing = id ? await iamService.getAccountById(id) : null;

    if (!existing) {
      // ── Create new account ──
      const created = await iamService.createAccount({
        name: String(name),
        email: String(email),
        phone: phone ? String(phone) : undefined,
        password: typeof password === 'string' && password.trim() ? password.trim() : undefined,
      });

      if (isActive !== undefined || isVerified !== undefined) {
        await iamService.updateAccount(created.id, {
          isActive: isActive !== undefined ? !!isActive : undefined,
          isVerified: isVerified !== undefined ? !!isVerified : undefined,
        });
      }

      await iamService.linkAccountToCharacter(created.id, String(characterId));

      const updated = await iamService.getAccountById(created.id);
      return NextResponse.json(updated);
    }

    // ── Update existing account ──
    await iamService.updateAccount(existing.id, {
      name: String(name),
      email: String(email),
      phone: phone !== undefined ? (phone ? String(phone) : undefined) : undefined,
      password: typeof password === 'string' && password.trim() ? password.trim() : undefined,
      isActive: isActive !== undefined ? !!isActive : undefined,
      isVerified: isVerified !== undefined ? !!isVerified : undefined,
    });

    if (existing.characterId !== String(characterId)) {
      await iamService.linkAccountToCharacter(existing.id, String(characterId));
    }

    const updated = await iamService.getAccountById(existing.id);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('[Accounts API] POST error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save account' }, { status: 500 });
  }
}
