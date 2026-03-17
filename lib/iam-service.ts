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
  IAM_ACCOUNTS_INDEX,
  IAM_CHARACTERS_INDEX,
  IAM_PLAYERS_INDEX
} from './keys';
import { v4 as uuidv4 } from 'uuid';

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
}

export const iamService = new IAMService();
