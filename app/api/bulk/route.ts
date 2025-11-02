// app/api/bulk/route.ts
// Unified bulk operation endpoint for all core entities
// KV-only implementation - no server→server HTTP anti-pattern

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { EntityType, SaleStatus, SiteStatus } from '@/types/enums';
import {
  getAllItems, upsertItem, removeItem,
  getAllTasks, upsertTask, removeTask,
  getAllSales, upsertSale, removeSale,
  getAllFinancials, upsertFinancial, removeFinancial,
  getAllCharacters, upsertCharacter, removeCharacter,
  getAllPlayers, upsertPlayer, removePlayer,
  getAllSites, upsertSite, removeSite
} from '@/data-store/datastore';
import { getBusinessKey } from '@/lib/utils/business-keys';
import { appendBulkOperationLog } from '@/workflows/entities-logging';
import { validateEntities } from '@/lib/utils/entity-validation';
import type { Item, Task, Sale, FinancialRecord, Character, Player, Site } from '@/types/entities';

export const dynamic = 'force-dynamic';
// Increased timeout for large bulk operations (CSV imports, seed data)
export const maxDuration = 300; // 5 minutes

// Phase 2: All core entities, all modes
const SUPPORTED_ENTITY_TYPES = [
  EntityType.ITEM,
  EntityType.TASK,
  EntityType.SALE,
  EntityType.FINANCIAL,
  EntityType.CHARACTER,
  EntityType.PLAYER,
  EntityType.SITE
];
const SUPPORTED_MODES = ['add-only', 'merge', 'replace'] as const;

