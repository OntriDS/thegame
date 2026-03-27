// workflows/entities-workflows/player.workflow.ts
// Player-specific workflow with LEVEL_UP, POINTS_CHANGED events

import { EntityType, LogEventType, FOUNDER_CHARACTER_ID } from '@/types/enums';
import type { Player } from '@/types/entities';
import { appendEntityLog, updateEntityLeanFields, appendPlayerPointsChangedLog, upsertPlayerPointsChangedLog } from '../entities-logging';
import { hasEffect, markEffect, clearEffect, clearEffectsByPrefix } from '@/data-store/effects-registry';
import { EffectKeys } from '@/data-store/keys';
import { getLinksFor, removeLink } from '@/links/link-registry';
import { getPlayerById, upsertPlayer } from '@/data-store/datastore';
import { appendPlayerPointsUpdateLog } from '../entities-logging';
import type { Task } from '@/types/entities';

const STATE_FIELDS = ['level', 'totalPoints', 'points', 'isActive'];

export async function onPlayerUpsert(player: Player, previousPlayer?: Player): Promise<void> {
  
  // New player creation
  if (!previousPlayer) {
    const effectKey = EffectKeys.created('player', player.id);
    const hasEffectResult = await hasEffect(effectKey);
    
    if (hasEffectResult) {
      return;
    }
    await appendEntityLog(EntityType.PLAYER, player.id, LogEventType.CREATED, { 
      name: player.name, 
      level: player.level
    }, player.createdAt);
    
    await markEffect(effectKey);
    return;
  }
  
  // Level up - LEVEL_UP event
  const levelUp = previousPlayer.level < player.level;
  if (levelUp) {
    await appendEntityLog(EntityType.PLAYER, player.id, LogEventType.LEVEL_UP, {
      name: player.name,
      oldLevel: previousPlayer.level,
      newLevel: player.level
    });
  }
  
  // Points changes - POINTS_CHANGED event (shows total after changes)
  const totalPointsChanged = JSON.stringify(previousPlayer.totalPoints) !== JSON.stringify(player.totalPoints);
  const pointsChanged = JSON.stringify(previousPlayer.points) !== JSON.stringify(player.points);
  const pointsChangedOverall = totalPointsChanged || pointsChanged;
  
  if (pointsChangedOverall) {
    // Append new POINTS_CHANGED entry for each change (do not upsert/update existing ones)
    await appendPlayerPointsChangedLog(player.id, player.totalPoints, player.points);
  }
  
  // General updates - UPDATED event
  const hasSignificantChanges = previousPlayer.isActive !== player.isActive;
  if (hasSignificantChanges) {
    await appendEntityLog(EntityType.PLAYER, player.id, LogEventType.UPDATED, {
      name: player.name,
      isActive: player.isActive
    });
  }
  
  // Lean identity fields changed — cascade patch ALL log entries across ALL months and events
  if (previousPlayer) {
    if (previousPlayer.name !== player.name) {
      await updateEntityLeanFields(EntityType.PLAYER, player.id, {
        name: player.name || 'Unknown'
      });
    }
  }
}

/**
 * Remove player effects when player is deleted
 * Players can have entries in player log and related links
 */
export async function removePlayerEffectsOnDelete(playerId: string): Promise<void> {
  try {

    
    // 1. Remove all Links related to this player
    const playerLinks = await getLinksFor({ type: EntityType.PLAYER, id: playerId });

    
    for (const link of playerLinks) {
      try {
        await removeLink(link.id);
      } catch (error) {
        console.error(`[removePlayerEffectsOnDelete] ❌ Failed to remove link ${link.id}:`, error);
      }
    }
    
    // 2. Clear all effects for this player
    await clearEffect(EffectKeys.created('player', playerId));
    await clearEffectsByPrefix(EntityType.PLAYER, playerId, '');
    
    // 3. Remove log entries from player log

    
    // TODO: Implement server-side log removal or remove this call

    
  } catch (error) {
    console.error('Error removing player effects:', error);
  }
}

