// workflows/settings/import-data-workflow.ts
// Import Data Workflow for KV-only architecture

import { kv, kvScan, kvGet, kvMSet, kvSAdd, kvDel, kvLPush, kvDelMany } from '@/data-store/kv';
import { getUTCNow } from '@/lib/utils/utc-utils';
import { buildDataKey, buildIndexKey, buildLogKey, buildLogMonthKey, buildLogMonthsIndexKey } from '@/data-store/keys';
import { getMonthKeyFromTimestamp } from '../entities-logging';
import { EntityType } from '@/types/enums';
import {
  upsertItem,
  upsertTask,
  upsertSale,
  upsertFinancial,
  upsertCharacter,
  upsertPlayer,
  upsertSite
} from '@/data-store/datastore';

// Centralized list of entity types for import operations
const IMPORTABLE_ENTITY_TYPES = [
  EntityType.TASK,
  EntityType.ITEM,
  EntityType.SALE,
  EntityType.FINANCIAL,
  EntityType.CHARACTER,
  EntityType.PLAYER,
  EntityType.SITE
];

export interface SettingsResult {
  success: boolean;
  message: string;
  data?: {
    results: string[];
    errors: string[];
    operation: string;
    environment: string;
    requiresClientExecution?: boolean;
    progress?: {
      current: number;
      total: number;
      percentage: number;
    };
  };
}

export interface ProgressCallback {
  (current: number, total: number, message: string): void;
}

export class ImportDataWorkflow {
  
