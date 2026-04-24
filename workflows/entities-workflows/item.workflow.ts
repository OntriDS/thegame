// workflows/entities-workflows/item.workflow.ts
// Item-specific workflow: SOLD drives archive; points only on tasks/sales

import { EntityType, LogEventType } from '@/types/enums';
import type { Item } from '@/types/entities';
import { ItemStatus } from '@/types/enums';
import { appendEntityLog, updateEntityLeanFields, removeLogEntriesAcrossMonths } from '../entities-logging';
import { hasEffect, markEffect, clearEffect, clearEffectsByPrefix } from '@/data-store/effects-registry';
import { EffectKeys } from '@/data-store/keys';
import { getLinksFor, removeLink } from '@/links/link-registry';
import { deleteItem } from '@/data-store/datastore';
import { getCategoryForItemType } from '@/lib/utils/searchable-select-utils';
import { createCharacterFromItem } from '../character-creation-utils';
import {
  upsertItem,
  getItemById,
  getAvailableArchiveMonths,
  getAllTasks,
  getTaskById,
  upsertTask,
  getPlayerById,
  upsertPlayer,
  getAllCharacters,
  upsertCharacter,
} from '@/data-store/datastore';
import { entityHasLogEvent } from '@/lib/utils/entity-log-scan';
import { formatForDisplay } from '@/lib/utils/date-display-utils';
import { isSoldStatus } from '@/lib/utils/status-utils';
import { getUTCNow, endOfMonthUTC, formatArchiveMonthKeyUTC } from '@/lib/utils/utc-utils';
import { buildArchiveMonthsKey } from '@/data-store/keys';
import { getItemCharacterId } from '@/lib/item-character-id';

const STATE_FIELDS = ['status', 'stock', 'quantitySold'];