const BATCH_SIZE = 50;

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { entityType, mode, source, records } = body;

    // Validate required fields
    if (!entityType || !mode || !source || !Array.isArray(records)) {
      return NextResponse.json(
        { error: 'Missing required fields: entityType, mode, source, records' },
        { status: 400 }
      );
    }

    // Validate entityType
    if (!SUPPORTED_ENTITY_TYPES.includes(entityType as EntityType)) {
      return NextResponse.json(
        { error: `Unsupported entityType. Supported: ${SUPPORTED_ENTITY_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate mode
    if (!SUPPORTED_MODES.includes(mode)) {
      return NextResponse.json(
        { error: `Unsupported mode. Supported modes: ${SUPPORTED_MODES.join(', ')}` },
        { status: 400 }
      );
    }

    // Route to appropriate handler based on entity type and mode
    switch (entityType) {
      case EntityType.ITEM:
        if (mode === 'add-only') return await handleItemsAddOnly(records, source);
        if (mode === 'merge') return await handleItemsMerge(records, source);
        if (mode === 'replace') return await handleItemsReplace(records, source);
        break;
      case EntityType.TASK:
        if (mode === 'add-only') return await handleTasksAddOnly(records, source);
        if (mode === 'merge') return await handleTasksMerge(records, source);
        if (mode === 'replace') return await handleTasksReplace(records, source);
        break;
      case EntityType.SALE:
        if (mode === 'add-only') return await handleSalesAddOnly(records, source);
        if (mode === 'merge') return await handleSalesMerge(records, source);
        if (mode === 'replace') return await handleSalesReplace(records, source);
        break;
      case EntityType.FINANCIAL:
        if (mode === 'add-only') return await handleFinancialsAddOnly(records, source);
        if (mode === 'merge') return await handleFinancialsMerge(records, source);
        if (mode === 'replace') return await handleFinancialsReplace(records, source);
        break;
      case EntityType.CHARACTER:
        if (mode === 'add-only') return await handleCharactersAddOnly(records, source);
        if (mode === 'merge') return await handleCharactersMerge(records, source);
        if (mode === 'replace') return await handleCharactersReplace(records, source);
        break;
      case EntityType.PLAYER:
        if (mode === 'add-only') return await handlePlayersAddOnly(records, source);
        if (mode === 'merge') return await handlePlayersMerge(records, source);
        if (mode === 'replace') return await handlePlayersReplace(records, source);
        break;
      case EntityType.SITE:
        if (mode === 'add-only') return await handleSitesAddOnly(records, source);
        if (mode === 'merge') return await handleSitesMerge(records, source);
        if (mode === 'replace') return await handleSitesReplace(records, source);
        break;
    }

    return NextResponse.json(
      { error: 'Unsupported entityType/mode combination' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Bulk API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// Generic bulk operation handler - reduces code duplication
async function handleBulkOperation<T>(
  entityType: EntityType,
  mode: 'add-only' | 'merge' | 'replace',
  records: any[],
  source: string,
  getAllFn: () => Promise<T[]>,
  upsertFn: (entity: T, options?: { skipWorkflowEffects?: boolean }) => Promise<T>,
  removeFn: (id: string) => Promise<void>
): Promise<NextResponse> {
  const counts = {
    added: 0,
    updated: 0,
    skipped: 0,
    failed: 0
  };
  const errors: string[] = [];

  try {
    // Handle replace mode: delete all existing first
    if (mode === 'replace') {
      const existing = await getAllFn();
      for (const entity of existing) {
        try {
          await removeFn((entity as any).id);
        } catch (err) {
          console.error(`[Bulk API] Error deleting existing ${entityType}:`, err);
        }
      }
    }

    // Validate all records before processing
    console.log(`[Bulk API] Validating ${records.length} records for ${entityType}...`);
    const validation = validateEntities(entityType, records);
    
    // Report validation results
    if (validation.invalid.length > 0) {
      console.warn(`[Bulk API] ⚠️ ${validation.invalid.length} invalid records detected, will be skipped`);
      validation.invalid.forEach(inv => {
        console.warn(`[Bulk API] Row ${inv.index}: ${inv.errors.join('; ')}`);
      });
    }
    
    if (validation.fixed.length > 0) {
      console.log(`[Bulk API] ✅ ${validation.fixed.length} records normalized/fixed`);
    }
    
    // Use validated and fixed records for processing
    const recordsToProcess = validation.valid;
    
    // Add validation errors to error list
    validation.invalid.forEach(inv => {
      const errorMsg = `Row ${inv.index}: ${inv.errors.join('; ')}${inv.warnings.length > 0 ? ` (Warnings: ${inv.warnings.join(', ')})` : ''}`;
      errors.push(errorMsg);
      counts.failed++;
    });

    // Load existing entities and map by business key (for add-only and merge modes)
    const existingByKey = new Map<string, T>();
    if (mode !== 'replace') {
      const existing = await getAllFn();
      existing.forEach(entity => {
        try {
          const key = getBusinessKey(entityType, entity);
          existingByKey.set(key, entity);
        } catch (err) {
          console.warn(`[Bulk API] Failed to generate business key for existing ${entityType}:`, (entity as any).id);
        }
      });
    }

    // Process records in batches
    const seenThisBatch = new Set<string>();
    
    for (let batchStart = 0; batchStart < recordsToProcess.length; batchStart += BATCH_SIZE) {
      const batch = recordsToProcess.slice(batchStart, batchStart + BATCH_SIZE);
      
      for (let i = 0; i < batch.length; i++) {
        const record = batch[i];
        const recordIndex = batchStart + i;

        // Skip null/undefined records
        if (!record) {
          console.warn(`[Bulk API] Skipping null/undefined record at index ${recordIndex}`);
          counts.failed++;
          continue;
        }

        try {
          // Generate ID if missing
          if (!record.id) {
            record.id = `imported-${Date.now()}-${recordIndex}`;
          }

          // Set safe default statuses to avoid side effects during bulk load
          if (!record.status) {
            switch (entityType) {
              case EntityType.TASK:
                // Tasks: default to "Created" to avoid triggering item/financial creation
                record.status = 'Created';
                break;
              case EntityType.SALE:
                // Sales: default to "PENDING" with safe payment flags to avoid points/lines processing
                record.status = SaleStatus.PENDING;
                if (record.isNotPaid === undefined) record.isNotPaid = true;
                if (record.isNotCharged === undefined) record.isNotCharged = true;
                break;
              case EntityType.FINANCIAL:
                // Financials: default to "Created" with safe payment flags
                record.status = record.status || 'Created';
                if (record.isNotPaid === undefined) record.isNotPaid = true;
                if (record.isNotCharged === undefined) record.isNotCharged = true;
                break;
              case EntityType.SITE:
                // Sites: default to "Active" (sites start as Active, not Created)
                record.status = record.status || SiteStatus.ACTIVE;
                break;
              // Items, Characters, Players: any status is safe (no side effects)
            }
          } else {
            // Even if status is provided, ensure safe payment flags for Sales and Financials
            if (entityType === EntityType.SALE) {
              if (record.isNotPaid === undefined) record.isNotPaid = true;
              if (record.isNotCharged === undefined) record.isNotCharged = true;
            } else if (entityType === EntityType.FINANCIAL) {
              if (record.isNotPaid === undefined) record.isNotPaid = true;
              if (record.isNotCharged === undefined) record.isNotCharged = true;
            }
          }

          // Generate business key
          const businessKey = getBusinessKey(entityType, record);

          // Check for duplicates within batch (last-wins)
          if (seenThisBatch.has(businessKey)) {
            counts.skipped++;
            continue;
          }
          seenThisBatch.add(businessKey);

          const existing = existingByKey.get(businessKey);

          if (mode === 'add-only') {
            // Skip if exists
            if (existing) {
              counts.skipped++;
              continue;
            }
            // Add new - ALWAYS skip workflow effects during bulk operations (no individual CREATED logs)
            await upsertFn(record as T, { skipWorkflowEffects: true });
            counts.added++;
            existingByKey.set(businessKey, record as T);
          } else if (mode === 'merge') {
            // Update if exists, add if new - ALWAYS skip workflow effects during bulk operations
            if (existing) {
              // Preserve identity fields: id, createdAt, links
              const merged: T = {
                ...existing,
                ...record,
                id: (existing as any).id,
                createdAt: (existing as any).createdAt,
                links: (existing as any).links || [],
                updatedAt: new Date()
              } as T;
              await upsertFn(merged, { skipWorkflowEffects: true });
              counts.updated++;
              existingByKey.set(businessKey, merged);
            } else {
              await upsertFn(record as T, { skipWorkflowEffects: true });
              counts.added++;
              existingByKey.set(businessKey, record as T);
            }
          } else if (mode === 'replace') {
            // Just add (replace mode already deleted everything) - ALWAYS skip workflow effects during bulk operations
            await upsertFn(record as T, { skipWorkflowEffects: true });
            counts.added++;
          }
        } catch (error) {
          counts.failed++;
          const errorMsg = `Row ${recordIndex + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`[Bulk API] Error processing record ${recordIndex + 1}:`, error);
        }
      }
    }

    // Log bulk operation
    const totalProcessed = counts.added + counts.updated + counts.skipped + counts.failed;
    const importMode = mode === 'add-only' ? 'add' : mode === 'merge' ? 'merge' : 'replace';
    await appendBulkOperationLog(entityType, 'import', {
      count: totalProcessed,
      source,
      importMode,
      extra: {
        added: counts.added,
        updated: counts.updated,
        skipped: counts.skipped,
        failed: counts.failed,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined
      }
    });

    // Return response
    const success = counts.failed === 0;
    return NextResponse.json({
      success,
      mode,
      counts: {
        added: counts.added,
        updated: counts.updated,
        skipped: counts.skipped
      },
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error(`[Bulk API] Fatal error in handleBulkOperation for ${entityType}:`, error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Fatal error during bulk operation',
        mode,
        counts: {
          added: counts.added,
          updated: counts.updated,
          skipped: counts.skipped
        },
        errors
      },
      { status: 500 }
    );
  }
}

