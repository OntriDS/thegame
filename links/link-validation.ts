// links/link-validation.ts
// Link Validation System for The Rosetta Stone
// Migrated from lib/game-mechanics/workflow-integration.ts

import { LinkType, EntityType } from '@/types/enums';
import { getTaskById } from '@/data-store/repositories/task.repo';
import { getItemById } from '@/data-store/repositories/item.repo';
import { getSaleById } from '@/data-store/repositories/sale.repo';
import { getCharacterById } from '@/data-store/repositories/character.repo';
import { getPlayerById } from '@/data-store/repositories/player.repo';
import { getAccountById } from '@/data-store/repositories/account.repo';
import { kvGet } from '@/data-store/kv';
import { buildDataKey } from '@/data-store/keys';
import { getLinksFor } from './link-registry';

/**
 * Link validation result interface
 */
export interface LinkValidationResult {
  isValid: boolean;
  reason?: string;
  warnings?: string[];
}

/**
 * Main link validation orchestrator
 * Validates link type compatibility, entity existence, and business rules
 */
export async function validateLink(
  linkType: LinkType,
  source: { type: EntityType; id: string },
  target: { type: EntityType; id: string },
  metadata?: Record<string, any>
): Promise<LinkValidationResult> {
  const warnings: string[] = [];

  try {
    // 1. Basic validation
    if (!linkType || !source?.type || !source?.id || !target?.type || !target?.id) {
      return {
        isValid: false,
        reason: 'Missing required fields: linkType, source.type, source.id, target.type, target.id'
      };
    }

    // 2. Self-reference validation
    if (source.type === target.type && source.id === target.id) {
      return {
        isValid: false,
        reason: 'Self-referencing links are not allowed'
      };
    }

    // 3. Link type compatibility validation
    const compatibilityResult = validateLinkTypeCompatibility(linkType, source.type, target.type);
    if (!compatibilityResult.isValid) {
      return {
        isValid: false,
        reason: `Incompatible link type: ${linkType} cannot connect ${source.type} to ${target.type}. ${compatibilityResult.reason}`
      };
    }

    // 4. Entity existence validation
    const sourceExists = await validateEntityExistsWithRetry(source.type, source.id);
    if (!sourceExists) {
      return {
        isValid: false,
        reason: `Source entity does not exist: ${source.type}:${source.id}`
      };
    }

    const targetExists = await validateEntityExistsWithRetry(target.type, target.id);
    if (!targetExists) {
      return {
        isValid: false,
        reason: `Target entity does not exist: ${target.type}:${target.id}`
      };
    }

    // 5. Business rules validation
    const businessRulesResult = await validateBusinessRules(linkType, source, target, metadata);
    if (!businessRulesResult.isValid) {
      return {
        isValid: false,
        reason: businessRulesResult.reason
      };
    }

    // Add any warnings from business rules
    if (businessRulesResult.warnings) {
      warnings.push(...businessRulesResult.warnings);
    }

    return {
      isValid: true,
      warnings: warnings.length > 0 ? warnings : undefined
    };

  } catch (error) {
    return {
      isValid: false,
      reason: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Validate link type compatibility with source and target entity types
 * Complete mapping of all 39 link types
 */
export function validateLinkTypeCompatibility(
  linkType: LinkType,
  sourceType: EntityType,
  targetType: EntityType
): LinkValidationResult {
  // Define valid link type combinations for all 39 link types
  const validCombinations: Record<LinkType, { source: EntityType[], target: EntityType[] }> = {
    // TASK relationships (6)
    'TASK_ITEM': { source: [EntityType.TASK], target: [EntityType.ITEM] },
    'TASK_FINREC': { source: [EntityType.TASK], target: [EntityType.FINANCIAL] },
    'TASK_SALE': { source: [EntityType.TASK], target: [EntityType.SALE] },
    'TASK_PLAYER': { source: [EntityType.TASK], target: [EntityType.PLAYER] },
    'TASK_CHARACTER': { source: [EntityType.TASK], target: [EntityType.CHARACTER] },
    'TASK_SITE': { source: [EntityType.TASK], target: [EntityType.SITE] },

    // ITEM relationships (6)
    'ITEM_TASK': { source: [EntityType.ITEM], target: [EntityType.TASK] },
    'ITEM_SALE': { source: [EntityType.ITEM], target: [EntityType.SALE] },
    'ITEM_FINREC': { source: [EntityType.ITEM], target: [EntityType.FINANCIAL] },
    'ITEM_PLAYER': { source: [EntityType.ITEM], target: [EntityType.PLAYER] },
    'ITEM_CHARACTER': { source: [EntityType.ITEM], target: [EntityType.CHARACTER] },
    'ITEM_SITE': { source: [EntityType.ITEM], target: [EntityType.SITE] },

    // SALE relationships (6)
    'SALE_TASK': { source: [EntityType.SALE], target: [EntityType.TASK] },
    'SALE_ITEM': { source: [EntityType.SALE], target: [EntityType.ITEM] },
    'SALE_FINREC': { source: [EntityType.SALE], target: [EntityType.FINANCIAL] },
    'SALE_PLAYER': { source: [EntityType.SALE], target: [EntityType.PLAYER] },
    'SALE_CHARACTER': { source: [EntityType.SALE], target: [EntityType.CHARACTER] },
    'SALE_SITE': { source: [EntityType.SALE], target: [EntityType.SITE] },

    // FINANCIAL RECORD relationships (6)
    'FINREC_TASK': { source: [EntityType.FINANCIAL], target: [EntityType.TASK] },
    'FINREC_ITEM': { source: [EntityType.FINANCIAL], target: [EntityType.ITEM] },
    'FINREC_SALE': { source: [EntityType.FINANCIAL], target: [EntityType.SALE] },
    'FINREC_PLAYER': { source: [EntityType.FINANCIAL], target: [EntityType.PLAYER] },
    'FINREC_CHARACTER': { source: [EntityType.FINANCIAL], target: [EntityType.CHARACTER] },
    'FINREC_SITE': { source: [EntityType.FINANCIAL], target: [EntityType.SITE] },

    // CHARACTER relationships (6)
    'CHARACTER_TASK': { source: [EntityType.CHARACTER], target: [EntityType.TASK] },
    'CHARACTER_ITEM': { source: [EntityType.CHARACTER], target: [EntityType.ITEM] },
    'CHARACTER_SALE': { source: [EntityType.CHARACTER], target: [EntityType.SALE] },
    'CHARACTER_FINREC': { source: [EntityType.CHARACTER], target: [EntityType.FINANCIAL] },
    'CHARACTER_SITE': { source: [EntityType.CHARACTER], target: [EntityType.SITE] },
    'CHARACTER_PLAYER': { source: [EntityType.CHARACTER], target: [EntityType.PLAYER] },
    'CHARACTER_BUSINESS': { source: [EntityType.CHARACTER], target: [EntityType.BUSINESS] },

    // SITE relationships (6)
    'SITE_TASK': { source: [EntityType.SITE], target: [EntityType.TASK] },
    'SITE_CHARACTER': { source: [EntityType.SITE], target: [EntityType.CHARACTER] },
    'SITE_FINREC': { source: [EntityType.SITE], target: [EntityType.FINANCIAL] },
    'SITE_ITEM': { source: [EntityType.SITE], target: [EntityType.ITEM] },
    'SITE_SALE': { source: [EntityType.SITE], target: [EntityType.SALE] },
    'SITE_SITE': { source: [EntityType.SITE], target: [EntityType.SITE] },

    // PLAYER relationships (5)
    'PLAYER_TASK': { source: [EntityType.PLAYER], target: [EntityType.TASK] },
    'PLAYER_SALE': { source: [EntityType.PLAYER], target: [EntityType.SALE] },
    'PLAYER_FINREC': { source: [EntityType.PLAYER], target: [EntityType.FINANCIAL] },
    'PLAYER_ITEM': { source: [EntityType.PLAYER], target: [EntityType.ITEM] },
    'PLAYER_CHARACTER': { source: [EntityType.PLAYER], target: [EntityType.CHARACTER] },

    // ACCOUNT relationships (4)
    'ACCOUNT_PLAYER': { source: [EntityType.ACCOUNT], target: [EntityType.PLAYER] },
    'ACCOUNT_CHARACTER': { source: [EntityType.ACCOUNT], target: [EntityType.CHARACTER] },
    'PLAYER_ACCOUNT': { source: [EntityType.PLAYER], target: [EntityType.ACCOUNT] },
    'CHARACTER_ACCOUNT': { source: [EntityType.CHARACTER], target: [EntityType.ACCOUNT] },

    // CONTRACT relationships (1)
    'CONTRACT_CHARACTER': { source: [EntityType.CONTRACT], target: [EntityType.CHARACTER] }
  };

  const combination = validCombinations[linkType];
  if (!combination) {
    return {
      isValid: false,
      reason: `Unknown link type: ${linkType}`
    };
  }

  if (!combination.source.includes(sourceType)) {
    return {
      isValid: false,
      reason: `Invalid source type for ${linkType}: ${sourceType}. Valid sources: ${combination.source.join(', ')}`
    };
  }

  if (!combination.target.includes(targetType)) {
    return {
      isValid: false,
      reason: `Invalid target type for ${linkType}: ${targetType}. Valid targets: ${combination.target.join(', ')}`
    };
  }

  return { isValid: true };
}

/**
 * Validate entity exists with retry for KV eventual consistency
 */
async function validateEntityExistsWithRetry(t: EntityType, id: string, retries = 5, delayMs = 120): Promise<boolean> {
  for (let i = 0; i <= retries; i++) {
    if (await validateEntityExists(t, id)) return true;
    if (i < retries) await new Promise(r => setTimeout(r, delayMs));
  }
  return false;
}

/**
 * Validate that entity exists in the system
 * OPTIMIZED: Direct KV lookup instead of loading all entities
 */
export async function validateEntityExists(entityType: EntityType, entityId: string): Promise<boolean> {
  try {
    const key = buildDataKey(entityType, entityId);
    const entity = await kvGet(key);
    return !!entity;
  } catch (error) {
    console.error(`[validateEntityExists] Error validating entity ${entityType}:${entityId}:`, error);
    return false;
  }
}

/**
 * Check if a reverse duplicate link already exists (canonical direction policy)
 * Prevents creating CHARACTER_ITEM if ITEM_CHARACTER exists, etc.
 */
async function checkReverseDuplicate(
  linkType: LinkType,
  source: { type: EntityType; id: string },
  target: { type: EntityType; id: string }
): Promise<LinkValidationResult> {
  // Define canonical link types and their reverse pairs
  const canonicalPairs: Record<LinkType, LinkType | null> = {
    // Ownership: canonical is ITEM_CHARACTER, reverse is CHARACTER_ITEM
    [LinkType.ITEM_CHARACTER]: null, // Canonical - no reverse check needed
    [LinkType.CHARACTER_ITEM]: LinkType.ITEM_CHARACTER, // Reverse - check if canonical exists

    // Ownership: canonical is SITE_CHARACTER, reverse is CHARACTER_SITE
    [LinkType.SITE_CHARACTER]: null, // Canonical - no reverse check needed
    [LinkType.CHARACTER_SITE]: LinkType.SITE_CHARACTER, // Reverse - check if canonical exists

    // Add other reverse pairs as needed
    [LinkType.TASK_ITEM]: null,
    [LinkType.ITEM_TASK]: null,
    [LinkType.TASK_FINREC]: null,
    [LinkType.FINREC_TASK]: null,
    [LinkType.TASK_SALE]: null,
    [LinkType.SALE_TASK]: null,
    [LinkType.TASK_PLAYER]: null,
    [LinkType.PLAYER_TASK]: null,
    [LinkType.TASK_CHARACTER]: null,
    [LinkType.CHARACTER_TASK]: null,
    [LinkType.TASK_SITE]: null,
    [LinkType.SITE_TASK]: null,
    [LinkType.ITEM_SALE]: null,
    [LinkType.SALE_ITEM]: null,
    [LinkType.ITEM_FINREC]: null,
    [LinkType.FINREC_ITEM]: null,
    [LinkType.ITEM_PLAYER]: null,
    [LinkType.PLAYER_ITEM]: null,
    [LinkType.ITEM_SITE]: null,
    [LinkType.SITE_ITEM]: null,
    [LinkType.SALE_FINREC]: null,
    [LinkType.FINREC_SALE]: null,
    [LinkType.SALE_PLAYER]: null,
    [LinkType.PLAYER_SALE]: null,
    [LinkType.SALE_CHARACTER]: null,
    [LinkType.CHARACTER_SALE]: null,
    [LinkType.SALE_SITE]: null,
    [LinkType.SITE_SALE]: null,
    [LinkType.FINREC_PLAYER]: null,
    [LinkType.PLAYER_FINREC]: null,
    [LinkType.FINREC_CHARACTER]: null,
    [LinkType.CHARACTER_FINREC]: null,
    [LinkType.FINREC_SITE]: null,
    [LinkType.SITE_FINREC]: null,
    [LinkType.CHARACTER_PLAYER]: null,
    [LinkType.PLAYER_CHARACTER]: null,
    [LinkType.SITE_SITE]: null,
    [LinkType.ACCOUNT_PLAYER]: null,
    [LinkType.PLAYER_ACCOUNT]: null,
    [LinkType.ACCOUNT_CHARACTER]: null,
    [LinkType.CHARACTER_ACCOUNT]: null,
    [LinkType.CHARACTER_BUSINESS]: null,
    [LinkType.CONTRACT_CHARACTER]: null
  };

  const canonicalType = canonicalPairs[linkType];

  // If this is a reverse link type, check if canonical already exists
  if (canonicalType) {
    // For reverse links, we need to check if canonical exists
    // Example: CHARACTER_ITEM (reverse) -> check if ITEM_CHARACTER (canonical) exists
    // The canonical link would have ITEM as source and CHARACTER as target
    // So we check links for both entities to find the canonical link

    // Get links for both entities to find canonical link
    const sourceLinks = await getLinksFor(source);
    const targetLinks = await getLinksFor(target);
    const allRelevantLinks = [...sourceLinks, ...targetLinks];

    // Check if canonical link exists connecting the same entities
    const canonicalExists = allRelevantLinks.some((link: any) => {
      if (link.linkType !== canonicalType) return false;

      // Check if canonical link connects the same two entities (in either direction)
      // For ITEM_CHARACTER canonical: source=ITEM, target=CHARACTER
      // For CHARACTER_ITEM reverse: source=CHARACTER, target=ITEM
      // We need to match the entity pair regardless of direction
      const linkConnectsSource = (link.source.type === source.type && link.source.id === source.id) ||
        (link.target.type === source.type && link.target.id === source.id);
      const linkConnectsTarget = (link.source.type === target.type && link.source.id === target.id) ||
        (link.target.type === target.type && link.target.id === target.id);

      return linkConnectsSource && linkConnectsTarget;
    });

    if (canonicalExists) {
      return {
        isValid: false,
        reason: `Cannot create reverse link ${linkType}. Canonical link ${canonicalType} already exists for this relationship. Links are semantically unidirectional - use the canonical direction.`
      };
    }
  }

  return { isValid: true };
}

/**
 * Validate business rules specific to link types
 */
export async function validateBusinessRules(
  linkType: LinkType,
  source: { type: EntityType; id: string },
  target: { type: EntityType; id: string },
  metadata?: Record<string, any>
): Promise<LinkValidationResult> {
  const warnings: string[] = [];

  try {
    // Check for reverse duplicate links (canonical direction policy)
    // If canonical link exists, reject reverse link creation
    const reverseDuplicateCheck = await checkReverseDuplicate(linkType, source, target);
    if (!reverseDuplicateCheck.isValid) {
      return reverseDuplicateCheck;
    }

    switch (linkType) {
      case 'PLAYER_CHARACTER':
        // Validate that character has valid playerId
        const character = await getCharacterById(source.id);
        if (character && character.playerId !== target.id) {
          warnings.push(`Character playerId (${character.playerId}) does not match target player ID (${target.id})`);
        }
        break;

      case 'TASK_SITE':
        // Validate that task has valid siteId
        const task = await getTaskById(source.id);
        if (task && task.siteId !== target.id) {
          warnings.push(`Task siteId (${task.siteId}) does not match target site ID (${target.id})`);
        }
        break;

      case 'ITEM_SITE':
        // Validate item stock location
        const item = await getItemById(source.id);
        if (item && item.stock) {
          const hasStockAtSite = item.stock.some((stock: any) => stock.siteId === target.id);
          if (!hasStockAtSite) {
            warnings.push(`Item does not have stock at target site: ${target.id}`);
          }
        }
        break;

      case 'SALE_ITEM':
        // Validate sale contains the item
        const sale = await getSaleById(source.id);
        if (sale && sale.lines) {
          const hasItemInSale = sale.lines.some((line: any) => line.kind === 'item' && line.itemId === target.id);
          if (!hasItemInSale) {
            warnings.push(`Sale does not contain target item: ${target.id}`);
          }
        }
        break;

      case 'CHARACTER_PLAYER':
        // Validate that character belongs to the player
        const char = await getCharacterById(source.id);
        if (char && char.playerId !== target.id) {
          warnings.push(`Character playerId (${char.playerId}) does not match target player ID (${target.id})`);
        }
        break;

      case 'SALE_CHARACTER':
        // Validate that character is the customer
        const saleWithChar = await getSaleById(source.id);
        if (saleWithChar && saleWithChar.customerId !== target.id) {
          warnings.push(`Sale customerId (${saleWithChar.customerId}) does not match target character ID (${target.id})`);
        }
        break;

      case 'ACCOUNT_PLAYER':
        // Validate that player belongs to the account
        const playerForAccount = await getPlayerById(target.id);
        if (playerForAccount && playerForAccount.accountId !== source.id) {
          warnings.push(`Player accountId (${playerForAccount.accountId}) does not match source account ID (${source.id})`);
        }
        break;

      case 'ACCOUNT_CHARACTER':
        // Validate that character belongs to the account
        const characterForAccount = await getCharacterById(target.id);
        if (characterForAccount && characterForAccount.accountId !== source.id) {
          warnings.push(`Character accountId (${characterForAccount.accountId}) does not match source account ID (${source.id})`);
        }
        break;

      case 'PLAYER_ACCOUNT':
        // Validate that player belongs to the account
        const playerWithAccount = await getPlayerById(source.id);
        if (playerWithAccount && playerWithAccount.accountId !== target.id) {
          warnings.push(`Player accountId (${playerWithAccount.accountId}) does not match target account ID (${target.id})`);
        }
        break;

      case 'CHARACTER_ACCOUNT':
        // Validate that character belongs to the account
        const characterWithAccount = await getCharacterById(source.id);
        if (characterWithAccount && characterWithAccount.accountId !== target.id) {
          warnings.push(`Character accountId (${characterWithAccount.accountId}) does not match target account ID (${target.id})`);
        }
        break;

      // Add more business rule validations as needed
      default:
        // No specific business rules for this link type
        break;
    }

    return {
      isValid: true,
      warnings: warnings.length > 0 ? warnings : undefined
    };

  } catch (error) {
    return {
      isValid: false,
      reason: `Business rules validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
