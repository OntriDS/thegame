// lib/game-mechanics/cascade-operations.ts
// Cascade operations for Link Rules Engine

import { Link } from '../../types/entities';
import { LinkType, EntityType } from '../../types/enums';
import { LinkRule, ENTITY_RULES } from './entity-rules';

export interface CascadeResult {
  action: 'cascade' | 'prompt' | 'block' | 'ignore' | 'propagate';
  message?: string;
  affectedEntities?: { type: EntityType; id: string }[];
  requiresConfirmation?: boolean;
}

/**
 * Evaluate what should happen when an entity is deleted
 */
export function evaluateDeleteCascade(
  entityType: EntityType,
  entityId: string,
  links: Link[]
): CascadeResult[] {
  const results: CascadeResult[] = [];
  
  for (const link of links) {
    const rule = ENTITY_RULES.LINK_RULES.find(r => r.linkType === link.linkType);
    if (!rule) continue;
    
    const isSource = link.source.type === entityType && link.source.id === entityId;
    const isTarget = link.target.type === entityType && link.target.id === entityId;
    
    if (isSource) {
      const action = rule.onSourceDelete;
      results.push({
        action,
        message: getCascadeMessage(action, 'source', link),
        affectedEntities: [{ type: link.target.type, id: link.target.id }],
        requiresConfirmation: action === 'prompt'
      });
    }
    
    if (isTarget) {
      const action = rule.onTargetDelete;
      results.push({
        action,
        message: getCascadeMessage(action, 'target', link),
        affectedEntities: [{ type: link.source.type, id: link.source.id }],
        requiresConfirmation: action === 'prompt'
      });
    }
  }
  
  return results;
}

/**
 * Evaluate what should happen when an entity is updated
 */
export function evaluateUpdateCascade(
  entityType: EntityType,
  entityId: string,
  links: Link[]
): CascadeResult[] {
  const results: CascadeResult[] = [];
  
  for (const link of links) {
    const rule = ENTITY_RULES.LINK_RULES.find(r => r.linkType === link.linkType);
    if (!rule) continue;
    
    const isSource = link.source.type === entityType && link.source.id === entityId;
    const isTarget = link.target.type === entityType && link.target.id === entityId;
    
    if (isSource) {
      const action = rule.onSourceUpdate;
      if (action !== 'ignore') {
        results.push({
          action,
          message: getCascadeMessage(action, 'source', link),
          affectedEntities: [{ type: link.target.type, id: link.target.id }],
          requiresConfirmation: action === 'prompt'
        });
      }
    }
    
    if (isTarget) {
      const action = rule.onTargetUpdate;
      if (action !== 'ignore') {
        results.push({
          action,
          message: getCascadeMessage(action, 'target', link),
          affectedEntities: [{ type: link.source.type, id: link.source.id }],
          requiresConfirmation: action === 'prompt'
        });
      }
    }
  }
  
  return results;
}

/**
 * Generate user-friendly cascade messages
 */
function getCascadeMessage(
  action: 'cascade' | 'prompt' | 'block' | 'ignore' | 'propagate',
  direction: 'source' | 'target',
  link: Link
): string {
  const entityName = direction === 'source' ? link.target.type : link.source.type;
  const linkDescription = getLinkDescription(link.linkType);
  
  switch (action) {
    case 'cascade':
      return `This will also ${linkDescription} the ${entityName} "${direction === 'source' ? link.target.id : link.source.id}"`;
    case 'prompt':
      return `This ${entityName} is linked to another entity. What would you like to do?`;
    case 'block':
      return `Cannot delete this entity because it is linked to a ${entityName}`;
    case 'ignore':
      return `This will not affect the linked ${entityName}`;
    case 'propagate':
      return `This will propagate changes to the linked ${entityName}`;
    default:
      return '';
  }
}

/**
 * Get human-readable description of link type
 */
function getLinkDescription(linkType: LinkType): string {
  const descriptions: Partial<Record<LinkType, string>> = {
    // TASK relationships
    'TASK_ITEM': 'delete the item created by',
    'TASK_FINREC': 'remove from financial records linked to',
    'TASK_SALE': 'delete the sale spawned from',
    'TASK_CHARACTER': 'remove points earned from',
    'TASK_SITE': 'remove task from site',
    
    // ITEM relationships
    'ITEM_TASK': 'remove from the task that created',
    'ITEM_SALE': 'remove from the sale that sold',
    'ITEM_FINREC': 'remove from financial records tracking',
    'ITEM_CHARACTER': 'remove points earned from',
    'ITEM_SITE': 'remove item from site',
    
    // SALE relationships
    'SALE_TASK': 'delete the task created by',
    'SALE_ITEM': 'remove the item sold in',
    'SALE_FINREC': 'remove from financial records linked to',
    'SALE_CHARACTER': 'remove points earned from',
    'SALE_SITE': 'remove sale from site',
    
    // FINANCIAL RECORD relationships
    'FINREC_TASK': 'remove from financial records tracking',
    'FINREC_ITEM': 'remove from financial records tracking',
    'FINREC_SALE': 'remove from financial records linked to',
    'FINREC_CHARACTER': 'remove points earned from',
    'FINREC_SITE': 'remove financial record from site',
    
    // CHARACTER relationships
    'CHARACTER_TASK': 'remove points earned from',
    'CHARACTER_ITEM': 'remove points earned from',
    'CHARACTER_SALE': 'remove points earned from',
    'CHARACTER_FINREC': 'remove points earned from',
    'CHARACTER_SITE': 'remove character relationship with',
    
    // SITE relationships
    'SITE_CHARACTER': 'remove site relationship with',
    'SITE_TASK': 'remove site from task',
    'SITE_FINREC': 'remove site from financial record',
    'SITE_ITEM': 'remove site from item',
    'SITE_SALE': 'remove site from sale',
    
    // PLAYER relationships
    'PLAYER_TASK': 'remove points from player',
    'PLAYER_SALE': 'remove points from player',
    'PLAYER_FINREC': 'remove points from player',
    'PLAYER_ITEM': 'remove item from player',
    'PLAYER_CHARACTER': 'remove character from player',
    
    // ACCOUNT relationships
    'ACCOUNT_PLAYER': 'remove account from player',
    'ACCOUNT_CHARACTER': 'remove account from character',
    'PLAYER_ACCOUNT': 'remove player from account',
    'CHARACTER_ACCOUNT': 'remove character from account'
  };
  
  return descriptions[linkType] || 'affect the linked';
}

/**
 * Check if any cascade results require blocking the operation
 */
export function shouldBlockOperation(results: CascadeResult[]): boolean {
  return results.some(result => result.action === 'block');
}

/**
 * Check if any cascade results require user confirmation
 */
export function requiresConfirmation(results: CascadeResult[]): boolean {
  return results.some(result => result.requiresConfirmation);
}

/**
 * Get all entities that would be affected by cascade operations
 */
export function getAffectedEntities(results: CascadeResult[]): { type: EntityType; id: string }[] {
  const entities: { type: EntityType; id: string }[] = [];
  
  for (const result of results) {
    if (result.affectedEntities) {
      entities.push(...result.affectedEntities);
    }
  }
  
  // Remove duplicates
  return entities.filter((entity, index, self) => 
    index === self.findIndex(e => e.type === entity.type && e.id === entity.id)
  );
}
