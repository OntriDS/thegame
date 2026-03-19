/**
 * IAM Service
 * Manages Accounts (identity/credentials) and authentication.
 * Characters are NOT stored in IAM — they live in the Game Data-Store.
 * The ACCOUNT_CHARACTER link (Rosetta Stone) bridges the two.
 */

import { kvGet, kvSet, kvSAdd, kvSRem, kvSMembers, kvDel } from '@/data-store/kv';
import {
  buildAccountKey,
  buildAccountByEmailKey,
  buildPlayerKey,
  buildM2MKey,
  IAM_ACCOUNTS_INDEX,
  IAM_PLAYERS_INDEX,
  IAM_M2M_INDEX
} from './keys';
import { v4 as uuidv4 } from 'uuid';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

import { CharacterRole, EntityType, LinkType } from '@/types/enums';
export { CharacterRole };

import { getCharacterById as dsGetCharacterById } from '@/data-store/repositories/character.repo';
import { getLinksFor, createLink as rosettaCreateLink } from '@/links/link-registry';
import type { Character as GameCharacter, Link } from '@/types/entities';

// --- Interfaces ---

export interface Account {
  id: string;
  name: string;
  email: string;
  phone?: string;
  passwordHash: string | null;
  passphraseFlag: boolean;
  isActive: boolean;
  isVerified: boolean;
  characterId?: string;
  playerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Player {
  id: string;
  characterId: string;
  jungleCoins: number;
  level: number;
  createdAt: string;
  updatedAt: string;
}

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
  password?: string;
  passphraseFlag?: boolean;
}

const HANDSHAKE_PREFIX = 'iam:handshake:';

// --- Permissions & RBAC ---

export interface Permission {
  resource: string;
  action: string;
  roles: CharacterRole[];
}

export interface AuthPermissions {
  hasRole: (role: string | CharacterRole) => boolean;
  hasAnyRole: (roles: (string | CharacterRole)[]) => boolean;
  can: (resource: string, action: string) => boolean;
}

const PERMISSION_MATRIX: Permission[] = [
  { resource: 'tasks', action: 'read', roles: [CharacterRole.FOUNDER, CharacterRole.TEAM] },
  { resource: 'tasks', action: 'write', roles: [CharacterRole.FOUNDER, CharacterRole.TEAM] },
  { resource: 'tasks', action: 'delete', roles: [CharacterRole.FOUNDER] },
  { resource: 'finances', action: 'read', roles: [CharacterRole.FOUNDER] },
  { resource: 'finances', action: 'write', roles: [CharacterRole.FOUNDER] },
  { resource: 'inventory', action: 'read', roles: [CharacterRole.FOUNDER, CharacterRole.TEAM] },
  { resource: 'inventory', action: 'write', roles: [CharacterRole.FOUNDER, CharacterRole.TEAM] },
  { resource: 'sales', action: 'read', roles: [CharacterRole.FOUNDER, CharacterRole.TEAM] },
  { resource: 'sales', action: 'write', roles: [CharacterRole.FOUNDER, CharacterRole.TEAM] },
  { resource: 'players', action: 'read', roles: [CharacterRole.FOUNDER] },
  { resource: 'players', action: 'write', roles: [CharacterRole.FOUNDER] },
  { resource: 'users', action: 'read', roles: [CharacterRole.FOUNDER] },
  { resource: 'users', action: 'write', roles: [CharacterRole.FOUNDER] },
  { resource: 'settings', action: 'read', roles: [CharacterRole.FOUNDER] },
  { resource: 'settings', action: 'write', roles: [CharacterRole.FOUNDER] },
];

// --- IAM Service Implementation ---

export class IAMService {

  // ═══════════════════════════════════════════════════════════════
  // ACCOUNT CRUD (iam:account:*)
  // ═══════════════════════════════════════════════════════════════

  async createAccount(data: CreateAccountDTO): Promise<Account> {
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
      passwordHash,
      passphraseFlag: data.passphraseFlag || false,
      isActive: true,
      isVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await kvSet(buildAccountKey(account.id), account);
    await kvSet(buildAccountByEmailKey(account.email), { accountId: account.id });
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
    const mapping = await kvGet<any>(buildAccountByEmailKey(email));
    if (!mapping) return null;

    let accountId: string;
    if (typeof mapping === 'string') {
      accountId = mapping;
    } else if (mapping && typeof mapping === 'object' && mapping.accountId) {
      accountId = mapping.accountId;
    } else {
      console.error(`[IAM] Invalid email mapping format for ${email}:`, mapping);
      return null;
    }

    accountId = accountId.split(':').pop() || accountId;
    return await this.getAccountById(accountId);
  }

