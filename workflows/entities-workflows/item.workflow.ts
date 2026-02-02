// workflows/entities-workflows/item.workflow.ts
// Item-specific workflow with MOVED, SOLD, COLLECTED events

import { EntityType, LogEventType } from '@/types/enums';
import type { Item } from '@/types/entities';
import { ItemStatus } from '@/types/enums';
import { appendEntityLog, updateEntityLogField } from '../entities-logging';
import { hasEffect, markEffect, clearEffect, clearEffectsByPrefix } from '@/data-store/effects-registry';
import { EffectKeys, buildLogKey } from '@/data-store/keys';
import { kvGet, kvSet } from '@/data-store/kv';
import { getLinksFor, removeLink } from '@/links/link-registry';
import { getCategoryForItemType } from '@/lib/utils/searchable-select-utils';
import { createCharacterFromItem } from '../character-creation-utils';
import { upsertItem } from '@/data-store/datastore';
import { createItemSnapshot } from '../snapshot-workflows';
import { formatMonthKey, calculateClosingDate } from '@/lib/utils/date-utils';

const STATE_FIELDS = ['status', 'stock', 'quantitySold', 'isCollected'];
const DESCRIPTIVE_FIELDS = ['name', 'description', 'price', 'unitCost', 'additionalCost', 'value'];

