// lib/game-mechanics/directional-workflow.ts
// Directional Workflow Engine for The Rosetta Stone

import { Link } from '../../types/entities';
import { LinkType, EntityType } from '../../types/enums';
import { DirectionalRule, ENTITY_RULES } from './entity-rules';

export interface WorkflowTrigger {
  entityType: EntityType;
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'complete';
  oldStatus?: string;
  newStatus?: string;
  metadata?: Record<string, any>;
}

export interface WorkflowResult {
  triggered: boolean;
  actions: WorkflowAction[];
  errors: string[];
}

export interface WorkflowAction {
  type: 'create_target' | 'update_target' | 'delete_target' | 'propagate_status';
  targetType: EntityType;
  targetId?: string;
  data?: any;
  metadata?: Record<string, any>;
}

/**
 * Process directional workflow triggers
 */
export async function processWorkflowTrigger(
  trigger: WorkflowTrigger,
  existingLinks: Link[]
): Promise<WorkflowResult> {
  const result: WorkflowResult = {
    triggered: false,
    actions: [],
    errors: []
  };

  try {
    // Find all links involving this entity
    const entityLinks = existingLinks.filter(link => 
      link.source.type === trigger.entityType && link.source.id === trigger.entityId
    );

    // Process each link through directional rules
    for (const link of entityLinks) {
      const rule = ENTITY_RULES.DIRECTIONAL_RULES.find(r => r.linkType === link.linkType);
      if (!rule) continue;

      // Check if this rule should trigger
      if (shouldTriggerRule(rule, trigger, link)) {
        const action = createWorkflowAction(rule, trigger, link);
        if (action) {
          result.actions.push(action);
          result.triggered = true;
        }
      }
    }

    return result;
  } catch (error) {
    result.errors.push(`Workflow processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}

/**
 * Check if a directional rule should trigger
 */
function shouldTriggerRule(
  rule: DirectionalRule,
  trigger: WorkflowTrigger,
  link: Link
): boolean {
  // Check trigger type
  if (rule.trigger !== trigger.action) return false;

  // Check direction
  if (rule.direction === 'forward' && link.source.type !== trigger.entityType) return false;
  if (rule.direction === 'backward' && link.target.type !== trigger.entityType) return false;

  // Check conditions
  if (rule.conditions) {
    // Check source status
    if (rule.conditions.sourceStatus && trigger.newStatus !== rule.conditions.sourceStatus) {
      return false;
    }

    // Check metadata conditions
    if (rule.conditions.metadata) {
      for (const [key, value] of Object.entries(rule.conditions.metadata)) {
        if (trigger.metadata?.[key] !== value) {
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * Create a workflow action based on the rule
 */
function createWorkflowAction(
  rule: DirectionalRule,
  trigger: WorkflowTrigger,
  link: Link
): WorkflowAction | null {
  const targetType = rule.direction === 'forward' ? link.target.type : link.source.type;
  const targetId = rule.direction === 'forward' ? link.target.id : link.source.id;

  switch (rule.action) {
    case 'create_target':
      return {
        type: 'create_target',
        targetType,
        data: generateTargetData(rule, trigger, link),
        metadata: {
          sourceEntity: trigger.entityType,
          sourceId: trigger.entityId,
          linkType: rule.linkType
        }
      };

    case 'update_target':
      return {
        type: 'update_target',
        targetType,
        targetId,
        data: generateUpdateData(rule, trigger, link),
        metadata: {
          sourceEntity: trigger.entityType,
          sourceId: trigger.entityId,
          linkType: rule.linkType
        }
      };

    case 'propagate_status':
      return {
        type: 'propagate_status',
        targetType,
        targetId,
        data: { status: trigger.newStatus },
        metadata: {
          sourceEntity: trigger.entityType,
          sourceId: trigger.entityId,
          linkType: rule.linkType
        }
      };

    default:
      return null;
  }
}

/**
 * Generate data for creating a new target entity
 */
function generateTargetData(
  rule: DirectionalRule,
  trigger: WorkflowTrigger,
  link: Link
): any {
  const baseData = {
    id: generateId(),
    name: `Generated from ${trigger.entityType}`,
    description: `Auto-generated from ${trigger.entityType} ${trigger.entityId}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    isCollected: false,
    links: []
  };

  // Add specific data based on target type and link type
  switch (rule.linkType) {
    case 'TASK_ITEM':
      return {
        ...baseData,
        type: 'ARTWORK', // Default type, should be configurable
        status: 'FOR_SALE',
        station: 'PRODUCTION',
        category: 'Artworks',
        stock: [],
        unitCost: 0,
        additionalCost: 0,
        price: 0,
        value: 0,
        quantitySold: 0,
        sourceTaskId: trigger.entityId
      };

    case 'TASK_SALE':
      return {
        ...baseData,
        saleDate: new Date(),
        type: 'FERIA',
        status: 'PENDING',
        siteId: 'ECO_FERIA', // Default site
        lines: [],
        totals: {
          subtotal: 0,
          discountTotal: 0,
          taxTotal: 0,
          totalRevenue: 0
        }
      };

    case 'SALE_FINREC':
      return {
        ...baseData,
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        station: 'SALES',
        category: 'Direct',
        type: 'company',
        cost: 0,
        revenue: 0,
        jungleCoins: 0,
        netCashflow: 0,
        jungleCoinsValue: 0
      };

    default:
      return baseData;
  }
}

/**
 * Generate data for updating an existing target entity
 */
function generateUpdateData(
  rule: DirectionalRule,
  trigger: WorkflowTrigger,
  link: Link
): any {
  // This would typically update player points, status changes, etc.
  switch (rule.linkType) {
    case LinkType.PLAYER_TASK:
    case LinkType.PLAYER_SALE:
    case LinkType.PLAYER_FINREC:
      return {
        points: trigger.metadata?.rewards?.points || {},
        jungleCoins: trigger.metadata?.rewards?.jungleCoins || 0
      };

    default:
      return {};
  }
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `generated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Example usage for the Feria workflow:
 * 
 * 1. Recurrent Task "Go to Feria" completes
 * 2. Triggers TASK_SALE rule with createsSale: true
 * 3. Creates a new Sale entity (status: PENDING)
 * 4. User fills in the sale details
 * 5. Sale completion triggers SALE_FINREC rule
 * 6. Creates Financial Records for the sale
 * 7. Both trigger CHARACTER rules to award points (PLAYER role only)
 */
