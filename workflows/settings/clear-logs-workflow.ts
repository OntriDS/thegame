// workflows/settings/clear-logs-workflow.ts
// Clear Logs Workflow for KV-only architecture

import { kv } from '@/lib/utils/kv';
import { buildLogKey } from '@/data-store/keys';
import { EntityType } from '@/types/enums';
import { TransactionManager } from './transaction-manager';

// Centralized list of entity types for log clearing operations
const CLEARABLE_LOG_ENTITY_TYPES = [
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

export class ClearLogsWorkflow {
  
  /**
   * Execute clear logs operation
   */
  static async execute(): Promise<SettingsResult> {
    try {
      console.log('[ClearLogsWorkflow] 🗑️ Starting clear logs operation...');
      
      const isKV = Boolean(process.env.UPSTASH_REDIS_REST_URL);
      const isServer = typeof window === 'undefined';
      const results: string[] = [];
      const errors: string[] = [];
      
      console.log(`[ClearLogsWorkflow] 🌍 Environment: ${isKV ? 'KV (Production)' : 'Local (Development)'}`);
      console.log(`[ClearLogsWorkflow] 🖥️ Context: ${isServer ? 'Server' : 'Client'}`);
      
      // For local environment, we need to run on client side
      if (!isKV && isServer) {
        console.log(`[ClearLogsWorkflow] ⚠️ Local environment detected on server - returning instruction for client-side execution`);
        return {
          success: true,
          message: 'Clear logs requires client-side execution for local environment',
          data: { 
            results: ['Client-side clear logs required for local environment'],
            errors: [],
            operation: 'clear-logs',
            environment: 'local',
            requiresClientExecution: true
          }
        };
      }
      
      // Use TransactionManager for rollback support
      const transactionManager = new TransactionManager();
      
      const result = await transactionManager.execute(async () => {
        // Clear all entity logs
        await this.clearEntityLogs(results, errors);
        
        return { results, errors };
      });
      
      // Extract results from transaction
      const { results: transactionResults, errors: transactionErrors } = result;
      results.push(...transactionResults);
      errors.push(...transactionErrors);
      
      const success = errors.length === 0;
      const message = success 
        ? `Successfully cleared logs - ${results.length} operations completed`
        : `Clear logs completed with ${errors.length} errors - ${results.length} operations completed`;
      
      console.log(`[ClearLogsWorkflow] ✅ Clear logs operation completed: ${message}`);
      
      return {
        success,
        message,
        data: {
          results,
          errors,
          operation: 'clear-logs',
          environment: isKV ? 'kv' : 'local'
        }
      };
      
    } catch (error) {
      console.error('[ClearLogsWorkflow] ❌ Clear logs operation failed:', error);
      return {
        success: false,
        message: `Clear logs operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: {
          results: [],
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          operation: 'clear-logs',
          environment: 'unknown'
        }
      };
    }
  }
  
  /**
   * Clear all entity logs from KV
   */
  private static async clearEntityLogs(results: string[], errors: string[]): Promise<void> {
    try {
      console.log('[ClearLogsWorkflow] 📝 Clearing entity logs...');
      
      const logTypes = [...CLEARABLE_LOG_ENTITY_TYPES, 'links']; // links is special case
      
      for (const logType of logTypes) {
        try {
          if (logType === 'links') {
            // Links are not partitioned by month yet
            const { buildLogKey } = await import('@/data-store/keys');
            await kv.del(buildLogKey('links' as EntityType));
          } else {
            // Clear partitioned monthly logs
            const { getEntityLogMonths } = await import('../entities-logging');
            const { buildLogMonthKey, buildLogMonthsIndexKey } = await import('@/data-store/keys');
            
            const months = await getEntityLogMonths(logType as EntityType);
            for (const monthKey of months) {
              await kv.del(buildLogMonthKey(logType as EntityType, monthKey));
            }
            // Clear the month index itself
            await kv.del(buildLogMonthsIndexKey(logType as EntityType));
          }
          
          results.push(`Cleared ${logType} logs`);
          console.log(`[ClearLogsWorkflow] ✅ Cleared ${logType} logs`);
        } catch (error) {
          const errorMsg = `Failed to clear ${logType} logs: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`[ClearLogsWorkflow] ❌ ${errorMsg}`);
        }
      }
    } catch (error) {
      const errorMsg = `Failed to clear entity logs: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[ClearLogsWorkflow] ❌ ${errorMsg}`);
    }
  }
}

