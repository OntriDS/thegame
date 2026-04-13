/**
 * IAM Service
 * Manages Accounts (identity/credentials) and authentication.
 * Characters are NOT stored in IAM — they live in the Game Data-Store.
 * ACCOUNT_CHARACTER + CHARACTER_PLAYER / PLAYER_CHARACTER links bridge identity.
 * Players live only in the Game Data-Store (`thegame:data:player:*`), not `iam:player:*`.
 */

import { kvGet, kvSet, kvSAdd, kvSRem, kvSMembers, kvDel } from '@/lib/utils/kv';
import { buildAccountKey, buildAccountByEmailKey, buildM2MKey, IAM_ACCOUNTS_INDEX, IAM_M2M_INDEX } from './keys';
import { v4 as uuidv4 } from 'uuid';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { getUTCNow, toUTCISOString, fromUTCISOString, toUTC } from '@/lib/utils/utc-utils';

import { CharacterRole, EntityType, LinkType } from '@/types/enums';
export { CharacterRole };
import { normalizeCharacterRoles } from '@/lib/character-roles';
import {
  createPermissionEvaluator,
  type AuthPermissions,
  PERMISSION_MATRIX,
} from '@/integrity/iam/permissions';

/**
 * AUTHZ NOTE:
 * Role evaluation is centralized here:
 * - The privileged-admin role list is defined in integrity/iam/permissions.ts
 * - This service must never add its own founder/team/admin overrides.
 */

import { getCharacterById as dsGetCharacterById } from '@/data-store/repositories/character.repo';
import { getPlayerById as dsGetPlayerById } from '@/data-store/repositories/player.repo';
import { upsertCharacter, upsertPlayer } from '@/data-store/datastore';
import { getLinksFor, createLink as rosettaCreateLink } from '@/links/link-registry';
import { removeAccountEffectsOnDelete } from '@/workflows/entities-workflows/account.workflow';
import type { Character as GameCharacter, Link, Player } from '@/types/entities';

// --- Interfaces ---

export interface Account {
  id: string;
  name: string;
  email: string;
  phone?: string;
  phoneCountryCode?: string;
  requiresFounderAuth?: boolean;
  passwordHash: string | null;
  passphraseFlag: boolean;
  isActive: boolean;
  isVerified: boolean;
  characterId?: string;
  playerId?: string;
  resetToken?: string;
  resetTokenExpiry?: string;
  createdAt: string;
  updatedAt: string;
}

export type { Player } from '@/types/entities';

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: AuthUser;
  token?: string;
}

export interface AuthUser {
  userId: string;
  accountId: string;
  username: string;
  email: string;
  characterId: string;
  roles: CharacterRole[];
  isActive: boolean;
}

interface CreateAccountDTO {
  name: string;
  email: string;
  phone?: string;
  phoneCountryCode?: string;
  password?: string;
  passphraseFlag?: boolean;
}

const HANDSHAKE_PREFIX = 'iam:handshake:';

// --- Permissions & RBAC ---

// --- IAM Service Implementation ---

export class IAMService {

  // ═══════════════════════════════════════════════════════════════
  // ACCOUNT CRUD (iam:account:*)
  // ═══════════════════════════════════════════════════════════════

  /**
   * @param options.skipGlobalEmailMapping — When true, does not write `iam:account:email:*`.
   *   Use for Akiles-driven customer provision: the hub already owns the canonical email map
   *   for that address; TheGame still creates `iam:account:{id}` for character linking + admin IAM.
   */
  async createAccount(
    data: CreateAccountDTO,
    options?: { skipGlobalEmailMapping?: boolean },
  ): Promise<Account> {
    const now = getUTCNow();
    let passwordHash: string | null = null;

    if (data.password) {
      const saltRounds = 10;
      passwordHash = await bcrypt.hash(data.password, saltRounds);
    }

    const account: Account = {
      id: uuidv4(),
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone,
      phoneCountryCode: data.phoneCountryCode?.trim(),
      requiresFounderAuth: false,
      passwordHash,
      passphraseFlag: data.passphraseFlag || false,
      isActive: true,
      isVerified: false,
      createdAt: toUTCISOString(now),
      updatedAt: toUTCISOString(now),
    };

    await kvSet(buildAccountKey(account.id), account);
    if (!options?.skipGlobalEmailMapping) {
      await kvSet(buildAccountByEmailKey(account.email), { accountId: account.id });
    }
    await kvSAdd(IAM_ACCOUNTS_INDEX, account.id);

    return account;
  }

