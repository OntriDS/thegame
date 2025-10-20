// workflows/settings/backfill-logs-workflow.ts
// Backfill Logs Workflow for KV-only architecture

import { kv } from '@vercel/kv';
import { buildDataKey, buildIndexKey, buildLogKey } from '@/data-store/keys';
import { EntityType } from '@/types/enums';

// Centralized list of entity types for backfill operations
const BACKFILLABLE_ENTITY_TYPES = [
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

export class BackfillLogsWorkflow {
  
  /**
   * Execute backfill logs operation
   */
  static async execute(): Promise<SettingsResult> {
    try {
      console.log('[BackfillLogsWorkflow] 🔄 Starting backfill logs operation...');
      
      const isKV = Boolean(process.env.KV_REST_API_URL);
      const isServer = typeof window === 'undefined';
      const results: string[] = [];
      const errors: string[] = [];
      
      console.log(`[BackfillLogsWorkflow] 🌍 Environment: ${isKV ? 'KV (Production)' : 'Local (Development)'}`);
      console.log(`[BackfillLogsWorkflow] 🖥️ Context: ${isServer ? 'Server' : 'Client'}`);
      
      // For local environment, we need to run on client side
      if (!isKV && isServer) {
        console.log(`[BackfillLogsWorkflow] ⚠️ Local environment detected on server - returning instruction for client-side execution`);
        return {
          success: true,
          message: 'Backfill logs requires client-side execution for local environment',
          data: { 
            results: ['Client-side backfill logs required for local environment'],
            errors: [],
            operation: 'backfill-logs',
            environment: 'local',
            requiresClientExecution: true
          }
        };
      }
      
      // Backfill logs for all entity types
      await this.backfillEntityLogs(results, errors);
      
      const success = errors.length === 0;
      const message = success 
        ? `Successfully backfilled logs - ${results.length} operations completed`
        : `Backfill logs completed with ${errors.length} errors - ${results.length} operations completed`;
      
      console.log(`[BackfillLogsWorkflow] ✅ Backfill logs operation completed: ${message}`);
      
      return {
        success,
        message,
        data: {
          results,
          errors,
          operation: 'backfill-logs',
          environment: isKV ? 'kv' : 'local'
        }
      };
      
    } catch (error) {
      console.error('[BackfillLogsWorkflow] ❌ Backfill logs operation failed:', error);
      return {
        success: false,
        message: `Backfill logs operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: {
          results: [],
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          operation: 'backfill-logs',
          environment: 'unknown'
        }
      };
    }
  }
  
  /**
   * Backfill logs for all entity types
   */
  private static async backfillEntityLogs(results: string[], errors: string[]): Promise<void> {
    try {
      console.log('[BackfillLogsWorkflow] 📝 Backfilling entity logs...');
      
      for (const entityType of BACKFILLABLE_ENTITY_TYPES) {
        try {
          await this.backfillEntityTypeLogs(entityType, results, errors);
        } catch (error) {
          const errorMsg = `Failed to backfill ${entityType} logs: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`[BackfillLogsWorkflow] ❌ ${errorMsg}`);
        }
      }
    } catch (error) {
      const errorMsg = `Failed to backfill entity logs: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[BackfillLogsWorkflow] ❌ ${errorMsg}`);
    }
  }
  
  /**
   * Backfill logs for a specific entity type
   */
  private static async backfillEntityTypeLogs(entityType: string, results: string[], errors: string[]): Promise<void> {
    try {
      // Get all entity IDs from index
      const indexKey = buildIndexKey(entityType);
      const entityIds = await kv.smembers(indexKey);
      
      if (entityIds.length === 0) {
        results.push(`No ${entityType} entities to backfill logs for`);
        return;
      }
      
      // Clear existing logs for this entity type
      const logKey = buildLogKey(entityType);
      await kv.del(logKey);
      
      // Create initial log entry
      const initialLogEntry = {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Backfilled logs for ${entityType}`,
        entityType,
        operation: 'backfill',
        details: {
          entityCount: entityIds.length,
          backfilledAt: new Date().toISOString()
        }
      };
      
      await kv.lpush(logKey, JSON.stringify(initialLogEntry));
      
      // For each entity, create a log entry
      let loggedEntities = 0;
      for (const entityId of entityIds) {
        try {
          const dataKey = buildDataKey(entityType, entityId);
          const entityData = await kv.get(dataKey);
          
          if (entityData) {
            const entity = JSON.parse(entityData as string);
            const logEntry = {
              timestamp: entity.createdAt || new Date().toISOString(),
              level: 'info',
              message: `${entityType} created`,
              entityType,
              entityId,
              operation: 'created',
              details: {
                name: entity.name || 'Unknown',
                status: entity.status || 'unknown'
              }
            };
            
            await kv.lpush(logKey, JSON.stringify(logEntry));
            loggedEntities++;
          }
        } catch (error) {
          console.warn(`[BackfillLogsWorkflow] ⚠️ Failed to backfill log for ${entityType} ${entityId}:`, error);
        }
      }
      
      results.push(`Backfilled logs for ${loggedEntities} ${entityType} entities`);
      console.log(`[BackfillLogsWorkflow] ✅ Backfilled logs for ${loggedEntities} ${entityType} entities`);
      
    } catch (error) {
      const errorMsg = `Failed to backfill ${entityType} logs: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[BackfillLogsWorkflow] ❌ ${errorMsg}`);
    }
  }
}
