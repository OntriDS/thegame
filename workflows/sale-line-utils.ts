// workflows/sale-line-utils.ts
// Sale line processing utilities

import type { Sale, Item, ItemSaleLine, ServiceLine, Task } from '@/types/entities';
import { LinkType, EntityType, LogEventType, ItemStatus } from '@/types/enums';
import { getItemById, upsertItem } from '@/data-store/datastore';
import { upsertTask } from '@/data-store/datastore';
import { makeLink } from '@/links/links-workflows';
import { createLink } from '@/links/link-registry';
import { hasEffect, markEffect } from '@/data-store/effects-registry';
import { EffectKeys, buildArchiveCollectionIndexKey, buildArchiveMonthsKey, buildMonthIndexKey } from '@/data-store/keys';
import { calculateClosingDate, formatMonthKey, formatDisplayDate, saleReferenceDateForItemSoldAndLog } from '@/lib/utils/date-utils';
import { appendEntityLog } from './entities-logging';
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
        case 'service':
          await processServiceLine(line as ServiceLine, sale);
          break;
        default:
          console.warn(`[processSaleLines] Unknown line kind: ${(line as any).kind}`);
      }
    }

    // Financial records from sales are created/updated only in onSaleUpsert → updateFinancialRecordsFromSale
    // (creating them here duplicated finrecs on every charged resave).

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

    // Live inventory: only adjust site stock — do not bump quantitySold or soldAt (sold row holds that).
    const updatedItem = {
      ...item,
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

    // SOLD item logs: only on the sold-item row (see ensureItemSoldLogsFromSale after ensureSoldItemEntities), not the live inventory id.

    console.log(`[processItemSaleLine] ✅ Processed item sale: ${item.name} x${line.quantity}`);

  } catch (error) {
    console.error(`[processItemSaleLine] ❌ Failed to process item sale line ${line.lineId}:`, error);
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

    if (itemLines.length === 0) return;

    console.log(`[ensureSoldItemEntities] Ensuring ${itemLines.length} item sold entities for sale: ${sale.id}`);

    const { calculateClosingDate, formatMonthKey, formatDisplayDate } = await import('@/lib/utils/date-utils');
    const { kvSAdd } = await import('@/data-store/kv');
    const { buildArchiveMonthsKey, buildMonthIndexKey } = await import('@/data-store/keys');

    let changedLines = false;
    const newLines = [...(sale.lines || [])];

    for (let i = 0; i < newLines.length; i++) {
      const line = newLines[i];
      if (line.kind !== 'item' || !line.itemId) continue;

      const lineId = line.lineId || line.itemId;
      const originalItemId = line.itemId;

      if (originalItemId.includes('-sold-')) continue;

      const primaryCloneId = `${originalItemId}-sold-${lineId}`;
      const legacyCloneId = `${originalItemId}-sold-bundle-${lineId}`;
      const effectKey = EffectKeys.sideEffect('sale', sale.id, `soldItemEntity:${lineId}`);
      const legacyBundleEffectKey = EffectKeys.sideEffect('sale', sale.id, `soldItemEntity:bundle:${lineId}`);

      const hasPrimaryEffect = await hasEffect(effectKey);
      const hasLegacyEffect = await hasEffect(legacyBundleEffectKey);

      if (!hasPrimaryEffect && !hasLegacyEffect) {
        const item = await getItemById(originalItemId);
        if (!item) {
          console.warn(`[ensureSoldItemEntities] Item not found: ${originalItemId}, skipping`);
          continue;
        }

        const refDate = saleReferenceDateForItemSoldAndLog(sale);
        const soldItemEntity: Item = {
          ...item,
          id: primaryCloneId,
          name: item.name,
          status: ItemStatus.SOLD,
          isCollected: sale.isCollected || false,
          stock: [{ siteId: sale.siteId || item.stock?.[0]?.siteId || '', quantity: 0 }],
          quantitySold: line.quantity || 0,
          soldAt: refDate,
          price: line.unitPrice,
          value: (line.unitPrice || 0) * (line.quantity || 0),
          sourceRecordId: sale.id,
          ownerCharacterId: sale.customerId || item.ownerCharacterId || null,
          updatedAt: new Date(),
          description: `Sold in ${sale.counterpartyName || 'Sale'} (${formatDisplayDate(refDate)})`
        };

        await upsertItem(soldItemEntity, { skipWorkflowEffects: true });

        const archiveMonth = calculateClosingDate(soldItemEntity.soldAt || new Date());
        const monthKey = formatMonthKey(archiveMonth);
        await kvSAdd(buildMonthIndexKey(EntityType.ITEM, monthKey), soldItemEntity.id);
        await kvSAdd(buildArchiveCollectionIndexKey('items', monthKey), soldItemEntity.id);
        await kvSAdd(buildArchiveMonthsKey(), monthKey);

        const soldItemLink = makeLink(
          LinkType.SALE_ITEM,
          { type: EntityType.SALE, id: sale.id },
          { type: EntityType.ITEM, id: soldItemEntity.id }
        );
        await createLink(soldItemLink);

        await markEffect(effectKey);
        console.log(`[ensureSoldItemEntities] ✅ Created: ${soldItemEntity.id} (${item.name} x${line.quantity} @ $${line.unitPrice}) → ${monthKey}`);
      } else if (!hasPrimaryEffect && hasLegacyEffect && (await getItemById(legacyCloneId))) {
        await markEffect(effectKey);
      }

      const primaryRow = await getItemById(primaryCloneId);
      const legacyRow = await getItemById(legacyCloneId);
      const resolvedCloneId = primaryRow ? primaryCloneId : legacyRow ? legacyCloneId : primaryCloneId;
      newLines[i] = { ...(line as ItemSaleLine), itemId: resolvedCloneId };
      changedLines = true;
    }

    if (changedLines) {
      console.log(`[ensureSoldItemEntities] Updating sale ${sale.id} to explicitly point to sold item entities.`);
      const { upsertSale } = await import('@/data-store/datastore');
      await upsertSale({ ...sale, lines: newLines }, { skipWorkflowEffects: true, skipLinkEffects: true });
    }
}
