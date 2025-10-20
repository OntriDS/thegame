// lib/core/entity-rules.ts
// The Core Game Mechanics - Entity Rules Engine
// This is the heart of The Rosetta Stone system

import { Link } from '../../types/entities';
import { LinkType, EntityType } from '../../types/enums';

/** Link Registry Interface - The Rosetta Stone of Relationships */
export interface LinkRegistry {
  createLink(link: Link): Promise<void>;
  getLinksFor(entity: {type: EntityType, id: string}): Promise<Link[]>;
  getLinksByType(linkType: LinkType): Promise<Link[]>;
  removeLink(linkId: string): Promise<void>;
  removeLinksFor(entity: {type: EntityType, id: string}): Promise<void>;
  getRelationshipGraph(entityId: string, entityType?: EntityType): Promise<RelationshipGraph>;
}

/** Relationship Graph for visualization */
export interface RelationshipGraph {
  entityId: string;
  entityType: EntityType;
  links: {
    incoming: Link[];
    outgoing: Link[];
  };
  relatedEntities: {
    [entityType in EntityType]?: string[];
  };
}

/** Link Rules for cascade operations */
export interface LinkRule {
  linkType: LinkType;
  onSourceDelete: 'cascade' | 'prompt' | 'block' | 'ignore';
  onTargetDelete: 'cascade' | 'prompt' | 'block' | 'ignore';
  onSourceUpdate: 'propagate' | 'prompt' | 'ignore';
  onTargetUpdate: 'propagate' | 'prompt' | 'ignore';
}

/** Directional Rules for workflow triggers */
export interface DirectionalRule {
  linkType: LinkType;
  direction: 'forward' | 'backward' | 'bidirectional';
  trigger: 'create' | 'update' | 'delete' | 'complete';
  action: 'create_target' | 'update_target' | 'delete_target' | 'propagate_status';
  conditions?: {
    sourceStatus?: string;
    targetStatus?: string;
    metadata?: Record<string, any>;
  };
}

