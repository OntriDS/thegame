// workflows/character-creation-utils.ts
// Character Creation System - DNA/RNA Molecular Pattern Implementation
// Creates characters from Tasks, Sales, Financial Records, and Items using emissary fields

import type { Task, Sale, FinancialRecord, Item, Character } from '@/types/entities';
import { CharacterRole, PLAYER_ONE_ID } from '@/types/enums';
import { upsertCharacter } from '@/data-store/datastore';
import { hasEffect, markEffect } from '@/data-store/effects-registry';
import { EffectKeys } from '@/data-store/keys';

/**
 * Creates a Character entity from emissary fields
 * IDEMPOTENT: Relies on Effects Registry to prevent duplicate creation
 * This function is only called when Effects Registry confirms no character exists yet
 * 
 * @param entityType - Type of entity creating the character (task, sale, financial, item)
 * @param entityId - ID of the entity creating the character
 * @param entityName - Name of the entity creating the character
 * @param newCustomerName - Name for the new character (from emissary field)
 * @returns Created Character or null if creation failed
 */
export async function createCharacterFromEntity(
  entityType: 'task' | 'sale' | 'financial' | 'item',
  entityId: string,
  entityName: string,
  newCustomerName: string
): Promise<Character | null> {
  try {
    console.log(`[createCharacterFromEntity] Starting character creation from ${entityType}: ${entityName} (${entityId})`);
    console.log(`[createCharacterFromEntity] newCustomerName: ${newCustomerName}`);
    
    if (!newCustomerName || !newCustomerName.trim()) {
      console.error(`Cannot create character: newCustomerName is required`);
      return null;
    }
    
    // OPTIMIZED: No need to check for existing characters - Effects Registry already did!
    // The workflow only calls this when hasEffect('{entityType}:{id}:characterCreated') === false
    console.log(`[createCharacterFromEntity] Creating new character (Effect Registry confirmed no existing character)`);
    
    const newCharacter: Character = {
      id: `character-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: newCustomerName.trim(),
      description: `Customer character created from ${entityType}: ${entityName}`,
      roles: [CharacterRole.CUSTOMER],
      inventory: [],
      achievementsCharacter: [],
      jungleCoins: 0,
      purchasedAmount: 0,
      playerId: PLAYER_ONE_ID, // Default to Player One for now
      lastActiveAt: new Date(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      links: []  // Initialize links array (The Rosetta Stone)
    };
    
    // Store the character in DataStore
    console.log(`[createCharacterFromEntity] Creating new character:`, newCharacter);
    const createdCharacter = await upsertCharacter(newCharacter);
    console.log(`[createCharacterFromEntity] ✅ Character created successfully: ${createdCharacter.name}`);
    
    return createdCharacter;
  } catch (error) {
    console.error(`[createCharacterFromEntity] ❌ Error creating character from ${entityType} ${entityId}:`, error);
    return null;
  }
}

/**
 * Convenience functions for specific entity types
 * These follow the same pattern as item-creation-utils.ts and financial-record-utils.ts
 */

export async function createCharacterFromTask(task: Task): Promise<Character | null> {
  if (!task.newCustomerName) {
    return null;
  }
  return createCharacterFromEntity('task', task.id, task.name, task.newCustomerName);
}

export async function createCharacterFromSale(sale: Sale): Promise<Character | null> {
  if (!sale.newCustomerName) {
    return null;
  }
  return createCharacterFromEntity('sale', sale.id, sale.counterpartyName || sale.name, sale.newCustomerName);
}

export async function createCharacterFromFinancial(record: FinancialRecord): Promise<Character | null> {
  if (!record.newCustomerName) {
    return null;
  }
  return createCharacterFromEntity('financial', record.id, record.name, record.newCustomerName);
}

export async function createCharacterFromItem(item: Item): Promise<Character | null> {
  if (!item.newOwnerName) {
    return null;
  }
  return createCharacterFromEntity('item', item.id, item.name, item.newOwnerName);
}

