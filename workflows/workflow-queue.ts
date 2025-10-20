// workflows/workflow-queue.ts
// Safety belt for real money operations - retry mechanism and controlled processing

import { EntityType } from '@/types/enums';
import { processLinkEntity } from '@/links/links-workflows';

// ============================================================================
// WORKFLOW QUEUE SYSTEM: Safety belt for bulk operations and modal submissions
// ============================================================================

export interface WorkflowQueueItem {
  id: string;
  entity: any;
  entityType: EntityType;
  metadata?: any;
  priority: number; // Higher number = higher priority
  retryCount: number;
  maxRetries: number;
  createdAt: number;
  scheduledAt?: number;
}

export interface QueueStatus {
  queueSize: number;
  processingCount: number;
  maxConcurrency: number;
  batchSize: number;
  isProcessing: boolean;
}

export interface QueueConfig {
  maxConcurrency?: number;
  batchSize?: number;
}

export class WorkflowQueue {
  private static queue: WorkflowQueueItem[] = [];
  private static processing = new Set<string>();
  private static maxConcurrency = 3; // Maximum concurrent workflows
  private static batchSize = 5; // Process in batches of 5
  private static isProcessing = false;
  private static processingInterval: NodeJS.Timeout | null = null;

  /**
   * Add workflow to queue
   */
  static enqueue(entity: any, entityType: EntityType, priority: number = 0): string {
    const id = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const item: WorkflowQueueItem = {
      id,
      entity,
      entityType,
      priority,
      retryCount: 0,
      maxRetries: 3,
      createdAt: Date.now()
    };

    // Insert based on priority (higher priority first)
    const insertIndex = this.queue.findIndex(q => q.priority < priority);
    if (insertIndex === -1) {
      this.queue.push(item);
    } else {
      this.queue.splice(insertIndex, 0, item);
    }

    console.log(`[WorkflowQueue] ➕ Enqueued ${entityType}:${entity.id} (priority: ${priority}, queue size: ${this.queue.length})`);
    
    // Start processing if not already running
    this.startProcessing();
    
    return id;
  }

  /**
   * Process workflows from queue
   */
  private static async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`[WorkflowQueue] 🔄 Starting queue processing (${this.queue.length} items)`);

    try {
      // Process in batches
      const batch = this.queue.splice(0, this.batchSize);
      
      // Process batch concurrently (up to maxConcurrency)
      const promises = batch.map(item => this.processWorkflowItem(item));
      await Promise.allSettled(promises);

      // Continue processing if more items in queue
      if (this.queue.length > 0) {
        setTimeout(() => this.processQueue(), 100); // Small delay between batches
      }
    } catch (error) {
      console.error('[WorkflowQueue] Error in queue processing:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process individual workflow item
   */
  private static async processWorkflowItem(item: WorkflowQueueItem): Promise<void> {
    const { entity, entityType, metadata } = item;
    
    try {
      // Check concurrency limit
      if (this.processing.size >= this.maxConcurrency) {
        // Re-queue with higher priority
        item.priority += 1;
        this.queue.unshift(item);
        console.log(`[WorkflowQueue] ⏳ Concurrency limit reached, re-queued ${entityType}:${entity.id}`);
        return;
      }

      // Mark as processing
      this.processing.add(item.id);
      
      try {
        // Process the workflow
        await processLinkEntity(entity, entityType);
        console.log(`[WorkflowQueue] ✅ Completed ${entityType}:${entity.id}`);
      } finally {
        // Always remove from processing set
        this.processing.delete(item.id);
      }

    } catch (error) {
      console.error(`[WorkflowQueue] ❌ Error processing ${entityType}:${entity.id}:`, error);
      
      // Retry logic
      if (item.retryCount < item.maxRetries) {
        item.retryCount++;
        item.priority += 1; // Increase priority on retry
        this.queue.unshift(item); // Add to front of queue
        console.log(`[WorkflowQueue] 🔄 Retrying ${entityType}:${entity.id} (attempt ${item.retryCount}/${item.maxRetries})`);
      } else {
        console.error(`[WorkflowQueue] 💀 Max retries exceeded for ${entityType}:${entity.id}`);
      }
    }
  }

  /**
   * Start queue processing
   */
  private static startProcessing(): void {
    if (this.processingInterval) {
      return; // Already processing
    }

    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 1000); // Check every second
  }

  /**
   * Stop queue processing
   */
  static stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    this.isProcessing = false;
    console.log('[WorkflowQueue] 🛑 Stopped processing');
  }

  /**
   * Get queue status
   */
  static getStatus(): QueueStatus {
    return {
      queueSize: this.queue.length,
      processingCount: this.processing.size,
      maxConcurrency: this.maxConcurrency,
      batchSize: this.batchSize,
      isProcessing: this.isProcessing
    };
  }

  /**
   * Configure queue settings
   */
  static configure(options: QueueConfig): void {
    if (options.maxConcurrency !== undefined) {
      this.maxConcurrency = options.maxConcurrency;
    }
    if (options.batchSize !== undefined) {
      this.batchSize = options.batchSize;
    }
    console.log(`[WorkflowQueue] ⚙️ Configured: maxConcurrency=${this.maxConcurrency}, batchSize=${this.batchSize}`);
  }

  /**
   * Clear queue (emergency)
   */
  static clearQueue(): void {
    this.queue = [];
    this.processing.clear();
    console.log('[WorkflowQueue] 🧹 Cleared queue');
  }

  /**
   * Get queue items for debugging
   */
  static getQueueItems(): WorkflowQueueItem[] {
    return [...this.queue];
  }
}

// ============================================================================
// PUBLIC API: Queued processing functions
// ============================================================================

/**
 * Process entity through queue system (safety + retry)
 */
export async function processLinkEntityQueued(
  entity: any, 
  entityType: EntityType, 
  priority: number = 0
): Promise<string> {
  return WorkflowQueue.enqueue(entity, entityType, priority);
}

/**
 * Process multiple entities through queue (bulk operations)
 */
export async function processBulkEntitiesQueued(
  entities: Array<{ entity: any; entityType: EntityType; priority?: number }>
): Promise<string[]> {
  const ids: string[] = [];
  
  for (const { entity, entityType, priority = 0 } of entities) {
    const id = await processLinkEntityQueued(entity, entityType, priority);
    ids.push(id);
  }
  
  console.log(`[WorkflowQueue] 📦 Enqueued ${ids.length} bulk entities`);
  return ids;
}

/**
 * Get queue status for monitoring
 */
export function getQueueStatus(): QueueStatus {
  return WorkflowQueue.getStatus();
}

/**
 * Configure queue settings
 */
export function configureQueue(options: QueueConfig): void {
  WorkflowQueue.configure(options);
}

/**
 * Stop queue processing
 */
export function stopQueue(): void {
  WorkflowQueue.stopProcessing();
}

/**
 * Clear queue (emergency)
 */
export function clearQueue(): void {
  WorkflowQueue.clearQueue();
}
