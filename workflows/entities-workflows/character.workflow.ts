// workflows/entities-workflows/character.workflow.ts
// Character-specific workflow with ROLE_CHANGED event

import type { Character } from '@/types/entities';
import { appendEntityLog, updateEntityLogField } from '../entities-logging';
import { hasEffect, markEffect, clearEffect, clearEffectsByPrefix } from '@/data-store/effects-registry';
import { ClientAPI } from '@/lib/client-api';
import { appendCharacterJungleCoinsLog } from '../entities-logging';
import type { Task, FinancialRecord } from '@/types/entities';

const STATE_FIELDS = ['roles', 'isActive'];
const DESCRIPTIVE_FIELDS = ['name', 'description', 'contactEmail', 'contactPhone', 'commColor'];

export async function onCharacterUpsert(character: Character, previousCharacter?: Character): Promise<void> {
  // New character creation
  if (!previousCharacter) {
    const effectKey = `character:${character.id}:created`;
    if (await hasEffect(effectKey)) return;
    
    await appendEntityLog('character', character.id, 'CREATED', { 
      name: character.name, 
      roles: character.roles
    });
    await markEffect(effectKey);
    return;
  }
  
  // Role changes - ROLE_CHANGED event
  const rolesChanged = JSON.stringify(previousCharacter.roles) !== JSON.stringify(character.roles);
  if (rolesChanged) {
    await appendEntityLog('character', character.id, 'ROLE_CHANGED', {
      name: character.name,
      oldRoles: previousCharacter.roles,
      newRoles: character.roles
    });
  }
  
  // General updates - UPDATED event
  const hasSignificantChanges = previousCharacter.isActive !== character.isActive;
  if (hasSignificantChanges) {
    await appendEntityLog('character', character.id, 'UPDATED', {
      name: character.name,
      isActive: character.isActive
    });
  }
  
  // Descriptive changes - update in-place
  for (const field of DESCRIPTIVE_FIELDS) {
    if ((previousCharacter as any)[field] !== (character as any)[field]) {
      await updateEntityLogField('character', character.id, field, (previousCharacter as any)[field], (character as any)[field]);
    }
  }
}

/**
 * Remove character effects when character is deleted
 * Characters can have entries in character log and related links
 */
export async function removeCharacterEffectsOnDelete(characterId: string): Promise<void> {
  try {
    console.log(`[removeCharacterEffectsOnDelete] Starting cleanup for character: ${characterId}`);
    
    // 1. Remove all Links related to this character
    const characterLinks = await ClientAPI.getLinksFor({ type: 'character', id: characterId });
    console.log(`[removeCharacterEffectsOnDelete] Found ${characterLinks.length} links to remove`);
    
    for (const link of characterLinks) {
      try {
        await ClientAPI.removeLink(link.id);
        console.log(`[removeCharacterEffectsOnDelete] ✅ Removed link: ${link.linkType}`);
      } catch (error) {
        console.error(`[removeCharacterEffectsOnDelete] ❌ Failed to remove link ${link.id}:`, error);
      }
    }
    
    // 2. Clear all effects for this character
    await clearEffect(`character:${characterId}:created`);
    await clearEffectsByPrefix('character', characterId, '');
    
    // 3. Remove log entries from character log
    console.log(`[removeCharacterEffectsOnDelete] Starting log entry removal for character: ${characterId}`);
    
    const result = await ClientAPI.removeLogEntry('character', characterId);
    
    if (result.success) {
      console.log(`[removeCharacterEffectsOnDelete] ✅ Character log entries removed successfully for character: ${characterId}`);
    } else {
      console.error(`[removeCharacterEffectsOnDelete] Failed to remove character log entries: ${result.message}`);
    }
    
    console.log(`[removeCharacterEffectsOnDelete] ✅ Cleared effects, removed links, and removed log entries for character ${characterId}`);
  } catch (error) {
    console.error('Error removing character effects:', error);
  }
}

/**
 * Log character effect from task completion
 * This is currently a no-op since tasks don't award jungle coins anymore
 * J$ are only earned via Points Exchange
 */
export async function logCharacterEffect(task: Task): Promise<void> {
  // J$ no longer awarded as task rewards - only earned via Points Exchange
  // This function is now a no-op since tasks don't award J$ anymore
  return;
}

/**
 * Log character effect from financial record
 * This logs the jungle coins awarded to the character from a financial record
 */
export async function logCharacterEffectFromRecord(record: FinancialRecord): Promise<void> {
  try {
    console.log(`[logCharacterEffectFromRecord] Logging character effect for record: ${record.name} (${record.id})`);
    
    // Only log if there are jungle coins to award
    if (!record.jungleCoins || record.jungleCoins <= 0) {
      console.log('[logCharacterEffectFromRecord] No jungle coins to log, skipping');
      return;
    }
    
    // Get main character ID (V0.1 constant)
    const mainCharacterId = 'CHARACTER_ONE_ID';
    
    await appendCharacterJungleCoinsLog(
      mainCharacterId,
      record.jungleCoins,
      record.id,
      'financial'
    );
    
    console.log(`[logCharacterEffectFromRecord] ✅ Character effect logged successfully for ${record.name}`);
  } catch (error) {
    console.error('Error logging character effect from record:', error);
  }
}

/**
 * Log character update from task changes
 * This is currently a no-op since tasks don't award jungle coins anymore
 * J$ are only earned via Points Exchange
 */
export async function logCharacterUpdateFromTask(task: Task, oldTask: Task): Promise<void> {
  // J$ no longer awarded as task rewards - only earned via Points Exchange
  // This function is now a no-op since tasks don't award J$ anymore
  return;
}