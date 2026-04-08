// thegame/workflows/points-rewards-utils.ts
import type { Player, Rewards } from '@/types/entities';
import { getPlayerById, getCharacterById, upsertPlayer } from '@/data-store/datastore';
import { makeLink } from '@/links/links-workflows';
import { createLink } from '@/links/link-registry';
import { LinkType, EntityType, FOUNDER_CHARACTER_ID } from '@/types/enums';
import { appendPlayerPointsLog } from './entities-logging';
import { getUTCNow } from '@/lib/utils/utc-utils';

/**
 * Resolve a candidate id (playerId or characterId) to a valid playerId.
 * - If it's already a player id, return as-is.
 * - Else, if it's a character id, return character.playerId.
 * - Else, fallback to FOUNDER_CHARACTER_ID.
 */
export async function resolveToPlayerIdMaybeCharacter(candidateId?: string | null): Promise<string> {
  try {
    if (candidateId) {
      const asPlayer = await getPlayerById(candidateId);
      if (asPlayer) return candidateId;
      const asCharacter = await getCharacterById(candidateId);
      if (asCharacter?.playerId) return asCharacter.playerId;
    }
  } catch (e) {
    console.warn('[resolveToPlayerIdMaybeCharacter] Resolution error, falling back:', e);
  }
  return FOUNDER_CHARACTER_ID;
}

/**
 * Awards points to a player with idempotency and proper tracking
 * @param playerId - ID of the player to award points to
 * @param points - Points to award (XP, RP, FP, HP)
 * @param sourceId - ID of the entity that triggered the award
 * @param sourceType - Type of entity (task, financial, sale)
 */
export async function awardPointsToPlayer(
  playerId: string,
  points: Rewards['points'] | undefined | null,
  sourceId: string,
  sourceType: string,
  customTimestamp?: string | Date
): Promise<void> {
  try {
    if (!points) return;

    const resolvedPlayerId = await resolveToPlayerIdMaybeCharacter(playerId);

    // Get the player
    const player = await getPlayerById(resolvedPlayerId);
    if (!player) {
      return;
    }

    // Check if any points to award
    const hasPoints = (points.xp || 0) > 0 || (points.rp || 0) > 0 ||
      (points.fp || 0) > 0 || (points.hp || 0) > 0;

    if (!hasPoints) {
      return;
    }

    // Update player points
    const updatedPlayer: Player = {
      ...player,
      points: {
        xp: Math.round((player.points?.xp || 0) + (points.xp || 0)),
        rp: Math.round((player.points?.rp || 0) + (points.rp || 0)),
        fp: Math.round((player.points?.fp || 0) + (points.fp || 0)),
        hp: Math.round((player.points?.hp || 0) + (points.hp || 0))
      },
      totalPoints: {
        xp: Math.round((player.totalPoints?.xp || 0) + (points.xp || 0)),
        rp: Math.round((player.totalPoints?.rp || 0) + (points.rp || 0)),
        fp: Math.round((player.totalPoints?.fp || 0) + (points.fp || 0)),
        hp: Math.round((player.totalPoints?.hp || 0) + (points.hp || 0))
      },
      updatedAt: getUTCNow()
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
      case 'item':
        linkType = LinkType.ITEM_PLAYER;
        sourceEntityType = EntityType.ITEM;
        break;
      default:
        console.warn(`[awardPointsToPlayer] Unknown source type: ${sourceType}`);
        return;
    }

    const link = makeLink(
      linkType,
      { type: sourceEntityType, id: sourceId },
      { type: EntityType.PLAYER, id: resolvedPlayerId }
    );

    await createLink(link);
    await appendPlayerPointsLog(resolvedPlayerId, points, sourceId, sourceType, customTimestamp);
  } catch (error) {
    console.error(`[awardPointsToPlayer] ❌ Failed to award points:`, error);
    throw error;
  }
}

/**
 * Stages points for a player (Pending state)
 * Used when a task is Done or Sale is Charged, but not yet Collected
 * @returns true if pending points were actually updated (for effect-registry idempotency)
 */
