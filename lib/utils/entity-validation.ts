// lib/utils/entity-validation.ts
// Validation utilities for entity records before bulk operations
// Prevents corrupt data from entering the system

import { EntityType } from '@/types/enums';
import type { Site, Item, Task, Sale, FinancialRecord, Character, Player } from '@/types/entities';
import { SiteType } from '@/types/enums';

/**
 * Validation result for a single record
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  fixed?: any; // Optional: fixed/normalized record
}

/**
 * Validate a Site record
 */
export function validateSite(site: any, index: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let fixed: any = { ...site };

  // Required fields
  if (!site.name || typeof site.name !== 'string' || site.name.trim() === '') {
    errors.push(`Missing or invalid 'name' field`);
  }

  if (!site.metadata) {
    errors.push(`Missing 'metadata' field`);
    return { valid: false, errors, warnings };
  }

  // Validate metadata.type - STRICT: only accept valid enum values
  const type = site.metadata.type;
  if (!type) {
    errors.push(`Missing 'metadata.type' field`);
    return { valid: false, errors, warnings };
  }

  // Check if type matches valid SiteType enum values
  if (!Object.values(SiteType).includes(type as SiteType)) {
    errors.push(`Invalid 'metadata.type': '${type}'. Must be one of: ${Object.values(SiteType).join(', ')}`);
    return { valid: false, errors, warnings };
  }

  // Validate type-specific metadata
  
  if (type === SiteType.PHYSICAL) {
    if (!site.metadata.businessType) {
      errors.push(`Physical sites require 'metadata.businessType' field`);
    }
    if (!site.metadata.settlementId) {
      warnings.push(`Physical site missing 'metadata.settlementId' (recommended)`);
    }
  } else if (type === SiteType.DIGITAL) {
    if (!site.metadata.digitalType) {
      errors.push(`Digital sites require 'metadata.digitalType' field`);
    }
  } else if (type === SiteType.SYSTEM) {
    // STRICT: Only accept the exact field name 'systemType'
    if (!site.metadata.systemType) {
      errors.push(`System sites require 'metadata.systemType' field`);
    }
  }

  // Ensure required base fields
  if (typeof site.isActive !== 'boolean') {
    warnings.push(`Missing 'isActive' field, defaulting to true`);
    fixed.isActive = true;
  }

  if (!site.status) {
    warnings.push(`Missing 'status' field, defaulting to 'Created'`);
    fixed.status = 'Created';
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    fixed: errors.length === 0 ? fixed : undefined
  };
}

/**
 * Validate a record based on entity type
 */
export function validateEntity(entityType: EntityType, record: any, index: number): ValidationResult {
  switch (entityType) {
    case EntityType.SITE:
      return validateSite(record, index);
    
    case EntityType.ITEM:
    case EntityType.TASK:
    case EntityType.SALE:
    case EntityType.FINANCIAL:
    case EntityType.CHARACTER:
    case EntityType.PLAYER:
      // TODO: Add validation for other entity types as needed
      // For now, basic validation
      return {
        valid: true,
        errors: [],
        warnings: [],
        fixed: record
      };
    
    default:
      return {
        valid: true,
        errors: [],
        warnings: [],
        fixed: record
      };
  }
}

/**
 * Validate multiple records and return results
 */
export function validateEntities(
  entityType: EntityType,
  records: any[]
): {
  valid: any[];
  invalid: Array<{ index: number; record: any; errors: string[]; warnings: string[] }>;
  fixed: any[];
} {
  const valid: any[] = [];
  const invalid: Array<{ index: number; record: any; errors: string[]; warnings: string[] }> = [];
  const fixed: any[] = [];

  records.forEach((record, index) => {
    if (!record) {
      invalid.push({
        index,
        record: null,
        errors: ['Record is null or undefined'],
        warnings: []
      });
      return;
    }

    const validation = validateEntity(entityType, record, index);
    
    if (validation.valid) {
      if (validation.fixed && validation.fixed !== record) {
        // Record was normalized/fixed
        fixed.push(validation.fixed);
        valid.push(validation.fixed);
      } else {
        valid.push(record);
      }
    } else {
      invalid.push({
        index: index + 1, // 1-indexed for user-friendly error messages
        record,
        errors: validation.errors,
        warnings: validation.warnings
      });
    }
  });

  return { valid, invalid, fixed };
}

