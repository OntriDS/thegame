// workflows/entities-workflows/character.workflow.ts
// Character-specific workflow with ROLE_CHANGED event

import { EntityType, LogEventType } from '@/types/enums';
import type { Character } from '@/types/entities';
import { appendEntityLog, updateEntityLeanFields } from '../entities-logging';
import { hasEffect, markEffect, clearEffect, clearEffectsByPrefix } from '@/data-store/effects-registry';
import { EffectKeys } from '@/data-store/keys';
import { getLinksFor, removeLink } from '@/links/link-registry';
import type { Task, FinancialRecord } from '@/types/entities';

const STATE_FIELDS = ['roles', 'isActive'];

export async function onCharacterUpsert(character: Character, previousCharacter?: Character): Promise<void> {
  // New character creation
  if (!previousCharacter) {
    const effectKey = EffectKeys.created('character', character.id);
    
    if (await hasEffect(effectKey)) return;
    
    await appendEntityLog(EntityType.CHARACTER, character.id, LogEventType.CREATED, { 
      name: character.name, 
      roles: character.roles
    });
    
    await markEffect(effectKey);
    return;
  }
  
  // Role changes - ROLE_CHANGED event
  const rolesChanged = JSON.stringify(previousCharacter.roles) !== JSON.stringify(character.roles);
  
  if (rolesChanged) {
    await appendEntityLog(EntityType.CHARACTER, character.id, LogEventType.ROLE_CHANGED, {
      name: character.name,
      oldRoles: previousCharacter.roles,
      newRoles: character.roles
    });
  }
  
  // General updates - UPDATED event
  const hasSignificantChanges = previousCharacter.isActive !== character.isActive;
  
  if (hasSignificantChanges) {
    await appendEntityLog(EntityType.CHARACTER, character.id, LogEventType.UPDATED, {
      name: character.name,
      isActive: character.isActive
    });
  }
  
  // Lean identity fields changed — cascade patch ALL log entries across ALL months and events
  if (previousCharacter) {
    if (previousCharacter.name !== character.name) {
      await updateEntityLeanFields(EntityType.CHARACTER, character.id, {
        name: character.name || 'Unknown'
      });
    }
  }
}

/**
 * Remove character effects when character is deleted
 * Characters can have entries in character log and related links
 */
export async function removeCharacterEffectsOnDelete(characterId: string): Promise<void> {
  try {
    // 1. Remove all Links related to this character
    const characterLinks = await getLinksFor({ type: EntityType.CHARACTER, id: characterId });
    
    for (const link of characterLinks) {
      try {
        await removeLink(link.id);
      } catch (error) {
        console.error(`[removeCharacterEffectsOnDelete] ❌ Failed to remove link ${link.id}:`, error);
      }
    }
    
    // 2. Clear all effects for this character
    await clearEffect(EffectKeys.created('character', characterId));
    await clearEffectsByPrefix(EntityType.CHARACTER, characterId, '');
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

// Only players can convert points to J$ through the points system

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