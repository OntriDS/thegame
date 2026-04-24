// workflows/sale-line-utils.ts
// Sale line processing utilities

import type { Sale, Item, ItemSaleLine, ServiceLine, Task } from '@/types/entities';
import { LinkType, EntityType, LogEventType, ItemStatus, SaleStatus } from '@/types/enums';
import { getItemById, upsertItem, deleteItem } from '@/data-store/datastore';
import { upsertTask } from '@/data-store/datastore';
import { makeLink } from '@/links/links-workflows';
import { createLink } from '@/links/link-registry';
import { clearEffect, hasEffect, markEffect } from '@/data-store/effects-registry';
import { EffectKeys, buildArchiveMonthsKey, buildMonthIndexKey } from '@/data-store/keys';
import { formatForDisplay } from '@/lib/utils/date-display-utils';
import { getUTCNow, formatArchiveMonthKeyUTC } from '@/lib/utils/utc-utils';
import { appendEntityLog, getMonthKeyFromTimestamp } from './entities-logging';
import { ORDER_INCREMENT } from '@/lib/constants/app-constants';
import { getItemCharacterId } from '@/lib/item-character-id';
import { getSaleCharacterId } from '@/lib/sale-character-id';

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

    // [OVERSELL WARNING] If insufficient stock, warn user but allow sale to proceed
    // User confirmation should happen in UI layer (Sales Modal) before calling this workflow
    if (requiredTotal > currentStock) {
      const shortage = requiredTotal - currentStock;
      console.warn(`[processItemSaleLine] ⚠️ Overselling item ${item.name}. Required: ${requiredTotal}, Available: ${currentStock}, Shortage: ${shortage}`);
      console.warn(`[processItemSaleLine] ⚠️ This should have been validated in UI layer with user confirmation`);

      // For now, we'll auto-adjust stock to allow the sale to proceed
      // TODO: UI validation should handle this with user confirmation
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
    let updatedItem = {
      ...item,
      updatedAt: getUTCNow(),
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

    // Calculate remaining stock after sale
    const remainingStock = updatedItem.stock.reduce((sum, stockPoint) => sum + stockPoint.quantity, 0);

    // Handle keepInInventoryAfterSold logic
    const shouldKeepInInventory = item.keepInInventoryAfterSold ?? false;

    // Handle restockToTarget logic (mainly for Network Sales)
    const shouldRestockToTarget = item.restockToTarget ?? false;
    const targetAmount = item.targetAmount || 0;

    if (shouldRestockToTarget && targetAmount > 0) {
      // Restock to target quantity (consignment behavior)
      updatedItem = {
        ...updatedItem,
        status: ItemStatus.FOR_SALE,
        quantitySold: 0, // Always 0 for inventory items
        stock: [{ siteId: sale.siteId || updatedItem.stock[0]?.siteId || '', quantity: targetAmount }],
        updatedAt: getUTCNow()
      };
      await upsertItem(updatedItem, { skipWorkflowEffects: true });
      console.log(`[processItemSaleLine] 🔄 Restocked ${item.name} to target quantity ${targetAmount}`);
    } else if (shouldKeepInInventory || remainingStock > 0) {
      // Keep item in inventory - either because toggle is ON or there's still stock
      updatedItem = {
        ...updatedItem,
        status: ItemStatus.FOR_SALE, // Keep item active
        quantitySold: 0, // Always 0 for inventory items
        updatedAt: getUTCNow()
      };

      // Save the updated item (Skip generic workflow to avoid duplicate logs)
      await upsertItem(updatedItem, { skipWorkflowEffects: true });
    } else {
      // Not keeping in inventory AND no stock remaining - delete the item
      await deleteItem(item.id);
      console.log(`[processItemSaleLine] 🗑️ Deleted inventory item ${item.id} (${item.name}) - quantity reached 0`);
    }

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
      createdAt: getUTCNow(),
      updatedAt: getUTCNow(),
      links: [],
      // Ambassador Fields - inherit from sale
      siteId: sale.siteId,
      targetSiteId: line.taskTargetSiteId || undefined,
      sourceSaleId: sale.id, // Link task back to sale
      characterId: getSaleCharacterId(sale),
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
      outputItemStatus: line.outputItemStatus || (line.isSold ? ItemStatus.SOLD : ItemStatus.CREATED)
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

function stripToInventoryBaseForLine(itemId: string, lineId: string): string {
  if (!itemId.includes('-sold-')) return itemId;
  const suf = `-sold-${lineId}`;
  if (itemId.endsWith(suf)) return itemId.slice(0, -suf.length);
  const bundleSuf = `-sold-bundle-${lineId}`;
  if (itemId.endsWith(bundleSuf)) return itemId.slice(0, -bundleSuf.length);
  return itemId;
}

async function ensureSaleItemLink(saleId: string, soldItemId: string): Promise<void> {
  const soldItemLink = makeLink(
    LinkType.SALE_ITEM,
    { type: EntityType.SALE, id: saleId },
    { type: EntityType.ITEM, id: soldItemId }
  );
  await createLink(soldItemLink);
}

/**
 * Ensure Sold Item entities exist for all item lines in a sale.
 * This runs INDEPENDENTLY of stock processing or line-change detection.
 * Each line gets its own idempotency key so it's safe to call on every save.
 * This is the single function that guarantees items appear in Sold Items tab + Archive.
 *
 * Heals: deleted KV clone while effect flag still set (recreates row + SALE_ITEM);
 * ghost composite line.itemId (strips to inventory base then materializes);
 * line left on inventory id after clone delete (clears stale effect, recreates clone).
 */
export async function ensureSoldItemEntities(sale: Sale, previousSale?: Sale): Promise<void> {
    const itemLines = (sale.lines || []).filter(
      (l): l is ItemSaleLine => l.kind === 'item' && 'itemId' in l && !!l.itemId
    );

    if (itemLines.length === 0) return;

    console.log(`[ensureSoldItemEntities] Ensuring ${itemLines.length} item sold entities for sale: ${sale.id}`);

    const { kvSAdd } = await import('@/lib/utils/kv');

    let changedLines = false;
    const newLines = [...(sale.lines || [])];

    for (let i = 0; i < newLines.length; i++) {
      const line = newLines[i];
      if (line.kind !== 'item' || !line.itemId?.trim()) continue;

      const lineId = (line as ItemSaleLine).lineId?.trim() || line.itemId;
      let working = newLines[i] as ItemSaleLine;

      const rowAtLineId = await getItemById(working.itemId);
      if (
        rowAtLineId &&
        rowAtLineId.status === ItemStatus.SOLD &&
        rowAtLineId.sourceRecordId === sale.id
      ) {
        await ensureSaleItemLink(sale.id, working.itemId);
        continue;
      }

      let inventoryBaseId = working.itemId;
      if (working.itemId.includes('-sold-')) {
        const suf = `-sold-${lineId}`;
        const bundleSuf = `-sold-bundle-${lineId}`;
        let stripped: string | null = null;
        if (working.itemId.endsWith(suf)) {
          stripped = working.itemId.slice(0, -suf.length);
        } else if (working.itemId.endsWith(bundleSuf)) {
          stripped = working.itemId.slice(0, -bundleSuf.length);
        }
        if (stripped) {
          inventoryBaseId = stripped;
          working = { ...working, itemId: stripped };
          newLines[i] = working;
          changedLines = true;
        } else {
          console.warn(
            `[ensureSoldItemEntities] Cannot strip inventory base from ${working.itemId} (lineId=${lineId}, sale ${sale.id})`
          );
          continue;
        }
      }

      const primaryCloneId = `${inventoryBaseId}-sold-${lineId}`;
      const legacyCloneId = `${inventoryBaseId}-sold-bundle-${lineId}`;
      const effectKey = EffectKeys.sideEffect('sale', sale.id, `soldItemEntity:${lineId}`);
      const legacyBundleEffectKey = EffectKeys.sideEffect('sale', sale.id, `soldItemEntity:bundle:${lineId}`);

      if (previousSale?.lines?.length) {
        const prevLine = previousSale.lines.find(
          (l): l is ItemSaleLine =>
            l.kind === 'item' &&
            !!l.itemId?.trim() &&
            (l.lineId?.trim() || l.itemId) === lineId
        );
        if (prevLine?.itemId) {
          const prevBase = stripToInventoryBaseForLine(prevLine.itemId, lineId);
          if (prevBase !== inventoryBaseId) {
            await clearEffect(effectKey);
            await clearEffect(legacyBundleEffectKey);
            console.warn(
              `[ensureSoldItemEntities] Inventory base changed for line ${lineId} (${prevBase} → ${inventoryBaseId}); cleared sold-item effects for sale ${sale.id}`
            );
          }
        }
      }

      let hasPrimaryEffect = await hasEffect(effectKey);
      let hasLegacyEffect = await hasEffect(legacyBundleEffectKey);

      let primaryRow = await getItemById(primaryCloneId);
      let legacyRow = await getItemById(legacyCloneId);

      if ((hasPrimaryEffect || hasLegacyEffect) && !primaryRow && !legacyRow) {
        await clearEffect(effectKey);
        await clearEffect(legacyBundleEffectKey);
        hasPrimaryEffect = false;
        hasLegacyEffect = false;
        console.warn(
          `[ensureSoldItemEntities] Stale sold-item effect cleared (clone missing KV). Recreating for line ${lineId}, sale ${sale.id}`
        );
      }

      if (!hasPrimaryEffect && !hasLegacyEffect) {
        const item = await getItemById(inventoryBaseId);
        if (!item) {
          console.warn(`[ensureSoldItemEntities] Inventory item not found: ${inventoryBaseId}, skipping`);
          continue;
        }

        const refDate = (() => {
          // Inlined saleReferenceDateForItemSoldAndLog — uses top-level SaleStatus import
          const isCollected = sale.status === SaleStatus.COLLECTED || !!sale.isCollected;
          const toValid = (v: unknown): Date | null => {
            if (v == null || v === '') return null;
            const d = v instanceof Date ? v : new Date(v as string);
            return Number.isFinite(d.getTime()) ? d : null;
          };
          if (isCollected) { const c = toValid(sale.collectedAt); if (c) return c; }
          const done = toValid(sale.doneAt); if (done) return done;
          const sd = toValid(sale.saleDate); if (sd) return sd;
          return getUTCNow();
        })();
        const soldItemEntity: Item = {
          ...item,
          id: primaryCloneId,
          name: item.name,
          status: ItemStatus.SOLD,
          stock: [{ siteId: sale.siteId || item.stock?.[0]?.siteId || '', quantity: 0 }],
          quantitySold: working.quantity || 0,
          soldAt: refDate,
          price: working.unitPrice,
          value: (working.unitPrice || 0) * (working.quantity || 0),
          sourceRecordId: sale.id,
          characterId: getSaleCharacterId(sale) || getItemCharacterId(item) || null,
          updatedAt: getUTCNow(),
          description: `Sold in ${sale.counterpartyName || 'Sale'} (${formatForDisplay(refDate)})`
        };

        await upsertItem(soldItemEntity, { skipWorkflowEffects: true });

        const monthKey = formatArchiveMonthKeyUTC(
          soldItemEntity.soldAt instanceof Date ? soldItemEntity.soldAt : getUTCNow()
        );
        await kvSAdd(buildMonthIndexKey(EntityType.ITEM, monthKey), soldItemEntity.id);
        await kvSAdd(buildArchiveMonthsKey(), monthKey);

        await ensureSaleItemLink(sale.id, soldItemEntity.id);

        await markEffect(effectKey);
        console.log(
          `[ensureSoldItemEntities] ✅ Created: ${soldItemEntity.id} (${item.name} x${working.quantity} @ $${working.unitPrice}) → ${monthKey}`
        );
      } else if (!hasPrimaryEffect && hasLegacyEffect && legacyRow) {
        await markEffect(effectKey);
      }

      primaryRow = await getItemById(primaryCloneId);
      legacyRow = await getItemById(legacyCloneId);
      const resolvedCloneId = primaryRow ? primaryCloneId : legacyRow ? legacyCloneId : null;

      if (!resolvedCloneId) {
        console.warn(
          `[ensureSoldItemEntities] No sold row after ensure (line ${lineId}, sale ${sale.id}, base ${inventoryBaseId})`
        );
        continue;
      }

      const soldCloneForLog = await getItemById(resolvedCloneId);
      if (!soldCloneForLog) {
        console.warn(
          `[ensureSoldItemEntities] Sold clone not found while logging (line ${lineId}, sale ${sale.id}, clone ${resolvedCloneId})`
        );
        continue;
      }

      const parsedSoldTimestamp = soldCloneForLog.soldAt
        ? new Date(soldCloneForLog.soldAt)
        : null;
      const logTimestamp =
        parsedSoldTimestamp && Number.isFinite(parsedSoldTimestamp.getTime())
          ? parsedSoldTimestamp
          : getUTCNow();

      // Ensure the Sold clone has an explicit SOLD lifecycle log for the sold-items tab.
      // We append by idempotent event dedupe (same entity + event in month) to avoid duplicates.
      await appendEntityLog(EntityType.ITEM, resolvedCloneId, LogEventType.SOLD, {
        name: soldCloneForLog.name || 'Unknown Item',
        itemType: soldCloneForLog.type,
        subItemType: soldCloneForLog.subItemType,
        soldQuantity: working.quantity || 0,
      }, logTimestamp);

      if (working.itemId !== resolvedCloneId) {
        newLines[i] = { ...working, itemId: resolvedCloneId };
        changedLines = true;
      }
      await ensureSaleItemLink(sale.id, resolvedCloneId);
    }

    if (changedLines) {
      console.log(`[ensureSoldItemEntities] Updating sale ${sale.id} to explicitly point to sold item entities.`);
      const { upsertSale } = await import('@/data-store/datastore');
      await upsertSale({ ...sale, lines: newLines }, { skipWorkflowEffects: true, skipLinkEffects: true });
    }
}