  async getAccountById(id: string): Promise<Account | null> {
    return await kvGet<Account>(buildAccountKey(id));
  }

  async listAccounts(): Promise<Account[]> {
    const accountIds = await kvSMembers(IAM_ACCOUNTS_INDEX);
    if (accountIds.length === 0) return [];
    const accounts = await Promise.all(accountIds.map(id => this.getAccountById(id)));
    return accounts.filter((a): a is Account => !!a);
  }

  async getAccountByEmail(email: string): Promise<Account | null> {
    const mapping = await kvGet<{ accountId: string }>(buildAccountByEmailKey(email));
    if (!mapping?.accountId) return null;

    return await this.getAccountById(mapping.accountId);
  }

  async updateAccount(
    accountId: string,
    updates: {
      name?: string;
      email?: string;
      phone?: string | undefined;
      phoneCountryCode?: string;
      requiresFounderAuth?: boolean;
      password?: string;
      isActive?: boolean;
      isVerified?: boolean;
    }
  ): Promise<Account> {
    const account = await this.getAccountById(accountId);
    if (!account) throw new Error('Account not found');
    const now = getUTCNow();

    let passwordHash: string | null | undefined;
    if (updates.password !== undefined) {
      const pwd = updates.password?.trim();
      if (pwd) {
        const saltRounds = 10;
        passwordHash = await bcrypt.hash(pwd, saltRounds);
      } else {
        passwordHash = account.passwordHash;
      }
    }

    const nextEmail = updates.email ? updates.email.toLowerCase().trim() : account.email;
    const prevEmail = account.email;

    if (nextEmail !== prevEmail) {
      await kvDel(buildAccountByEmailKey(prevEmail));
    }
    await kvSet(buildAccountByEmailKey(nextEmail), { accountId: account.id });

    const updated: Account = {
      ...account,
      name: updates.name !== undefined ? updates.name.trim() : account.name,
      email: nextEmail,
      phone: updates.phone !== undefined ? updates.phone?.trim() : account.phone,
      phoneCountryCode: updates.phoneCountryCode !== undefined ? updates.phoneCountryCode?.trim() : account.phoneCountryCode,
      requiresFounderAuth: updates.requiresFounderAuth !== undefined ? updates.requiresFounderAuth : account.requiresFounderAuth,
      passwordHash: passwordHash !== undefined ? passwordHash : account.passwordHash,
      isActive: updates.isActive !== undefined ? updates.isActive : account.isActive,
      isVerified: updates.isVerified !== undefined ? updates.isVerified : account.isVerified,
      updatedAt: toUTCISOString(now),
    };

    await kvSet(buildAccountKey(accountId), updated);
    return updated;
  }

  /**
   * Unlink IAM account from the Game Data-Store character: merge identity onto the character,
   * clear `accountId` on the character, remove Rosetta links for this account id.
   */
  private async unlinkIamAccountFromDatastore(account: Account): Promise<void> {
    const now = getUTCNow();
    const accountId = account.id;

    let character =
      (account.characterId ? await dsGetCharacterById(account.characterId) : null) ??
      (await this.resolveCharacterForAccount(accountId));

    if (character) {
      const mergedName = (character.name?.trim() || account.name?.trim() || '').trim() || character.name;
      const mergedPhone = character.contactPhone || account.phone || undefined;
      const mergedEmail = character.contactEmail || account.email || undefined;
      const mergedPhoneCountry =
        character.contactPhoneCountryCode || account.phoneCountryCode || undefined;

      await upsertCharacter(
        {
          ...character,
          accountId: null,
          name: mergedName,
          contactPhone: mergedPhone,
          contactEmail: mergedEmail,
          contactPhoneCountryCode: mergedPhoneCountry,
          updatedAt: now,
        },
        { skipWorkflowEffects: true, skipLinkEffects: true },
      );
    }

    await removeAccountEffectsOnDelete(accountId);
  }