/** ENTITY RULES - The Core Game Mechanics */
export const ENTITY_RULES = {
  // Link Rules - What happens when entities are deleted/updated
  LINK_RULES: [
    // TASK relationships
    {
      linkType: 'TASK_ITEM',
      onSourceDelete: 'cascade',    // Delete Task → Delete Item
      onTargetDelete: 'prompt',     // Delete Item → Ask about Task
      onSourceUpdate: 'propagate',  // Task Done → Update Item status
      onTargetUpdate: 'ignore'      // Item update → Don't affect Task
    },
    {
      linkType: 'ITEM_TASK',
      onSourceDelete: 'prompt',     // Delete Item → Ask about Task
      onTargetDelete: 'cascade',    // Delete Task → Delete Item
      onSourceUpdate: 'ignore',     // Item update → Don't affect Task
      onTargetUpdate: 'propagate'   // Task Done → Update Item status
    },
    {
      linkType: 'TASK_FINREC',
      onSourceDelete: 'prompt',     // Delete Task → Ask about Financial Record
      onTargetDelete: 'ignore',     // Delete Financial Record → Don't affect Task
      onSourceUpdate: 'propagate',  // Task Done → Update Financial Record
      onTargetUpdate: 'ignore'      // Financial Record update → Don't affect Task
    },
    {
      linkType: 'FINREC_TASK',
      onSourceDelete: 'ignore',     // Delete Financial Record → Don't affect Task
      onTargetDelete: 'prompt',     // Delete Task → Ask about Financial Record
      onSourceUpdate: 'ignore',     // Financial Record update → Don't affect Task
      onTargetUpdate: 'propagate'   // Task Done → Update Financial Record
    },
    {
      linkType: 'TASK_SALE',
      onSourceDelete: 'ignore',     // Delete Task → Don't affect Sale
      onTargetDelete: 'prompt',     // Delete Sale → Ask about Task
      onSourceUpdate: 'ignore',     // Task update → Don't affect Sale
      onTargetUpdate: 'propagate'   // Sale Done → Mark Task as paid
    },
    {
      linkType: 'SALE_TASK', 
      onSourceDelete: 'prompt',     // Delete Sale → Ask about Task
      onTargetDelete: 'ignore',     // Delete Task → Don't affect Sale
      onSourceUpdate: 'propagate',  // Sale Done → Mark Task as paid
      onTargetUpdate: 'propagate'   // Task Done → Mark Sale as done
    },
    {
      linkType: 'TASK_CHARACTER',
      onSourceDelete: 'ignore',     // Delete Task → Don't affect Character points
      onTargetDelete: 'ignore',     // Delete Character → Don't affect Task
      onSourceUpdate: 'ignore',     // Task update → Don't affect Character
      onTargetUpdate: 'ignore'      // Character update → Don't affect Task
    },
    {
      linkType: 'CHARACTER_TASK',
      onSourceDelete: 'ignore',     // Delete Character → Don't affect Task
      onTargetDelete: 'ignore',     // Delete Task → Don't affect Character points
      onSourceUpdate: 'ignore',     // Character update → Don't affect Task
      onTargetUpdate: 'ignore'      // Task update → Don't affect Character
    },

    // ITEM relationships
    {
      linkType: 'ITEM_SALE',
      onSourceDelete: 'prompt',     // Delete Item → Ask about Sale
      onTargetDelete: 'prompt',     // Delete Sale → Ask about Item
      onSourceUpdate: 'ignore',     // Item update → Don't affect Sale
      onTargetUpdate: 'ignore'      // Sale update → Don't affect Item
    },
    {
      linkType: 'SALE_ITEM',
      onSourceDelete: 'prompt',     // Delete Sale → Ask about Item
      onTargetDelete: 'prompt',     // Delete Item → Ask about Sale
      onSourceUpdate: 'ignore',     // Sale update → Don't affect Item
      onTargetUpdate: 'ignore'      // Item update → Don't affect Sale
    },
    {
      linkType: 'ITEM_FINREC',
      onSourceDelete: 'prompt',     // Delete Item → Ask about Financial Record
      onTargetDelete: 'ignore',     // Delete Financial Record → Don't affect Item
      onSourceUpdate: 'ignore',     // Item update → Don't affect Financial Record
      onTargetUpdate: 'ignore'      // Financial Record update → Don't affect Item
    },
    {
      linkType: 'FINREC_ITEM',
      onSourceDelete: 'ignore',     // Delete Financial Record → Don't affect Item
      onTargetDelete: 'prompt',     // Delete Item → Ask about Financial Record
      onSourceUpdate: 'ignore',     // Financial Record update → Don't affect Item
      onTargetUpdate: 'ignore'      // Item update → Don't affect Financial Record
    },
    {
      linkType: 'ITEM_CHARACTER',
      onSourceDelete: 'ignore',     // Delete Item → Don't affect Character (future)
      onTargetDelete: 'ignore',     // Delete Character → Don't affect Item
      onSourceUpdate: 'ignore',     // Item update → Don't affect Character
      onTargetUpdate: 'ignore'      // Character update → Don't affect Item
    },
    {
      linkType: 'CHARACTER_ITEM',
      onSourceDelete: 'ignore',     // Delete Character → Don't affect Item
      onTargetDelete: 'ignore',     // Delete Item → Don't affect Character (future)
      onSourceUpdate: 'ignore',     // Character update → Don't affect Item
      onTargetUpdate: 'ignore'      // Item update → Don't affect Character
    },

    // SALE relationships
    {
      linkType: 'SALE_FINREC',
      onSourceDelete: 'prompt',     // Delete Sale → Ask about Financial Record
      onTargetDelete: 'ignore',     // Delete Financial Record → Don't affect Sale
      onSourceUpdate: 'propagate',  // Sale Done → Update Financial Record
      onTargetUpdate: 'ignore'      // Financial Record update → Don't affect Sale
    },
    {
      linkType: 'FINREC_SALE',
      onSourceDelete: 'ignore',     // Delete Financial Record → Don't affect Sale
      onTargetDelete: 'prompt',     // Delete Sale → Ask about Financial Record
      onSourceUpdate: 'ignore',     // Financial Record update → Don't affect Sale
      onTargetUpdate: 'propagate'   // Sale Done → Update Financial Record
    },
    {
      linkType: 'SALE_CHARACTER',
      onSourceDelete: 'ignore',     // Delete Sale → Don't affect Character points
      onTargetDelete: 'ignore',     // Delete Character → Don't affect Sale
      onSourceUpdate: 'ignore',     // Sale update → Don't affect Character
      onTargetUpdate: 'ignore'      // Character update → Don't affect Sale
    },
    {
      linkType: 'CHARACTER_SALE',
      onSourceDelete: 'ignore',     // Delete Character → Don't affect Sale
      onTargetDelete: 'ignore',     // Delete Sale → Don't affect Character points
      onSourceUpdate: 'ignore',     // Character update → Don't affect Sale
      onTargetUpdate: 'ignore'      // Sale update → Don't affect Character
    },

    // FINANCIAL RECORD relationships
    {
      linkType: 'FINREC_CHARACTER',
      onSourceDelete: 'ignore',     // Delete Financial Record → Don't affect Character
      onTargetDelete: 'ignore',     // Delete Character → Don't affect Financial Record
      onSourceUpdate: 'ignore',     // Financial Record update → Don't affect Character
      onTargetUpdate: 'ignore'      // Character update → Don't affect Financial Record
    },
    {
      linkType: 'CHARACTER_FINREC',
      onSourceDelete: 'ignore',     // Delete Character → Don't affect Financial Record
      onTargetDelete: 'ignore',     // Delete Financial Record → Don't affect Character
      onSourceUpdate: 'ignore',     // Character update → Don't affect Financial Record
      onTargetUpdate: 'ignore'      // Financial Record update → Don't affect Character
    },
    
    // CHARACTER ↔ SITE relationships (people and places)
    {
      linkType: 'CHARACTER_SITE',
      onSourceDelete: 'ignore',     // Delete Character → Don't affect Site
      onTargetDelete: 'ignore',     // Delete Site → Don't affect Character
      onSourceUpdate: 'ignore',     // Character update → Don't affect Site
      onTargetUpdate: 'ignore'      // Site update → Don't affect Character
    },
    {
      linkType: 'SITE_CHARACTER',
      onSourceDelete: 'ignore',     // Delete Site → Don't affect Character
      onTargetDelete: 'ignore',     // Delete Character → Don't affect Site
      onSourceUpdate: 'ignore',     // Site update → Don't affect Character
      onTargetUpdate: 'ignore'      // Character update → Don't affect Site
    }
  ] as LinkRule[],

  // Directional Rules - Workflow automation triggers
  DIRECTIONAL_RULES: [
    // Task completion creates Items
    {
      linkType: 'TASK_ITEM',
      direction: 'forward',
      trigger: 'complete',
      action: 'create_target',
      conditions: {
        sourceStatus: 'Done',
        metadata: { hasOutputItem: true }
      }
    },
    
    // Task completion creates Sales (like Feria example)
    {
      linkType: 'TASK_SALE',
      direction: 'forward',
      trigger: 'complete',
      action: 'create_target',
      conditions: {
        sourceStatus: 'Done',
        metadata: { createsSale: true }
      }
    },
    
    // Sale completion creates Financial Records
    {
      linkType: 'SALE_FINREC',
      direction: 'forward',
      trigger: 'complete',
      action: 'create_target',
      conditions: {
        sourceStatus: 'Done'
      }
    },
    
    // Task completion awards Character points (PLAYER role only)
    {
      linkType: 'TASK_CHARACTER',
      direction: 'forward',
      trigger: 'complete',
      action: 'update_target',
      conditions: {
        sourceStatus: 'Done',
        metadata: { hasRewards: true }
      }
    },
    
    // Sale completion awards Character points (PLAYER role only)
    {
      linkType: 'SALE_CHARACTER',
      direction: 'forward',
      trigger: 'complete',
      action: 'update_target',
      conditions: {
        sourceStatus: 'Done'
      }
    },
    
    // Financial Record completion awards Character points (PLAYER role only)
    {
      linkType: 'FINREC_CHARACTER',
      direction: 'forward',
      trigger: 'complete',
      action: 'update_target',
      conditions: {
        sourceStatus: 'Done'
      }
    }
  ] as DirectionalRule[]
};

/** Link Registry Factory */
export function createLinkRegistry(adapter: 'local' | 'hybrid'): LinkRegistry {
  // This will be implemented in Phase 2 with actual adapters
  throw new Error('LinkRegistry adapters not yet implemented');
}