export async function onItemUpsert(item: Item, previousItem?: Item): Promise<void> {
  // New item creation
  if (!previousItem) {
    const effectKey = EffectKeys.created('item', item.id);
    if (await hasEffect(effectKey)) return;

    // Log item creation with standard pattern + source tracking
    const sourceType = item.sourceTaskId ? 'task' : item.sourceRecordId ? 'record' : 'direct';
    const sourceId = item.sourceTaskId || item.sourceRecordId || undefined;
    await appendEntityLog(EntityType.ITEM, item.id, LogEventType.CREATED, {
      name: item.name,
      itemType: item.type,
      station: item.station,
      collection: item.collection,
      status: item.status,
      quantity: item.stock?.reduce((sum: number, stock: any) => sum + stock.quantity, 0) || 0,
      unitCost: item.unitCost || 0,
      totalCost: (item.stock?.reduce((sum: number, stock: any) => sum + stock.quantity, 0) || 0) * (item.unitCost || 0),
      price: item.price || 0,
      sourceType,
      sourceId,
      subItemType: item.subItemType,
      description: `Item created from ${sourceType}: ${item.type} (${item.stock?.reduce((sum: number, stock: any) => sum + stock.quantity, 0) || 0}x)`
    });

    await markEffect(effectKey);

    // Character creation from emissary fields - when newOwnerName is provided
    if (item.newOwnerName && !item.ownerCharacterId) {
      const characterEffectKey = EffectKeys.sideEffect('item', item.id, 'characterCreated');
      if (!(await hasEffect(characterEffectKey))) {
        console.log(`[onItemUpsert] Creating character from item emissary fields: ${item.name}`);
        const createdCharacter = await createCharacterFromItem(item);
        if (createdCharacter) {
          // Update item with the created character ID
          const updatedItem = { ...item, ownerCharacterId: createdCharacter.id };
          await upsertItem(updatedItem, { skipWorkflowEffects: true });
          await markEffect(characterEffectKey);
          console.log(`[onItemUpsert] ✅ Character created and item updated: ${createdCharacter.name}`);
        }
      }
    }

    return;
  }

  // Stock changes - MOVED event (only log when Move Items Submodal is used)
  const stockChanged = JSON.stringify(previousItem.stock) !== JSON.stringify(item.stock);
  if (stockChanged) {
    // Check if this was moved via the Move Items Submodal (temporary flag)
    const movedViaSubmodal = (item as any)._movedViaSubmodal === true;

    if (movedViaSubmodal) {
      await appendEntityLog(EntityType.ITEM, item.id, LogEventType.MOVED, {
        name: item.name,
        itemType: item.type,
        station: item.station,
        subItemType: item.subItemType,
        collection: item.collection,
        price: item.price,
        unitCost: item.unitCost,
        oldStock: previousItem.stock,
        newStock: item.stock
      });

      // Remove temporary flag (clean up)
      delete (item as any)._movedViaSubmodal;
    }
  }

  // Manual SOLD status change - detect when status changes to SOLD without quantitySold change (not via sale)
  const statusChangedToSold =
    previousItem.status !== ItemStatus.SOLD &&
    item.status === ItemStatus.SOLD; // No quantitySold change means manual status change

  if (statusChangedToSold) {
    const manualSoldEffectKey = EffectKeys.sideEffect('item', item.id, 'manualSold');
    if (await hasEffect(manualSoldEffectKey)) {
      // Already processed
      return;
    }

    console.log(`[onItemUpsert] Processing manual SOLD status change for item: ${item.name}`);

    // Calculate remaining stock to sell
    const totalStock = item.stock?.reduce((sum, stockPoint) => sum + stockPoint.quantity, 0) || 0;
    const remainingStock = totalStock - item.quantitySold;
    const quantityToSell = remainingStock;

    if (quantityToSell <= 0) {
      console.log(`[onItemUpsert] No remaining stock to sell for item ${item.name}`);

      // CRITICAL FIX: Even if no stock to sell, ensure soldAt is set if missing
      if (!item.soldAt) {
        console.log(`[onItemUpsert] Fixing missing soldAt for manually sold item ${item.name}`);
        const fixedItem = {
          ...item,
          soldAt: item.updatedAt || new Date(),
          updatedAt: new Date()
        };
        await upsertItem(fixedItem, { skipWorkflowEffects: true });
      }

      await markEffect(manualSoldEffectKey);
      return;
    }

    // Create snapshot BEFORE updating item (capture current state)
    // DISABLED: User requirement "ONLY COLLECTED SENDS THINGS TO ARCHIVE"
    // Manual "Sold" status change does not imply "Collected" (money received).
    // Therefore, we do NOT archive here.
    // const soldAt = item.soldAt || new Date();
    // await createItemSnapshot(item, quantityToSell, null, soldAt);
    console.log(`[onItemUpsert] Manual SOLD status change processed for ${item.name} (${quantityToSell} units) - Archive skipped (Not Collected)`);

    // Update item: deduct all remaining stock, update quantitySold, set soldAt
    const updatedItem: Item = {
      ...item,
      quantitySold: item.quantitySold + quantityToSell,
      soldAt: item.soldAt || new Date(),
      stock: [], // All stock is sold
      status: ItemStatus.SOLD,
      updatedAt: new Date()
    };

    // Save updated item (skip workflow to avoid recursion)
    await upsertItem(updatedItem, { skipWorkflowEffects: true });



    // Log SOLD event
    const soldLogDetails: Record<string, any> = {
      name: item.name,
      itemType: item.type,
      collection: item.collection,
      quantitySold: updatedItem.quantitySold,
      oldQuantitySold: previousItem.quantitySold,
      quantitySoldInThisTransaction: quantityToSell,
      manualSale: true
    };

    if (item.station !== undefined) {
      soldLogDetails.station = item.station;
    }
    if (item.subItemType !== undefined) {
      soldLogDetails.subItemType = item.subItemType;
    }
    if (item.unitCost !== undefined) {
      soldLogDetails.unitCost = item.unitCost;
    }
    if (item.price !== undefined) {
      soldLogDetails.price = item.price;
    }

    await appendEntityLog(EntityType.ITEM, item.id, LogEventType.SOLD, soldLogDetails);
    await markEffect(manualSoldEffectKey);
    console.log(`[onItemUpsert] ✅ Processed manual SOLD for item ${item.name}: sold ${quantityToSell} units`);
  }

  // Quantity sold changes - SOLD event (via sale)
  if (previousItem.quantitySold !== item.quantitySold && item.quantitySold > previousItem.quantitySold) {
    const soldLogDetails: Record<string, any> = {
      name: item.name,
      itemType: item.type,
      collection: item.collection,
      quantitySold: item.quantitySold,
      oldQuantitySold: previousItem.quantitySold
    };

    if (item.station !== undefined) {
      soldLogDetails.station = item.station;
    }
    if (item.subItemType !== undefined) {
      soldLogDetails.subItemType = item.subItemType;
    }
    if (item.unitCost !== undefined) {
      soldLogDetails.unitCost = item.unitCost;
    }
    if (item.price !== undefined) {
      soldLogDetails.price = item.price;
    }
    if (item.status !== undefined) {
      soldLogDetails.status = item.status;
    }

    await appendEntityLog(EntityType.ITEM, item.id, LogEventType.SOLD, soldLogDetails);
  }

  // Collection status - COLLECTED event
  // Dual detection: status OR flag change to COLLECTED
  const statusBecameCollected =
    item.status === ItemStatus.COLLECTED &&
    (!previousItem || previousItem.status !== ItemStatus.COLLECTED);

  const flagBecameCollected =
    !!item.isCollected && (!previousItem || !previousItem.isCollected);

  if (statusBecameCollected || flagBecameCollected) {
    // Snap-to-Month Logic
    // For items without a sale, we use the soldAt date (if set) or current date as reference
    // FIX: Prefer existing dates over "Now" to ensure historical accuracy (e.g. Jan item collected in Feb)
    let defaultCollectedAt: Date;

    if (item.soldAt) {
      defaultCollectedAt = calculateClosingDate(item.soldAt);
    } else if (item.createdAt) {
      defaultCollectedAt = calculateClosingDate(item.createdAt);
    } else {
      const now = new Date();
      // Adjust to CR time (UTC-6) roughly for "Today" fallback
      const adjustedNow = new Date(now.getTime() - 6 * 60 * 60 * 1000);
      defaultCollectedAt = calculateClosingDate(adjustedNow);
    }

    const collectedAt = item.collectedAt ?? defaultCollectedAt;

    await appendEntityLog(EntityType.ITEM, item.id, LogEventType.COLLECTED, {
      name: item.name,
      itemType: item.type,
      collection: item.collection,
      collectedAt: collectedAt.toISOString()
    });

    // Create Item Snapshot for Archive (Fixing the Gap)
    // Only if not already snapshotted (e.g. via Sale workflow)
    const snapshotEffectKey = EffectKeys.sideEffect('item', item.id, `itemSnapshot:${formatMonthKey(collectedAt)}`);

    if (!(await hasEffect(snapshotEffectKey))) {
      // Create ItemSnapshot using the new Archive-First approach
      // We pass 'undefined' for saleId as this is a manual collection (no parent sale)
      await createItemSnapshot(item, item.quantitySold || 1, undefined);

      // Add to month-based collection index for efficient History Tab queries
      const monthKey = formatMonthKey(collectedAt);
      const { kvSAdd } = await import('@/data-store/kv');
      const collectedIndexKey = `index:items:collected:${monthKey}`;
      await kvSAdd(collectedIndexKey, item.id);

      await markEffect(snapshotEffectKey);
      console.log(`[onItemUpsert] ✅ Created snapshot for manually collected item ${item.name}, added to index ${monthKey}`);
    }
  }

  // Descriptive changes - update in-place
  for (const field of DESCRIPTIVE_FIELDS) {
    if ((previousItem as any)[field] !== (item as any)[field]) {
      await updateEntityLogField(EntityType.ITEM, item.id, field, (previousItem as any)[field], (item as any)[field]);
    }
  }
}