  /**
    * Execute import data operation with timeout and progress tracking
    */
   static async execute(importData: any, progressCallback?: ProgressCallback): Promise<SettingsResult> {
     try {
       console.log('[ImportDataWorkflow] 📥 Starting import data operation...');

       const isKV = Boolean(process.env.UPSTASH_REDIS_REST_URL);
       const isServer = typeof window === 'undefined';
       const results: string[] = [];
       const errors: string[] = [];

       console.log(`[ImportDataWorkflow] 🌍 Environment: ${isKV ? 'KV (Production)' : 'Local (Development)'}`);
       console.log(`[ImportDataWorkflow] 🖥️ Context: ${isServer ? 'Server' : 'Client'}`);
      
      // For local environment, we need to run on client side
      if (!isKV && isServer) {
        console.log(`[ImportDataWorkflow] ⚠️ Local environment detected on server - returning instruction for client-side execution`);
        return {
          success: true,
          message: 'Import data requires client-side execution for local environment',
          data: {
            results: ['Client-side import data required for local environment'],
            errors: [],
            operation: 'import-data',
            environment: 'local',
            requiresClientExecution: true
          }
        };
      }

      const startTime = Date.now();
      const TIMEOUT_MS = 4 * 60 * 1000; // 4 minutes (leaving 1 minute buffer for API timeout)
      const totalOperations = IMPORTABLE_ENTITY_TYPES.length + 3; // entities + settlements + links + logs

      // Validate import data
      if (!this.validateImportData(importData, errors)) {
        return {
          success: false,
          message: 'Invalid import data format',
          data: {
            results: [],
            errors,
            operation: 'import-data',
            environment: isKV ? 'kv' : 'local'
          }
        };
      }

      // Import all data with timeout and progress tracking
       try {
         await this.importAllData(importData, results, errors, progressCallback);
       } catch (error) {
         if (error instanceof Error && error.message.includes('timeout')) {
           console.error('[ImportDataWorkflow] ⏰ Operation timeout - attempting graceful shutdown');
           return {
             success: false,
             message: `Import operation timed out: ${error.message}`,
             data: {
               results,
               errors: [...errors, `TIMEOUT: ${error.message}`],
               operation: 'import-data',
               environment: isKV ? 'kv' : 'local',
               progress: {
                 current: Math.max(results.length, errors.length),
                 total: totalOperations,
                 percentage: Math.round((Math.max(results.length, errors.length) / totalOperations) * 100)
               }
             }
           };
         }
         throw error; // Re-throw non-timeout errors
       }
      
      const success = errors.length === 0;
      const message = success 
        ? `Successfully imported data - ${results.length} operations completed`
        : `Import data completed with ${errors.length} errors - ${results.length} operations completed`;
      
      console.log(`[ImportDataWorkflow] ✅ Import data operation completed in ${Date.now() - startTime}ms: ${message}`);

      return {
        success,
        message,
        data: {
          results,
          errors,
          operation: 'import-data',
          environment: isKV ? 'kv' : 'local',
          progress: {
            current: totalOperations,
            total: totalOperations,
            percentage: 100
          }
        }
      };
      
    } catch (error) {
      console.error('[ImportDataWorkflow] ❌ Import data operation failed:', error);
      return {
        success: false,
        message: `Import data operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: {
          results: [],
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          operation: 'import-data',
          environment: 'unknown'
        }
      };
    }
  }
  
  /**
   * Validate import data format
   */
  private static validateImportData(importData: any, errors: string[]): boolean {
    try {
      if (!importData || typeof importData !== 'object') {
        errors.push('Import data must be an object');
        return false;
      }
      
      if (!importData.entities || typeof importData.entities !== 'object') {
        errors.push('Import data must have entities property');
        return false;
      }
      
      for (const entityType of IMPORTABLE_ENTITY_TYPES) {
        if (!Array.isArray(importData.entities[entityType])) {
          errors.push(`Import data must have ${entityType} as an array`);
          return false;
        }
      }
      
      if (!Array.isArray(importData.links)) {
        errors.push('Import data must have links as an array');
        return false;
      }
      
      if (!importData.logs || typeof importData.logs !== 'object') {
        errors.push('Import data must have logs property');
        return false;
      }
      
      // Settlements are optional reference data
      if (importData.settlements && !Array.isArray(importData.settlements)) {
        errors.push('Import data settlements must be an array if present');
        return false;
      }
      
      return true;
    } catch (error) {
      errors.push(`Failed to validate import data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }
  
  /**
   * Import all data with timeout and progress tracking
   */
  private static async importAllData(importData: any, results: string[], errors: string[], progressCallback?: ProgressCallback): Promise<void> {
    try {
      console.log('[ImportDataWorkflow] 📥 Importing all data...');

      const startTime = Date.now();
      const TIMEOUT_MS = 4 * 60 * 1000; // 4 minutes (leaving 1 minute buffer for API timeout)
      let importedEntityTypes = 0;
      const totalOperations = IMPORTABLE_ENTITY_TYPES.length + 3; // entities + settlements + links + logs
      let currentOperation = 0;

      // Helper function to check timeout and report progress
      const checkTimeoutAndProgress = (operation: string) => {
        currentOperation++;
        const elapsed = Date.now() - startTime;
        if (elapsed > TIMEOUT_MS) {
          throw new Error(`Operation timeout after ${elapsed}ms during: ${operation}`);
        }
        if (progressCallback) {
          const progress = Math.round((currentOperation / totalOperations) * 100);
          progressCallback(currentOperation, totalOperations, `Processing: ${operation}`);
        }
      };

      // Import all entity types
      for (const entityType of IMPORTABLE_ENTITY_TYPES) {
        try {
          checkTimeoutAndProgress(`Importing ${entityType} entities`);
          await this.importEntityType(entityType, importData.entities[entityType], results, errors);
          importedEntityTypes++;
        } catch (error) {
          if (error instanceof Error && error.message.includes('timeout')) {
            throw error; // Re-throw timeout errors
          }
          const errorMsg = `Failed to import ${entityType}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`[ImportDataWorkflow] ❌ ${errorMsg}`);
        }
      }

      // Import settlements as reference data (if present)
      if (importData.settlements && Array.isArray(importData.settlements)) {
        try {
          checkTimeoutAndProgress('Importing settlements');
          await this.importSettlements(importData.settlements, results, errors);
        } catch (error) {
          if (error instanceof Error && error.message.includes('timeout')) {
            throw error; // Re-throw timeout errors
          }
          const errorMsg = `Failed to import settlements: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`[ImportDataWorkflow] ❌ ${errorMsg}`);
        }
      } else {
        currentOperation++; // Count as completed even if skipped
      }

      // Import links
      try {
        checkTimeoutAndProgress('Importing links');
        await this.importLinks(importData.links, results, errors);
      } catch (error) {
        if (error instanceof Error && error.message.includes('timeout')) {
          throw error; // Re-throw timeout errors
        }
        const errorMsg = `Failed to import links: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(`[ImportDataWorkflow] ❌ ${errorMsg}`);
      }

      // Import logs
      try {
        checkTimeoutAndProgress('Importing logs');
        await this.importLogs(importData.logs, results, errors);
      } catch (error) {
        if (error instanceof Error && error.message.includes('timeout')) {
          throw error; // Re-throw timeout errors
        }
        const errorMsg = `Failed to import logs: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(`[ImportDataWorkflow] ❌ ${errorMsg}`);
      }

      results.push(`Imported data for ${importedEntityTypes} entity types`);
      console.log(`[ImportDataWorkflow] ✅ Imported all data in ${Date.now() - startTime}ms`);

    } catch (error) {
      const errorMsg = `Failed to import all data: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[ImportDataWorkflow] ❌ ${errorMsg}`);
    }
  }
  