  /**
   * Soft-disable: unlink + `isActive: false`. IAM row and `iam:index:accounts` membership stay so
   * admin UIs can show **Inactive**. Email mapping is removed so the address can register again.
   * For full KV removal use {@link deleteAccountPermanently}.
   */
  async disableAccount(accountId: string): Promise<void> {
    const account = await this.getAccountById(accountId);
    if (!account) return;
    const now = getUTCNow();

    await this.unlinkIamAccountFromDatastore(account);

    const updated: Account = {
      ...account,
      isActive: false,
      characterId: undefined,
      playerId: undefined,
      updatedAt: toUTCISOString(now),
    };

    await kvSet(buildAccountKey(accountId), updated);
    await kvSAdd(IAM_ACCOUNTS_INDEX, accountId);
    await kvDel(buildAccountByEmailKey(account.email));
  }

  /**
   * Hard delete: unlink from character, remove Rosetta links, delete IAM keys (no ghost row).
   * Admin DELETE /api/accounts/[id] uses this.
   */
  async deleteAccountPermanently(accountId: string): Promise<void> {
    const account = await this.getAccountById(accountId);
    if (!account) return;

    await this.unlinkIamAccountFromDatastore(account);

    if (account.resetToken) {
      await kvDel(`iam:reset:${account.resetToken}`);
    }

    await kvDel(buildAccountKey(accountId));
    await kvSRem(IAM_ACCOUNTS_INDEX, accountId);
    await kvDel(buildAccountByEmailKey(account.email));
  }

  // ═══════════════════════════════════════════════════════════════
  // PASSWORD RESET
  // ═══════════════════════════════════════════════════════════════

  /**
   * Generate a password reset token for an account by email
   * Token is valid for 1 hour
   */
  async generatePasswordResetToken(email: string): Promise<{ success: boolean; token?: string; error?: string }> {
    const account = await this.getAccountByEmail(email);
    if (!account) {
      return { success: false, error: 'Account not found' };
    }

    if (!account.isActive) {
      return { success: false, error: 'Account is inactive' };
    }

    const token = uuidv4();
    const now = getUTCNow();
    const expiry = toUTCISOString(toUTC(now.getTime() + 60 * 60 * 1000)); // 1 hour

    const resetKey = `iam:reset:${token}`;
    await kvSet(resetKey, {
      accountId: account.id,
      email: account.email,
      expiresAt: expiry
    });

    // Store token reference on account for easy lookup
    const updated: Account = {
      ...account,
      resetToken: token,
      resetTokenExpiry: expiry,
      updatedAt: toUTCISOString(now),
    };
    await kvSet(buildAccountKey(account.id), updated);

    return { success: true, token };
  }

  /**
   * Validate a password reset token
   */
  async validatePasswordResetToken(token: string): Promise<{ valid: boolean; accountId?: string; email?: string }> {
    const resetKey = `iam:reset:${token}`;
    const resetData = await kvGet<{ accountId: string; email: string; expiresAt: string }>(resetKey);

    if (!resetData) {
      return { valid: false };
    }

    // Check expiry
    const now = getUTCNow();
    if (fromUTCISOString(resetData.expiresAt).getTime() < now.getTime()) {
      await kvDel(resetKey);
      return { valid: false };
    }

    return {
      valid: true,
      accountId: resetData.accountId,
      email: resetData.email
    };
  }

