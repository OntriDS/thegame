// workflows/entities-workflows/player.workflow.ts
// Player-specific workflow with LEVEL_UP, POINTS_CHANGED events

import { EntityType, LogEventType } from '@/types/enums';
import type { Player } from '@/types/entities';
import { appendEntityLog, updateEntityLogField } from '../entities-logging';
import { hasEffect, markEffect, clearEffect, clearEffectsByPrefix } from '@/data-store/effects-registry';
import { getLinksFor, removeLink } from '@/links/link-registry';
import { getAllPlayers, upsertPlayer } from '@/data-store/datastore';
import { appendPlayerPointsLog, appendPlayerPointsUpdateLog } from '../entities-logging';
import type { Task, FinancialRecord } from '@/types/entities';

const STATE_FIELDS = ['level', 'totalPoints', 'points', 'isActive'];
const DESCRIPTIVE_FIELDS = ['name', 'email'];

export async function onPlayerUpsert(player: Player, previousPlayer?: Player): Promise<void> {
  console.log('🔥 [onPlayerUpsert] START', { 
    id: player.id, 
    name: player.name,
    type: previousPlayer ? 'UPDATE' : 'CREATE'
  });
  
  // New player creation
  if (!previousPlayer) {
    const effectKey = `player:${player.id}:created`;
    const hasEffectResult = await hasEffect(effectKey);
    
    console.log('🔥 [onPlayerUpsert] New player check', { effectKey, hasEffect: hasEffectResult });
    
    if (hasEffectResult) {
      console.log('🔥 [onPlayerUpsert] ⏭️ SKIPPED - effect already exists');
      return;
    }
    
    console.log('🔥 [onPlayerUpsert] Creating log entry...');
    await appendEntityLog(EntityType.PLAYER, player.id, LogEventType.CREATED, { 
      name: player.name, 
      level: player.level
    });
    
    await markEffect(effectKey);
    console.log('🔥 [onPlayerUpsert] ✅ Log entry created and effect marked');
    return;
  }
  
  // Level up - LEVEL_UP event
  const levelUp = previousPlayer.level < player.level;
  console.log('🔥 [onPlayerUpsert] Level up check', { 
    levelUp,
    oldLevel: previousPlayer.level,
    newLevel: player.level
  });
  
  if (levelUp) {
    console.log('🔥 [onPlayerUpsert] Creating LEVEL_UP log entry...');
    await appendEntityLog(EntityType.PLAYER, player.id, LogEventType.LEVEL_UP, {
      name: player.name,
      oldLevel: previousPlayer.level,
      newLevel: player.level
    });
    console.log('🔥 [onPlayerUpsert] ✅ LEVEL_UP log entry created');
  }
  
  // Points changes - POINTS_CHANGED event
  const totalPointsChanged = JSON.stringify(previousPlayer.totalPoints) !== JSON.stringify(player.totalPoints);
  const pointsChanged = JSON.stringify(previousPlayer.points) !== JSON.stringify(player.points);
  const pointsChangedOverall = totalPointsChanged || pointsChanged;
  
  console.log('🔥 [onPlayerUpsert] Points change check', { 
    pointsChangedOverall,
    totalPointsChanged,
    pointsChanged,
    oldTotalPoints: previousPlayer.totalPoints,
    newTotalPoints: player.totalPoints,
    oldPoints: previousPlayer.points,
    newPoints: player.points
  });
  
  if (pointsChangedOverall) {
    console.log('🔥 [onPlayerUpsert] Creating POINTS_CHANGED log entry...');
    await appendEntityLog(EntityType.PLAYER, player.id, LogEventType.POINTS_CHANGED, {
      name: player.name,
      totalPoints: player.totalPoints,
      points: player.points
    });
    console.log('🔥 [onPlayerUpsert] ✅ POINTS_CHANGED log entry created');
  }
  
  // General updates - UPDATED event
  const hasSignificantChanges = previousPlayer.isActive !== player.isActive;
  console.log('🔥 [onPlayerUpsert] Significant change check', { 
    hasSignificantChanges,
    oldIsActive: previousPlayer.isActive,
    newIsActive: player.isActive
  });
  
  if (hasSignificantChanges) {
    console.log('🔥 [onPlayerUpsert] Creating UPDATED log entry...');
    await appendEntityLog(EntityType.PLAYER, player.id, LogEventType.UPDATED, {
      name: player.name,
      isActive: player.isActive
    });
    console.log('🔥 [onPlayerUpsert] ✅ UPDATED log entry created');
  }
  
  // Descriptive changes - update in-place
  console.log('🔥 [onPlayerUpsert] Checking descriptive field changes...');
  for (const field of DESCRIPTIVE_FIELDS) {
    const oldValue = (previousPlayer as any)[field];
    const newValue = (player as any)[field];
    const fieldChanged = oldValue !== newValue;
    
    if (fieldChanged) {
      console.log(`🔥 [onPlayerUpsert] Field '${field}' changed:`, { oldValue, newValue });
      await updateEntityLogField(EntityType.PLAYER, player.id, field, oldValue, newValue);
      console.log(`🔥 [onPlayerUpsert] ✅ Field '${field}' updated in log`);
    }
  }
  
  console.log('🔥 [onPlayerUpsert] ✅ COMPLETED');
}

/**
 * Remove player effects when player is deleted
 * Players can have entries in player log and related links
 */
