// workflows/settings/export-data-workflow.ts
// Export Data Workflow for KV-only architecture

import { kv } from '@vercel/kv';
import { buildDataKey, buildIndexKey } from '@/data-store/keys';
import { EntityType } from '@/types/enums';

// Centralized list of entity types for export operations
const EXPORTABLE_ENTITY_TYPES = [
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
    exportData?: any;
    requiresClientExecution?: boolean;
  };
}

export class ExportDataWorkflow {
  
  /**
   * Execute export data operation
   */
  static async execute(): Promise<SettingsResult> {
    try {
      console.log('[ExportDataWorkflow] 📤 Starting export data operation...');
      
      const isKV = Boolean(process.env.KV_REST_API_URL);
      const isServer = typeof window === 'undefined';
      const results: string[] = [];
      const errors: string[] = [];
      
      console.log(`[ExportDataWorkflow] 🌍 Environment: ${isKV ? 'KV (Production)' : 'Local (Development)'}`);
      console.log(`[ExportDataWorkflow] 🖥️ Context: ${isServer ? 'Server' : 'Client'}`);
      
      // For local environment, we need to run on client side
      if (!isKV && isServer) {
        console.log(`[ExportDataWorkflow] ⚠️ Local environment detected on server - returning instruction for client-side execution`);
        return {
          success: true,
          message: 'Export data requires client-side execution for local environment',
          data: { 
            results: ['Client-side export data required for local environment'],
            errors: [],
            operation: 'export-data',
            environment: 'local',
            requiresClientExecution: true
          }
        };
      }
      
      // Export all data
      const exportData = await this.exportAllData(results, errors);
      
      const success = errors.length === 0;
      const message = success 
        ? `Successfully exported data - ${results.length} operations completed`
        : `Export data completed with ${errors.length} errors - ${results.length} operations completed`;
      
      console.log(`[ExportDataWorkflow] ✅ Export data operation completed: ${message}`);
      
      return {
        success,
        message,
        data: {
          results,
          errors,
          operation: 'export-data',
          environment: isKV ? 'kv' : 'local',
          exportData
        }
      };
      
    } catch (error) {
      console.error('[ExportDataWorkflow] ❌ Export data operation failed:', error);
      return {
        success: false,
        message: `Export data operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: {
          results: [],
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          operation: 'export-data',
          environment: 'unknown'
        }
      };
    }
  }
  
  /**
   * Export all data from KV
   */
  private static async exportAllData(results: string[], errors: string[]): Promise<any> {
    try {
      console.log('[ExportDataWorkflow] 📤 Exporting all data...');
      
      const exportData: any = {
        metadata: {
          exportedAt: new Date().toISOString(),
          version: '1.0',
          environment: process.env.KV_REST_API_URL ? 'kv' : 'local'
        },
        entities: {
          tasks: [],
          items: [],
          sales: [],
          financials: [],
          characters: [],
          players: [],
          sites: []
        },
        settlements: [],
        links: [],
        logs: {}
      };
      
      // Export all entity types
      for (const entityType of EXPORTABLE_ENTITY_TYPES) {
        try {
          await this.exportEntityType(entityType, exportData, results, errors);
        } catch (error) {
          const errorMsg = `Failed to export ${entityType}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`[ExportDataWorkflow] ❌ ${errorMsg}`);
        }
      }
      
      // Export settlements as part of sites data
      await this.exportSettlements(exportData, results, errors);
      
      // Export links
      await this.exportLinks(exportData, results, errors);
      
      // Export logs
      await this.exportLogs(exportData, results, errors);
      
      results.push(`Exported data for ${EXPORTABLE_ENTITY_TYPES.length} entity types`);
      console.log(`[ExportDataWorkflow] ✅ Exported all data`);
      
