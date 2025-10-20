// workflows/settings/import-data-workflow.ts
// Import Data Workflow for KV-only architecture

import { kv } from '@vercel/kv';
import { buildDataKey, buildIndexKey, buildLogKey } from '@/data-store/keys';
import { EntityType } from '@/types/enums';

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
  };
}

export class ImportDataWorkflow {
  
  /**
   * Execute import data operation
   */
  static async execute(importData: any): Promise<SettingsResult> {
    try {
      console.log('[ImportDataWorkflow] 📥 Starting import data operation...');
      
      const isKV = Boolean(process.env.KV_REST_API_URL);
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
      
      // Import all data
      await this.importAllData(importData, results, errors);
      
      const success = errors.length === 0;
      const message = success 
        ? `Successfully imported data - ${results.length} operations completed`
        : `Import data completed with ${errors.length} errors - ${results.length} operations completed`;
      
      console.log(`[ImportDataWorkflow] ✅ Import data operation completed: ${message}`);
      
      return {
        success,
        message,
        data: {
          results,
          errors,
          operation: 'import-data',
          environment: isKV ? 'kv' : 'local'
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
   * Import all data
   */
  private static async importAllData(importData: any, results: string[], errors: string[]): Promise<void> {
    try {
      console.log('[ImportDataWorkflow] 📥 Importing all data...');
      
      let importedEntityTypes = 0;
      
      // Import all entity types
      for (const entityType of IMPORTABLE_ENTITY_TYPES) {
        try {
          await this.importEntityType(entityType, importData.entities[entityType], results, errors);
          importedEntityTypes++;
        } catch (error) {
          const errorMsg = `Failed to import ${entityType}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`[ImportDataWorkflow] ❌ ${errorMsg}`);
        }
      }
      
      // Import settlements as reference data (if present)
      if (importData.settlements && Array.isArray(importData.settlements)) {
        await this.importSettlements(importData.settlements, results, errors);
      }
      
      // Import links
      await this.importLinks(importData.links, results, errors);
      
      // Import logs
      await this.importLogs(importData.logs, results, errors);
      
      results.push(`Imported data for ${importedEntityTypes} entity types`);
      console.log(`[ImportDataWorkflow] ✅ Imported all data`);
      
    } catch (error) {
      const errorMsg = `Failed to import all data: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[ImportDataWorkflow] ❌ ${errorMsg}`);
    }
  }
  
  /**
   * Import specific entity type
   */
  private static async importEntityType(entityType: string, entities: any[], results: string[], errors: string[]): Promise<void> {
    try {
      if (!entities || entities.length === 0) {
        results.push(`No ${entityType} entities to import`);
        return;
      }
      
      // Clear existing entities for this type
      const indexKey = buildIndexKey(entityType);
      const existingIds = await kv.smembers(indexKey);
      
      if (existingIds.length > 0) {
        const dataKeys = existingIds.map(id => buildDataKey(entityType, id));
        await kv.del(...dataKeys);
        await kv.del(indexKey);
        results.push(`Cleared ${existingIds.length} existing ${entityType} entities`);
      }
      
      // Import each entity
      let importedCount = 0;
      for (const entity of entities) {
        try {
          if (!entity.id) {
            console.warn(`[ImportDataWorkflow] ⚠️ Skipping ${entityType} entity without ID:`, entity);
            continue;
          }
          
          const dataKey = buildDataKey(entityType, entity.id);
          await kv.set(dataKey, JSON.stringify(entity));
          
          // Add to index
          await kv.sadd(indexKey, entity.id);
          importedCount++;
        } catch (error) {
          console.warn(`[ImportDataWorkflow] ⚠️ Failed to import ${entityType} entity:`, error);
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
   * Import links
   */
  private static async importLinks(links: any[], results: string[], errors: string[]): Promise<void> {
    try {
      if (!links || links.length === 0) {
        results.push('No links to import');
        return;
      }
      
      // Clear existing links
      const linksIndexKey = buildIndexKey('links');
      const existingLinkIds = await kv.smembers(linksIndexKey);
      
      if (existingLinkIds.length > 0) {
        const linkKeys = existingLinkIds.map(id => `links:link:${id}`);
        await kv.del(...linkKeys);
        await kv.del(linksIndexKey);
        results.push(`Cleared ${existingLinkIds.length} existing links`);
      }
      
      // Import each link
      let importedCount = 0;
      for (const link of links) {
        try {
          if (!link.id) {
            console.warn(`[ImportDataWorkflow] ⚠️ Skipping link without ID:`, link);
            continue;
          }
          
          const linkKey = `links:link:${link.id}`;
          await kv.set(linkKey, JSON.stringify(link));
          
          // Add to links index
          await kv.sadd(linksIndexKey, link.id);
          importedCount++;
        } catch (error) {
          console.warn(`[ImportDataWorkflow] ⚠️ Failed to import link:`, error);
        }
      }
      
      results.push(`Imported ${importedCount} links`);
      console.log(`[ImportDataWorkflow] ✅ Imported ${importedCount} links`);
      
    } catch (error) {
      const errorMsg = `Failed to import links: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[ImportDataWorkflow] ❌ ${errorMsg}`);
    }
  }
  
  /**
   * Import logs
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
          
          // Clear existing logs for this type
          const logKey = buildLogKey(logType);
          await kv.del(logKey);
          
          // Import each log entry
          for (const logEntry of logEntries) {
            try {
              await kv.lpush(logKey, JSON.stringify(logEntry));
            } catch (error) {
              console.warn(`[ImportDataWorkflow] ⚠️ Failed to import ${logType} log entry:`, error);
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
   * Import settlements as reference data (not a core entity)
   */
  private static async importSettlements(settlements: any[], results: string[], errors: string[]): Promise<void> {
    try {
      if (!settlements || settlements.length === 0) {
        results.push('No settlements to import');
        return;
      }
      
      console.log('[ImportDataWorkflow] 📥 Importing settlements as reference data...');
      
      // Clear existing settlements
      const settlementsIndexKey = buildIndexKey('settlements');
      const existingSettlementIds = await kv.smembers(settlementsIndexKey);
      
      if (existingSettlementIds.length > 0) {
        const dataKeys = existingSettlementIds.map(id => buildDataKey('settlements', id));
        await kv.del(...dataKeys);
        await kv.del(settlementsIndexKey);
        results.push(`Cleared ${existingSettlementIds.length} existing settlements`);
      }
      
      // Import each settlement
      for (const settlement of settlements) {
        try {
          const dataKey = buildDataKey('settlements', settlement.id);
          await kv.set(dataKey, JSON.stringify(settlement));
          
          // Add to settlements index
          await kv.sadd(settlementsIndexKey, settlement.id);
        } catch (error) {
          console.warn(`[ImportDataWorkflow] ⚠️ Failed to import settlement ${settlement.id}:`, error);
        }
      }
      
      results.push(`Imported ${settlements.length} settlements as reference data`);
      console.log(`[ImportDataWorkflow] ✅ Imported ${settlements.length} settlements`);
      
    } catch (error) {
      const errorMsg = `Failed to import settlements: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[ImportDataWorkflow] ❌ ${errorMsg}`);
    }
  }
}
