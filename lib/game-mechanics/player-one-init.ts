/**
 * Player One Initialization - The Triforce Bootstrap
 * 
 * Environment-agnostic utility that ensures The Triforce (Account + Player + Character) exists.
 * There must ALWAYS be at least one account for the system to exist.
 * This runs ONCE on first load, works in BOTH LocalAdapter and HybridAdapter.
 * 
 * Creates "The Triforce":
 * - Account "account-one" (Power - Source of Truth for identity)
 * - Player "player-one" (Wisdom - Game progression)
 * - Character "character-one" (Courage - Business role with FOUNDER role)
 * - Links: ACCOUNT ↔ PLAYER ↔ CHARACTER (bidirectional links via workflows)
 * 
 * Note: "Player One" is the unique bootstrap identity.
 * "Founder" is just a role that multiple people can have.
 */

import { Player, Character, Account } from '@/types/entities';
import { CharacterRole, EntityType } from '@/types/enums';
import { PLAYER_ONE_ID, CHARACTER_ONE_ID, PLAYER_ONE_ACCOUNT_ID } from '@/lib/constants/entity-constants';

/**
 * Default Account One - The Source of Truth for Identity
 * User edits this from Player Modal → Account submodal
 * This is the "Triforce" - Account/Player/Character all linked
 */
const DEFAULT_ACCOUNT_ONE: Account = {
  id: PLAYER_ONE_ACCOUNT_ID,
  name: 'Akiles',  // Source of truth for name (user fills this in)
  description: 'Player One Account',
  
  // Identity
  email: '',
  phone: '',
  
  // Authentication (empty - not connected to real login yet)
  passwordHash: '',
  loginAttempts: 0,
  
  // Access Control
  isActive: true,
  isVerified: true,
  
  // Privacy Settings
  privacySettings: {
    showEmail: false,
    showPhone: false,
    showRealName: true
  },
  
  // Relationships - The Triforce Link
  playerId: PLAYER_ONE_ID,
  characterId: CHARACTER_ONE_ID,
  
  // Lifecycle
  lastActiveAt: new Date(),
  
  // Timestamps
  createdAt: new Date(),
  updatedAt: new Date(),
  links: []
};

/**
 * Default Player One - Gets name from Account
 * User edits account info from Player Modal → Account submodal
 */
const DEFAULT_PLAYER_ONE: Player = {
  id: PLAYER_ONE_ID,
  name: '',  // Will be synced from Account
  description: 'Player One',
  
  // Account Ambassador - Permanently linked from start
  accountId: PLAYER_ONE_ACCOUNT_ID,
  // Temporary auth fields (empty - to be filled from Account)
  email: '',
  passwordHash: '',
  
  // Progression
  level: 0,
  totalPoints: { xp: 0, rp: 0, fp: 0, hp: 0 },
  points: { xp: 0, rp: 0, fp: 0, hp: 0 },
  jungleCoins: 0,
  
  // Character management
  characterIds: [CHARACTER_ONE_ID],
  
  // Achievements
  achievementsPlayer: [],
  
  // RPG Stats (V0.2)
  skills: undefined,
  intellectualFunctions: undefined,
  attributes: undefined,
  
  // Metrics
  lastActiveAt: new Date(),
  totalTasksCompleted: 0,
  totalSalesCompleted: 0,
  totalItemsSold: 0,
  metrics: undefined,
  
  // Status
  isActive: true,
  
  // Timestamps
  createdAt: new Date(),
  updatedAt: new Date(),
  links: []
};

/**
 * Default Character (The Creator) - Gets name from Account
 * Contact info stored in Account entity
 */
const DEFAULT_CHARACTER_ONE: Character = {
  id: CHARACTER_ONE_ID,
  name: '',  // Will be synced from Account
  description: 'Player One Character',
  
  // Account Ambassador - Permanently linked from start
  accountId: PLAYER_ONE_ACCOUNT_ID,
  
  // Roles
  roles: [CharacterRole.FOUNDER, CharacterRole.PLAYER],
  
  // Contact info (empty - user can add from Character Modal)
  contactEmail: undefined,
  contactPhone: undefined,
  
  // Communication
  commColor: undefined,
  
  // Progression
  CP: undefined,
  achievementsCharacter: [],
  
  // Business metrics
  jungleCoins: 0,
  purchasedAmount: 0,
  inventory: [],
  
  // Relationships
  playerId: PLAYER_ONE_ID,
  relationships: undefined,
  
  // Lifecycle
  lastActiveAt: new Date(),
  isActive: true,
  
  // Timestamps
  createdAt: new Date(),
  updatedAt: new Date(),
  links: []
};

let playerOneInitialized = false;

/**
 * Ensures The Triforce (Account + Player + Character) exists with proper linking
 * Checks if entities exist and creates them if missing
 * 
 * @param getPlayers - Function to retrieve all players
 * @param getCharacters - Function to retrieve all characters
 * @param getAccounts - Function to retrieve all accounts
 * @param upsertPlayer - Function to create/update player
 * @param upsertCharacter - Function to create/update character
 * @param upsertAccount - Function to create/update account
 */