  /**
   * Reset password using a valid token
   */
  async resetPasswordWithToken(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const validation = await this.validatePasswordResetToken(token);

    if (!validation.valid || !validation.accountId) {
      return { success: false, error: 'Invalid or expired reset token' };
    }

    // Update password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    const account = await this.getAccountById(validation.accountId);
    if (!account) {
      return { success: false, error: 'Account not found' };
    }

    const updated: Account = {
      ...account,
      passwordHash,
      resetToken: undefined,
      resetTokenExpiry: undefined,
      updatedAt: toUTCISOString(getUTCNow()),
    };

    await kvSet(buildAccountKey(account.id), updated);

    // Clear reset token
    const resetKey = `iam:reset:${token}`;
    await kvDel(resetKey);

    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════════
  // ACCOUNT ↔ CHARACTER LINK (Rosetta Stone — the only bridge)
  // Characters live ONLY in thegame:data:character:*
  // ═══════════════════════════════════════════════════════════════

  /**
   * Link an IAM account to an existing Game Data-Store character using the
   * Rosetta Stone ACCOUNT_CHARACTER link. Updates account.characterId pointer
   * for O(1) lookup during auth.
   */
  async linkAccountToCharacter(accountId: string, characterId: string): Promise<{ account: Account; character: GameCharacter }> {
    const account = await this.getAccountById(accountId);
    if (!account) throw new Error('Account not found');

    let character = await dsGetCharacterById(characterId);
    if (!character) throw new Error('Character not found in Game Data-Store');
    const now = getUTCNow();
    if (!character.accountId) {
      await upsertCharacter(
        {
          ...character,
          accountId,
          updatedAt: now,
        },
        { skipWorkflowEffects: true, skipLinkEffects: true }
      );
      character = (await dsGetCharacterById(characterId))!;
    }

    account.characterId = characterId;
    account.updatedAt = toUTCISOString(now);
    await kvSet(buildAccountKey(accountId), account);

    const link: Link = {
      id: uuidv4(),
      linkType: LinkType.ACCOUNT_CHARACTER,
      source: { type: EntityType.ACCOUNT, id: accountId },
      target: { type: EntityType.CHARACTER, id: characterId },
      createdAt: now,
    };
    await rosettaCreateLink(link, { skipValidation: true });

    // DS Player + Character↔Player links only (never ACCOUNT_PLAYER — IAM account is not a DS entity)
    await this.ensureDataStorePlayerForLinkedCharacter(accountId, characterId, character);

    const freshAccount = await this.getAccountById(accountId);
    character = (await dsGetCharacterById(characterId))!;

    return { account: freshAccount!, character };
  }

  /**
   * Resolve the Game Data-Store character for an IAM account.
   * Fast path: account.characterId → direct DS lookup.
   * Fallback: query ACCOUNT_CHARACTER links in Rosetta Stone.
   */
  async resolveCharacterForAccount(accountId: string): Promise<GameCharacter | null> {
    const account = await this.getAccountById(accountId);
    if (!account) return null;

    if (account.characterId) {
      const char = await dsGetCharacterById(account.characterId);
      if (char) return char;
    }

    const links = await getLinksFor({ type: EntityType.ACCOUNT, id: accountId });
    const acLink = links.find(l => l.linkType === LinkType.ACCOUNT_CHARACTER);
    if (!acLink) return null;

    const char = await dsGetCharacterById(acLink.target.id);
    if (char && !account.characterId) {
      account.characterId = char.id;
      account.updatedAt = toUTCISOString(getUTCNow());
      await kvSet(buildAccountKey(accountId), account);
    }
    return char;
  }

  // ═══════════════════════════════════════════════════════════════
  // PLAYER — Game Data-Store only (`thegame:data:player:*`)
  // Resolve via character.playerId and/or CHARACTER_PLAYER / PLAYER_CHARACTER links.
  // ═══════════════════════════════════════════════════════════════

  async getPlayerById(id: string): Promise<Player | null> {
    return dsGetPlayerById(id);
  }

  async getPlayerByCharacterId(characterId: string): Promise<Player | null> {
    const character = await dsGetCharacterById(characterId);
    if (character?.playerId) {
      const byField = await dsGetPlayerById(character.playerId);
      if (byField) return byField;
    }

    const links = await getLinksFor({ type: EntityType.CHARACTER, id: characterId });
    for (const l of links) {
      if (l.linkType === LinkType.CHARACTER_PLAYER && l.target.type === EntityType.PLAYER) {
        const p = await dsGetPlayerById(l.target.id);
        if (p) return p;
      }
      if (
        l.linkType === LinkType.PLAYER_CHARACTER &&
        l.source.type === EntityType.PLAYER &&
        l.target.id === characterId
      ) {
        const p = await dsGetPlayerById(l.source.id);
        if (p) return p;
      }
    }
    return null;
  }

  /**
   * When an IAM account links to a character, ensure a DS Player exists and
   * Character↔Player Rosetta links (CHARACTER_PLAYER + PLAYER_CHARACTER).
   * Does NOT create ACCOUNT_PLAYER (IAM accounts are not `thegame:data:account` rows).
   */
  private async ensureDataStorePlayerForLinkedCharacter(
    accountId: string,
    characterId: string,
    character: GameCharacter
  ): Promise<void> {
    const account = await this.getAccountById(accountId);
    if (!account) return;

    const existing = await this.getPlayerByCharacterId(characterId);
    if (existing) {
      account.playerId = existing.id;
      account.updatedAt = toUTCISOString(getUTCNow());
      await kvSet(buildAccountKey(accountId), account);
      return;
    }

    // DS Player + CHARACTER_PLAYER links for any login-linked staff role (not only the `player` badge).
    const eligible =
      character.roles.includes(CharacterRole.PLAYER) ||
      character.roles.includes(CharacterRole.FOUNDER) ||
      character.roles.includes(CharacterRole.TEAM);
    if (!eligible) return;

    const now = getUTCNow();
    const newPlayer: Player = {
      id: uuidv4(),
      name: character.name || account.name,
      description: `Player for character ${character.name || characterId}`,
      accountId,
      email: account.email || '',
      passwordHash: '',
      level: 1,
      totalPoints: { hp: 0, fp: 0, rp: 0, xp: 0 },
      points: { hp: 0, fp: 0, rp: 0, xp: 0 },
      characterIds: [characterId],
      badges: [],
      achievements: [],
      lastActiveAt: now,
      totalTasksCompleted: 0,
      totalSalesCompleted: 0,
      totalItemsSold: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      links: [],
    };

    await upsertPlayer(newPlayer, { skipWorkflowEffects: true, skipLinkEffects: true });

    const updatedChar: GameCharacter = {
      ...character,
      playerId: newPlayer.id,
      updatedAt: now,
    };
    await upsertCharacter(updatedChar, { skipWorkflowEffects: true, skipLinkEffects: true });

    await rosettaCreateLink(
      {
        id: uuidv4(),
        linkType: LinkType.CHARACTER_PLAYER,
        source: { type: EntityType.CHARACTER, id: characterId },
        target: { type: EntityType.PLAYER, id: newPlayer.id },
        createdAt: now,
      },
      { skipValidation: true }
    );

    await rosettaCreateLink(
      {
        id: uuidv4(),
        linkType: LinkType.PLAYER_CHARACTER,
        source: { type: EntityType.PLAYER, id: newPlayer.id },
        target: { type: EntityType.CHARACTER, id: characterId },
        createdAt: now,
      },
      { skipValidation: true }
    );

    account.playerId = newPlayer.id;
    account.updatedAt = toUTCISOString(now);
    await kvSet(buildAccountKey(accountId), account);
  }

  // ═══════════════════════════════════════════════════════════════
  // PERMISSIONS
  // ═══════════════════════════════════════════════════════════════

  getPermissions(user: AuthUser): AuthPermissions {
    return createPermissionEvaluator(user.roles, PERMISSION_MATRIX);
  }

  // ═══════════════════════════════════════════════════════════════
  // AUTHENTICATION (resolves Account → Link → DS Character)
  // ═══════════════════════════════════════════════════════════════

  async authenticatePassphrase(passphrase: string): Promise<AuthResult> {
    const adminKey = process.env.ADMIN_ACCESS_KEY;
    const founderEmail = process.env.FOUNDER_EMAIL?.toLowerCase().trim();

    if (!adminKey || passphrase !== adminKey) {
      return { success: false, error: 'Invalid passphrase' };
    }

    let account: Account | null = null;
    if (founderEmail) {
      account = await this.getAccountByEmail(founderEmail);
    }

    if (!account) {
      const accounts = await this.listAccounts();
      const passphraseAccounts = accounts.filter(a => a.passphraseFlag);
      if (passphraseAccounts.length === 1) {
        account = passphraseAccounts[0];
      } else if (passphraseAccounts.length === 0 && accounts.length === 1) {
        account = accounts[0];
      } else if (passphraseAccounts.length > 1) {
        return { success: false, error: 'Multiple passphrase accounts found. Set FOUNDER_EMAIL to disambiguate.' };
      }
    }

    if (!account || !account.isActive) {
      return { success: false, error: 'Founder account not found or inactive' };
    }

    const character = await this.resolveCharacterForAccount(account.id);
    if (!character) {
      return { success: false, error: 'Character not found for account. Check ACCOUNT_CHARACTER link.' };
    }

    const authUser: AuthUser = {
      userId: account.id,
      accountId: account.id,
      username: account.name,
      email: account.email,
      characterId: character.id,
      roles: character.roles,
      isActive: account.isActive
    };

    const token = await this.generateJWT(authUser);
    return { success: true, user: authUser, token };
  }

  async authenticateEmailPassword(email: string, password: string): Promise<AuthResult> {
    if (!email || !password) {
      return { success: false, error: 'Email and password are required' };
    }

    const mapping = await kvGet<{ accountId: string }>(buildAccountByEmailKey(email.trim().toLowerCase()));
    if (!mapping) {
      return { success: false, error: 'Invalid email or password' };
    }

    const account = await this.getAccountById(mapping.accountId);
    if (!account) {
      return { success: false, error: 'Invalid email or password' };
    }

    if (!account.isActive) {
      return { success: false, error: 'Account is inactive' };
    }

    if (!account.passwordHash) {
      return { success: false, error: 'Account does not have a password set' };
    }

    const isPasswordValid = await bcrypt.compare(password, account.passwordHash);
    if (!isPasswordValid) {
      return { success: false, error: 'Invalid email or password' };
    }

    const character = await this.resolveCharacterForAccount(account.id);
    if (!character) {
      return { success: false, error: 'Character not found for account. Check ACCOUNT_CHARACTER link.' };
    }

    const authUser: AuthUser = {
      userId: account.id,
      accountId: account.id,
      username: account.name,
      email: account.email,
      characterId: character.id,
      roles: character.roles,
      isActive: account.isActive
    };

    const token = await this.generateJWT(authUser);
    return { success: true, user: authUser, token };
  }

  // ═══════════════════════════════════════════════════════════════
  // JWT
  // ═══════════════════════════════════════════════════════════════

  async generateJWT(user: AuthUser): Promise<string> {
    const secret = process.env.ADMIN_SESSION_SECRET;
    if (!secret) throw new Error('ADMIN_SESSION_SECRET not configured');

    const secretBytes = new TextEncoder().encode(secret);
    return await new SignJWT({ ...user })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer('iam-service')
      .setExpirationTime('24h')
      .sign(secretBytes);
  }

  async verifyJWT(token: string): Promise<AuthUser | null> {
    const secret = process.env.ADMIN_SESSION_SECRET;
    if (!secret) return null;

    try {
      const secretBytes = new TextEncoder().encode(secret);
      const { payload: jwtPayload } = await jwtVerify(token, secretBytes, {
        algorithms: ['HS256'],
        issuer: 'iam-service'
      });

      const data = jwtPayload as any;

      if (data.type === 'm2m') {
        return {
          userId: `system:${data.appId}`,
          accountId: 'system',
          username: data.appId as string,
          email: `${data.appId}@du.system`,
          characterId: 'system',
          roles: [CharacterRole.AI_AGENT],
          isActive: true
        };
      }

      if (data.roles && Array.isArray(data.roles)) {
        const normalizedRoles = normalizeCharacterRoles(data.roles as (CharacterRole | string)[]);
        data.roles = normalizedRoles;
      } else if (typeof data.roles === 'string') {
        const normalizedRoles = normalizeCharacterRoles([data.roles as string]);
        data.roles = normalizedRoles;
      }

      return data as unknown as AuthUser;
    } catch (error) {
      console.error('[IAM] JWT Verification failed:', error);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // M2M & HANDSHAKE
  // ═══════════════════════════════════════════════════════════════

  async generateM2MKey(appId: string): Promise<string> {
    const apiKey = `du_${uuidv4().replace(/-/g, '')}`;
    await kvSet(buildM2MKey(appId), {
      appId,
      apiKey,
      createdAt: toUTCISOString(getUTCNow())
    });
    await kvSAdd(IAM_M2M_INDEX, appId);
    return apiKey;
  }

  async authenticateM2M(appId: string, apiKey: string): Promise<string | null> {
    const data = await kvGet<{ appId: string, apiKey: string }>(buildM2MKey(appId));
    if (!data || data.apiKey !== apiKey) return null;

    const secret = process.env.ADMIN_SESSION_SECRET;
    if (!secret) return null;

    const secretBytes = new TextEncoder().encode(secret);
    return await new SignJWT({ appId, type: 'm2m' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer('iam-service')
      .setExpirationTime('10m')
      .sign(secretBytes);
  }

  async generateHandshakeToken(targetApp: string, user: AuthUser): Promise<string> {
    const token = uuidv4();
    const key = `${HANDSHAKE_PREFIX}${token}`;
    const { kv } = await import('@/lib/utils/kv');
    await (kv as any).set(key, { ...user, aud: targetApp }, { ex: 60 });
    return token;
  }

  async consumeHandshakeToken(token: string, currentApp: string): Promise<AuthUser | null> {
    const key = `${HANDSHAKE_PREFIX}${token}`;
    const data = await kvGet<AuthUser & { aud: string }>(key);
    if (!data) return null;

    if (data.aud !== currentApp) {
      console.warn(`[IAM] Handshake audience mismatch: expected ${data.aud}, got ${currentApp}`);
      return null;
    }

    const { kv } = await import('@/lib/utils/kv');
    await kv.del(key);

    const { aud, ...user } = data;
    return user;
  }

  async listM2MApps(): Promise<{ appId: string; createdAt: string }[]> {
    const indexed = await kvSMembers(IAM_M2M_INDEX);
    const { kvScan } = await import('@/lib/utils/kv');
    const allKeys = await kvScan('iam:m2m:');
    const fromKeys = allKeys
      .map((k: string) => k.split(':').pop() || '')
      .filter(Boolean);

    const indexSet = new Set(indexed);
    for (const appId of fromKeys) {
      if (!indexSet.has(appId)) {
        await kvSAdd(IAM_M2M_INDEX, appId);
        indexSet.add(appId);
      }
    }

    const appIds = Array.from(new Set([...indexed, ...fromKeys]));

    const apps = await Promise.all(
      appIds.map(async (appId) => {
        const data = await kvGet<{ appId: string; createdAt: string }>(buildM2MKey(appId));
        return data;
      })
    );
    return apps.filter(Boolean) as { appId: string; createdAt: string }[];
  }
}

export const iamService = new IAMService();

