// thegame/workflows/points-rewards-utils.ts
import type { Player, PlayerRewardsV1, PointAmountV1, Rewards } from '@/types/entities';
import { getPlayerById, getCharacterById, upsertPlayer } from '@/data-store/datastore';
import { makeLink } from '@/links/links-workflows';
import { createLink } from '@/links/link-registry';
import { LinkType, EntityType, FOUNDER_PLAYER_ID } from '@/types/enums';
import { appendPlayerPointsLog } from './entities-logging';
import { getUTCNow } from '@/lib/utils/utc-utils';

const zeroPoints = (): PointAmountV1 => ({ hp: 0, fp: 0, rp: 0, xp: 0 });

function addPoints(left: PointAmountV1, right: PointAmountV1): PointAmountV1 {
  return {
    hp: Math.round(left.hp + right.hp),
    fp: Math.round(left.fp + right.fp),
    rp: Math.round(left.rp + right.rp),
    xp: Math.round(left.xp + right.xp),
  };
}

function subtractPoints(left: PointAmountV1, right: PointAmountV1): PointAmountV1 {
  return {
    hp: Math.max(0, Math.round(left.hp - right.hp)),
    fp: Math.max(0, Math.round(left.fp - right.fp)),
    rp: Math.max(0, Math.round(left.rp - right.rp)),
    xp: Math.max(0, Math.round(left.xp - right.xp)),
  };
}

/** Read the canonical projection, with a one-way fallback for pre-rewards Players. */
export function getPlayerRewards(player: Player): PlayerRewardsV1 {
  if (player.rewards) return player.rewards;

  const current = player.points ?? zeroPoints();
  const pending = player.pendingPoints ?? zeroPoints();
  const historic = player.totalPoints ?? addPoints(current, pending);
  return {
    points: {
      pending,
      vested: historic,
      current,
      exchanged: zeroPoints(),
      historic: addPoints(historic, pending),
    },
    achievements: [],
    badges: player.badges ?? [],
  };
}

/** Persist only the canonical reward projection; legacy point fields are not written. */
function playerWithRewards(player: Player, rewards: PlayerRewardsV1): Player {
  const {
    points: _legacyPoints,
    pendingPoints: _legacyPendingPoints,
    totalPoints: _legacyTotalPoints,
    ...identity
  } = player;
  return { ...identity, rewards, updatedAt: getUTCNow() };
}

function asPointAmount(points: Rewards['points'] | undefined | null): PointAmountV1 {
  return {
    hp: Math.round(points?.hp || 0),
    fp: Math.round(points?.fp || 0),
    rp: Math.round(points?.rp || 0),
    xp: Math.round(points?.xp || 0),
  };
}

/**
 * Resolve a candidate id (playerId or characterId) to a valid playerId.
 * - If it's already a player id, return as-is.
 * - Else, if it's a character id, return character.playerId.
 * - Otherwise return null; callers must handle an unresolved recipient.
 */
