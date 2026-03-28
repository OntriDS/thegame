// workflows/sale-line-utils.ts
// Sale line processing utilities

import type { Sale, Item, ItemSaleLine, BundleSaleLine, ServiceLine, Task } from '@/types/entities';
import { LinkType, EntityType, LogEventType, ItemStatus } from '@/types/enums';
import { getItemById, upsertItem, getAllItems, getItemsByType } from '@/data-store/datastore';
import { upsertTask } from '@/data-store/datastore';
import { makeLink } from '@/links/links-workflows';
import { createLink } from '@/links/link-registry';
import { hasEffect, markEffect } from '@/data-store/effects-registry';
import { EffectKeys, buildArchiveCollectionIndexKey, buildArchiveMonthsKey, buildMonthIndexKey } from '@/data-store/keys';
import { calculateClosingDate, formatMonthKey, formatDisplayDate } from '@/lib/utils/date-utils';
import { appendEntityLog } from './entities-logging';
import { createFinancialRecordFromSale } from './financial-record-utils';
import { ORDER_INCREMENT } from '@/lib/constants/app-constants';

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
    const stockDecrementedKey = EffectKeys.sideEffect('sale', sale.id, `stockDecremented:${line.lineId}`);
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
          quantity: shortage
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
    // [CHANGE] User requested items NOT be marked SOLD/Deleted even if stock is 0.
    // They should remain visible (likely ACTIVE) to be restocked.
    /*
    if (totalRemainingQuantity <= 0) {
      updatedItem.status = ItemStatus.SOLD;
    }
    */

    // Save the updated item (Skip generic workflow to avoid duplicate logs)
    await upsertItem(updatedItem, { skipWorkflowEffects: true });

    const link = makeLink(
      LinkType.SALE_ITEM,
      { type: EntityType.SALE, id: sale.id },
      { type: EntityType.ITEM, id: line.itemId }
    );
    await createLink(link);

    // Mark effect as complete
    await markEffect(stockDecrementedKey);

    // Log the effect
    await appendEntityLog(EntityType.ITEM, line.itemId, LogEventType.SOLD, {
      name: item.name,
      itemType: item.type,
      subItemType: item.subItemType,
      quantity: line.quantity
    }, sale.saleDate);

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
    const bundleProcessedKey = EffectKeys.sideEffect('sale', sale.id, `bundleProcessed:${line.lineId}`);
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

      await upsertItem(updatedItem, { skipWorkflowEffects: true });

      // Log detailed sale event (Fixes missing data for bundles)
      await appendEntityLog(EntityType.ITEM, bundleItem.id, LogEventType.SOLD, {
        name: bundleItem.name,
        itemType: bundleItem.type,
        subItemType: bundleItem.subItemType,
        quantity: line.quantity
      }, sale.saleDate);

      // Create SALE_ITEM link for the bundle
      const bundleLink = makeLink(
        LinkType.SALE_ITEM,
        { type: EntityType.SALE, id: sale.id },
        { type: EntityType.ITEM, id: bundleItem.id }
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

        await upsertItem(updatedItem, { skipWorkflowEffects: true });

        // Log detailed usage event for item consumed in bundle
        await appendEntityLog(EntityType.ITEM, item.id, LogEventType.SOLD, {
          name: item.name,
          itemType: item.type,
          subItemType: item.subItemType,
          quantity: toDeduct
        }, sale.saleDate);
        processedItems.push({ item, quantity: toDeduct });

        // Create SALE_ITEM link for each item consumed
        const itemLink = makeLink(
          LinkType.SALE_ITEM,
          { type: EntityType.SALE, id: sale.id },
          { type: EntityType.ITEM, id: item.id }
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
    const taskCreatedKey = EffectKeys.sideEffect('sale', sale.id, `taskCreated:${line.lineId}`);
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
      order: ORDER_INCREMENT,
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
      outputItemStatus: (line.outputItemStatus as any) || (line.isSold ? ItemStatus.SOLD : 'Created' as any)
    };

    // Save the task
    await upsertTask(serviceTask);

    const link = makeLink(
      LinkType.SALE_TASK,
      { type: EntityType.SALE, id: sale.id },
      { type: EntityType.TASK, id: serviceTask.id }
    );
    await createLink(link);

    // Mark effect as complete
    await markEffect(taskCreatedKey);

    // Log the task creation
    await appendEntityLog(EntityType.TASK, serviceTask.id, LogEventType.CREATED, {
      name: serviceTask.name,
      createdFrom: 'service_sale',
      saleId: sale.id,
      serviceDescription: line.description,
      station: line.station
    }, sale.saleDate || serviceTask.createdAt);

    console.log(`[processServiceLine] ✅ Created task from service: ${serviceTask.name}`);

  } catch (error) {
    console.error(`[processServiceLine] ❌ Failed to process service sale line ${line.lineId}:`, error);
    throw error;
  }
}

