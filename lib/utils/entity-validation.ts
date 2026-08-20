// lib/utils/entity-validation.ts
// Validation utilities for entity records before bulk operations
// Prevents corrupt data from entering the system

import { EntityType, SiteType, SiteStatus } from '@/types/enums';
import type { Site, Item, Task, Sale, FinancialRecord, Character, Player } from '@/types/entities';

/**
 * Validation result for a single record
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  fixed?: unknown; // Optional: fixed/normalized record
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

  const legacyMetadata = site.metadata;
  const type = site.type ?? legacyMetadata?.type;
  const subtype = site.subtype ?? legacyMetadata?.businessType ?? legacyMetadata?.digitalType ?? legacyMetadata?.systemType;
  if (!type) {
    errors.push(`Missing 'type' field`);
    return { valid: false, errors, warnings };
  }

  // Check if type matches valid SiteType enum values
  if (!Object.values(SiteType).includes(type as SiteType)) {
    errors.push(`Invalid 'type': '${type}'. Must be one of: ${Object.values(SiteType).join(', ')}`);
    return { valid: false, errors, warnings };
  }

  // Validate type-specific root subtype/fields

  if (type === SiteType.PHYSICAL) {
    if (!subtype) {
      errors.push(`Physical sites require 'subtype' field`);
    }
    if (!(site.settlementId ?? legacyMetadata?.settlementId)) {
      warnings.push(`Physical site missing 'settlementId' (recommended)`);
    }
  } else if (type === SiteType.DIGITAL_SITE) {
    if (!subtype) {
      errors.push(`Digital sites require 'subtype' field`);
    }
  } else if (type === SiteType.SYSTEM) {
    if (!subtype) {
      errors.push(`System sites require 'subtype' field`);
    }
  }

  // Ensure required status field - Sites start as Active
  if (!site.status || !Object.values(SiteStatus).includes(site.status as SiteStatus)) {
    warnings.push(`Missing or invalid 'status' field, defaulting to 'Active'`);
    fixed.status = SiteStatus.ACTIVE;
  }

  // Remove isActive and isArchived fields if present (migrated to status)
  if ('isActive' in fixed) {
    delete fixed.isActive;
  }
  if ('isArchived' in fixed) {
    delete fixed.isArchived;
  }

  // Legacy nested metadata is an input compatibility shape only. New writes
  // normalize it at the datastore boundary and do not persist it.
  delete fixed.metadata;
  fixed.type = fixed.type ?? legacyMetadata?.type;
  fixed.subtype = fixed.subtype ?? legacyMetadata?.businessType ?? legacyMetadata?.digitalType ?? legacyMetadata?.systemType;
  fixed.settlementId = fixed.settlementId ?? legacyMetadata?.settlementId;
  fixed.googleMapsAddress = fixed.googleMapsAddress ?? legacyMetadata?.googleMapsAddress;
  fixed.coordinates = fixed.coordinates ?? legacyMetadata?.coordinates;
  fixed.url = fixed.url ?? legacyMetadata?.url;

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
export function validateEntity(entityType: EntityType, record: Partial<Site | Item | Task | Sale | FinancialRecord | Character | Player>, index: number): ValidationResult {
  switch (entityType) {
    case EntityType.SITE:
      return validateSite(record as Partial<Site>, index);

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
  records: Array<Partial<Site | Item | Task | Sale | FinancialRecord | Character | Player>>
): {
  valid: Array<Partial<Site | Item | Task | Sale | FinancialRecord | Character | Player>>;
  invalid: Array<{ index: number; record: Partial<Site | Item | Task | Sale | FinancialRecord | Character | Player> | null; errors: string[]; warnings: string[] }>;
  fixed: Array<Partial<Site | Item | Task | Sale | FinancialRecord | Character | Player>>;
} {
  const valid: Array<Partial<Site | Item | Task | Sale | FinancialRecord | Character | Player>> = [];
  const invalid: Array<{ index: number; record: Partial<Site | Item | Task | Sale | FinancialRecord | Character | Player> | null; errors: string[]; warnings: string[] }> = [];
  const fixed: Array<Partial<Site | Item | Task | Sale | FinancialRecord | Character | Player>> = [];

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

