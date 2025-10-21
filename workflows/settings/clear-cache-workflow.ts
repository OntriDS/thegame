// workflows/settings/clear-cache-workflow.ts
// Clear Cache Workflow for KV-only architecture

import { kv } from '@/data-store/kv';

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

export class ClearCacheWorkflow {
  
  /**
   * Execute clear cache operation
   */
  static async execute(): Promise<SettingsResult> {
    try {
      console.log('[ClearCacheWorkflow] 🗑️ Starting clear cache operation...');
      
      const isKV = Boolean(process.env.UPSTASH_REDIS_REST_URL);
      const isServer = typeof window === 'undefined';
      const results: string[] = [];
      const errors: string[] = [];
      
      console.log(`[ClearCacheWorkflow] 🌍 Environment: ${isKV ? 'KV (Production)' : 'Local (Development)'}`);
      console.log(`[ClearCacheWorkflow] 🖥️ Context: ${isServer ? 'Server' : 'Client'}`);
      
      // For local environment, we need to run on client side
      if (!isKV && isServer) {
        console.log(`[ClearCacheWorkflow] ⚠️ Local environment detected on server - returning instruction for client-side execution`);
        return {
          success: true,
          message: 'Clear cache requires client-side execution for local environment',
          data: { 
            results: ['Client-side clear cache required for local environment'],
            errors: [],
            operation: 'clear-cache',
            environment: 'local',
            requiresClientExecution: true
          }
        };
      }
      
      // Clear cache patterns
      await this.clearCachePatterns(results, errors);
      
      const success = errors.length === 0;
      const message = success 
        ? `Successfully cleared cache - ${results.length} operations completed`
        : `Clear cache completed with ${errors.length} errors - ${results.length} operations completed`;
      
      console.log(`[ClearCacheWorkflow] ✅ Clear cache operation completed: ${message}`);
      
      return {
        success,
        message,
        data: {
          results,
          errors,
          operation: 'clear-cache',
          environment: isKV ? 'kv' : 'local'
        }
      };
      
    } catch (error) {
      console.error('[ClearCacheWorkflow] ❌ Clear cache operation failed:', error);
      return {
        success: false,
        message: `Clear cache operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: {
          results: [],
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          operation: 'clear-cache',
          environment: 'unknown'
        }
      };
    }
  }
  
  /**
   * Clear cache patterns from KV
   */
  private static async clearCachePatterns(results: string[], errors: string[]): Promise<void> {
    try {
      console.log('[ClearCacheWorkflow] 🗑️ Clearing cache patterns...');
      
      // Clear effects registry cache
      try {
        const effectsPattern = 'effects:*';
        const effectKeys = await kv.keys(effectsPattern);
        if (effectKeys.length > 0) {
          await kv.del(...effectKeys);
          results.push(`Cleared ${effectKeys.length} effect registry entries`);
          console.log(`[ClearCacheWorkflow] ✅ Cleared ${effectKeys.length} effect registry entries`);
        } else {
          results.push('No effect registry entries to clear');
        }
      } catch (error) {
        const errorMsg = `Failed to clear effect registry: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(`[ClearCacheWorkflow] ❌ ${errorMsg}`);
      }
      
      // Clear any temporary cache keys
      try {
        const tempPattern = 'temp:*';
        const tempKeys = await kv.keys(tempPattern);
        if (tempKeys.length > 0) {
          await kv.del(...tempKeys);
          results.push(`Cleared ${tempKeys.length} temporary cache entries`);
          console.log(`[ClearCacheWorkflow] ✅ Cleared ${tempKeys.length} temporary cache entries`);
        } else {
          results.push('No temporary cache entries to clear');
        }
      } catch (error) {
        const errorMsg = `Failed to clear temporary cache: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(`[ClearCacheWorkflow] ❌ ${errorMsg}`);
      }
      
      // Clear session cache if any
      try {
        const sessionPattern = 'session:*';
        const sessionKeys = await kv.keys(sessionPattern);
        if (sessionKeys.length > 0) {
          await kv.del(...sessionKeys);
          results.push(`Cleared ${sessionKeys.length} session cache entries`);
          console.log(`[ClearCacheWorkflow] ✅ Cleared ${sessionKeys.length} session cache entries`);
        } else {
          results.push('No session cache entries to clear');
        }
      } catch (error) {
        const errorMsg = `Failed to clear session cache: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(`[ClearCacheWorkflow] ❌ ${errorMsg}`);
      }
      
    } catch (error) {
      const errorMsg = `Failed to clear cache patterns: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[ClearCacheWorkflow] ❌ ${errorMsg}`);
    }
  }
}