export async function stagePointsForPlayer(
  playerId: string,
  points: Rewards['points'] | undefined | null,
  sourceId: string,
  sourceType: string,
  customTimestamp?: string | Date
): Promise<boolean> {
  try {
    if (!points) return false;

    const resolvedPlayerId = await resolveToPlayerIdMaybeCharacter(playerId);

    const player = await getPlayerById(resolvedPlayerId);
    if (!player) return false;

    // Check if any points to stage
    const hasPoints = (points.xp || 0) > 0 || (points.rp || 0) > 0 ||
      (points.fp || 0) > 0 || (points.hp || 0) > 0;

    if (!hasPoints) return false;

    // Add to pendingPoints
    const updatedPlayer: Player = {
      ...player,
      pendingPoints: {
        xp: Math.round((player.pendingPoints?.xp || 0) + (points.xp || 0)),
        rp: Math.round((player.pendingPoints?.rp || 0) + (points.rp || 0)),
        fp: Math.round((player.pendingPoints?.fp || 0) + (points.fp || 0)),
        hp: Math.round((player.pendingPoints?.hp || 0) + (points.hp || 0))
      },
      updatedAt: getUTCNow()
    };

    await upsertPlayer(updatedPlayer);
    return true;
  } catch (error) {
    console.error(`[stagePointsForPlayer] ❌ Failed to stage points:`, error);
    throw error;
  }
}

/**
 * Completely withdraws points that were previously staged but have NOT yet been rewarded.
 * Use when a task/record is deleted or unchecked before it was marked Collected.
 */
export async function withdrawStagedPointsFromPlayer(
  characterId: string,
  points: Rewards['points'] | undefined | null,
  sourceEntityId: string,
  sourceEntityType: string
): Promise<void> {
  try {
    if (!points) return;

    const resolvedPlayerId = await resolveToPlayerIdMaybeCharacter(characterId);

    const player = await getPlayerById(resolvedPlayerId);
    if (!player) return;

    const hasPoints = (points.xp || 0) > 0 || (points.rp || 0) > 0 ||
      (points.fp || 0) > 0 || (points.hp || 0) > 0;

    if (!hasPoints) return;

    // Remove from pendingPoints (clamp to 0)
    const updatedPlayer: Player = {
      ...player,
      pendingPoints: {
        xp: Math.max(0, (player.pendingPoints?.xp || 0) - (points.xp || 0)),
        rp: Math.max(0, (player.pendingPoints?.rp || 0) - (points.rp || 0)),
        fp: Math.max(0, (player.pendingPoints?.fp || 0) - (points.fp || 0)),
        hp: Math.max(0, (player.pendingPoints?.hp || 0) - (points.hp || 0))
      },
      updatedAt: getUTCNow()
    };

    await upsertPlayer(updatedPlayer);

  } catch (error) {
    console.error(`[withdrawStagedPointsFromPlayer] ❌ Failed to withdraw staged points:`, error);
    throw error;
  }
}

/**
 * Un-rewards points that were previously rewarded.
 * This takes points OUT of the available balance and puts them BACK into pending/staged.
 * Use this when a record transitions from Collected -> Done/Created.
 */
export async function unrewardPointsForPlayer(
  characterId: string,
  points: Rewards['points'] | undefined | null,
  sourceEntityId: string,
  sourceEntityType: string
): Promise<void> {
  try {
    if (!points) return;

    const resolvedPlayerId = await resolveToPlayerIdMaybeCharacter(characterId);

    const player = await getPlayerById(resolvedPlayerId);
    if (!player) return;

    const hasPoints = (points.xp || 0) > 0 || (points.rp || 0) > 0 ||
      (points.fp || 0) > 0 || (points.hp || 0) > 0;

    if (!hasPoints) return;

    // 1. Remove from points (Available)
    // 2. Add back to pendingPoints (Staged)
    const updatedPlayer: Player = {
      ...player,
      points: {
        xp: Math.max(0, Math.round((player.points?.xp || 0) - (points.xp || 0))),
        rp: Math.max(0, Math.round((player.points?.rp || 0) - (points.rp || 0))),
        fp: Math.max(0, Math.round((player.points?.fp || 0) - (points.fp || 0))),
        hp: Math.max(0, Math.round((player.points?.hp || 0) - (points.hp || 0)))
      },
      pendingPoints: {
        xp: Math.round((player.pendingPoints?.xp || 0) + (points.xp || 0)),
        rp: Math.round((player.pendingPoints?.rp || 0) + (points.rp || 0)),
        fp: Math.round((player.pendingPoints?.fp || 0) + (points.fp || 0)),
        hp: Math.round((player.pendingPoints?.hp || 0) + (points.hp || 0))
      },
      // Note: totalPoints are NOT reduced (they track lifetime earnings)
      updatedAt: getUTCNow()
    };

    await upsertPlayer(updatedPlayer);


  } catch (error) {
    console.error(`[unrewardPointsForPlayer] ❌ Failed to un-reward points:`, error);
    throw error;
  }
}