// Entity-specific handler wrappers using generic handler
async function handleItemsAddOnly(records: any[], source: string): Promise<NextResponse> {
  return handleBulkOperation(EntityType.ITEM, 'add-only', records, source, getAllItems, upsertItem, removeItem);
}

async function handleItemsMerge(records: any[], source: string): Promise<NextResponse> {
  return handleBulkOperation(EntityType.ITEM, 'merge', records, source, getAllItems, upsertItem, removeItem);
}

async function handleItemsReplace(records: any[], source: string): Promise<NextResponse> {
  return handleBulkOperation(EntityType.ITEM, 'replace', records, source, getAllItems, upsertItem, removeItem);
}

async function handleTasksAddOnly(records: any[], source: string): Promise<NextResponse> {
  return handleBulkOperation(EntityType.TASK, 'add-only', records, source, getAllTasks, upsertTask, removeTask);
}

async function handleTasksMerge(records: any[], source: string): Promise<NextResponse> {
  return handleBulkOperation(EntityType.TASK, 'merge', records, source, getAllTasks, upsertTask, removeTask);
}

async function handleTasksReplace(records: any[], source: string): Promise<NextResponse> {
  return handleBulkOperation(EntityType.TASK, 'replace', records, source, getAllTasks, upsertTask, removeTask);
}