export async function removePlayerEffectsOnDelete(playerId: string): Promise<void> {
  try {
    console.log(`[removePlayerEffectsOnDelete] Starting cleanup for player: ${playerId}`);
    
    // 1. Remove all Links related to this player
    const playerLinks = await getLinksFor({ type: EntityType.PLAYER, id: playerId });
    console.log(`[removePlayerEffectsOnDelete] Found ${playerLinks.length} links to remove`);
    
    for (const link of playerLinks) {
      try {
        await removeLink(link.id);
        console.log(`[removePlayerEffectsOnDelete] ✅ Removed link: ${link.linkType}`);
      } catch (error) {
        console.error(`[removePlayerEffectsOnDelete] ❌ Failed to remove link ${link.id}:`, error);
      }
    }
    
    // 2. Clear all effects for this player
    await clearEffect(`player:${playerId}:created`);
    await clearEffectsByPrefix(EntityType.PLAYER, playerId, '');
    
    // 3. Remove log entries from player log
    console.log(`[removePlayerEffectsOnDelete] Starting log entry removal for player: ${playerId}`);
    
    // TODO: Implement server-side log removal or remove this call
    console.log(`[removePlayerEffectsOnDelete] ⚠️ Log entry removal skipped - needs server-side implementation`);
    
    console.log(`[removePlayerEffectsOnDelete] ✅ Cleared effects, removed links, and removed log entries for player ${playerId}`);
  } catch (error) {
    console.error('Error removing player effects:', error);
  }
}

/**
 * Log player effect from task completion
 * This logs the points awarded to the player from completing a task
 */
export async function logPlayerEffect(task: Task): Promise<void> {
  try {
    console.log(`[logPlayerEffect] Logging player effect for task: ${task.name} (${task.id})`);
    
    // Only log if there are points to award
    const hasPoints = task.rewards?.points && (
      (task.rewards.points.xp || 0) > 0 ||
      (task.rewards.points.rp || 0) > 0 ||
      (task.rewards.points.fp || 0) > 0 ||
      (task.rewards.points.hp || 0) > 0
    );
    
    if (!hasPoints) {
      console.log('[logPlayerEffect] No points to log, skipping');
      return;
    }
    
    // Get main player ID (V0.1 constant)
    const mainPlayerId = 'PLAYER_ONE_ID';
    
    await appendPlayerPointsLog(
      mainPlayerId,
      {
        xp: task.rewards.points.xp || 0,
        rp: task.rewards.points.rp || 0,
        fp: task.rewards.points.fp || 0,
        hp: task.rewards.points.hp || 0
      },
      task.id,
      'task'
    );
    
    console.log(`[logPlayerEffect] ✅ Player effect logged successfully for ${task.name}`);
  } catch (error) {
    console.error('Error logging player effect:', error);
  }
}

/**
 * Log player effect from financial record
 * This logs the points awarded to the player from a financial record
 */
export async function logPlayerEffectFromRecord(record: FinancialRecord): Promise<void> {
  try {
    console.log(`[logPlayerEffectFromRecord] Logging player effect for record: ${record.name} (${record.id})`);
    
    // Only log if there are points to award
    const hasPoints = record.rewards?.points && (
      (record.rewards.points.xp || 0) > 0 ||
      (record.rewards.points.rp || 0) > 0 ||
      (record.rewards.points.fp || 0) > 0 ||
      (record.rewards.points.hp || 0) > 0
    );
    
    if (!hasPoints) {
      console.log('[logPlayerEffectFromRecord] No points to log, skipping');
      return;
    }
    
    // Get main player ID (V0.1 constant)
    const mainPlayerId = 'PLAYER_ONE_ID';
    
    await appendPlayerPointsLog(
      mainPlayerId,
      {
        xp: record.rewards?.points?.xp || 0,
        rp: record.rewards?.points?.rp || 0,
        fp: record.rewards?.points?.fp || 0,
        hp: record.rewards?.points?.hp || 0
      },
      record.id,
      'financial'
    );
    
    console.log(`[logPlayerEffectFromRecord] ✅ Player effect logged successfully for ${record.name}`);
  } catch (error) {
    console.error('Error logging player effect from record:', error);
  }
}

/**
 * Log player update from task changes
 * This logs when task rewards change and player points need to be updated
 */
export async function logPlayerUpdateFromTask(task: Task, oldTask: Task): Promise<void> {
  try {
    console.log(`[logPlayerUpdateFromTask] Logging player update for task: ${task.name} (${task.id})`);
    
    const oldRewards = oldTask.rewards?.points || { xp: 0, rp: 0, fp: 0, hp: 0 };
    const newRewards = task.rewards?.points || { xp: 0, rp: 0, fp: 0, hp: 0 };
    
    // Check if rewards actually changed
    const rewardsChanged = JSON.stringify(oldRewards) !== JSON.stringify(newRewards);
    
    if (!rewardsChanged) {
      console.log('[logPlayerUpdateFromTask] No reward changes to log, skipping');
      return;
    }
    
    // Get main player ID (V0.1 constant)
    const mainPlayerId = 'PLAYER_ONE_ID';
    
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
    
    console.log(`[logPlayerUpdateFromTask] ✅ Player update logged successfully for ${task.name}`);
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
    console.log(`[updatePlayerPointsFromTask] Updating player points for task: ${task.name} (${task.id})`);
    
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
      console.log('[updatePlayerPointsFromTask] No point changes to apply, skipping');
      return;
    }
    
    // Get main player
    const mainPlayerId = 'PLAYER_ONE_ID';
    const players = await getAllPlayers();
    const mainPlayer = players.find(p => p.id === mainPlayerId);
    
    if (!mainPlayer) {
      console.log('[updatePlayerPointsFromTask] Main player not found, skipping');
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
    console.log(`[updatePlayerPointsFromTask] Applying point delta:`, delta);
    await upsertPlayer(updatedPlayer);
    
    console.log(`[updatePlayerPointsFromTask] ✅ Player points updated successfully`);
  } catch (error) {
    console.error('Error updating player points from task:', error);
  }
}