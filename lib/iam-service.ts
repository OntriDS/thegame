/**
 * IAM Service
 * Central service for Account, Character, and Player management.
 * Standardized across thegame, pixelbrain, and akiles-ecosystem.
 */

import { kvGet, kvSet, kvSAdd, kvSMembers } from '@/data-store/kv';
import { 
  buildAccountKey, 
  buildCharacterKey, 
  buildPlayerKey, 
  buildLinkKey,
  buildM2MKey,
  IAM_ACCOUNTS_INDEX,
  IAM_CHARACTERS_INDEX,
  IAM_PLAYERS_INDEX
} from './keys';
import { v4 as uuidv4 } from 'uuid';
import { SignJWT, jwtVerify } from 'jose';

const HANDSHAKE_PREFIX = 'iam:handshake:';

// --- Interfaces (Standardized) ---

export enum CharacterRole {
  CUSTOMER = 'customer',
  TEAM = 'team',
  FOUNDER = 'founder',
  ADMIN = 'admin',
  OPERATOR = 'operator', // For Pixelbrain
  DEVELOPER = 'developer',
  INVESTOR = 'investor',
  SELLER = 'seller',
  PLAYER = 'player',   // Specific role for gameplay access
}

export interface Account {
  id: string;
  name: string;
  email: string;
  phone?: string;
  passwordHash: string | null;
  passphraseFlag: boolean;
  isActive: boolean;
  isVerified: boolean;
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

export interface AuthUser {
  userId: string;
  accountId: string;
  username: string;
  email: string;
  characterId: string;
  roles: CharacterRole[];
  isActive: boolean;
}

// --- IAM Service Implementation ---

export class IAMService {
  /**
   * Create a new Account (The Egg)
   */
  async createAccount(data: CreateAccountDTO): Promise<Account> {
    const account: Account = {
      id: uuidv4(),
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone,
      passwordHash: null, // Password hashing to be implemented in auth phase
      passphraseFlag: data.passphraseFlag || false,
      isActive: true,
      isVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await kvSet(buildAccountKey(account.id), account);
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

  async getCharacterById(id: string): Promise<Character | null> {
    return await kvGet<Character>(buildCharacterKey(id));
  }

  async getPlayerById(id: string): Promise<Player | null> {
    return await kvGet<Player>(buildPlayerKey(id));
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

    // Find the Founder account
    const accountIds = await kvSMembers(IAM_ACCOUNTS_INDEX);
    let account: Account | null = null;

    for (const id of accountIds) {
      const acc = await this.getAccountById(id);
      if (acc?.email === founderEmail.toLowerCase()) {
        account = acc;
        break;
      }
    }

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
      const { payload } = await jwtVerify(token, secretBytes, {
        algorithms: ['HS256'],
        issuer: 'iam-service'
      });

      return payload as unknown as AuthUser;
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
}

export const iamService = new IAMService();
