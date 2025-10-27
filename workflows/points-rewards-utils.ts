// thegame/workflows/points-rewards-utils.ts
import type { Player, Character, Rewards } from '@/types/entities';
import { getAllPlayers, upsertPlayer } from '@/data-store/repositories/player.repo';
import { getAllCharacters, upsertCharacter } from '@/data-store/repositories/character.repo';
import { makeLink } from '@/links/links-workflows';
import { createLink } from '@/links/link-registry';
import { LinkType, EntityType } from '@/types/enums';
import { appendPlayerPointsLog, appendCharacterJungleCoinsLog } from './entities-logging';
import { PLAYER_ONE_ID } from '@/lib/constants/entity-constants';

/**
 * Awards points to a player with idempotency and proper tracking
 * @param playerId - ID of the player to award points to
 * @param points - Points to award (XP, RP, FP, HP)
 * @param sourceId - ID of the entity that triggered the award
 * @param sourceType - Type of entity (task, financial, sale)
 */
export async function awardPointsToPlayer(
  playerId: string, 
  points: Rewards['points'], 
  sourceId: string, 
  sourceType: string
): Promise<void> {
  try {
    console.log(`[awardPointsToPlayer] Awarding points to player ${playerId} from ${sourceType} ${sourceId}`);
    
    // Get the player
    const players = await getAllPlayers();
    const player = players.find(p => p.id === playerId);
    if (!player) {
      console.log(`[awardPointsToPlayer] Player ${playerId} not found, skipping`);
      return;
    }

    // Check if any points to award
    const hasPoints = (points.xp || 0) > 0 || (points.rp || 0) > 0 || 
                     (points.fp || 0) > 0 || (points.hp || 0) > 0;
    
    if (!hasPoints) {
      console.log(`[awardPointsToPlayer] No points to award, skipping`);
      return;
    }

    // Update player points
    const updatedPlayer: Player = {
      ...player,
      points: {
        xp: (player.points?.xp || 0) + (points.xp || 0),
        rp: (player.points?.rp || 0) + (points.rp || 0),
        fp: (player.points?.fp || 0) + (points.fp || 0),
        hp: (player.points?.hp || 0) + (points.hp || 0)
      },
      totalPoints: {
        xp: (player.totalPoints?.xp || 0) + (points.xp || 0),
        rp: (player.totalPoints?.rp || 0) + (points.rp || 0),
        fp: (player.totalPoints?.fp || 0) + (points.fp || 0),
        hp: (player.totalPoints?.hp || 0) + (points.hp || 0)
      },
      updatedAt: new Date()
    };

    // Save updated player
    await upsertPlayer(updatedPlayer);

    // Create appropriate link based on source type - use forward links (SOURCE → PLAYER)
    let linkType: LinkType;
    let sourceEntityType: EntityType;
    
    switch (sourceType) {
      case 'task':
        linkType = LinkType.TASK_PLAYER;
        sourceEntityType = EntityType.TASK;
        break;
      case 'financial':
        linkType = LinkType.FINREC_PLAYER;
        sourceEntityType = EntityType.FINANCIAL;
        break;
      case 'sale':
        linkType = LinkType.SALE_PLAYER;
        sourceEntityType = EntityType.SALE;
        break;
      default:
        console.warn(`[awardPointsToPlayer] Unknown source type: ${sourceType}`);
        return;
    }

    // Create link with points metadata (forward link: SOURCE → PLAYER)
    const link = makeLink(
      linkType,
      { type: sourceEntityType, id: sourceId },
      { type: EntityType.PLAYER, id: playerId },
      {
        points: points,
        sourceType: sourceType,
        awardedAt: new Date().toISOString()
      }
    );

    await createLink(link);
    // Add dedicated player points log with source attribution
    await appendPlayerPointsLog(playerId, points, sourceId, sourceType);

  } catch (error) {
    console.error(`[awardPointsToPlayer] ❌ Failed to award points:`, error);
    throw error;
  }
}

/**
 * Removes points from a player (rollback function)
 * @param playerId - ID of the player to remove points from
 * @param points - Points to remove (XP, RP, FP, HP)
 */
export async function removePointsFromPlayer(
  playerId: string, 
  points: Rewards['points']
): Promise<void> {
  try {
    console.log(`[removePointsFromPlayer] Removing points from player ${playerId}`);
    
    // Get the player
    const players = await getAllPlayers();
    const player = players.find(p => p.id === playerId);
    if (!player) {
      console.log(`[removePointsFromPlayer] Player ${playerId} not found, skipping`);
      return;
    }

    // Check if any points to remove
    const hasPoints = (points.xp || 0) > 0 || (points.rp || 0) > 0 || 
                     (points.fp || 0) > 0 || (points.hp || 0) > 0;
    
    if (!hasPoints) {
      console.log(`[removePointsFromPlayer] No points to remove, skipping`);
      return;
    }

    // Update player points (ensure they don't go negative)
    const updatedPlayer: Player = {
      ...player,
      points: {
        xp: Math.max(0, (player.points?.xp || 0) - (points.xp || 0)),
        rp: Math.max(0, (player.points?.rp || 0) - (points.rp || 0)),
        fp: Math.max(0, (player.points?.fp || 0) - (points.fp || 0)),
        hp: Math.max(0, (player.points?.hp || 0) - (points.hp || 0))
      },
      // Note: totalPoints are NOT reduced (they track lifetime earnings)
      updatedAt: new Date()
    };

    // Save updated player
    await upsertPlayer(updatedPlayer);

  } catch (error) {
    console.error(`[removePointsFromPlayer] ❌ Failed to remove points:`, error);
    throw error;
  }
}

