// lib/constants/entity-constants.ts
// Centralized entity ID constants (DRY principle)

/**
 * Player One Entity IDs - The Bootstrap Identity
 * 
 * There must ALWAYS be at least one account/player/character for the system to exist.
 * "Player One" is the unique bootstrap identity.
 * "Founder" is just a role that multiple people can have (e.g. company associates, team members).
 * 
 * These are the canonical IDs used across the entire system.
 */
export const PLAYER_ONE_ACCOUNT_ID = 'account-one';
export const PLAYER_ONE_ID = 'player-one';
export const CHARACTER_ONE_ID = 'character-one';

/**
 * Check if an entity is Player One
 */
export const isPlayerOneAccount = (accountId: string): boolean => accountId === PLAYER_ONE_ACCOUNT_ID;
export const isPlayerOne = (playerId: string): boolean => playerId === PLAYER_ONE_ID;
export const isCharacterOne = (characterId: string): boolean => characterId === CHARACTER_ONE_ID;


