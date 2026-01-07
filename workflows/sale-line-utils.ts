// workflows/sale-line-utils.ts
// Sale line processing utilities

import type { Sale, ItemSaleLine, BundleSaleLine, ServiceLine, Task } from '@/types/entities';
import { LinkType, EntityType, LogEventType, ItemStatus } from '@/types/enums';
import { getItemById, upsertItem, getAllItems, getItemsByType } from '@/data-store/datastore';
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
      if (sale.type === 'BOOTH') {
        // Dynamic import to avoid circular dependency
        const { createFinancialRecordFromBoothSale } = await import('./financial-record-utils');
        await createFinancialRecordFromBoothSale(sale);
      } else {
        await createFinancialRecordFromSale(sale);
      }
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
    const item = await getItemById(line.itemId);

    if (!item) {
      console.error(`[processItemSaleLine] Item not found: ${line.itemId}`);
      return;
    }

    // Check if we have enough stock at the sale site
    // Calculate total available quantity from stock array
    const currentStock = item.stock.reduce((sum, stockPoint) => sum + stockPoint.quantity, 0);
    const requiredTotal = line.quantity;

    // [AUTO-ADJUST] If insufficient stock, we "find" the items to allow the sale
    if (requiredTotal > currentStock) {
      const shortage = requiredTotal - currentStock;
      console.warn(`[processItemSaleLine] ⚠️ Auto-adjusting stock for ${item.name}. Required: ${requiredTotal}, Available: ${currentStock}, Adding: ${shortage}`);

      // Add shortage to the sale site (or first available site)
      const targetSiteId = sale.siteId || (item.stock[0]?.siteId) || 'default';

      let siteStockPoint = item.stock.find(sp => sp.siteId === targetSiteId);

      if (siteStockPoint) {
        siteStockPoint.quantity += shortage;
      } else {
        // Create new stock point if needed
        item.stock.push({
          siteId: targetSiteId,
          quantity: shortage,
          location: 'Sales Adjustment'
        });
      }

      // We don't save yet, we let the logic below deduct correctly and then save the final state.
      // This ensures we end up with 0 (or valid) stock after deduction.
    }

    // Update item stock
    const updatedItem = {
      ...item,
      quantitySold: item.quantitySold + line.quantity,
      // Set soldAt on first sale (when item had no previous sales)
      soldAt: item.quantitySold === 0 ? sale.saleDate : item.soldAt,
      updatedAt: new Date(),
      stock: item.stock ? item.stock.map(stockPoint => ({ ...stockPoint })) : []
    };

    let remainingToDeduct = line.quantity;

    const deductFromStockIndex = (index: number) => {
      if (index < 0 || index >= updatedItem.stock.length || remainingToDeduct <= 0) return;
      const stockPoint = updatedItem.stock[index];
      const available = stockPoint.quantity;
      const deduction = Math.min(available, remainingToDeduct);
      if (deduction <= 0) return;
      updatedItem.stock[index] = { ...stockPoint, quantity: available - deduction };
      remainingToDeduct -= deduction;
    };

    // Prefer deducting stock from the sale site, if available
    if (sale.siteId) {
      const saleSiteIndex = updatedItem.stock.findIndex(stockPoint => stockPoint.siteId === sale.siteId);
      deductFromStockIndex(saleSiteIndex);
    }

    // Deduct remaining quantities from other stock points
    for (let i = 0; i < updatedItem.stock.length && remainingToDeduct > 0; i++) {
      if (sale.siteId && updatedItem.stock[i].siteId === sale.siteId) continue;
      deductFromStockIndex(i);
    }

    if (remainingToDeduct > 0) {
      console.warn(
        `[processItemSaleLine] Remaining quantity could not be deducted for item ${item.id}. Remaining: ${remainingToDeduct}`
      );
    }

    // Remove empty stock points
    updatedItem.stock = updatedItem.stock.filter(stockPoint => stockPoint.quantity > 0);

    const totalRemainingQuantity = updatedItem.stock.reduce((sum, stockPoint) => sum + stockPoint.quantity, 0);

    // Mark item as SOLD if all stock is sold
    if (totalRemainingQuantity <= 0) {
      updatedItem.status = ItemStatus.SOLD;
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
    await markEffect(stockDecrementedKey);
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
    console.log(`[processBundleSaleLine] Processing bundle sale: ${line.itemType}, quantity: ${line.quantity} bundles, ${line.itemsPerBundle} items per bundle`);

    // Idempotency check
    const bundleProcessedKey = `sale:${sale.id}:bundleProcessed:${line.lineId}`;
    const hasBeenProcessed = await hasEffect(bundleProcessedKey);

    if (hasBeenProcessed) {
      console.log(`[processBundleSaleLine] Bundle already processed for line ${line.lineId}, skipping`);
      return;
    }

    // Calculate total items needed
    const totalItemsNeeded = line.quantity * line.itemsPerBundle;

    // If a specific bundle item is specified, use it
    if (line.itemId) {
      const bundleItem = await getItemById(line.itemId);
      if (!bundleItem) {
        console.error(`[processBundleSaleLine] Bundle item ${line.itemId} not found`);
        return;
      }

      // Reduce bundle stock
      const updatedStock = bundleItem.stock.map(stockPoint => {
        if (stockPoint.siteId === line.siteId) {
          const newQuantity = Math.max(0, stockPoint.quantity - line.quantity);
          return { ...stockPoint, quantity: newQuantity };
        }
        return stockPoint;
      });

      const updatedItem = {
        ...bundleItem,
        stock: updatedStock,
        quantitySold: (bundleItem.quantitySold || 0) + line.quantity,
        updatedAt: new Date()
      };

      await upsertItem(updatedItem);

      // Create SALE_ITEM link for the bundle
      const bundleLink = makeLink(
        LinkType.SALE_ITEM,
        { type: EntityType.SALE, id: sale.id },
        { type: EntityType.ITEM, id: bundleItem.id },
        {
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          itemsPerBundle: line.itemsPerBundle,
          totalItems: totalItemsNeeded
        }
      );
      await createLink(bundleLink);

      console.log(`[processBundleSaleLine] ✅ Processed bundle sale: ${line.quantity} bundles of ${bundleItem.name}`);
    } else {
      // Find individual items of the specified type at the site
      const allItems = await getAllItems();
      const itemsOfType = allItems.filter(item =>
        item.type === line.itemType &&
        item.stock.some(sp => sp.siteId === line.siteId && sp.quantity > 0)
      );

      if (itemsOfType.length === 0) {
        console.error(`[processBundleSaleLine] No items of type ${line.itemType} found at site ${line.siteId}`);
        return;
      }

      // Sort by stock quantity (descending) to prioritize items with more stock
      itemsOfType.sort((a, b) => {
        const aStock = a.stock.find(sp => sp.siteId === line.siteId)?.quantity || 0;
        const bStock = b.stock.find(sp => sp.siteId === line.siteId)?.quantity || 0;
        return bStock - aStock;
      });

      let remainingToDeduct = totalItemsNeeded;
      const processedItems: Array<{ item: typeof itemsOfType[0]; quantity: number }> = [];

      // Deduct stock from items until we have enough
      for (const item of itemsOfType) {
        if (remainingToDeduct <= 0) break;

        const stockPoint = item.stock.find(sp => sp.siteId === line.siteId);
        if (!stockPoint || stockPoint.quantity <= 0) continue;

        const toDeduct = Math.min(remainingToDeduct, stockPoint.quantity);
        remainingToDeduct -= toDeduct;

        // Update item stock
        const updatedStock = item.stock.map(sp => {
          if (sp.siteId === line.siteId) {
            return { ...sp, quantity: sp.quantity - toDeduct };
          }
          return sp;
        });

        const updatedItem = {
          ...item,
          stock: updatedStock,
          quantitySold: (item.quantitySold || 0) + toDeduct,
          updatedAt: new Date()
        };

        await upsertItem(updatedItem);
        processedItems.push({ item, quantity: toDeduct });

        // Create SALE_ITEM link for each item consumed
        const itemLink = makeLink(
          LinkType.SALE_ITEM,
          { type: EntityType.SALE, id: sale.id },
          { type: EntityType.ITEM, id: item.id },
          {
            quantity: toDeduct,
            unitPrice: line.unitPrice / line.itemsPerBundle, // Price per individual item
            bundleQuantity: line.quantity,
            itemsPerBundle: line.itemsPerBundle,
            fromBundle: true
          }
        );
        await createLink(itemLink);
      }

      if (remainingToDeduct > 0) {
        console.warn(`[processBundleSaleLine] ⚠️ Insufficient stock: needed ${totalItemsNeeded}, only deducted ${totalItemsNeeded - remainingToDeduct}`);
      }

      console.log(`[processBundleSaleLine] ✅ Processed bundle sale: ${line.quantity} bundles consuming ${totalItemsNeeded - remainingToDeduct} items from ${processedItems.length} items`);
    }

    await markEffect(bundleProcessedKey);

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
      customerCharacterId: sale.customerId || null,
      playerCharacterId: sale.playerCharacterId || null,
      newCustomerName: sale.newCustomerName || undefined,
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
      outputItemId: line.outputItemId || null,
      isNewItem: (line.isNewItem ?? line.isNewOutputItem) ?? true,
      isSold: line.isSold || false,
      outputItemStatus: (line.outputItemStatus as any) || (line.isSold ? 'SOLD' as any : 'Created' as any)
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