/**
 * Ensure Sold Item entities exist for all item lines in a sale.
 * This runs INDEPENDENTLY of stock processing or line-change detection.
 * Each line gets its own idempotency key so it's safe to call on every save.
 * This is the single function that guarantees items appear in Sold Items tab + Archive.
 */
export async function ensureSoldItemEntities(sale: Sale): Promise<void> {
    const itemLines = (sale.lines || []).filter(
      (l): l is ItemSaleLine => l.kind === 'item' && 'itemId' in l && !!l.itemId
    );

    const bundleLines = (sale.lines || []).filter(
      (l): l is BundleSaleLine => l.kind === 'bundle' && 'itemId' in l && !!l.itemId
    );

    if (itemLines.length === 0 && bundleLines.length === 0) return;

    console.log(`[ensureSoldItemEntities] Ensuring ${itemLines.length} item + ${bundleLines.length} bundle sold item entities for sale: ${sale.id}`);

    // Import utility functions once for both loops
    const { calculateClosingDate, formatMonthKey, formatDisplayDate } = await import('@/lib/utils/date-utils');
    const { kvSAdd } = await import('@/data-store/kv');
    const { buildArchiveMonthsKey, buildMonthIndexKey } = await import('@/data-store/keys');

    let changedLines = false;
    const newLines = [...(sale.lines || [])];

    // Process individual item lines
    for (let i = 0; i < newLines.length; i++) {
      const line = newLines[i];
      if (line.kind !== 'item' || !line.itemId) continue;

      const lineId = line.lineId || line.itemId; 
      const originalItemId = line.itemId;

      // Do not clone an item that is already a clone
      if (originalItemId.includes('-sold-')) continue;

      const cloneId = `${originalItemId}-sold-${lineId}`;
      const effectKey = EffectKeys.sideEffect('sale', sale.id, `soldItemEntity:${lineId}`);

      if (!(await hasEffect(effectKey))) {
        const item = await getItemById(originalItemId);
        if (!item) {
          console.warn(`[ensureSoldItemEntities] Item not found: ${originalItemId}, skipping`);
          continue;
        }

        // Create the Sold Item entity
        const soldItemEntity: Item = {
          ...item,
          id: cloneId, // Unique per sale line
          name: item.name,
          status: ItemStatus.SOLD,
          isCollected: sale.isCollected || false,
          stock: [{ siteId: sale.siteId || item.stock?.[0]?.siteId || 'Home', quantity: 0 }], // Sale site, qty 0 (historical)
          quantitySold: line.quantity || 0,
          soldAt: sale.saleDate || new Date(),
          price: line.unitPrice,
          value: (line.unitPrice || 0) * (line.quantity || 0),
          sourceRecordId: sale.id, // Link back to sale
          ownerCharacterId: sale.customerId || item.ownerCharacterId || null, // Customer from sale
          updatedAt: new Date(),
          description: `Sold in ${sale.counterpartyName || 'Sale'} (${formatDisplayDate(sale.saleDate || new Date())})`
        };

        // Persist the Sold Item entity (skip workflows to avoid duplicate logs)
        await upsertItem(soldItemEntity, { skipWorkflowEffects: true });

        // IMPORTANT: Prevent double-counting in summaries.
        // If the original item already registered this sale (via processItemSaleLine), 
        // we must decrement it from the original item since it's now tracked by the clone.
        const stockEffectKey = EffectKeys.sideEffect('sale', sale.id, `stockDecremented:${lineId}`);
        if (await hasEffect(stockEffectKey)) {
          const updatedOriginal = {
            ...item,
            quantitySold: Math.max(0, item.quantitySold - (line.quantity || 0)),
            updatedAt: new Date()
          };
          // If it was SOLD but now has 0 quantitySold, revert to FOR_SALE
          if (updatedOriginal.quantitySold === 0 && (item.status === ItemStatus.SOLD || (item.status as string) === 'ItemStatus.SOLD')) {
            updatedOriginal.status = ItemStatus.FOR_SALE;
          }
          await upsertItem(updatedOriginal, { skipWorkflowEffects: true });
          console.log(`[ensureSoldItemEntities] Double-count prevention: Decremented ${line.quantity} from original ${item.id}`);
        }

        // Register in Monthly Archive Index
        const archiveMonth = calculateClosingDate(soldItemEntity.soldAt || new Date());
        const monthKey = formatMonthKey(archiveMonth);
        await kvSAdd(buildMonthIndexKey(EntityType.ITEM, monthKey), soldItemEntity.id);
        await kvSAdd(buildArchiveCollectionIndexKey('items', monthKey), soldItemEntity.id);
        await kvSAdd(buildArchiveMonthsKey(), monthKey);

        // Create SALE_ITEM link for the sold item entity
        const soldItemLink = makeLink(
          LinkType.SALE_ITEM,
          { type: EntityType.SALE, id: sale.id },
          { type: EntityType.ITEM, id: soldItemEntity.id }
        );
        await createLink(soldItemLink);

        await markEffect(effectKey);
        console.log(`[ensureSoldItemEntities] ✅ Created: ${soldItemEntity.id} (${item.name} x${line.quantity} @ $${line.unitPrice}) → ${monthKey}`);
      }

      // Update the line to point to the clone ID (unconditionally to allow migration of old sales)
      newLines[i] = { ...line, itemId: cloneId };
      changedLines = true;
    }

    // Process bundle lines - create Sold Item entities for bundles too
    for (let i = 0; i < newLines.length; i++) {
        const line = newLines[i];
        if (line.kind !== 'bundle' || !line.itemId) continue;

        const lineId = line.lineId || line.itemId;
        const originalItemId = line.itemId;
        
        // Do not clone an item that is already a clone
        if (originalItemId.includes('-sold-')) continue;
        
        const cloneId = `${originalItemId}-sold-bundle-${lineId}`;
        const effectKey = EffectKeys.sideEffect('sale', sale.id, `soldItemEntity:bundle:${lineId}`);

        if (!(await hasEffect(effectKey))) {
            const bundleItem = await getItemById(originalItemId);
            if (!bundleItem) {
                console.warn(`[ensureSoldItemEntities] Bundle item not found: ${originalItemId}, skipping`);
                continue;
            }

            // Create Sold Item entity for the bundle
            const soldBundleItemEntity: Item = {
                ...bundleItem,
                id: cloneId, // Unique per sale line
                name: bundleItem.name,
                status: ItemStatus.SOLD,
                isCollected: sale.isCollected || false,
                stock: [{ siteId: sale.siteId || bundleItem.stock?.[0]?.siteId || 'Home', quantity: 0 }], // Sale site, qty 0 (historical)
                quantitySold: line.quantity || 0,
                soldAt: sale.saleDate || new Date(),
                price: line.unitPrice,
                value: (line.unitPrice || 0) * (line.quantity || 0),
                sourceRecordId: sale.id, // Link back to sale
                ownerCharacterId: sale.customerId || bundleItem.ownerCharacterId || null, // Customer from sale
                updatedAt: new Date(),
                description: `Bundle Sold in ${sale.counterpartyName || 'Sale'} (${formatDisplayDate(sale.saleDate || new Date())}) - ${line.quantity} bundles`
            };

            // Persist the Sold Bundle Item entity
            await upsertItem(soldBundleItemEntity, { skipWorkflowEffects: true });

            // Prevent double-counting for bundle items
            const bundleEffectKey = EffectKeys.sideEffect('sale', sale.id, `bundleProcessed:${lineId}`);
            if (await hasEffect(bundleEffectKey)) {
                const updatedBundle = {
                    ...bundleItem,
                    quantitySold: Math.max(0, (bundleItem.quantitySold || 0) - (line.quantity || 0)),
                    updatedAt: new Date()
                };
                if (updatedBundle.quantitySold === 0 && (bundleItem.status === ItemStatus.SOLD || (bundleItem.status as string) === 'ItemStatus.SOLD')) {
                    updatedBundle.status = ItemStatus.FOR_SALE;
                }
                await upsertItem(updatedBundle, { skipWorkflowEffects: true });
                console.log(`[ensureSoldItemEntities] Double-count prevention: Decremented ${line.quantity} from original bundle ${bundleItem.id}`);
            }

            // Register in Monthly Archive Index
            const bundleArchiveMonth = calculateClosingDate(soldBundleItemEntity.soldAt as Date || new Date());
            const bundleMonthKey = formatMonthKey(bundleArchiveMonth);
            await kvSAdd(buildMonthIndexKey(EntityType.ITEM, bundleMonthKey), soldBundleItemEntity.id);
            await kvSAdd(buildArchiveCollectionIndexKey('items', bundleMonthKey), soldBundleItemEntity.id);
            await kvSAdd(buildArchiveMonthsKey(), bundleMonthKey);

            // Create SALE_ITEM link for the sold bundle entity
            const soldBundleItemLink = makeLink(
                LinkType.SALE_ITEM,
                { type: EntityType.SALE, id: sale.id },
                { type: EntityType.ITEM, id: soldBundleItemEntity.id }
            );
            await createLink(soldBundleItemLink);

            await markEffect(effectKey);
            console.log(`[ensureSoldItemEntities] ✅ Created bundle: ${soldBundleItemEntity.id} (${bundleItem.name} x${line.quantity} bundles @ $${line.unitPrice}) → ${bundleMonthKey}`);
        }

        // Update the line to point to the clone ID (unconditionally)
        newLines[i] = { ...line, itemId: cloneId };
        changedLines = true;
    }

    // Persist the sale with updated line itemIds pointing exactly to the clones
    if (changedLines) {
      console.log(`[ensureSoldItemEntities] Updating sale ${sale.id} to explicitly point to sold item entities.`);
      const { upsertSale } = await import('@/data-store/datastore');
      await upsertSale({ ...sale, lines: newLines }, { skipWorkflowEffects: true, skipLinkEffects: true });
    }
}