/**
 * Log player update from task changes
 * This logs when task rewards change and player points need to be updated
 */
export async function logPlayerUpdateFromTask(task: Task, oldTask: Task): Promise<void> {
  try {
    // J$ no longer awarded as task rewards - only earned via Points Exchange
    
    const oldRewards = oldTask.rewards?.points || { xp: 0, rp: 0, fp: 0, hp: 0 };
    const newRewards = task.rewards?.points || { xp: 0, rp: 0, fp: 0, hp: 0 };
    
    // Check if rewards actually changed
    const rewardsChanged = JSON.stringify(oldRewards) !== JSON.stringify(newRewards);
    
    if (!rewardsChanged) {
      return;
      return;
    }
    
    // Get main player ID (V0.1 constant)
    const mainPlayerId = FOUNDER_CHARACTER_ID;
    
    await appendPlayerPointsUpdateLog(
      mainPlayerId,
      {
        xp: oldRewards.xp || 0,
        rp: oldRewards.rp || 0,
        fp: oldRewards.fp || 0,
        hp: oldRewards.hp || 0
      },
      {
        xp: newRewards.xp || 0,
        rp: newRewards.rp || 0,
        fp: newRewards.fp || 0,
        hp: newRewards.hp || 0
      },
      task.id
    );
    
  } catch (error) {
    console.error('Error logging player update from task:', error);
  }
}

/**
 * Update player points from task changes
 * This updates the player's points when task rewards change
 */
export async function updatePlayerPointsFromTask(task: Task, oldTask: Task): Promise<void> {
  try {
    // Update player points from task rewards
    
    const oldRewards = oldTask.rewards?.points || { xp: 0, rp: 0, fp: 0, hp: 0 };
    const newRewards = task.rewards?.points || { xp: 0, rp: 0, fp: 0, hp: 0 };
    
    // Calculate point delta
    const delta = {
      xp: (newRewards.xp || 0) - (oldRewards.xp || 0),
      rp: (newRewards.rp || 0) - (oldRewards.rp || 0),
      fp: (newRewards.fp || 0) - (oldRewards.fp || 0),
      hp: (newRewards.hp || 0) - (oldRewards.hp || 0)
    };
    
    // Check if there are any changes
    const hasChanges = delta.xp !== 0 || delta.rp !== 0 || delta.fp !== 0 || delta.hp !== 0;
    
    if (!hasChanges) {
      return;
      return;
    }
    
    // Get main player
    const mainPlayerId = FOUNDER_CHARACTER_ID;
    const mainPlayer = await getPlayerById(mainPlayerId);
    
    if (!mainPlayer) {
      return;
      return;
    }
    
    // Apply delta to player points
    const updatedPlayer: Player = {
      ...mainPlayer,
      points: {
        xp: Math.max(0, (mainPlayer.points?.xp || 0) + delta.xp),
        rp: Math.max(0, (mainPlayer.points?.rp || 0) + delta.rp),
        fp: Math.max(0, (mainPlayer.points?.fp || 0) + delta.fp),
        hp: Math.max(0, (mainPlayer.points?.hp || 0) + delta.hp)
      },
      totalPoints: {
        xp: Math.max(0, (mainPlayer.totalPoints?.xp || 0) + delta.xp),
        rp: Math.max(0, (mainPlayer.totalPoints?.rp || 0) + delta.rp),
        fp: Math.max(0, (mainPlayer.totalPoints?.fp || 0) + delta.fp),
        hp: Math.max(0, (mainPlayer.totalPoints?.hp || 0) + delta.hp)
      },
      updatedAt: new Date()
    };
    
    // Store the updated player

    await upsertPlayer(updatedPlayer);
    
  } catch (error) {
    console.error('Error updating player points from task:', error);
  }
}
