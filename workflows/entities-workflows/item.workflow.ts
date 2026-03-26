// workflows/entities-workflows/item.workflow.ts
// Item-specific workflow with MOVED, SOLD, COLLECTED events

import { EntityType, LogEventType, FOUNDER_CHARACTER_ID } from '@/types/enums';
import type { Item } from '@/types/entities';
import { ItemStatus } from '@/types/enums';
import { appendEntityLog, updateEntityLeanFields, removeLogEntriesAcrossMonths } from '../entities-logging';
import { hasEffect, markEffect, clearEffect, clearEffectsByPrefix } from '@/data-store/effects-registry';
import { EffectKeys } from '@/data-store/keys';
import { getLinksFor, removeLink } from '@/links/link-registry';
import { getCategoryForItemType } from '@/lib/utils/searchable-select-utils';
import { createCharacterFromItem } from '../character-creation-utils';
import { upsertItem, getAvailableArchiveMonths } from '@/data-store/datastore';
import { formatMonthKey, calculateClosingDate } from '@/lib/utils/date-utils';
import { stagePointsForPlayer } from '../points-rewards-utils';
import { isSoldStatus, isCollectedStatus } from '@/lib/utils/status-utils';
import { buildArchiveCollectionIndexKey, buildArchiveMonthsKey } from '@/data-store/keys';

