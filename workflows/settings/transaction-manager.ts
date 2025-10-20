// workflows/settings/transaction-manager.ts
// Transaction Manager for rollback support in Settings workflows

import { kv } from '@vercel/kv';
import { buildDataKey, buildIndexKey, buildLogKey } from '@/data-store/keys';
import { EntityType } from '@/types/enums';
import { kvScan } from '@/data-store/kv';

export interface TransactionState {
  clearedEntities: Map<EntityType, string[]>;
  clearedLogs: string[];
  clearedLinks: string[];
  createdEntities: Map<EntityType, any[]>;
  originalState: Map<string, any>;
}

export class TransactionManager {
  private state: TransactionState | null = null;

  /**
   * Execute operations with transaction support
   * Captures state before operations and provides rollback capability
   */
  async execute<T>(operations: () => Promise<T>): Promise<T> {
    try {
      // Capture current state before operations
      this.state = await this.captureState();
      console.log('[TransactionManager] 📸 State captured for transaction');
      
      // Execute operations
      const result = await operations();
      
      // Clear state on success (no rollback needed)
      this.state = null;
      console.log('[TransactionManager] ✅ Transaction completed successfully');
      
      return result;
    } catch (error) {
      console.error('[TransactionManager] ❌ Transaction failed, attempting rollback:', error);
      
      // Attempt rollback if state was captured
      if (this.state) {
        try {
          await this.rollback(this.state);
          console.log('[TransactionManager] 🔄 Rollback completed');
        } catch (rollbackError) {
          console.error('[TransactionManager] ❌ Rollback failed:', rollbackError);
          throw new Error(`Transaction failed and rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}. Rollback error: ${rollbackError instanceof Error ? rollbackError.message : 'Unknown rollback error'}`);
        }
      }
      
      // Re-throw original error
      throw error;
    }
  }

  /**
   * Capture current state for potential rollback
   */
  async captureState(): Promise<TransactionState> {
    const state: TransactionState = {
      clearedEntities: new Map(),
      clearedLogs: [],
      clearedLinks: [],
      createdEntities: new Map(),
      originalState: new Map()
    };

    // Capture entity data for all entity types
    const entityTypes = [
      EntityType.TASK,
      EntityType.ITEM,
      EntityType.SALE,
      EntityType.FINANCIAL,
      EntityType.CHARACTER,
      EntityType.PLAYER,
      EntityType.ACCOUNT,
      EntityType.SITE
    ];

    for (const entityType of entityTypes) {
      try {
        const indexKey = buildIndexKey(entityType);
        const entityIds = await kv.smembers(indexKey);
        
        if (entityIds.length > 0) {
          const entities: any[] = [];
          for (const id of entityIds) {
            const dataKey = buildDataKey(entityType, id);
            const entity = await kv.get(dataKey);
            if (entity) {
              entities.push(entity);
              state.originalState.set(dataKey, entity);
            }
          }
          state.originalState.set(indexKey, entityIds);
          console.log(`[TransactionManager] 📸 Captured ${entities.length} ${entityType} entities`);
        }
      } catch (error) {
        console.warn(`[TransactionManager] ⚠️ Failed to capture ${entityType} state:`, error);
      }
    }

    // Capture log data
    const logTypes = [...entityTypes, 'links'];
    for (const logType of logTypes) {
      try {
        const logKey = buildLogKey(logType);
        const logData = await kv.get(logKey);
        if (logData) {
          state.originalState.set(logKey, logData);
          console.log(`[TransactionManager] 📸 Captured ${logType} logs`);
        }
      } catch (error) {
        console.warn(`[TransactionManager] ⚠️ Failed to capture ${logType} logs:`, error);
      }
    }

    // Capture links data
    try {
      const linkKeys = await kvScan('links:link:');
      
      if (linkKeys.length > 0) {
        const links: any[] = [];
        for (const linkKey of linkKeys) {
          const link = await kv.get(linkKey);
          if (link) {
            links.push(link);
            state.originalState.set(linkKey, link);
          }
        }
        console.log(`[TransactionManager] 📸 Captured ${links.length} links`);
      }
    } catch (error) {
      console.warn(`[TransactionManager] ⚠️ Failed to capture links state:`, error);
    }

    return state;
  }

  /**
   * Rollback to captured state
   */
  async rollback(state: TransactionState): Promise<void> {
    console.log('[TransactionManager] 🔄 Starting rollback...');

    try {
      // Restore original state
      for (const [key, value] of state.originalState) {
        try {
          await kv.set(key, value);
        } catch (error) {
          console.warn(`[TransactionManager] ⚠️ Failed to restore ${key}:`, error);
        }
      }

      console.log('[TransactionManager] ✅ Rollback completed successfully');
    } catch (error) {
      console.error('[TransactionManager] ❌ Rollback failed:', error);
      throw error;
    }
  }

  /**
   * Track entity clearing for rollback
   */
  trackEntityClearing(entityType: EntityType, entityIds: string[]): void {
    if (!this.state) return;
    
    const existing = this.state.clearedEntities.get(entityType) || [];
    this.state.clearedEntities.set(entityType, [...existing, ...entityIds]);
  }

  /**
   * Track log clearing for rollback
   */
  trackLogClearing(logType: string): void {
    if (!this.state) return;
    
    this.state.clearedLogs.push(logType);
  }

  /**
   * Track link clearing for rollback
   */
  trackLinkClearing(linkIds: string[]): void {
    if (!this.state) return;
    
    this.state.clearedLinks.push(...linkIds);
  }

  /**
   * Track entity creation for rollback
   */
  trackEntityCreation(entityType: EntityType, entities: any[]): void {
    if (!this.state) return;
    
    const existing = this.state.createdEntities.get(entityType) || [];
    this.state.createdEntities.set(entityType, [...existing, ...entities]);
  }

  /**
   * Get current transaction state (for debugging)
   */
  getState(): TransactionState | null {
    return this.state;
  }

  /**
   * Check if transaction is active
   */
  isActive(): boolean {
    return this.state !== null;
  }
}
