/**
 * IAM Service
 * Central service for Account, Character, and Player management.
 * Standardized across thegame, pixelbrain, and akiles-ecosystem.
 */

import { kvGet, kvSet, kvSAdd, kvSMembers } from '@/data-store/kv';
import {
  buildAccountKey,
  buildAccountByEmailKey,
  buildCharacterKey,
  buildPlayerKey,
  buildLinkKey,
  buildM2MKey,
  IAM_ACCOUNTS_INDEX,
  IAM_CHARACTERS_INDEX,
  IAM_PLAYERS_INDEX,
  IAM_M2M_INDEX
} from './keys';
import { v4 as uuidv4 } from 'uuid';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

// --- Interfaces (Standardized) ---

import { CharacterRole } from '@/types/enums';
export { CharacterRole };

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

export interface Character {
  id: string;
  accountId: string;
  name: string;
  roles: CharacterRole[];
  profile: Record<string, any>;
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
  user?: {
    userId: string;
    accountId: string;
    username: string;
    email: string;
    characterId: string;
    roles: CharacterRole[];
    isActive: boolean;
  };
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

interface CreateCharacterDTO {
  name: string;
  roles: CharacterRole[];
  profile?: Record<string, any>;
}

const HANDSHAKE_PREFIX = 'iam:handshake:';

// --- Permissions & RBAC (Legacy Consolidated) ---

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
  // Tasks
  { resource: 'tasks', action: 'read', roles: [CharacterRole.FOUNDER, CharacterRole.TEAM] },
  { resource: 'tasks', action: 'write', roles: [CharacterRole.FOUNDER, CharacterRole.TEAM] },
  { resource: 'tasks', action: 'delete', roles: [CharacterRole.FOUNDER] },

  // Finances
  { resource: 'finances', action: 'read', roles: [CharacterRole.FOUNDER] },
  { resource: 'finances', action: 'write', roles: [CharacterRole.FOUNDER] },

  // Inventory
  { resource: 'inventory', action: 'read', roles: [CharacterRole.FOUNDER, CharacterRole.TEAM] },
  { resource: 'inventory', action: 'write', roles: [CharacterRole.FOUNDER, CharacterRole.TEAM] },

  // Sales
  { resource: 'sales', action: 'read', roles: [CharacterRole.FOUNDER, CharacterRole.TEAM] },
  { resource: 'sales', action: 'write', roles: [CharacterRole.FOUNDER, CharacterRole.TEAM] },

  // Player Management
  { resource: 'players', action: 'read', roles: [CharacterRole.FOUNDER] },
  { resource: 'players', action: 'write', roles: [CharacterRole.FOUNDER] },

  // User Management
  { resource: 'users', action: 'read', roles: [CharacterRole.FOUNDER] },
  { resource: 'users', action: 'write', roles: [CharacterRole.FOUNDER] },

  // Settings
  { resource: 'settings', action: 'read', roles: [CharacterRole.FOUNDER] },
  { resource: 'settings', action: 'write', roles: [CharacterRole.FOUNDER] },
];

// --- IAM Service Implementation ---

