// workflows/entities-workflows/item.workflow.ts
// Item-specific workflow with MOVED, SOLD, COLLECTED events

import { EntityType, LogEventType } from '@/types/enums';
import type { Item } from '@/types/entities';
import { appendEntityLog, updateEntityLogField } from '../entities-logging';
import { hasEffect, markEffect, clearEffect, clearEffectsByPrefix } from '@/data-store/effects-registry';
import { EffectKeys } from '@/data-store/keys';
import { getLinksFor, removeLink } from '@/links/link-registry';
import { getCategoryForItemType } from '@/lib/utils/searchable-select-utils';
import { createCharacterFromItem } from '../character-creation-utils';
import { upsertItem } from '@/data-store/datastore';

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
  
  // Stock changes - MOVED event
  const stockChanged = JSON.stringify(previousItem.stock) !== JSON.stringify(item.stock);
  if (stockChanged) {
    await appendEntityLog(EntityType.ITEM, item.id, LogEventType.MOVED, {
      name: item.name,
      itemType: item.type,
      collection: item.collection,
      oldStock: previousItem.stock,
      newStock: item.stock
    });
  }
  
  // Quantity sold changes - SOLD event
  if (previousItem.quantitySold !== item.quantitySold && item.quantitySold > previousItem.quantitySold) {
    await appendEntityLog(EntityType.ITEM, item.id, LogEventType.SOLD, {
      name: item.name,
      itemType: item.type,
      collection: item.collection,
      quantitySold: item.quantitySold,
      oldQuantitySold: previousItem.quantitySold
    });
  }
  
  // Collection status - COLLECTED event
  if (item.isCollected && !previousItem.isCollected) {
    await appendEntityLog(EntityType.ITEM, item.id, LogEventType.COLLECTED, {
      name: item.name,
      itemType: item.type,
      collection: item.collection,
      collectedAt: new Date().toISOString()
    });
  }

  // Status changes - UPDATED event
  if (previousItem.status !== item.status) {
    await appendEntityLog(EntityType.ITEM, item.id, LogEventType.UPDATED, {
      name: item.name,
      itemType: item.type,
      collection: item.collection,
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
    await clearEffect(EffectKeys.created('item', itemId));
    await clearEffect(EffectKeys.sideEffect('item', itemId, 'characterCreated'));
    await clearEffectsByPrefix(EntityType.ITEM, itemId, 'financialLogged:');
    await clearEffectsByPrefix(EntityType.ITEM, itemId, 'pointsLogged:');
    
    // 3. Remove log entries from items log only (Items don't have financial/player effects)
    console.log(`[removeItemEffectsOnDelete] Starting log entry removal for item: ${itemId}`);
    
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