export async function onItemUpsert(item: Item, previousItem?: Item): Promise<void> {
  // New item creation
  if (!previousItem) {
    const effectKey = EffectKeys.created('item', item.id);
    if (await hasEffect(effectKey)) return;

    // Log item creation with standard pattern + source tracking
    const totalQuantity = item.stock?.reduce((sum: number, stock: any) => sum + stock.quantity, 0) || 0;
    
    await appendEntityLog(EntityType.ITEM, item.id, LogEventType.CREATED, {
      name: item.name,
      itemType: item.type,
      subItemType: item.subItemType || '',
      quantity: totalQuantity,
      soldQuantity: 0 // It's newly created, not sold yet
    }, item.createdAt);

    await markEffect(effectKey);

    // Character creation from emissary fields - when newOwnerName is provided
    if (item.newOwnerName && !getItemCharacterId(item)) {
      const characterEffectKey = EffectKeys.sideEffect('item', item.id, 'characterCreated');
      if (!(await hasEffect(characterEffectKey))) {
        const createdCharacter = await createCharacterFromItem(item);
        if (createdCharacter) {
          // Update item with the created character ID
          const updatedItem = { ...item, characterId: createdCharacter.id };
          await upsertItem(updatedItem, { skipWorkflowEffects: true });
          await markEffect(characterEffectKey);
        }
      }
    }

    return;
  }

  // Status changes - UPDATED event (when not sold)
  if (previousItem.status !== item.status) {
    if (!isSoldStatus(item.status)) {
      await appendEntityLog(EntityType.ITEM, item.id, LogEventType.UPDATED, {
        name: item.name,
        itemType: item.type,
        subItemType: item.subItemType,
        soldQuantity: 1
      }, item.updatedAt || getUTCNow());
    }
  }

  // Manual SOLD status change - detect when status changes to SOLD without quantitySold change (not via sale)
  // ==========================================
  // UNIFIED MANUAL SALE & RESTOCK WORKFLOW
  // Triggered ONLY when status is explicitly set to SOLD in the modal
  // ==========================================
  const statusChangedToSold = !isSoldStatus(previousItem.status) && isSoldStatus(item.status);
  const manualQuantitySoldDelta = (item.quantitySold || 0) - (previousItem.quantitySold || 0);

  if (isSoldStatus(item.status) && (statusChangedToSold || manualQuantitySoldDelta > 0)) {
    const manualSoldEffectKey = EffectKeys.sideEffect('item', item.id, `manualSold-${Date.now()}`);
    if (await hasEffect(manualSoldEffectKey)) return;

    const previousStockTotal = previousItem.stock?.reduce((sum, sp) => sum + sp.quantity, 0) || 0;
    
    // 1. Determine how many we are selling in this transaction
    let quantityToSell = 0;
    if (manualQuantitySoldDelta > 0) {
      quantityToSell = manualQuantitySoldDelta; // User explicitly typed a new Sold Q (e.g. 16 out of 26)
    } else {
      quantityToSell = previousStockTotal; // User just flipped status to Sold, meaning "sell everything on shelf"
    }

    if (quantityToSell <= 0) {
      await markEffect(manualSoldEffectKey);
      return;
    }

    const soldAt = item.soldAt || getUTCNow();
    const monthKey = formatArchiveMonthKeyUTC(soldAt);
    const primarySite = item.stock?.[0]?.siteId || 'Home';

    // 2. CREATE THE SOLD BATCH CLONE FOR THE ARCHIVE (Sold Items Tab)
    const cloneId = `${item.id}-manualsold-${Date.now()}`;
    const soldItemClone: Item = {
      ...item,
      id: cloneId,
      status: ItemStatus.SOLD,
      stock: [{ siteId: primarySite, quantity: 0 }],
      quantitySold: quantityToSell,
      soldAt: soldAt,
      sourceRecordId: 'manual', 
      updatedAt: getUTCNow()
    };
    
    await upsertItem(soldItemClone, { skipWorkflowEffects: true });
    
    // THEGAME MARCH FIX: Standardize on monthly index, no 'collected' archive for items
    const { buildMonthIndexKey } = await import('@/data-store/keys');
    const { kvSAdd } = await import('@/lib/utils/kv');
    await kvSAdd(buildMonthIndexKey(EntityType.ITEM, monthKey), cloneId);
    await kvSAdd(buildArchiveMonthsKey(), monthKey);

    // 3. MANAGE THE BASE ITEM (Inventory Shell)
    let updatedBaseItem: Item;
    const remainingStock = Math.max(0, previousStockTotal - quantityToSell);

    const shouldKeepInInventory = item.keepInInventoryAfterSold ?? false;

    // Handle restockToTarget logic (consignment behavior)
    const shouldRestockToTarget = item.restockToTarget ?? false;
    const targetAmount = item.targetAmount || 0;

    if (shouldRestockToTarget && targetAmount > 0) {
      // Restock to target quantity (consignment behavior)
      updatedBaseItem = {
        ...item,
        status: ItemStatus.FOR_SALE,
        quantitySold: 0, // Always 0 for inventory items
        stock: [{ siteId: primarySite, quantity: targetAmount }],
        updatedAt: getUTCNow()
      };
      await upsertItem(updatedBaseItem, { skipWorkflowEffects: true });
      console.log(`[markItemAsSold] 🔄 Restocked ${item.name} to target quantity ${targetAmount}`);
    } else if (shouldKeepInInventory || remainingStock > 0) {
      // Keep item in inventory - either because toggle is ON or there's still stock
      updatedBaseItem = {
        ...item,
        status: ItemStatus.FOR_SALE, // Keep item active
        quantitySold: 0, // Always 0 for inventory items
        stock: [{ siteId: primarySite, quantity: remainingStock }],
        updatedAt: getUTCNow()
      };
      await upsertItem(updatedBaseItem, { skipWorkflowEffects: true });
    } else {
      // Not keeping in inventory AND no stock remaining - delete the item
      await deleteItem(item.id);
      console.log(`[markItemAsSold] 🗑️ Deleted inventory item ${item.id} (${item.name}) - quantity reached 0`);
      // No need to save updatedBaseItem
    }

    // 4. LOG EVENT & HANDLE POINTS
    await appendEntityLog(EntityType.ITEM, item.id, LogEventType.SOLD, {
      name: item.name,
      itemType: item.type,
      subItemType: item.subItemType,
      soldQuantity: quantityToSell
    }, item.soldAt || soldAt);

    // 5. LEAN SWEEPER (Since we return early, we must sweep manually here if needed)
    const leanFieldsChanged = previousItem.name !== item.name || previousItem.type !== item.type || previousItem.subItemType !== item.subItemType;
    if (leanFieldsChanged) {
      await updateEntityLeanFields(EntityType.ITEM, item.id, {
        name: item.name,
        itemType: item.type,
        subItemType: item.subItemType || '',
      });
    }

    await markEffect(manualSoldEffectKey);
    return; // Halt generic workflow so it doesn't overwrite our logic
  }

  // ==========================================
  // LEAN SWEEPER (Supports Clone Editing)
  // ==========================================
  const leanFieldsChanged =
    previousItem.name !== item.name ||
    previousItem.type !== item.type ||
    previousItem.subItemType !== item.subItemType;

  if (leanFieldsChanged) {
    // Map Clone IDs back to Base IDs to update the unified history log
    const baseItemId = item.id.includes('-sold-') ? item.id.split('-sold-')[0] : 
                       item.id.includes('-manualsold-') ? item.id.split('-manualsold-')[0] : 
                       item.id;
    
    await updateEntityLeanFields(EntityType.ITEM, baseItemId, {
      name: item.name,
      itemType: item.type,
      subItemType: item.subItemType || '',
    });
  }
  // Propagate changes to Tasks, Financials, and Sales to prevent name reversion
    const { 
      updateTasksFromItem, 
      updateFinancialRecordsFromItem,
      updateSalesFromItem 
    } = await import('../update-propagation-utils');
    
    await Promise.all([
      updateTasksFromItem(item, previousItem),
      updateFinancialRecordsFromItem(item, previousItem),
      updateSalesFromItem(item, previousItem)
    ]);
  // ==========================================
  // DETERMINISTIC ARCHIVE INDEXING + LOG SYNC
  // Safely synchronizes the item to the correct monthly index AND log based on exact dates.
  // This handles re-saves from the Sold Items Tab (fixing name, soldAt, quantity, etc.)
  // where no status change occurs so the SOLD event block above never fires.
  // ==========================================
  if (previousItem) {
    const isArchivable = isSoldStatus(item.status);

    if (isArchivable) {
      // Maintain month index (soldAt → createdAt)
      const currentTargetDate = item.soldAt || item.createdAt || getUTCNow();
      const targetMonth = formatArchiveMonthKeyUTC(currentTargetDate);

      const { kvSAdd, kvSRem } = await import('@/lib/utils/kv');
      const { buildMonthIndexKey } = await import('@/data-store/keys');

      // Remove from all other months to ensure single source of truth
      const allMonths = await getAvailableArchiveMonths();
      for (const m of allMonths) {
        if (m !== targetMonth) {
          await kvSRem(buildMonthIndexKey(EntityType.ITEM, m), item.id);
        }
      }

      // Add to the correct designated month
      await kvSAdd(buildMonthIndexKey(EntityType.ITEM, targetMonth), item.id);
      await kvSAdd(buildArchiveMonthsKey(), targetMonth);

      // ── Log Sync ──────────────────────────────────────────────────────────
      // When a sold item is re-saved for data correction (no status change),
      // no SOLD log event fires above. We must ensure a SOLD entry exists in
      // the target month's log. If one already exists (by entityId), update its
      // lean fields so the log reflects the corrected name/type/quantity.
      if (isSoldStatus(item.status)) {
        const { getEntityLogs } = await import('../entities-logging');
        const monthEntries = await getEntityLogs(EntityType.ITEM, { month: targetMonth });
        const existingEntry = monthEntries.find(
          (e: any) => e.entityId === item.id && String(e.event ?? '').toLowerCase() === 'sold'
        );

        if (existingEntry) {
          // Entry already exists — just patch the lean fields to reflect corrections
          await updateEntityLeanFields(EntityType.ITEM, item.id, {
            name: item.name,
            itemType: item.type,
            subItemType: item.subItemType || '',
          });
        } else {
          // No SOLD entry in this month yet — write one now so the item appears in the log
          await appendEntityLog(EntityType.ITEM, item.id, LogEventType.SOLD, {
            name: item.name,
            itemType: item.type,
            subItemType: item.subItemType,
            soldQuantity: item.quantitySold || 0,
          }, currentTargetDate);
        }
      }
    } else {
      // Clean up indexes if item reverts to an active inventory state
      const { kvSRem } = await import('@/lib/utils/kv');
      const { buildMonthIndexKey } = await import('@/data-store/keys');
      const allMonths = await getAvailableArchiveMonths();
      for (const m of allMonths) {
        await kvSRem(buildMonthIndexKey(EntityType.ITEM, m), item.id);
      }
    }
  }
}