const STATE_FIELDS = ['status', 'stock', 'quantitySold', 'isCollected'];

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
      subItemType: item.subItemType,
      soldQuantity: item.stock?.reduce((sum: number, stock: any) => sum + stock.quantity, 0) || 0
    }, item.createdAt);

    await markEffect(effectKey);

    // Character creation from emissary fields - when newOwnerName is provided
    if (item.newOwnerName && !item.ownerCharacterId) {
      const characterEffectKey = EffectKeys.sideEffect('item', item.id, 'characterCreated');
      if (!(await hasEffect(characterEffectKey))) {
        const createdCharacter = await createCharacterFromItem(item);
        if (createdCharacter) {
          // Update item with the created character ID
          const updatedItem = { ...item, ownerCharacterId: createdCharacter.id };
          await upsertItem(updatedItem, { skipWorkflowEffects: true });
          await markEffect(characterEffectKey);
        }
      }
    }

    return;
  }

  // Status changes - UPDATED event (for non-Sold/Collected statuses)
  if (previousItem.status !== item.status) {
    if (!isSoldStatus(item.status) && !isCollectedStatus(item.status)) {
      await appendEntityLog(EntityType.ITEM, item.id, LogEventType.UPDATED, {
        name: item.name,
        itemType: item.type,
        subItemType: item.subItemType,
        quantity: 1
      }, item.updatedAt || new Date());
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

    const soldAt = item.soldAt || new Date();
    const archiveMonth = calculateClosingDate(soldAt);
    const monthKey = formatMonthKey(archiveMonth);
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
      isCollected: true, 
      sourceRecordId: 'manual', 
      updatedAt: new Date()
    };
    
    await upsertItem(soldItemClone, { skipWorkflowEffects: true });
    
    // THEGAME MARCH FIX: Standardize on monthly index, no 'collected' archive for items
    const { buildMonthIndexKey } = await import('@/data-store/keys');
    const { kvSAdd } = await import('@/data-store/kv');
    await kvSAdd(buildMonthIndexKey(EntityType.ITEM, monthKey), cloneId);
    await kvSAdd(buildArchiveMonthsKey(), monthKey);

    // 3. MANAGE THE BASE ITEM (Inventory Shell)
    let updatedBaseItem: Item;
    const targetQ = item.targetAmount || 0;

    if (item.restockable && targetQ > 0) {
      // CONSIGNMENT RESTOCK: Keep active, refill to Target Q, reset Sold Q
      updatedBaseItem = {
        ...item,
        status: ItemStatus.FOR_SALE, // Revert from Sold back to active
        quantitySold: 0, 
        stock: [{ siteId: primarySite, quantity: targetQ }],
        updatedAt: new Date()
      };
    } else {
      // PARTIAL OR FULL SALE
      const remainingStock = Math.max(0, previousStockTotal - quantityToSell);
      if (remainingStock > 0) {
        // Partial Sale: Leave remaining stock on shelf, revert status to active
        updatedBaseItem = {
          ...item,
          status: ItemStatus.FOR_SALE,
          quantitySold: (previousItem.quantitySold || 0) + quantityToSell,
          stock: [{ siteId: primarySite, quantity: remainingStock }],
          updatedAt: new Date()
        };
      } else {
        // Full Depletion: Unique artwork or totally sold out
        updatedBaseItem = {
          ...item,
          status: ItemStatus.SOLD,
          quantitySold: (previousItem.quantitySold || 0) + quantityToSell,
          stock: [], 
          soldAt: soldAt,
          updatedAt: new Date()
        };
        // THEGAME MARCH FIX: Use standard monthly index
        const { buildMonthIndexKey } = await import('@/data-store/keys');
        await kvSAdd(buildMonthIndexKey(EntityType.ITEM, monthKey), item.id);
      }
    }

    await upsertItem(updatedBaseItem, { skipWorkflowEffects: true });

    // 4. LOG EVENT & HANDLE POINTS
    await appendEntityLog(EntityType.ITEM, item.id, LogEventType.SOLD, {
      name: item.name,
      itemType: item.type,
      subItemType: item.subItemType,
      soldQuantity: quantityToSell
    }, item.soldAt || soldAt);

    if (item.rewards?.points) {
      const playerId = item.ownerCharacterId || FOUNDER_CHARACTER_ID;
      const { stagePointsForPlayer } = await import('../points-rewards-utils');
      await stagePointsForPlayer(playerId, item.rewards.points, item.id, EntityType.ITEM);
    }

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

  // Collection status - COLLECTED event
  // Dual detection: status OR flag change to COLLECTED
  const statusBecameCollected =
    isCollectedStatus(item.status) &&
    (!previousItem || !isCollectedStatus(previousItem.status));

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
      subItemType: item.subItemType,
      soldQuantity: item.quantitySold || 1
    }, collectedAt);

    // Record Archive Index for COLLECTED case 
    // Usually items reach Archive on SOLD. But if they jump straight to COLLECTED, capture that.
    const archiveMonth = calculateClosingDate(collectedAt);
    const archiveIndexEffectKey = EffectKeys.sideEffect('item', item.id, `archiveIndex:${formatMonthKey(archiveMonth)}`);

    if (!(await hasEffect(archiveIndexEffectKey))) {
      const monthKey = formatMonthKey(archiveMonth);
      const { kvSAdd } = await import('@/data-store/kv');
      const { buildMonthIndexKey } = await import('@/data-store/keys');
      const itemsMonthKey = buildMonthIndexKey(EntityType.ITEM, monthKey);
      await kvSAdd(itemsMonthKey, item.id);

      await markEffect(archiveIndexEffectKey);
    }
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

  // ==========================================
  // DETERMINISTIC ARCHIVE INDEXING + LOG SYNC
  // Safely synchronizes the item to the correct monthly index AND log based on exact dates.
  // This handles re-saves from the Sold Items Tab (fixing name, soldAt, quantity, etc.)
  // where no status change occurs so the SOLD event block above never fires.
  // ==========================================
  if (previousItem) {
    const isArchivable = isSoldStatus(item.status) || isCollectedStatus(item.status) || !!item.isCollected;

    if (isArchivable) {
      const currentTargetDate = item.soldAt || item.collectedAt || item.createdAt || new Date();
      const targetMonth = formatMonthKey(calculateClosingDate(currentTargetDate));

      const { kvSAdd, kvSRem } = await import('@/data-store/kv');
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
            soldQuantity: item.quantitySold || existingEntry.soldQuantity || 0,
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
      const { kvSRem } = await import('@/data-store/kv');
      const { buildMonthIndexKey } = await import('@/data-store/keys');
      const allMonths = await getAvailableArchiveMonths();
      for (const m of allMonths) {
        await kvSRem(buildMonthIndexKey(EntityType.ITEM, m), item.id);
      }
    }
  }
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