export async function resolveToPlayerIdMaybeCharacter(candidateId?: string | null): Promise<string | null> {
  try {
    if (candidateId) {
      const asPlayer = await getPlayerById(candidateId);
      if (asPlayer) return candidateId;
      const asCharacter = await getCharacterById(candidateId);
      if (asCharacter?.playerId) return asCharacter.playerId;
    }
  } catch (e) {
    console.warn('[resolveToPlayerIdMaybeCharacter] Resolution error:', e);
  }
  return null;
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
    if (!resolvedPlayerId) return;

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

    const delta = asPointAmount(points);
    const current = getPlayerRewards(player);
    const updatedPlayer = playerWithRewards(player, {
      ...current,
      points: {
        ...current.points,
        vested: addPoints(current.points.vested, delta),
        current: addPoints(current.points.current, delta),
        historic: addPoints(current.points.historic, delta),
      },
    });

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
      { type: EntityType.PLAYER, id: resolvedPlayerId },
      sourceType === 'task' ? 'points-earned' : undefined
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
    if (!resolvedPlayerId) return false;

    const player = await getPlayerById(resolvedPlayerId);
    if (!player) return false;

    // Check if any points to stage
    const hasPoints = (points.xp || 0) > 0 || (points.rp || 0) > 0 ||
      (points.fp || 0) > 0 || (points.hp || 0) > 0;

    if (!hasPoints) return false;

    const delta = asPointAmount(points);
    const current = getPlayerRewards(player);
    const updatedPlayer = playerWithRewards(player, {
      ...current,
      points: {
        ...current.points,
        pending: addPoints(current.points.pending, delta),
        historic: addPoints(current.points.historic, delta),
      },
    });

    await upsertPlayer(updatedPlayer);

    // Record the resolved recipient as soon as Task points enter pending state.
    // The link is idempotent and remains the source evidence when the points
    // later vest on collection.
    if (sourceType === 'task') {
      await createLink(makeLink(
        LinkType.TASK_PLAYER,
        { type: EntityType.TASK, id: sourceId },
        { type: EntityType.PLAYER, id: resolvedPlayerId },
        'points-earned'
      ));
    }
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
    if (!resolvedPlayerId) return;

    const player = await getPlayerById(resolvedPlayerId);
    if (!player) return;

    const hasPoints = (points.xp || 0) > 0 || (points.rp || 0) > 0 ||
      (points.fp || 0) > 0 || (points.hp || 0) > 0;

    if (!hasPoints) return;

    const delta = asPointAmount(points);
    const current = getPlayerRewards(player);
    const updatedPlayer = playerWithRewards(player, {
      ...current,
      points: {
        ...current.points,
        pending: subtractPoints(current.points.pending, delta),
        historic: subtractPoints(current.points.historic, delta),
      },
    });

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
    if (!resolvedPlayerId) return;

    const player = await getPlayerById(resolvedPlayerId);
    if (!player) return;

    const hasPoints = (points.xp || 0) > 0 || (points.rp || 0) > 0 ||
      (points.fp || 0) > 0 || (points.hp || 0) > 0;

    if (!hasPoints) return;

    const delta = asPointAmount(points);
    const current = getPlayerRewards(player);
    const updatedPlayer = playerWithRewards(player, {
      ...current,
      points: {
        ...current.points,
        pending: addPoints(current.points.pending, delta),
        vested: subtractPoints(current.points.vested, delta),
        current: subtractPoints(current.points.current, delta),
      },
    });

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
    if (!resolvedPlayerId) return;

    const player = await getPlayerById(resolvedPlayerId);
    if (!player) return;

    const hasPoints = (points.xp || 0) > 0 || (points.rp || 0) > 0 ||
      (points.fp || 0) > 0 || (points.hp || 0) > 0;

    if (!hasPoints) return;

    const delta = asPointAmount(points);
    const current = getPlayerRewards(player);
    const updatedPlayer = playerWithRewards(player, {
      ...current,
      points: {
        ...current.points,
        pending: subtractPoints(current.points.pending, delta),
        vested: addPoints(current.points.vested, delta),
        current: addPoints(current.points.current, delta),
      },
    });

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
      { type: EntityType.PLAYER, id: resolvedPlayerId },
      sourceEntityType === 'task' ? 'points-earned' : undefined
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

    const delta = asPointAmount(points);
    const current = getPlayerRewards(player);
    const updatedPlayer = playerWithRewards(player, {
      ...current,
      points: {
        ...current.points,
        current: subtractPoints(current.points.current, delta),
      },
    });

    // Save updated player
    await upsertPlayer(updatedPlayer);

  } catch (error) {
    console.error(`[removePointsFromPlayer] ❌ Failed to remove points:`, error);
    throw error;
  }
}

/**
 * Gets the bootstrap Player ID. Character IDs must never be returned here.
 */
export function getMainPlayerId(): string {
  return FOUNDER_PLAYER_ID;
}

/** Reverse a task reward exactly according to its lifecycle state. */
export async function revokePointsFromPlayer(
  playerId: string,
  points: Rewards['points'] | undefined | null,
  wasCollected: boolean,
): Promise<void> {
  if (!points) return;
  const resolvedPlayerId = await resolveToPlayerIdMaybeCharacter(playerId);
  if (!resolvedPlayerId) return;
  const player = await getPlayerById(resolvedPlayerId);
  if (!player) return;

  const delta = asPointAmount(points);
  const current = getPlayerRewards(player);
  const nextPoints = wasCollected
    ? {
        ...current.points,
        vested: subtractPoints(current.points.vested, delta),
        current: subtractPoints(current.points.current, delta),
        historic: subtractPoints(current.points.historic, delta),
      }
    : {
        ...current.points,
        pending: subtractPoints(current.points.pending, delta),
        historic: subtractPoints(current.points.historic, delta),
      };

  await upsertPlayer(playerWithRewards(player, { ...current, points: nextPoints }));
}

/** Consume currently available points during an explicit points → J$ exchange. */
export async function exchangePointsForPlayer(
  playerId: string,
  points: Rewards['points'] | undefined | null,
): Promise<void> {
  if (!points) return;
  const resolvedPlayerId = await resolveToPlayerIdMaybeCharacter(playerId);
  if (!resolvedPlayerId) return;
  const player = await getPlayerById(resolvedPlayerId);
  if (!player) return;

  const delta = asPointAmount(points);
  const current = getPlayerRewards(player);
  const updatedPlayer = playerWithRewards(player, {
    ...current,
    points: {
      ...current.points,
      current: subtractPoints(current.points.current, delta),
      exchanged: addPoints(current.points.exchanged, delta),
    },
  });
  await upsertPlayer(updatedPlayer);
}


