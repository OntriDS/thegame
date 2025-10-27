// workflows/sale-line-utils.ts
// Sale line processing utilities

import type { Sale, ItemSaleLine, BundleSaleLine, ServiceLine, Task } from '@/types/entities';
import { LinkType, EntityType, LogEventType } from '@/types/enums';
import { getAllItems, upsertItem } from '@/data-store/datastore';
import { upsertTask } from '@/data-store/datastore';
import { makeLink } from '@/links/links-workflows';
import { createLink } from '@/links/link-registry';
import { hasEffect, markEffect } from '@/data-store/effects-registry';
import { appendEntityLog } from './entities-logging';
import { createFinancialRecordFromSale } from './financial-record-utils';

/**
 * Process all sale lines in a sale
 * Main dispatcher that processes each line based on its kind
 */
export async function processSaleLines(sale: Sale): Promise<void> {
  try {
    console.log(`[processSaleLines] Processing ${sale.lines.length} lines for sale: ${sale.counterpartyName}`);
    
    // Process each line based on its kind
    for (const line of sale.lines) {
      console.log(`[processSaleLines] Processing line: ${line.kind}, lineId: ${line.lineId}`);
      
      switch (line.kind) {
        case 'item':
          await processItemSaleLine(line as ItemSaleLine, sale);
          break;
        case 'bundle':
          await processBundleSaleLine(line as BundleSaleLine, sale);
          break;
        case 'service':
          await processServiceLine(line as ServiceLine, sale);
          break;
        default:
          console.warn(`[processSaleLines] Unknown line kind: ${(line as any).kind}`);
      }
    }
    
    // Create financial record from sale if it has revenue
    if (sale.totals.totalRevenue > 0) {
      await createFinancialRecordFromSale(sale);
    }
    
    console.log(`[processSaleLines] ✅ Processed all lines for sale: ${sale.counterpartyName}`);
    
  } catch (error) {
    console.error(`[processSaleLines] ❌ Failed to process sale lines for sale ${sale.id}:`, error);
    throw error;
  }
}

/**
 * Process item sale line - reduce item stock at specific site
 */
export async function processItemSaleLine(line: ItemSaleLine, sale: Sale): Promise<void> {
  try {
    console.log(`[processItemSaleLine] Processing item sale: ${line.itemId}, quantity: ${line.quantity}`);
    
    // Idempotency check
    const stockDecrementedKey = `sale:${sale.id}:stockDecremented:${line.lineId}`;
    const hasBeenDecremented = await hasEffect(stockDecrementedKey);
    
    if (hasBeenDecremented) {
      console.log(`[processItemSaleLine] Stock already decremented for line ${line.lineId}, skipping`);
      return;
    }
    
    // Get the item
    const items = await getAllItems();
    const item = items.find(i => i.id === line.itemId);
    
    if (!item) {
      console.error(`[processItemSaleLine] Item not found: ${line.itemId}`);
      return;
    }
    
    // Check if we have enough stock at the sale site
    // Calculate total available quantity from stock array
    const totalAvailableQuantity = item.stock.reduce((sum, stockPoint) => sum + stockPoint.quantity, 0);
    if (item.quantitySold + line.quantity > totalAvailableQuantity) {
      console.error(`[processItemSaleLine] Insufficient stock for item ${item.name}. Available: ${totalAvailableQuantity - item.quantitySold}, Required: ${line.quantity}`);
      return;
    }
    
    // Update item stock
    const updatedItem = {
      ...item,
      quantitySold: item.quantitySold + line.quantity,
      updatedAt: new Date()
    };
    
    // Mark item as SOLD if all stock is sold
    if (updatedItem.quantitySold >= totalAvailableQuantity) {
      updatedItem.status = 'SOLD' as any;
    }
    
    // Save the updated item
    await upsertItem(updatedItem);
    
    // Create SALE_ITEM link
    const linkMetadata = {
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      total: line.quantity * line.unitPrice,
      soldAt: sale.saleDate.toISOString(),
      siteId: sale.siteId
    };
    
    const link = makeLink(
      LinkType.SALE_ITEM,
      { type: EntityType.SALE, id: sale.id },
      { type: EntityType.ITEM, id: line.itemId },
      linkMetadata
    );
    await createLink(link);
    
    // Mark effect as complete
    await markEffect(`sale:${sale.id}:${stockDecrementedKey}`);
    
    // Log the effect
    await appendEntityLog(EntityType.ITEM, line.itemId, LogEventType.SOLD, {
      name: item.name,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      total: line.quantity * line.unitPrice,
      saleId: sale.id,
      soldAt: sale.saleDate.toISOString()
    });
    
    console.log(`[processItemSaleLine] ✅ Processed item sale: ${item.name} x${line.quantity}`);
    
  } catch (error) {
    console.error(`[processItemSaleLine] ❌ Failed to process item sale line ${line.lineId}:`, error);
    throw error;
  }
}