/**
 * Rewards previously staged points to a player (moves points from pending/staged to available balance).
 * NOTE: This is an internal state update for the user. It does not create logs/transactions on its own.
 * Use higher-level orchestrators for full transaction logic.
 *
 * @param characterId The player character ID
 * @param points The points to reward (must be exactly what was previously staged/pending)
 * @param sourceEntityId ID of the entity that triggered the reward
 * @param sourceEntityType Type of the entity
 */
export async function rewardPointsToPlayer(
  characterId: string,
  points: Rewards['points'] | undefined | null,
  sourceEntityId: string,
  sourceEntityType: string,
  customTimestamp?: string | Date
): Promise<void> {
  try {
    if (!points) return;

    const resolvedPlayerId = await resolveToPlayerIdMaybeCharacter(characterId);

    const player = await getPlayerById(resolvedPlayerId);
    if (!player) return;

    const hasPoints = (points.xp || 0) > 0 || (points.rp || 0) > 0 ||
      (points.fp || 0) > 0 || (points.hp || 0) > 0;

    if (!hasPoints) return;

    // 1. Remove from pendingPoints (clamp to 0)
    // 2. Add to points (Available)
    // 3. Add to totalPoints (Lifetime)
    const updatedPlayer: Player = {
      ...player,
      pendingPoints: {
        xp: Math.max(0, (player.pendingPoints?.xp || 0) - (points.xp || 0)),
        rp: Math.max(0, (player.pendingPoints?.rp || 0) - (points.rp || 0)),
        fp: Math.max(0, (player.pendingPoints?.fp || 0) - (points.fp || 0)),
        hp: Math.max(0, (player.pendingPoints?.hp || 0) - (points.hp || 0))
      },
      points: {
        xp: Math.round((player.points?.xp || 0) + (points.xp || 0)),
        rp: Math.round((player.points?.rp || 0) + (points.rp || 0)),
        fp: Math.round((player.points?.fp || 0) + (points.fp || 0)),
        hp: Math.round((player.points?.hp || 0) + (points.hp || 0))
      },
      totalPoints: {
        xp: Math.round((player.totalPoints?.xp || 0) + (points.xp || 0)),
        rp: Math.round((player.totalPoints?.rp || 0) + (points.rp || 0)),
        fp: Math.round((player.totalPoints?.fp || 0) + (points.fp || 0)),
        hp: Math.round((player.totalPoints?.hp || 0) + (points.hp || 0))
      },
      updatedAt: getUTCNow()
    };

    await upsertPlayer(updatedPlayer);

    // Create Link and Log (Permanent Record)
    // We duplicate the awardPointsToPlayer logic here for full record keeping
    let linkType: LinkType;
    let resolvedSourceEntityType: EntityType;

    switch (sourceEntityType) {
      case 'task': linkType = LinkType.TASK_PLAYER; resolvedSourceEntityType = EntityType.TASK; break;
      case 'financial': linkType = LinkType.FINREC_PLAYER; resolvedSourceEntityType = EntityType.FINANCIAL; break;
      case 'sale': linkType = LinkType.SALE_PLAYER; resolvedSourceEntityType = EntityType.SALE; break;
      case 'item': linkType = LinkType.ITEM_PLAYER; resolvedSourceEntityType = EntityType.ITEM; break;
      default: linkType = LinkType.TASK_PLAYER; resolvedSourceEntityType = EntityType.TASK; break;
    }

    const link = makeLink(
      linkType,
      { type: resolvedSourceEntityType, id: sourceEntityId },
      { type: EntityType.PLAYER, id: resolvedPlayerId }
    );

    await createLink(link);
    await appendPlayerPointsLog(resolvedPlayerId, points, sourceEntityId, sourceEntityType, customTimestamp);


  } catch (error) {
    console.error(`[rewardPointsToPlayer] ❌ Failed to reward points:`, error);
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
  points: Rewards['points'] | undefined | null
): Promise<void> {
  try {
    if (!points) return;

    // Get the player
    const player = await getPlayerById(playerId);
    if (!player) return;

    // Check if any points to remove
    const hasPoints = (points.xp || 0) > 0 || (points.rp || 0) > 0 ||
      (points.fp || 0) > 0 || (points.hp || 0) > 0;

    if (!hasPoints) return;

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
      updatedAt: getUTCNow()
    };

    // Save updated player
    await upsertPlayer(updatedPlayer);

  } catch (error) {
    console.error(`[removePointsFromPlayer] ❌ Failed to remove points:`, error);
    throw error;
  }
}

/**
 * Gets the main player ID (V0.1 constant)
 * TODO: V0.2 - Use character.playerId field
 */
export function getMainPlayerId(): string {
  return FOUNDER_CHARACTER_ID; // V0.1 constant
}