  async updateAccount(
    accountId: string,
    updates: {
      name?: string;
      email?: string;
      phone?: string | undefined;
      password?: string;
      isActive?: boolean;
      isVerified?: boolean;
    }
  ): Promise<Account> {
    const account = await this.getAccountById(accountId);
    if (!account) throw new Error('Account not found');

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
      passwordHash: passwordHash !== undefined ? passwordHash : account.passwordHash,
      isActive: updates.isActive !== undefined ? updates.isActive : account.isActive,
      isVerified: updates.isVerified !== undefined ? updates.isVerified : account.isVerified,
      updatedAt: new Date().toISOString(),
    };

    await kvSet(buildAccountKey(accountId), updated);
    return updated;
  }

  async disableAccount(accountId: string): Promise<void> {
    const account = await this.getAccountById(accountId);
    if (!account) return;

    const updated: Account = {
      ...account,
      isActive: false,
      updatedAt: new Date().toISOString(),
    };

    await kvSet(buildAccountKey(accountId), updated);
    await kvSRem(IAM_ACCOUNTS_INDEX, accountId);
    await kvDel(buildAccountByEmailKey(account.email));
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

    const character = await dsGetCharacterById(characterId);
    if (!character) throw new Error('Character not found in Game Data-Store');

    account.characterId = characterId;
    account.updatedAt = new Date().toISOString();
    await kvSet(buildAccountKey(accountId), account);

    const link: Link = {
      id: uuidv4(),
      linkType: LinkType.ACCOUNT_CHARACTER,
      source: { type: EntityType.ACCOUNT, id: accountId },
      target: { type: EntityType.CHARACTER, id: characterId },
      createdAt: new Date(),
    };
    await rosettaCreateLink(link, { skipValidation: true });

    return { account, character };
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
      account.updatedAt = new Date().toISOString();
      await kvSet(buildAccountKey(accountId), account);
    }
    return char;
  }

  // ═══════════════════════════════════════════════════════════════
  // PLAYER (iam:player:* — stays in IAM for now, game progression)
  // ═══════════════════════════════════════════════════════════════

  async getPlayerById(id: string): Promise<Player | null> {
    return await kvGet<Player>(buildPlayerKey(id));
  }

  async getPlayerByCharacterId(characterId: string): Promise<Player | null> {
    const playerIds = await kvSMembers(IAM_PLAYERS_INDEX);
    for (const id of playerIds) {
      const player = await this.getPlayerById(id);
      if (player?.characterId === characterId) return player;
    }
    return null;
  }

  async createPlayer(characterId: string): Promise<Player> {
    const character = await dsGetCharacterById(characterId);
    if (!character) throw new Error('Character not found in Game Data-Store');

    const hasPlayerRole = character.roles.includes(CharacterRole.PLAYER) ||
                          character.roles.includes(CharacterRole.FOUNDER);

    if (!hasPlayerRole) {
      throw new Error('Character does not have the PLAYER role.');
    }

    const player: Player = {
      id: uuidv4(),
      characterId,
      jungleCoins: 0,
      level: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await kvSet(buildPlayerKey(player.id), player);
    await kvSAdd(IAM_PLAYERS_INDEX, player.id);

    return player;
  }

  // ═══════════════════════════════════════════════════════════════
  // PERMISSIONS
  // ═══════════════════════════════════════════════════════════════

  getPermissions(user: AuthUser): AuthPermissions {
    const userRoles = user.roles || [];

    return {
      hasRole: (role: string | CharacterRole) => {
        if (userRoles.includes(CharacterRole.FOUNDER)) return true;
        return userRoles.includes(role as any);
      },

      hasAnyRole: (roles: (string | CharacterRole)[]) => {
        if (userRoles.includes(CharacterRole.FOUNDER)) return true;
        return roles.some(role => userRoles.includes(role as any));
      },

      can: (resource: string, action: string) => {
        if (userRoles.includes(CharacterRole.FOUNDER)) return true;
        const matchingPermissions = PERMISSION_MATRIX.filter(
          perm => perm.resource === resource && perm.action === action
        );
        return matchingPermissions.some(perm =>
          perm.roles.some(role => userRoles.includes(role))
        );
      },
    };
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
          roles: [CharacterRole.ADMIN, CharacterRole.DEVELOPER],
          isActive: true
        };
      }

      if (data.roles && Array.isArray(data.roles)) {
        const validRoles = Object.values(CharacterRole) as string[];
        data.roles = data.roles
          .map((r: string) => r.toLowerCase())
          .filter((r: string) => validRoles.includes(r));
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
      createdAt: new Date().toISOString()
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
    const { kv } = await import('@/data-store/kv');
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

    const { kv } = await import('@/data-store/kv');
    await kv.del(key);

    const { aud, ...user } = data;
    return user;
  }

  async listM2MApps(): Promise<{ appId: string; createdAt: string }[]> {
    let appIds = await kvSMembers(IAM_M2M_INDEX);

    if (appIds.length === 0) {
      const { kvScan } = await import('@/data-store/kv');
      const allKeys = await kvScan('iam:m2m:');
      appIds = allKeys.map((k: string) => k.split(':').pop() || '');
    }

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
