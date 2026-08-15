import { Character } from '@/types/entities';

/**
 * COMPATIBILITY SELECTORS - (Character / Account Identity)
 * These functions safely extract identity fields from a Character entity
 * that are transitioning to the Account entity.
 */

export function getCharacterEmail(character: Character): string | undefined {
  return (character as any).contactEmail;
}

export function getCharacterPhone(character: Character): string | undefined {
  return (character as any).contactPhone;
}

export function getCharacterWallet(character: Character): any {
  // Wallet is meant to be read from CharacterViewV1.walletProjection 
  // but APIs currently read it directly from the Character legacy shape.
  return (character as any).wallet;
}