export async function ensurePlayerOne(
  getPlayers: () => Promise<Player[]>,
  getCharacters: () => Promise<Character[]>,
  getAccounts: () => Promise<any[]>,
  upsertPlayer: (player: Player, options?: any) => Promise<Player>,
  upsertCharacter: (character: Character, options?: any) => Promise<Character>,
  upsertAccount: (account: Account, options?: any) => Promise<Account>,
  force?: boolean,
  options?: { skipLogging?: boolean }
): Promise<void> {
  // Hard override when called during reset
  if (force) {
    console.log('[ensurePlayerOne] 🚩 Force flag received - resetting initialization state');
    playerOneInitialized = false;
  }
  // Check if force re-initialization flag is set (after reset)
  if (typeof window !== 'undefined' && localStorage.getItem('force-triforce-reinit')) {
    console.log('[ensurePlayerOne] 🔄 Force re-initialization flag detected - resetting Triforce');
    playerOneInitialized = false;
    localStorage.removeItem('force-triforce-reinit');
  }
  
  // Check if already initialized in this session (but allow re-initialization after reset)
  if (playerOneInitialized && !force) {
    // Double-check if entities actually exist (in case of reset)
    const players = await getPlayers();
    const characters = await getCharacters();
    const accounts = await getAccounts();
    
    const accountExists = accounts.find(a => a.id === PLAYER_ONE_ACCOUNT_ID);
    const playerExists = players.find(p => p.id === PLAYER_ONE_ID);
    const characterExists = characters.find(c => c.id === CHARACTER_ONE_ID);
    
    if (accountExists && playerExists && characterExists) {
      console.log('[ensurePlayerOne] ✅ The Triforce exists and is properly initialized');
      return;
    } else {
      console.log('[ensurePlayerOne] 🔄 Triforce missing after reset - re-initializing...');
      playerOneInitialized = false; // Allow re-initialization
    }
  }
  
  try {
    const players = await getPlayers();
    const characters = await getCharacters();
    
    // Check if Player and Character exist (Account will be added later)
    const playerExists = players.find(p => p.id === PLAYER_ONE_ID);
    const characterExists = characters.find(c => c.id === CHARACTER_ONE_ID);
    
    if (playerExists && characterExists) {
      console.log('[ensurePlayerOne] ✅ Player and Character exist - skipping');
      playerOneInitialized = true;
      return;
    }
    
    console.log('[ensurePlayerOne] 🌱 No Player/Character found - creating defaults');
    
    // Use atomic creation instead of sequential upserts
    await createTriforceAtomic(upsertAccount, upsertPlayer, upsertCharacter);
    
    playerOneInitialized = true;
  } catch (error) {
    console.error('[ensurePlayerOne] ❌ Failed to ensure Player One:', error);
    // Don't throw - let app continue even if this fails
  }
}

/**
 * Create Triforce atomically without triggering workflows
 * Follows the standard pattern: entities exist first, then links are created
 */
export async function createTriforceAtomic(
  upsertAccount: (account: Account, options?: any) => Promise<Account>,
  upsertPlayer: (player: Player, options?: any) => Promise<Player>,
  upsertCharacter: (character: Character, options?: any) => Promise<Character>
): Promise<void> {
  console.log('[createTriforceAtomic] 🔺 Creating Triforce atomically...');
  
  try {
    // STEP 1: Create Player and Character entities (Account will be added later)
    const completePlayer = {
      ...DEFAULT_PLAYER_ONE,
      name: 'Akiles', // Default name
      characterIds: [CHARACTER_ONE_ID]
    };
    const savedPlayer = await upsertPlayer(completePlayer, { 
      skipWorkflowEffects: true // Skip workflows
    });
    console.log('[createTriforceAtomic] ✅ Player created (workflows skipped)');
    
    const completeCharacter = {
      ...DEFAULT_CHARACTER_ONE,
      name: 'Akiles', // Default name
      playerId: PLAYER_ONE_ID
    };
    const savedCharacter = await upsertCharacter(completeCharacter, { 
      skipWorkflowEffects: true // Skip workflows
    });
    console.log('[createTriforceAtomic] ✅ Character created (workflows skipped)');
    
    // STEP 2: Manually create Links (no workflows needed)
    const { createLink } = await import('@/links/link-registry');
    
    // Link: Player ↔ Character
    await createLink({
      id: `link-player-character-${PLAYER_ONE_ID}-${CHARACTER_ONE_ID}`,
      linkType: 'PLAYER_CHARACTER' as any,
      source: { type: EntityType.PLAYER, id: PLAYER_ONE_ID },
      target: { type: EntityType.CHARACTER, id: CHARACTER_ONE_ID },
      createdAt: new Date()
    });
    console.log('[createTriforceAtomic] 🔗 PLAYER_CHARACTER link created');
    
    // STEP 3: Manually create Logs (one "created" entry each)
    const { appendEntityLog } = await import('@/workflows/entities-logging');
    
    // Log Player creation
    await appendEntityLog(
      'player',
      PLAYER_ONE_ID,
      'CREATED',
      {
        name: savedPlayer.name,
        level: savedPlayer.level,
        totalPoints: savedPlayer.totalPoints,
        characterIds: savedPlayer.characterIds
      }
    );
    
    // Log Character creation
    await appendEntityLog(
      'character',
      CHARACTER_ONE_ID,
      'CREATED',
      {
        name: savedCharacter.name,
        roles: savedCharacter.roles,
        playerId: savedCharacter.playerId
      }
    );
    
    console.log('[createTriforceAtomic] 📝 All logs created');
    
    // STEP 4: Mark effects as complete (prevent duplicate processing)
    const { markEffect } = await import('@/data-store/effects-registry');
    await markEffect(`player:${PLAYER_ONE_ID}:playerCreated`);
    await markEffect(`character:${CHARACTER_ONE_ID}:characterCreated`);
    
    console.log('[createTriforceAtomic] 🔺 Player and Character created! Player ↔ Character');
    
  } catch (error) {
    console.error('[createTriforceAtomic] ❌ Failed to create Triforce atomically:', error);
    throw error;
  }
}

/**
 * Reset the initialization flag (for testing)
 */
export function resetPlayerOneFlag() {
  playerOneInitialized = false;
}

