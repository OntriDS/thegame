// lib/utils/business-keys.ts
// Business key generation for bulk operations deduplication
// Business keys identify records based on real-world properties, not technical IDs

import { EntityType } from '@/types/enums';
import type { Item, Task, Sale, FinancialRecord, Character, Player, Site } from '@/types/entities';

/**
 * Generate business key for an entity record
 * Business keys are used for deduplication - same business key = same real-world entity
 * 
 * @param entityType - The type of entity
 * @param record - The entity record
 * @returns Business key string (lowercase, trimmed, pipe-separated)
 */
export function getBusinessKey(entityType: EntityType, record: any): string {
  switch (entityType) {
    case EntityType.ITEM:
      return getItemBusinessKey(record as Item);
    case EntityType.TASK:
      return getTaskBusinessKey(record as Task);
    case EntityType.SALE:
      return getSaleBusinessKey(record as Sale);
    case EntityType.FINANCIAL:
      return getFinancialBusinessKey(record as FinancialRecord);
    case EntityType.CHARACTER:
      return getCharacterBusinessKey(record as Character);
    case EntityType.PLAYER:
      return getPlayerBusinessKey(record as Player);
    case EntityType.SITE:
      return getSiteBusinessKey(record as Site);
    
    default:
      throw new Error(`Business key generation not implemented for entity type: ${entityType}`);
  }
}

/**
 * Generate business key for Item entity
 * Key: type|name|collection (lowercased, trimmed)
 * Collection defaults to "No Collection" if not provided (matches Collection.NO_COLLECTION enum)
 */
function getItemBusinessKey(item: Item): string {
  const type = (item.type || '').trim().toLowerCase();
  const name = (item.name || '').trim().toLowerCase();
  const collection = (item.collection || 'No Collection').toString().trim().toLowerCase();
  
  return `${type}|${name}|${collection}`;
}

/**
 * Generate business key for Task entity
 * Key: name|type|station (lowercased, trimmed)
 */
function getTaskBusinessKey(task: Task): string {
  const name = (task.name || '').trim().toLowerCase();
  const type = (task.type || '').toString().trim().toLowerCase();
  const station = (task.station || '').toString().trim().toLowerCase();
  
  return `${name}|${type}|${station}`;
}

/**
 * Generate business key for Sale entity
 * Key: saleDate|counterpartyName|totalRevenue (normalized dates, handle missing counterpartyName)
 */
function getSaleBusinessKey(sale: Sale): string {
  // Normalize saleDate to ISO string for consistency
  let saleDateStr = '';
  if (sale.saleDate) {
    const date = sale.saleDate instanceof Date ? sale.saleDate : new Date(sale.saleDate);
    saleDateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
  }
  
  const counterpartyName = (sale.counterpartyName || '').trim().toLowerCase();
  const totalRevenue = (sale.totals?.totalRevenue ?? 0).toString();
  
  return `${saleDateStr}|${counterpartyName}|${totalRevenue}`;
}

/**
 * Generate business key for FinancialRecord entity
 * Key: year|month|type|station|name (fallback to year|month|type|station|cost|revenue if name missing)
 */
function getFinancialBusinessKey(financial: FinancialRecord): string {
  const year = (financial.year || 0).toString();
  const month = (financial.month || 0).toString();
  const type = (financial.type || '').trim().toLowerCase();
  const station = (financial.station || '').toString().trim().toLowerCase();
  
  // Use name if available, otherwise fallback to cost|revenue
  const name = (financial.name || '').trim().toLowerCase();
  if (name) {
    return `${year}|${month}|${type}|${station}|${name}`;
  } else {
    // Fallback: use cost and revenue to distinguish records
    const cost = (financial.cost || 0).toString();
    const revenue = (financial.revenue || 0).toString();
    return `${year}|${month}|${type}|${station}|${cost}|${revenue}`;
  }
}

/**
 * Generate business key for Character entity
 * Key: name (lowercased, trimmed) - default to "None" if missing
 */
function getCharacterBusinessKey(character: Character): string {
  const name = (character.name || 'None').trim().toLowerCase();
  return name;
}

/**
 * Generate business key for Player entity
 * Key: email (lowercased, trimmed)
 */
function getPlayerBusinessKey(player: Player): string {
  const email = (player.email || '').trim().toLowerCase();
  return email;
}

/**
 * Generate business key for Site entity
 * Key: name (lowercased, trimmed) - default to "None" if missing
 */
function getSiteBusinessKey(site: Site): string {
  const name = (site.name || 'None').trim().toLowerCase();
  return name;
}

