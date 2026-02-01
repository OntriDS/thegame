// thegame/workflows/points-rewards-utils.ts
import type { Player, Rewards } from '@/types/entities';
import { getPlayerById, getCharacterById, upsertPlayer } from '@/data-store/datastore';
import { makeLink } from '@/links/links-workflows';
import { createLink } from '@/links/link-registry';
import { LinkType, EntityType, PLAYER_ONE_ID } from '@/types/enums';
import { appendPlayerPointsLog } from './entities-logging';

/**
 * Resolve a candidate id (playerId or characterId) to a valid playerId.
 * - If it's already a player id, return as-is.
 * - Else, if it's a character id, return character.playerId.
 * - Else, fallback to PLAYER_ONE_ID.
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
  return PLAYER_ONE_ID;
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
  points: Rewards['points'],
  sourceId: string,
  sourceType: string
): Promise<void> {
  try {
    const resolvedPlayerId = await resolveToPlayerIdMaybeCharacter(playerId);
    if (resolvedPlayerId !== playerId) {
      console.log(`[awardPointsToPlayer] Mapped id ${playerId} → player ${resolvedPlayerId}`);
    }
    console.log(`[awardPointsToPlayer] Awarding points to player ${resolvedPlayerId} from ${sourceType} ${sourceId}`);

    // Get the player
    const player = await getPlayerById(resolvedPlayerId);
    if (!player) {
      console.log(`[awardPointsToPlayer] Player ${resolvedPlayerId} not found, skipping`);
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
      { type: EntityType.PLAYER, id: resolvedPlayerId },
      {
        points: points,
        sourceType: sourceType,
        awardedAt: new Date().toISOString()
      }
    );

    await createLink(link);
    await appendPlayerPointsLog(resolvedPlayerId, points, sourceId, sourceType);
  } catch (error) {
    console.error(`[awardPointsToPlayer] ❌ Failed to award points:`, error);
    throw error;
  }
}

/**
 * Stages points for a player (Pending state)
 * Used when a task is Done or Sale is Charged, but not yet Collected
 */
export async function stagePointsForPlayer(
  playerId: string,
  points: Rewards['points'],
  sourceId: string,
  sourceType: string
): Promise<void> {
  try {
    const resolvedPlayerId = await resolveToPlayerIdMaybeCharacter(playerId);
    console.log(`[stagePointsForPlayer] Staging points for player ${resolvedPlayerId} from ${sourceType} ${sourceId}`);

    const player = await getPlayerById(resolvedPlayerId);
    if (!player) return;

    // Check if any points to stage
    const hasPoints = (points.xp || 0) > 0 || (points.rp || 0) > 0 ||
      (points.fp || 0) > 0 || (points.hp || 0) > 0;

    if (!hasPoints) return;

    // Add to pendingPoints
    const updatedPlayer: Player = {
      ...player,
      pendingPoints: {
        xp: (player.pendingPoints?.xp || 0) + (points.xp || 0),
        rp: (player.pendingPoints?.rp || 0) + (points.rp || 0),
        fp: (player.pendingPoints?.fp || 0) + (points.fp || 0),
        hp: (player.pendingPoints?.hp || 0) + (points.hp || 0)
      },
      updatedAt: new Date()
    };

    await upsertPlayer(updatedPlayer);

    // Log staging ?? Maybe just console for now, or specific log event?
    // We'll trust the console logs for now as this is a transient state
    console.log(`[stagePointsForPlayer] ✅ Points staged for player ${resolvedPlayerId}`);

  } catch (error) {
    console.error(`[stagePointsForPlayer] ❌ Failed to stage points:`, error);
    throw error;
  }
}

/**
 * Vests points for a player (Pending -> Available)
 * Used when a task/sale/financial is Collected
 */
export async function vestPointsForPlayer(
  playerId: string,
  points: Rewards['points'],
  sourceId: string,
  sourceType: string
): Promise<void> {
  try {
    const resolvedPlayerId = await resolveToPlayerIdMaybeCharacter(playerId);
    console.log(`[vestPointsForPlayer] Vesting points for player ${resolvedPlayerId} from ${sourceType} ${sourceId}`);

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

    await upsertPlayer(updatedPlayer);

    // Create Link and Log (Permanent Record)
    // We duplicate the awardPointsToPlayer logic here for full record keeping
    let linkType: LinkType;
    let sourceEntityType: EntityType;

    switch (sourceType) {
      case 'task': linkType = LinkType.TASK_PLAYER; sourceEntityType = EntityType.TASK; break;
      case 'financial': linkType = LinkType.FINREC_PLAYER; sourceEntityType = EntityType.FINANCIAL; break;
      case 'sale': linkType = LinkType.SALE_PLAYER; sourceEntityType = EntityType.SALE; break;
      default: linkType = LinkType.TASK_PLAYER; sourceEntityType = EntityType.TASK; // Fallback
    }

    const link = makeLink(
      linkType,
      { type: sourceEntityType, id: sourceId },
      { type: EntityType.PLAYER, id: resolvedPlayerId },
      {
        points: points,
        sourceType: sourceType,
        vestedAt: new Date().toISOString()
      }
    );

    await createLink(link);
    await appendPlayerPointsLog(resolvedPlayerId, points, sourceId, sourceType);

    console.log(`[vestPointsForPlayer] ✅ Points vested for player ${resolvedPlayerId}`);

  } catch (error) {
    console.error(`[vestPointsForPlayer] ❌ Failed to vest points:`, error);
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
    const player = await getPlayerById(playerId);
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


