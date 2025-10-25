// workflows/entities-workflows/item.workflow.ts
// Item-specific workflow with MOVED, SOLD, COLLECTED events

import { EntityType, LogEventType } from '@/types/enums';
import type { Item } from '@/types/entities';
import { appendEntityLog, updateEntityLogField } from '../entities-logging';
import { hasEffect, markEffect, clearEffect, clearEffectsByPrefix } from '@/data-store/effects-registry';
import { getLinksFor, removeLink } from '@/links/link-registry';
import { getCategoryForItemType } from '@/lib/utils/searchable-select-utils';

const STATE_FIELDS = ['status', 'stock', 'quantitySold', 'isCollected'];
const DESCRIPTIVE_FIELDS = ['name', 'description', 'price', 'unitCost', 'additionalCost', 'value'];

export async function onItemUpsert(item: Item, previousItem?: Item): Promise<void> {
  // New item creation
  if (!previousItem) {
    const effectKey = `item:${item.id}:created`;
    if (await hasEffect(effectKey)) return;
    
    // Log item creation with standard pattern + source tracking
    const sourceType = item.sourceTaskId ? 'task' : item.sourceRecordId ? 'record' : 'direct';
    const sourceId = item.sourceTaskId || item.sourceRecordId || undefined;
    await appendEntityLog(EntityType.ITEM, item.id, LogEventType.CREATED, {
      name: item.name,
      type: item.type,
      station: item.station,
      collection: item.collection,
      status: item.status,
      quantity: item.stock?.reduce((sum: number, stock: any) => sum + stock.quantity, 0) || 0,
      unitCost: item.unitCost || 0,
      totalCost: (item.stock?.reduce((sum: number, stock: any) => sum + stock.quantity, 0) || 0) * (item.unitCost || 0),
      price: item.price || 0,
      year: item.year,
      sourceType,
      sourceId,
      category: getCategoryForItemType(item.type),
      subItemType: item.subItemType,
      description: `Item created from ${sourceType}: ${item.type} (${item.stock?.reduce((sum: number, stock: any) => sum + stock.quantity, 0) || 0}x)`
    });
    
    await markEffect(effectKey);
    return;
  }
  
  // Stock changes - MOVED event
  const stockChanged = JSON.stringify(previousItem.stock) !== JSON.stringify(item.stock);
  if (stockChanged) {
    await appendEntityLog(EntityType.ITEM, item.id, LogEventType.MOVED, {
      name: item.name,
      oldStock: previousItem.stock,
      newStock: item.stock
    });
  }
  
  // Quantity sold changes - SOLD event
  if (previousItem.quantitySold !== item.quantitySold && item.quantitySold > previousItem.quantitySold) {
    await appendEntityLog(EntityType.ITEM, item.id, LogEventType.SOLD, {
      name: item.name,
      quantitySold: item.quantitySold,
      oldQuantitySold: previousItem.quantitySold
    });
  }
  
  // Collection status - COLLECTED event
  if (item.isCollected && !previousItem.isCollected) {
    await appendEntityLog(EntityType.ITEM, item.id, LogEventType.COLLECTED, {
      name: item.name,
      collectedAt: new Date().toISOString()
    });
  }

  // Status changes - UPDATED event
  if (previousItem.status !== item.status) {
    await appendEntityLog(EntityType.ITEM, item.id, LogEventType.UPDATED, {
      name: item.name,
      oldStatus: previousItem.status,
      newStatus: item.status
    });
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
    await clearEffect(`item:${itemId}:created`);
    await clearEffectsByPrefix(EntityType.ITEM, itemId, 'financialLogged:');
    await clearEffectsByPrefix(EntityType.ITEM, itemId, 'pointsLogged:');
    
    // 3. Remove log entries from items log only (Items don't have financial/player effects)
    console.log(`[removeItemEffectsOnDelete] Starting log entry removal for item: ${itemId}`);
    
    // TODO: Implement server-side log removal or remove this call
    // const result = await ClientAPI.removeLogEntry(EntityType.ITEM, itemId);
    console.log(`[removeItemEffectsOnDelete] ⚠️ Log entry removal skipped - needs server-side implementation`);
    
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


/**
 * Update item log entry when item properties change
 * This function updates existing item log entries with new item data
 */
export async function updateItemLogEntryForItem(item: Item, dispatchEvents: boolean = true): Promise<void> {
  try {
    const updates = {
      itemName: item.name,
      itemType: item.type,
      collection: item.collection,
      status: item.status,
      quantity: item.stock?.reduce((sum: number, stock: any) => sum + stock.quantity, 0) || 0,
      unitCost: item.unitCost || 0,
      price: item.price || 0,
      station: item.station,
      year: item.year,
      description: `Item created directly: ${item.type} (${item.stock?.reduce((sum: number, stock: any) => sum + stock.quantity, 0) || 0}x)`
    };

    // Update the most recent log entry for this item
    await updateEntityLogField(EntityType.ITEM, item.id, 'itemName', '', item.name);
    await updateEntityLogField(EntityType.ITEM, item.id, 'itemType', '', item.type);
    await updateEntityLogField(EntityType.ITEM, item.id, 'status', '', item.status);
    await updateEntityLogField(EntityType.ITEM, item.id, 'quantity', '', item.stock?.reduce((sum: number, stock: any) => sum + stock.quantity, 0) || 0);
    await updateEntityLogField(EntityType.ITEM, item.id, 'unitCost', '', item.unitCost || 0);
    await updateEntityLogField(EntityType.ITEM, item.id, 'price', '', item.price || 0);

    console.log(`[updateItemLogEntryForItem] ✅ Item log entry updated successfully for ${item.name}`);
    
  } catch (error) {
    console.error('Error updating item log entry:', error);
  }
}

/**
 * Update all log entries when item properties change
 * This function updates existing log entries across all log types with new item data
 */
export async function updateAllItemLogEntries(item: Item, dispatchEvents: boolean = true): Promise<void> {
  try {
    console.log(`[updateAllItemLogEntries] Updating all log entries for item: ${item.name} (${item.id})`);
    
    // Update item log entries
    await updateItemLogEntryForItem(item, false);
    
    
    console.log(`[updateAllItemLogEntries] ✅ All log entries updated successfully for ${item.name}`);
  } catch (error) {
    console.error('Error updating all item log entries:', error);
  }
}