  /**
   * Import specific entity type with batch processing
   */
  private static async importEntityType(entityType: string, entities: any[], results: string[], errors: string[]): Promise<void> {
    try {
      if (!entities || entities.length === 0) {
        results.push(`No ${entityType} entities to import`);
        return;
      }

      console.log(`[ImportDataWorkflow] 📥 Processing ${entities.length} ${entityType} entities...`);

      // Clear existing entities for this type
      const indexKey = buildIndexKey(entityType);
      const existingIds = await kv.smembers(indexKey);

      if (existingIds.length > 0) {
        const dataKeys = existingIds.map(id => buildDataKey(entityType, id));
        await kvDelMany(dataKeys);
        await kv.del(indexKey);
        results.push(`Cleared ${existingIds.length} existing ${entityType} entities`);
      }

      // Filter out entities without IDs and prepare batch operations
      const validEntities = entities.filter(entity => entity && entity.id);
      const invalidCount = entities.length - validEntities.length;

      if (invalidCount > 0) {
        console.warn(`[ImportDataWorkflow] ⚠️ Skipped ${invalidCount} ${entityType} entities without valid IDs`);
      }

      if (validEntities.length === 0) {
        results.push(`No valid ${entityType} entities to import`);
        return;
      }

      // Process entities using proper upsert functions to maintain all indexes
      let importedCount = 0;

      for (const entity of validEntities) {
        try {
          // Parse dates if they exist
          if (entity.createdAt && typeof entity.createdAt === 'string') {
            entity.createdAt = new Date(entity.createdAt);
          }
          if (entity.updatedAt && typeof entity.updatedAt === 'string') {
            entity.updatedAt = new Date(entity.updatedAt);
          }
          if (entity.lastRestockDate && typeof entity.lastRestockDate === 'string') {
            entity.lastRestockDate = new Date(entity.lastRestockDate);
          }

          // Route to appropriate datastore function based on entity type
          // This ensures all indexes are maintained (type indexes, sourceTaskId indexes, etc.)
          switch (entityType) {
            case EntityType.ITEM:
              await upsertItem(entity, { skipWorkflowEffects: true, skipLinkEffects: true });
              importedCount++;
              break;
            case EntityType.TASK:
              await upsertTask(entity, { skipWorkflowEffects: true, skipLinkEffects: true });
              importedCount++;
              break;
            case EntityType.SALE:
              await upsertSale(entity, { skipWorkflowEffects: true, skipLinkEffects: true });
              importedCount++;
              break;
            case EntityType.FINANCIAL:
              await upsertFinancial(entity, { skipWorkflowEffects: true, skipLinkEffects: true });
              importedCount++;
              break;
            case EntityType.CHARACTER:
              await upsertCharacter(entity, { skipWorkflowEffects: true, skipLinkEffects: true });
              importedCount++;
              break;
            case EntityType.PLAYER:
              await upsertPlayer(entity, { skipWorkflowEffects: true, skipLinkEffects: true });
              importedCount++;
              break;
            case EntityType.SITE:
              await upsertSite(entity, { skipWorkflowEffects: true });
              importedCount++;
              break;
            default:
              console.warn(`[ImportDataWorkflow] ⚠️ Unknown entity type: ${entityType}, skipping`);
          }
        } catch (error) {
          const errorMsg = `Failed to import ${entityType} ${entity.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`[ImportDataWorkflow] ❌ ${errorMsg}`);
        }
      }

      results.push(`Imported ${importedCount} ${entityType} entities`);
      console.log(`[ImportDataWorkflow] ✅ Imported ${importedCount} ${entityType} entities`);

    } catch (error) {
      const errorMsg = `Failed to import ${entityType}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[ImportDataWorkflow] ❌ ${errorMsg}`);
    }
  }
  
  /**
   * Import links with batch processing
   */
  private static async importLinks(links: any[], results: string[], errors: string[]): Promise<void> {
    try {
      if (!links || links.length === 0) {
        results.push('No links to import');
        return;
      }

      console.log(`[ImportDataWorkflow] 🔗 Processing ${links.length} links...`);

      // Clear existing links
      const linksIndexKey = buildIndexKey('links');
      const existingLinkIds = await kv.smembers(linksIndexKey);

      if (existingLinkIds.length > 0) {
        const linkKeys = existingLinkIds.map(id => `links:link:${id}`);
        await kvDelMany(linkKeys);
        await kv.del(linksIndexKey);
        results.push(`Cleared ${existingLinkIds.length} existing links`);
      }

      // Filter out links without IDs
      const validLinks = links.filter(link => link && link.id);
      const invalidCount = links.length - validLinks.length;

      if (invalidCount > 0) {
        console.warn(`[ImportDataWorkflow] ⚠️ Skipped ${invalidCount} links without valid IDs`);
      }

      if (validLinks.length === 0) {
        results.push('No valid links to import');
        return;
      }

      // Batch import links in chunks
      const BATCH_SIZE = 50;
      let importedCount = 0;
      const totalBatches = Math.ceil(validLinks.length / BATCH_SIZE);

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const startIndex = batchIndex * BATCH_SIZE;
        const endIndex = Math.min(startIndex + BATCH_SIZE, validLinks.length);
        const batch = validLinks.slice(startIndex, endIndex);

        console.log(`[ImportDataWorkflow] 🔄 Processing links batch ${batchIndex + 1}/${totalBatches} (${batch.length} links)`);

        try {
          // Prepare batch operations for this chunk
          const pipeline = kv.multi();

          for (const link of batch) {
            const linkKey = `links:link:${link.id}`;
            pipeline.set(linkKey, JSON.stringify(link));
          }

          // Add all link IDs to index in a single operation
          const linkIds = batch.map(link => link.id);
          pipeline.sadd(linksIndexKey, ...linkIds);

          // Execute batch
          await pipeline.exec();
          importedCount += batch.length;

          console.log(`[ImportDataWorkflow] ✅ Links batch ${batchIndex + 1}/${totalBatches} completed`);
        } catch (error) {
          console.error(`[ImportDataWorkflow] ❌ Links batch ${batchIndex + 1} failed:`, error);
          // Continue with next batch instead of failing completely
        }
      }

      results.push(`Imported ${importedCount} links in ${totalBatches} batches`);
      console.log(`[ImportDataWorkflow] ✅ Imported ${importedCount} links`);

    } catch (error) {
      const errorMsg = `Failed to import links: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[ImportDataWorkflow] ❌ ${errorMsg}`);
    }
  }
  
  /**
   * Import logs with batch processing
   */
  private static async importLogs(logs: any, results: string[], errors: string[]): Promise<void> {
    try {
      const logTypes = [...IMPORTABLE_ENTITY_TYPES, 'links']; // links is special case

      for (const logType of logTypes) {
        try {
          const logEntries = logs[logType] || [];

          if (logEntries.length === 0) {
            results.push(`No ${logType} log entries to import`);
            continue;
          }

          console.log(`[ImportDataWorkflow] 📝 Processing ${logEntries.length} ${logType} log entries...`);

          // 1. Clear Existing Logs (Legacy & Partitioned)
          if (logType === 'links') {
            await kv.del(buildLogKey('links'));
          } else {
            await kv.del(buildLogKey(logType)); // Legacy key
            
            const { getEntityLogMonths } = await import('../entities-logging');
            const months = await getEntityLogMonths(logType as EntityType);
            for (const m of months) {
              await kv.del(buildLogMonthKey(logType as EntityType, m));
            }
            await kv.del(buildLogMonthsIndexKey(logType as EntityType));
          }

          // 2. Group by Month and Batch Import
          if (logType === 'links') {
            const logKey = buildLogKey('links');
            for (const logEntry of logEntries) {
              await kv.lpush(logKey, JSON.stringify(logEntry));
            }
          } else {
            const byMonth = new Map<string, any[]>();
            for (const entry of logEntries) {
              const mkey = getMonthKeyFromTimestamp(entry.timestamp || entry.at || getUTCNow());
              if (!byMonth.has(mkey)) byMonth.set(mkey, []);
              byMonth.get(mkey)!.push(entry);
            }

            for (const [mkey, entries] of byMonth) {
              const listKey = buildLogMonthKey(logType as EntityType, mkey);
              const indexKey = buildLogMonthsIndexKey(logType as EntityType);
              
              const serialized = entries.map(e => JSON.stringify(e));
              // Note: LPUSH preserves newest-first if we push in the right order, 
              // but simple lpush loop is safest for now matching existing pattern.
              for (const s of serialized) {
                await kv.lpush(listKey, s);
              }
              await kv.sadd(indexKey, mkey);
            }
          }

          results.push(`Imported ${logEntries.length} ${logType} log entries`);
        } catch (error) {
          console.warn(`[ImportDataWorkflow] ⚠️ Failed to import ${logType} logs:`, error);
        }
      }

      console.log(`[ImportDataWorkflow] ✅ Imported logs for ${logTypes.length} log types`);

    } catch (error) {
      const errorMsg = `Failed to import logs: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[ImportDataWorkflow] ❌ ${errorMsg}`);
    }
  }

  /**
   * Import settlements as reference data with batch processing
   */
  private static async importSettlements(settlements: any[], results: string[], errors: string[]): Promise<void> {
    try {
      if (!settlements || settlements.length === 0) {
        results.push('No settlements to import');
        return;
      }

      console.log(`[ImportDataWorkflow] 🏘️ Processing ${settlements.length} settlements...`);

      // Clear existing settlements
      const settlementsIndexKey = buildIndexKey('settlements');
      const existingSettlementIds = await kv.smembers(settlementsIndexKey);

      if (existingSettlementIds.length > 0) {
        const dataKeys = existingSettlementIds.map(id => buildDataKey('settlements', id));
        await kvDelMany(dataKeys);
        await kv.del(settlementsIndexKey);
        results.push(`Cleared ${existingSettlementIds.length} existing settlements`);
      }

      // Filter out settlements without IDs
      const validSettlements = settlements.filter(settlement => settlement && settlement.id);
      const invalidCount = settlements.length - validSettlements.length;

      if (invalidCount > 0) {
        console.warn(`[ImportDataWorkflow] ⚠️ Skipped ${invalidCount} settlements without valid IDs`);
      }

      if (validSettlements.length === 0) {
        results.push('No valid settlements to import');
        return;
      }

      // Batch import settlements in chunks
      const BATCH_SIZE = 50;
      let importedCount = 0;
      const totalBatches = Math.ceil(validSettlements.length / BATCH_SIZE);

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const startIndex = batchIndex * BATCH_SIZE;
        const endIndex = Math.min(startIndex + BATCH_SIZE, validSettlements.length);
        const batch = validSettlements.slice(startIndex, endIndex);

        console.log(`[ImportDataWorkflow] 🔄 Processing settlements batch ${batchIndex + 1}/${totalBatches} (${batch.length} settlements)`);

        try {
          // Prepare batch operations for this chunk
          const pipeline = kv.multi();

          for (const settlement of batch) {
            const dataKey = buildDataKey('settlements', settlement.id);
            pipeline.set(dataKey, JSON.stringify(settlement));
          }

          // Add all settlement IDs to index in a single operation
          const settlementIds = batch.map(settlement => settlement.id);
          pipeline.sadd(settlementsIndexKey, ...settlementIds);

          // Execute batch
          await pipeline.exec();
          importedCount += batch.length;

          console.log(`[ImportDataWorkflow] ✅ Settlements batch ${batchIndex + 1}/${totalBatches} completed`);
        } catch (error) {
          console.error(`[ImportDataWorkflow] ❌ Settlements batch ${batchIndex + 1} failed:`, error);
          // Continue with next batch instead of failing completely
        }
      }

      results.push(`Imported ${importedCount} settlements as reference data in ${totalBatches} batches`);
      console.log(`[ImportDataWorkflow] ✅ Imported ${importedCount} settlements`);

    } catch (error) {
      const errorMsg = `Failed to import settlements: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[ImportDataWorkflow] ❌ ${errorMsg}`);
    }
  }
}