/** Precision repair: append SOLD log when sold/collected state implies it but the row is missing. */
export async function ensureItemSoldLog(itemId: string): Promise<{
  success: boolean;
  noop?: boolean;
  error?: string;
}> {
  const item = await getItemById(itemId);
  if (!item) return { success: false, error: `Item not found: ${itemId}` };
  const impliesSold = isSoldStatus(item.status);
  if (!impliesSold) {
    return { success: false, error: 'Item is not sold; SOLD log not implied.' };
  }
  if (await entityHasLogEvent(EntityType.ITEM, itemId, 'sold')) {
    return { success: true, noop: true };
  }
  const ts = item.soldAt || item.createdAt || getUTCNow();
  await appendEntityLog(
    EntityType.ITEM,
    item.id,
    LogEventType.SOLD,
    {
      name: item.name,
      itemType: item.type,
      subItemType: item.subItemType || '',
      soldQuantity: item.quantitySold || 0,
    },
    ts
  );
  return { success: true };
}

/**
 * Remove item effects when item is deleted
 * Items can have entries in items log and related links
 */
export async function removeItemEffectsOnDelete(itemId: string): Promise<void> {
  try {

    // 1. Remove all Links related to this item
    const itemLinks = await getLinksFor({ type: EntityType.ITEM, id: itemId });

    for (const link of itemLinks) {
      try {
        await removeLink(link.id);
      } catch (error) {
        console.error(`[removeItemEffectsOnDelete] ❌ Failed to remove link ${link.id}:`, error);
      }
    }

    // 2. Clear all effects for this item
    await clearEffect(EffectKeys.created('item', itemId));
    await clearEffect(EffectKeys.sideEffect('item', itemId, 'characterCreated'));
    await clearEffectsByPrefix(EntityType.ITEM, itemId, 'financialLogged:');
    await clearEffectsByPrefix(EntityType.ITEM, itemId, 'pointsLogged:');

    // 3. Remove log entries from items log (monthly lists)
    await removeLogEntriesAcrossMonths(EntityType.ITEM, entry => entry.entityId === itemId);

    // Check and remove from character log if this item is owned by a character
    await removeLogEntriesAcrossMonths(EntityType.CHARACTER, entry => entry.itemId === itemId || entry.sourceItemId === itemId);

  } catch (error) {
    console.error('Error removing item effects:', error);
  }
}

/**
 * Process item creation effects when item is created
 * Handles side effects when item is created directly (not from task/record)
 */
export async function processItemCreationEffects(item: Item): Promise<void> {

  // Items created from Item Modal have NO financial effects
  // Items are just inventory/assets - financial effects come from Tasks/Records
  // This is different from Tasks/Records which have cost/revenue properties
}



