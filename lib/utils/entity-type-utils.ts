// lib/utils/entity-type-utils.ts
// Utilities for entity type string conversion and validation

import { EntityType } from '@/types/enums';

/**
 * Map plural UI form to EntityType enum value (singular)
 * Used by Seed Data UI which uses plural forms ('tasks', 'items') 
 * but EntityType enum uses singular forms ('task', 'item')
 */
const PLURAL_TO_SINGULAR: Record<string, EntityType> = {
  'tasks': EntityType.TASK,
  'items': EntityType.ITEM,
  'sales': EntityType.SALE,
  'financials': EntityType.FINANCIAL,
  'characters': EntityType.CHARACTER,
  'players': EntityType.PLAYER,
  'sites': EntityType.SITE
};

/**
 * Convert plural UI entity type string to EntityType enum value
 * @param pluralForm - Plural form from UI (e.g., 'tasks', 'items')
 * @returns EntityType enum value (e.g., 'task', 'item')
 */
export function pluralToEntityType(pluralForm: string): EntityType {
  const entityType = PLURAL_TO_SINGULAR[pluralForm];
  if (!entityType) {
    throw new Error(`Unknown plural entity type: ${pluralForm}. Supported: ${Object.keys(PLURAL_TO_SINGULAR).join(', ')}`);
  }
  return entityType;
}

/**
 * Check if a plural form is a valid entity type
 */
export function isValidPluralEntityType(pluralForm: string): boolean {
  return pluralForm in PLURAL_TO_SINGULAR;
}