/**
 * Process bundle sale line - reduce bundle stock
 * TODO: Implement bundle processing logic
 */
export async function processBundleSaleLine(line: BundleSaleLine, sale: Sale): Promise<void> {
  try {
    console.log(`[processBundleSaleLine] Processing bundle sale: ${line.itemType}, quantity: ${line.quantity}`);
    
    // Idempotency check
    const bundleProcessedKey = `sale:${sale.id}:bundleProcessed:${line.lineId}`;
    const hasBeenProcessed = await hasEffect(bundleProcessedKey);
    
    if (hasBeenProcessed) {
      console.log(`[processBundleSaleLine] Bundle already processed for line ${line.lineId}, skipping`);
      return;
    }
    
    // TODO: Implement bundle processing logic
    // This would involve:
    // 1. Finding bundle items of the specified type
    // 2. Reducing their stock
    // 3. Creating SALE_ITEM links
    // 4. Handling itemsPerBundle logic
    
    console.log(`[processBundleSaleLine] Bundle processing not yet implemented for ${line.itemType}`);
    
    // Mark effect as complete (even though not implemented)
    await markEffect(`sale:${sale.id}:${bundleProcessedKey}`);
    
  } catch (error) {
    console.error(`[processBundleSaleLine] ❌ Failed to process bundle sale line ${line.lineId}:`, error);
    throw error;
  }
}

/**
 * Process service sale line - create task from service
 */
export async function processServiceLine(line: ServiceLine, sale: Sale): Promise<void> {
  try {
    console.log(`[processServiceLine] Processing service sale: ${line.description}`);
    
    // Idempotency check
    const taskCreatedKey = `sale:${sale.id}:taskCreated:${line.lineId}`;
    const hasBeenCreated = await hasEffect(taskCreatedKey);
    
    if (hasBeenCreated || !line.createTask) {
      console.log(`[processServiceLine] Task already created or not requested for line ${line.lineId}, skipping`);
      return;
    }
    
    // Create task from service line
    const serviceTask: Task = {
      id: line.taskId || `task-${sale.id}-${line.lineId}`,
      name: line.description || 'Service Task',
      description: `Service from sale: ${sale.counterpartyName}`,
      type: line.taskType || 'TASK' as any,
      status: 'Created' as any,
      priority: 'Normal' as any,
      station: line.station,
      progress: 0,
      order: Date.now(),
      cost: line.taskCost || 0,
      revenue: 0, // Tasks from sales don't get revenue - it stays in the sale
      rewards: line.taskRewards ? { points: line.taskRewards } : { points: { xp: 0, rp: 0, fp: 0, hp: 0 } },
      isCollected: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      links: [],
      // Ambassador Fields - inherit from sale
      siteId: sale.siteId,
      targetSiteId: line.taskTargetSiteId || undefined,
      sourceSaleId: sale.id, // Link task back to sale
      // Additional fields from service line
      parentId: line.taskParentId || undefined,
      dueDate: line.taskDueDate || undefined,
      // Emissary fields for item creation
      outputItemType: line.outputItemType || undefined,
      outputItemSubType: line.outputItemSubType || undefined,
      outputQuantity: line.outputItemQuantity || undefined,
      outputItemName: line.outputItemName || undefined,
      outputUnitCost: line.outputUnitCost || undefined,
      outputItemCollection: line.outputItemCollection || undefined,
      outputItemPrice: line.outputItemPrice || undefined,
      isNewItem: line.isNewOutputItem || false,
      isSold: line.isSold || false,
      outputItemStatus: 'Created' as any
    };
    
    // Save the task
    await upsertTask(serviceTask);
    
    // Create SALE_TASK link
    const linkMetadata = {
      serviceDescription: line.description,
      revenue: line.revenue,
      station: line.station,
      taskType: line.taskType,
      createdFrom: 'service_sale'
    };
    
    const link = makeLink(
      LinkType.SALE_TASK,
      { type: EntityType.SALE, id: sale.id },
      { type: EntityType.TASK, id: serviceTask.id },
      linkMetadata
    );
    await createLink(link);
    
    // Mark effect as complete
    await markEffect(`sale:${sale.id}:${taskCreatedKey}`);
    
    // Log the task creation
    await appendEntityLog(EntityType.TASK, serviceTask.id, LogEventType.CREATED, {
      name: serviceTask.name,
      createdFrom: 'service_sale',
      saleId: sale.id,
      serviceDescription: line.description,
      station: line.station
    });
    
    console.log(`[processServiceLine] ✅ Created task from service: ${serviceTask.name}`);
    
  } catch (error) {
    console.error(`[processServiceLine] ❌ Failed to process service sale line ${line.lineId}:`, error);
    throw error;
  }
}