export class IAMService {
  /**
   * Create a new Account (The Egg)
   */
  async createAccount(data: CreateAccountDTO): Promise<Account> {
    let passwordHash: string | null = null;

    // Hash password if provided
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

  /**
   * Create a new Character (The Hatchling) linked to an Account
   */
  async createCharacter(accountId: string, data: CreateCharacterDTO): Promise<Character> {
    const character: Character = {
      id: uuidv4(),
      accountId: accountId,
      name: data.name,
      roles: data.roles,
      profile: data.profile || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await kvSet(buildCharacterKey(character.id), character);
    await kvSAdd(IAM_CHARACTERS_INDEX, character.id);

    // Link Account ↔ Character
    await this.createLink(accountId, character.id, 'ACCOUNT_CHARACTER');

    return character;
  }

  /**
   * Create a new Player Entity (The Evolution) granted to a Character
   * Requirement: Character must have the 'player' role
   */
  async createPlayer(characterId: string): Promise<Player> {
    const character = await this.getCharacterById(characterId);
    if (!character) throw new Error('Character not found');

    const hasPlayerRole = character.roles.includes(CharacterRole.PLAYER) || 
                          character.roles.includes(CharacterRole.FOUNDER);

    if (!hasPlayerRole) {
      throw new Error('Character does not have the PLAYER role. Contact Founder for grant.');
    }

    const player: Player = {
      id: uuidv4(),
      characterId: characterId,
      jungleCoins: 0,
      level: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await kvSet(buildPlayerKey(player.id), player);
    await kvSAdd(IAM_PLAYERS_INDEX, player.id);

    // Link Character ↔ Player
    await this.createLink(characterId, player.id, 'CHARACTER_PLAYER');

    return player;
  }

  /**
   * Generic link creation helper
   */
  private async createLink(sourceId: string, targetId: string, type: string): Promise<void> {
    const key = buildLinkKey(sourceId, targetId, type);
    const linkData = {
      id: uuidv4(),
      sourceId,
      targetId,
      type,
      createdAt: new Date().toISOString()
    };
    await kvSet(key, linkData);
  }

  // --- Retrieval Methods ---

  async getAccountById(id: string): Promise<Account | null> {
    return await kvGet<Account>(buildAccountKey(id));
  }

  async getAccountByEmail(email: string): Promise<Account | null> {
    const mapping = await kvGet<any>(buildAccountByEmailKey(email));
    if (!mapping) return null;
    
    // Fix: Handle both legacy string mapping and new object mapping
    let accountId: string;
    if (typeof mapping === 'string') {
      accountId = mapping;
    } else if (mapping && typeof mapping === 'object' && mapping.accountId) {
      accountId = mapping.accountId;
    } else {
      console.error(`[IAM] Invalid email mapping format for ${email}:`, mapping);
      return null;
    }

    // Fix: Normalize ID by stripping common prefixes if accidentally present
    // This handles "iam:account:ID" or "thegame:account:ID" accidentally stored as the ID
    accountId = accountId.split(':').pop() || accountId;

    return await this.getAccountById(accountId);
  }

  async getCharacterById(id: string): Promise<Character | null> {
    return await kvGet<Character>(buildCharacterKey(id));
  }

  async getPlayerById(id: string): Promise<Player | null> {
    return await kvGet<Player>(buildPlayerKey(id));
  }

  /**
   * Get pre-bound permissions helper for a user
   */
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

  async getCharacterByAccountId(accountId: string): Promise<Character | null> {
    // In V0.1 we assume 1:1 for Founder/Team for simplicity
    // But we use the scan pattern if needed or index
    const characterIds = await kvSMembers(IAM_CHARACTERS_INDEX);
    for (const id of characterIds) {
      const char = await this.getCharacterById(id);
      if (char?.accountId === accountId) return char;
    }
    return null;
  }

  async getPlayerByCharacterId(characterId: string): Promise<Player | null> {
    const playerIds = await kvSMembers(IAM_PLAYERS_INDEX);
    for (const id of playerIds) {
      const player = await this.getPlayerById(id);
      if (player?.characterId === characterId) return player;
    }
    return null;
  }

  // --- Role Management & Evolution ---

  /**
   * Assign roles to a character and trigger evolution if necessary
   */
  async assignCharacterRoles(characterId: string, roles: CharacterRole[]): Promise<Character> {
    const character = await this.getCharacterById(characterId);
    if (!character) throw new Error('Character not found');

    const oldRoles = character.roles;
    character.roles = Array.from(new Set(roles));
    character.updatedAt = new Date().toISOString();

    await kvSet(buildCharacterKey(characterId), character);

    // Evolution Trigger: If PLAYER or FOUNDER role is added and no player exists, create one
    const isNowPlayer = character.roles.includes(CharacterRole.PLAYER) || character.roles.includes(CharacterRole.FOUNDER);
    const wasAlreadyPlayer = oldRoles.includes(CharacterRole.PLAYER) || oldRoles.includes(CharacterRole.FOUNDER);

    if (isNowPlayer && !wasAlreadyPlayer) {
      const existingPlayer = await this.getPlayerByCharacterId(characterId);
      if (!existingPlayer) {
        console.log(`[IAM] Evolution Trigger: Creating player for character ${characterId}`);
        await this.createPlayer(characterId);
      }
    }

    return character;
  }

  // --- Authentication Methods ---

  /**
   * Simple Passphrase Authentication for Founder/Team
   */
  async authenticatePassphrase(passphrase: string): Promise<AuthResult> {
    const adminKey = process.env.ADMIN_ACCESS_KEY;
    const founderEmail = process.env.FOUNDER_EMAIL || 'aquiles.segovia.villamizar@gmail.com';

    if (!adminKey || passphrase !== adminKey) {
      return { success: false, error: 'Invalid passphrase' };
    }

    // Find the Founder account via O(1) lookup
    const account = await this.getAccountByEmail(founderEmail);

    if (!account || !account.isActive) {
      return { success: false, error: 'Founder account not found or inactive' };
    }

    const character = await this.getCharacterByAccountId(account.id);
    if (!character) {
      return { success: false, error: 'Character not found for account' };
    }

    const authUser: AuthUser = {
      userId: account.id, // Primary ID
      accountId: account.id,
      username: account.name,
      email: account.email,
      characterId: character.id,
      roles: character.roles,
      isActive: account.isActive
    };

    const token = await this.generateJWT(authUser);

    return {
      success: true,
      user: authUser,
      token
    };
  }

  /**
   * Email/Password Authentication for regular users
   */
  async authenticateEmailPassword(email: string, password: string): Promise<AuthResult> {
    // Validate inputs
    if (!email || !password) {
      return { success: false, error: 'Email and password are required' };
    }

    // Find account by email
    const account = await this.getAccountByEmail(email.toLowerCase());

    if (!account) {
      return { success: false, error: 'Invalid email or password' };
    }

    if (!account.isActive) {
      return { success: false, error: 'Account is inactive' };
    }

    // Check if account has a password set
    if (!account.passwordHash) {
      return { success: false, error: 'Account does not have a password set' };
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, account.passwordHash);
    if (!isPasswordValid) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Find associated character
    const character = await this.getCharacterByAccountId(account.id);
    if (!character) {
      return { success: false, error: 'Character not found for account' };
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

    return {
      success: true,
      user: authUser,
      token
    };
  }

  /**
   * Generate a JWT for cross-project session persistence
   */
  async generateJWT(user: AuthUser): Promise<string> {
    const secret = process.env.ADMIN_SESSION_SECRET;
    if (!secret) throw new Error('ADMIN_SESSION_SECRET not configured');

    const secretBytes = new TextEncoder().encode(secret);
    const alg = 'HS256';

    const token = await new SignJWT({ ...user })
      .setProtectedHeader({ alg })
      .setIssuedAt()
      .setIssuer('iam-service')
      .setExpirationTime('24h')
      .sign(secretBytes);

    return token;
  }

  /**
   * Verify a JWT and return the AuthUser
   */
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

      // Role Normalization & Validation (Enum-based & Lowercase)
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

  // --- M2M & Handshake Methods ---

  /**
   * Register an API key for a system component (M2M)
   */
  async generateM2MKey(appId: string): Promise<string> {
    const apiKey = `du_${uuidv4().replace(/-/g, '')}`; // du_ prefix for Digital Universe
    await kvSet(buildM2MKey(appId), {
      appId,
      apiKey,
      createdAt: new Date().toISOString()
    });
    await kvSAdd(IAM_M2M_INDEX, appId);
    return apiKey;
  }

  /**
   * Authenticate a system component via API Key
   */
  async authenticateM2M(appId: string, apiKey: string): Promise<string | null> {
    const data = await kvGet<{ appId: string, apiKey: string }>(buildM2MKey(appId));
    if (!data || data.apiKey !== apiKey) return null;

    // Generate a short-lived M2M token
    const secret = process.env.ADMIN_SESSION_SECRET;
    if (!secret) return null;

    const secretBytes = new TextEncoder().encode(secret);
    return await new SignJWT({ appId, type: 'm2m' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer('iam-service')
      .setExpirationTime('10m') // M2M tokens are very short-lived
      .sign(secretBytes);
  }

  /**
   * Generate a single-use handshake token for SSO-lite
   */
  async generateHandshakeToken(targetApp: string, user: AuthUser): Promise<string> {
    const token = uuidv4();
    const key = `${HANDSHAKE_PREFIX}${token}`;
    
    // Use raw kv.set to handle TTL (ex: 60)
    const { kv } = await import('@/data-store/kv');
    await (kv as any).set(key, { ...user, aud: targetApp }, { ex: 60 });
    return token;
  }

  /**
   * Consume a handshake token (one-time use)
   */
  async consumeHandshakeToken(token: string, currentApp: string): Promise<AuthUser | null> {
    const key = `${HANDSHAKE_PREFIX}${token}`;
    const data = await kvGet<AuthUser & { aud: string }>(key);
    
    if (!data) return null;

    // Audience Guard
    if (data.aud !== currentApp) {
      console.warn(`[IAM] Handshake audience mismatch: expected ${data.aud}, got ${currentApp}`);
      return null;
    }

    // Burn-after-reading: Delete immediately
    // In thegame we use kv.del via data-store wrapper
    // (Note: kv.ts has del but it might not be exported as kvDel, checking...)
    const { kv } = await import('@/data-store/kv');
    await kv.del(key);

    const { aud, ...user } = data;
    return user;
  }

  /**
   * List all M2M applications
   */
  async listM2MApps(): Promise<{ appId: string; createdAt: string }[]> {
    let appIds = await kvSMembers(IAM_M2M_INDEX);
    
    // Robustness: If index is empty, try to find existing apps via scan (if possible)
    // For now, we assume if it's missing, we might have lost the index
    if (appIds.length === 0) {
      // Note: kvSMembers is used in this environment, scanning might be limited
      // but we expect at least 'pixelbrain' if it exists.
      // If we can't scan, we'll try to explicitly check 'pixelbrain'
      const pixelbrain = await kvGet(buildM2MKey('pixelbrain'));
      if (pixelbrain) {
        appIds = ['pixelbrain'];
        await kvSAdd(IAM_M2M_INDEX, 'pixelbrain');
      }
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