/**
 * Remove item effects when item is deleted
 * Items can have entries in items log and related links
 */
export async function removeItemEffectsOnDelete(itemId: string): Promise<void> {
  try {
    console.log(`[removeItemEffectsOnDelete] Starting cleanup for item: ${itemId}`);

    // 1. Remove all Links related to this item
    const itemLinks = await getLinksFor({ type: EntityType.ITEM, id: itemId });
    console.log(`[removeItemEffectsOnDelete] Found ${itemLinks.length} links to remove`);

    for (const link of itemLinks) {
      try {
        await removeLink(link.id);
        console.log(`[removeItemEffectsOnDelete] ✅ Removed link: ${link.linkType}`);
      } catch (error) {
        console.error(`[removeItemEffectsOnDelete] ❌ Failed to remove link ${link.id}:`, error);
      }
    }

    // 2. Clear all effects for this item
    await clearEffect(EffectKeys.created('item', itemId));
    await clearEffect(EffectKeys.sideEffect('item', itemId, 'characterCreated'));
    await clearEffectsByPrefix(EntityType.ITEM, itemId, 'financialLogged:');
    await clearEffectsByPrefix(EntityType.ITEM, itemId, 'pointsLogged:');

    // 3. Remove log entries from items log
    console.log(`[removeItemEffectsOnDelete] Removing log entries for item: ${itemId}`);
    const itemsLogKey = buildLogKey(EntityType.ITEM);
    const itemsLog = (await kvGet<any[]>(itemsLogKey)) || [];
    const filteredItemsLog = itemsLog.filter(entry => entry.entityId !== itemId);
    if (filteredItemsLog.length !== itemsLog.length) {
      await kvSet(itemsLogKey, filteredItemsLog);
      console.log(`[removeItemEffectsOnDelete] ✅ Removed ${itemsLog.length - filteredItemsLog.length} entries from items log`);
    }

    // Check and remove from character log if this item is owned by a character
    const characterLogKey = buildLogKey(EntityType.CHARACTER);
    const characterLog = (await kvGet<any[]>(characterLogKey)) || [];
    const filteredCharacterLog = characterLog.filter(entry => entry.itemId !== itemId && entry.sourceItemId !== itemId);
    if (filteredCharacterLog.length !== characterLog.length) {
      await kvSet(characterLogKey, filteredCharacterLog);
      console.log(`[removeItemEffectsOnDelete] ✅ Removed ${characterLog.length - filteredCharacterLog.length} entries from character log`);
    }

    console.log(`[removeItemEffectsOnDelete] ✅ Cleared effects, removed links, and removed log entries for item ${itemId}`);
  } catch (error) {
    console.error('Error removing item effects:', error);
  }
}

/**
 * Process item creation effects when item is created
 * Handles side effects when item is created directly (not from task/record)
 */
export async function processItemCreationEffects(item: Item): Promise<void> {
  console.log(`[processItemCreationEffects] Processing item creation effects for: ${item.name} (${item.id})`);


  // Items created from Item Modal have NO financial effects
  // Items are just inventory/assets - financial effects come from Tasks/Records
  // This is different from Tasks/Records which have cost/revenue properties
}


