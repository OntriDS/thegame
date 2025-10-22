// workflows/entities-workflows/character.workflow.ts
// Character-specific workflow with ROLE_CHANGED event

import { EntityType, LogEventType } from '@/types/enums';
import type { Character } from '@/types/entities';
import { appendEntityLog, updateEntityLogField } from '../entities-logging';
import { hasEffect, markEffect, clearEffect, clearEffectsByPrefix } from '@/data-store/effects-registry';
import { getLinksFor, removeLink } from '@/links/link-registry';
import { appendCharacterJungleCoinsLog } from '../entities-logging';
import type { Task, FinancialRecord } from '@/types/entities';

const STATE_FIELDS = ['roles', 'isActive'];
const DESCRIPTIVE_FIELDS = ['name', 'description', 'contactEmail', 'contactPhone', 'commColor'];

export async function onCharacterUpsert(character: Character, previousCharacter?: Character): Promise<void> {
  console.log('🔥 [onCharacterUpsert] START', { 
    id: character.id, 
    name: character.name,
    type: previousCharacter ? 'UPDATE' : 'CREATE'
  });
  
  // New character creation
  if (!previousCharacter) {
    const effectKey = `character:${character.id}:created`;
    const hasEffectResult = await hasEffect(effectKey);
    
    console.log('🔥 [onCharacterUpsert] New character check', { effectKey, hasEffect: hasEffectResult });
    
    if (hasEffectResult) {
      console.log('🔥 [onCharacterUpsert] ⏭️ SKIPPED - effect already exists');
      return;
    }
    
    console.log('🔥 [onCharacterUpsert] Creating log entry...');
    await appendEntityLog(EntityType.CHARACTER, character.id, LogEventType.CREATED, { 
      name: character.name, 
      roles: character.roles
    });
    
    await markEffect(effectKey);
    console.log('🔥 [onCharacterUpsert] ✅ Log entry created and effect marked');
    return;
  }
  
  // Role changes - ROLE_CHANGED event
  const rolesChanged = JSON.stringify(previousCharacter.roles) !== JSON.stringify(character.roles);
  console.log('🔥 [onCharacterUpsert] Role change check', { 
    rolesChanged,
    oldRoles: previousCharacter.roles,
    newRoles: character.roles
  });
  
  if (rolesChanged) {
    console.log('🔥 [onCharacterUpsert] Creating ROLE_CHANGED log entry...');
    await appendEntityLog(EntityType.CHARACTER, character.id, LogEventType.ROLE_CHANGED, {
      name: character.name,
      oldRoles: previousCharacter.roles,
      newRoles: character.roles
    });
    console.log('🔥 [onCharacterUpsert] ✅ ROLE_CHANGED log entry created');
  }
  
  // General updates - UPDATED event
  const hasSignificantChanges = previousCharacter.isActive !== character.isActive;
  console.log('🔥 [onCharacterUpsert] Significant change check', { 
    hasSignificantChanges,
    oldIsActive: previousCharacter.isActive,
    newIsActive: character.isActive
  });
  
  if (hasSignificantChanges) {
    console.log('🔥 [onCharacterUpsert] Creating UPDATED log entry...');
    await appendEntityLog(EntityType.CHARACTER, character.id, LogEventType.UPDATED, {
      name: character.name,
      isActive: character.isActive
    });
    console.log('🔥 [onCharacterUpsert] ✅ UPDATED log entry created');
  }
  
  // Descriptive changes - update in-place
  console.log('🔥 [onCharacterUpsert] Checking descriptive field changes...');
  for (const field of DESCRIPTIVE_FIELDS) {
    const oldValue = (previousCharacter as any)[field];
    const newValue = (character as any)[field];
    const fieldChanged = oldValue !== newValue;
    
    if (fieldChanged) {
      console.log(`🔥 [onCharacterUpsert] Field '${field}' changed:`, { oldValue, newValue });
      await updateEntityLogField(EntityType.CHARACTER, character.id, field, oldValue, newValue);
      console.log(`🔥 [onCharacterUpsert] ✅ Field '${field}' updated in log`);
    }
  }
  
  console.log('🔥 [onCharacterUpsert] ✅ COMPLETED');
}

/**
 * Remove character effects when character is deleted
 * Characters can have entries in character log and related links
 */
export async function removeCharacterEffectsOnDelete(characterId: string): Promise<void> {
  try {
    console.log(`[removeCharacterEffectsOnDelete] Starting cleanup for character: ${characterId}`);
    
    // 1. Remove all Links related to this character
    const characterLinks = await getLinksFor({ type: EntityType.CHARACTER, id: characterId });
    console.log(`[removeCharacterEffectsOnDelete] Found ${characterLinks.length} links to remove`);
    
    for (const link of characterLinks) {
      try {
        await removeLink(link.id);
        console.log(`[removeCharacterEffectsOnDelete] ✅ Removed link: ${link.linkType}`);
      } catch (error) {
        console.error(`[removeCharacterEffectsOnDelete] ❌ Failed to remove link ${link.id}:`, error);
      }
    }
    
    // 2. Clear all effects for this character
    await clearEffect(`character:${characterId}:created`);
    await clearEffectsByPrefix(EntityType.CHARACTER, characterId, '');
    
    // 3. Remove log entries from character log
    console.log(`[removeCharacterEffectsOnDelete] Starting log entry removal for character: ${characterId}`);
    
    // TODO: Implement server-side log removal or remove this call
    console.log(`[removeCharacterEffectsOnDelete] ⚠️ Log entry removal skipped - needs server-side implementation`);
    
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