/**
 * Awards jungle coins to a character
 * @param characterId - ID of the character to award jungle coins to
 * @param amount - Amount of jungle coins to award
 * @param sourceId - ID of the entity that triggered the award
 * @param sourceType - Type of entity (task, financial, sale)
 */
export async function awardJungleCoinsToCharacter(
  characterId: string, 
  amount: number, 
  sourceId: string, 
  sourceType: string
): Promise<void> {
  try {
    console.log(`[awardJungleCoinsToCharacter] Awarding ${amount} J$ to character ${characterId} from ${sourceType} ${sourceId}`);
    
    if (amount <= 0) {
      console.log(`[awardJungleCoinsToCharacter] No jungle coins to award, skipping`);
      return;
    }

    // Get the character
    const characters = await getAllCharacters();
    const character = characters.find(c => c.id === characterId);
    if (!character) {
      console.log(`[awardJungleCoinsToCharacter] Character ${characterId} not found, skipping`);
      return;
    }

    // Update character jungle coins
    const updatedCharacter: Character = {
      ...character,
      jungleCoins: (character.jungleCoins || 0) + amount,
      updatedAt: new Date()
    };

    // Save updated character
    await upsertCharacter(updatedCharacter);
    // Add dedicated character jungle coins log with source attribution
    await appendCharacterJungleCoinsLog(characterId, amount, sourceId, sourceType);

    // NOTE: J$ (Jungle Coins) are CURRENCY that belongs to FINANCIALS
    // They can be borrowed as AMBASSADOR by Player and Character, but don't belong to them
    // No link creation needed here - J$ are handled by the Financial system

  } catch (error) {
    console.error(`[awardJungleCoinsToCharacter] ❌ Failed to award jungle coins:`, error);
    throw error;
  }
}

/**
 * Removes jungle coins from a character (rollback function)
 * @param characterId - ID of the character to remove jungle coins from
 * @param amount - Amount of jungle coins to remove
 */
export async function removeJungleCoinsFromCharacter(
  characterId: string, 
  amount: number
): Promise<void> {
  try {
    console.log(`[removeJungleCoinsFromCharacter] Removing ${amount} J$ from character ${characterId}`);
    
    if (amount <= 0) {
      console.log(`[removeJungleCoinsFromCharacter] No jungle coins to remove, skipping`);
      return;
    }

    // Get the character
    const characters = await getAllCharacters();
    const character = characters.find(c => c.id === characterId);
    if (!character) {
      console.log(`[removeJungleCoinsFromCharacter] Character ${characterId} not found, skipping`);
      return;
    }

    // Update character jungle coins (ensure they don't go negative)
    const updatedCharacter: Character = {
      ...character,
      jungleCoins: Math.max(0, (character.jungleCoins || 0) - amount),
      updatedAt: new Date()
    };

    // Save updated character
    await upsertCharacter(updatedCharacter);

  } catch (error) {
    console.error(`[removeJungleCoinsFromCharacter] ❌ Failed to remove jungle coins:`, error);
    throw error;
  }
}

/**
 * Calculates points from sale revenue (1 Point = $100)
 * @param revenue - Revenue amount in dollars
 * @returns Points to award (distributed across all types)
 */
export function calculatePointsFromRevenue(revenue: number): Rewards['points'] {
  const pointsAwarded = Math.floor(revenue / 100);
  
  if (pointsAwarded <= 0) {
    return { xp: 0, rp: 0, fp: 0, hp: 0 };
  }

  // Distribute points across all types equally
  const pointsPerType = Math.floor(pointsAwarded / 4);
  const remainder = pointsAwarded % 4;
  
  return {
    xp: pointsPerType + (remainder > 0 ? 1 : 0),
    rp: pointsPerType + (remainder > 1 ? 1 : 0),
    fp: pointsPerType + (remainder > 2 ? 1 : 0),
    hp: pointsPerType
  };
}

/**
 * Gets the main player ID (V0.1 constant)
 * TODO: V0.2 - Use character.playerId field
 */
export function getMainPlayerId(): string {
  return PLAYER_ONE_ID; // V0.1 constant
}

/**
 * Gets the main character ID (V0.1 constant)
 * TODO: V0.2 - Use proper character selection
 */
export function getMainCharacterId(): string {
  return 'CHARACTER_ONE_ID'; // V0.1 constant
}