      return exportData;
      
    } catch (error) {
      const errorMsg = `Failed to export all data: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[ExportDataWorkflow] ❌ ${errorMsg}`);
      return null;
    }
  }
  
  /**
   * Export specific entity type
   */
  private static async exportEntityType(entityType: string, exportData: any, results: string[], errors: string[]): Promise<void> {
    try {
      // Get all entity IDs from index
      const indexKey = buildIndexKey(entityType);
      const entityIds = await kv.smembers(indexKey);
      
      if (entityIds.length === 0) {
        results.push(`No ${entityType} entities to export`);
        return;
      }
      
      // Export each entity
      for (const entityId of entityIds) {
        try {
          const dataKey = buildDataKey(entityType, entityId);
          const entityData = await kv.get(dataKey);
          
          if (entityData) {
            const entity = JSON.parse(entityData as string);
            exportData.entities[entityType].push(entity);
          }
        } catch (error) {
          console.warn(`[ExportDataWorkflow] ⚠️ Failed to export ${entityType} ${entityId}:`, error);
        }
      }
      
      results.push(`Exported ${exportData.entities[entityType].length} ${entityType} entities`);
      console.log(`[ExportDataWorkflow] ✅ Exported ${exportData.entities[entityType].length} ${entityType} entities`);
      
    } catch (error) {
      const errorMsg = `Failed to export ${entityType}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[ExportDataWorkflow] ❌ ${errorMsg}`);
    }
  }
  
  /**
   * Export links
   */
  private static async exportLinks(exportData: any, results: string[], errors: string[]): Promise<void> {
    try {
      // Get all link IDs
      const linksIndexKey = buildIndexKey('links');
      const linkIds = await kv.smembers(linksIndexKey);
      
      if (linkIds.length === 0) {
        results.push('No links to export');
        return;
      }
      
      // Export each link
      for (const linkId of linkIds) {
        try {
          const linkKey = `links:link:${linkId}`;
          const linkData = await kv.get(linkKey);
          
          if (linkData) {
            const link = JSON.parse(linkData as string);
            exportData.links.push(link);
          }
        } catch (error) {
          console.warn(`[ExportDataWorkflow] ⚠️ Failed to export link ${linkId}:`, error);
        }
      }
      
      results.push(`Exported ${exportData.links.length} links`);
      console.log(`[ExportDataWorkflow] ✅ Exported ${exportData.links.length} links`);
      
    } catch (error) {
      const errorMsg = `Failed to export links: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[ExportDataWorkflow] ❌ ${errorMsg}`);
    }
  }
  
  /**
   * Export logs
   */
  private static async exportLogs(exportData: any, results: string[], errors: string[]): Promise<void> {
    try {
      const logTypes = [...EXPORTABLE_ENTITY_TYPES, 'links']; // links is special case
      
      for (const logType of logTypes) {
        try {
          const logKey = `logs:${logType}`;
          const logData = await kv.lrange(logKey, 0, -1);
          
          if (logData && logData.length > 0) {
            exportData.logs[logType] = logData.map(entry => JSON.parse(entry));
            results.push(`Exported ${logData.length} ${logType} log entries`);
          } else {
            exportData.logs[logType] = [];
            results.push(`No ${logType} log entries to export`);
          }
        } catch (error) {
          console.warn(`[ExportDataWorkflow] ⚠️ Failed to export ${logType} logs:`, error);
          exportData.logs[logType] = [];
        }
      }
      
      console.log(`[ExportDataWorkflow] ✅ Exported logs for ${logTypes.length} log types`);
      
    } catch (error) {
      const errorMsg = `Failed to export logs: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[ExportDataWorkflow] ❌ ${errorMsg}`);
    }
  }

  /**
   * Export settlements as reference data (not a core entity)
   */
  private static async exportSettlements(exportData: any, results: string[], errors: string[]): Promise<void> {
    try {
      console.log('[ExportDataWorkflow] 📤 Exporting settlements as reference data...');
      
      // Get all settlement IDs from index
      const settlementsIndexKey = buildIndexKey('settlements');
      const settlementIds = await kv.smembers(settlementsIndexKey);
      
      if (settlementIds.length === 0) {
        results.push('No settlements to export');
        return;
      }
      
      // Export each settlement
      for (const settlementId of settlementIds) {
        try {
          const dataKey = buildDataKey('settlements', settlementId);
          const settlementData = await kv.get(dataKey);
          
          if (settlementData) {
            const settlement = JSON.parse(settlementData as string);
            exportData.settlements.push(settlement);
          }
        } catch (error) {
          console.warn(`[ExportDataWorkflow] ⚠️ Failed to export settlement ${settlementId}:`, error);
        }
      }
      
      results.push(`Exported ${exportData.settlements.length} settlements as reference data`);
      console.log(`[ExportDataWorkflow] ✅ Exported ${exportData.settlements.length} settlements`);
      
    } catch (error) {
      const errorMsg = `Failed to export settlements: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[ExportDataWorkflow] ❌ ${errorMsg}`);
    }
  }
}