async function handleSalesAddOnly(records: any[], source: string): Promise<NextResponse> {
  return handleBulkOperation(EntityType.SALE, 'add-only', records, source, getAllSales, upsertSale, removeSale);
}

async function handleSalesMerge(records: any[], source: string): Promise<NextResponse> {
  return handleBulkOperation(EntityType.SALE, 'merge', records, source, getAllSales, upsertSale, removeSale);
}

async function handleSalesReplace(records: any[], source: string): Promise<NextResponse> {
  return handleBulkOperation(EntityType.SALE, 'replace', records, source, getAllSales, upsertSale, removeSale);
}

async function handleFinancialsAddOnly(records: any[], source: string): Promise<NextResponse> {
  return handleBulkOperation(EntityType.FINANCIAL, 'add-only', records, source, getAllFinancials, upsertFinancial, removeFinancial);
}

async function handleFinancialsMerge(records: any[], source: string): Promise<NextResponse> {
  return handleBulkOperation(EntityType.FINANCIAL, 'merge', records, source, getAllFinancials, upsertFinancial, removeFinancial);
}

async function handleFinancialsReplace(records: any[], source: string): Promise<NextResponse> {
  return handleBulkOperation(EntityType.FINANCIAL, 'replace', records, source, getAllFinancials, upsertFinancial, removeFinancial);
}

async function handleCharactersAddOnly(records: any[], source: string): Promise<NextResponse> {
  return handleBulkOperation(EntityType.CHARACTER, 'add-only', records, source, getAllCharacters, upsertCharacter, removeCharacter);
}

async function handleCharactersMerge(records: any[], source: string): Promise<NextResponse> {
  return handleBulkOperation(EntityType.CHARACTER, 'merge', records, source, getAllCharacters, upsertCharacter, removeCharacter);
}

async function handleCharactersReplace(records: any[], source: string): Promise<NextResponse> {
  return handleBulkOperation(EntityType.CHARACTER, 'replace', records, source, getAllCharacters, upsertCharacter, removeCharacter);
}

async function handlePlayersAddOnly(records: any[], source: string): Promise<NextResponse> {
  return handleBulkOperation(EntityType.PLAYER, 'add-only', records, source, getAllPlayers, upsertPlayer, removePlayer);
}

async function handlePlayersMerge(records: any[], source: string): Promise<NextResponse> {
  return handleBulkOperation(EntityType.PLAYER, 'merge', records, source, getAllPlayers, upsertPlayer, removePlayer);
}

async function handlePlayersReplace(records: any[], source: string): Promise<NextResponse> {
  return handleBulkOperation(EntityType.PLAYER, 'replace', records, source, getAllPlayers, upsertPlayer, removePlayer);
}

async function handleSitesAddOnly(records: any[], source: string): Promise<NextResponse> {
  return handleBulkOperation(EntityType.SITE, 'add-only', records, source, getAllSites, upsertSite, removeSite);
}

async function handleSitesMerge(records: any[], source: string): Promise<NextResponse> {
  return handleBulkOperation(EntityType.SITE, 'merge', records, source, getAllSites, upsertSite, removeSite);
}

async function handleSitesReplace(records: any[], source: string): Promise<NextResponse> {
  return handleBulkOperation(EntityType.SITE, 'replace', records, source, getAllSites, upsertSite, removeSite);
}

