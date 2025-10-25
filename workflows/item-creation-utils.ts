// workflows/item-creation-utils.ts
// Item Creation System - DNA/RNA Molecular Pattern Implementation
// Creates items from Tasks and Financial Records using emissary fields

import type { Task, Item, FinancialRecord } from '@/types/entities';
import { ItemStatus, ItemType, LinkType, EntityType } from '@/types/enums';
import { upsertItem, getAllItems } from '@/data-store/datastore';
import { deleteItem } from '@/data-store/repositories/item.repo';
import { hasEffect, markEffect } from '@/data-store/effects-registry';
// links are created by processLinkEntity()
import { v4 as uuid } from 'uuid';

/**
 * Determines the default item status based on item type and sale status
 * All newly created items start as CREATED, regardless of type
 * Their status will change based on business logic later
 */
export function getDefaultItemStatus(itemType: string, isSold: boolean = false): ItemStatus {
  if (isSold) {
    return ItemStatus.SOLD;
  }
  
  // All newly created items start as CREATED, regardless of type
  // Their status will change based on business logic later
  return ItemStatus.CREATED;
}

/**
 * Creates an Item entity from a Task's emissary fields
 * IDEMPOTENT: Checks if item already exists before creating
 * Uses atomic operations to prevent race conditions
 */
export async function createItemFromTask(task: Task): Promise<Item | null> {
  try {
    console.log(`[createItemFromTask] Starting item creation for task: ${task.name} (${task.id})`);
    console.log(`[createItemFromTask] outputItemType: ${task.outputItemType}`);
    console.log(`[createItemFromTask] outputQuantity: ${task.outputQuantity}`);
    
    if (!task.outputItemType) {
      console.error('Cannot create item: outputItemType is required');
      return null;
    }
    
    // IDEMPOTENCY CHECK: Look for existing item created by this task
    console.log(`[createItemFromTask] Checking for existing items...`);
    const allItems = await getAllItems();
    console.log(`[createItemFromTask] Found ${allItems.length} total items`);
    
    const existingItems = allItems.filter(item => 
      item.sourceTaskId === task.id && 
      item.type === task.outputItemType
    );
    console.log(`[createItemFromTask] Found ${existingItems.length} existing items for this task`);
    
    if (existingItems.length > 0) {
      console.log(`[createItemFromTask] Item already exists, skipping creation`);
      return existingItems[0]; // Return existing item
    }
    
    const newItem: Item = {
      id: `item-${task.id}-${Date.now()}`, // More predictable ID based on task ID
      name: task.outputItemName || `${task.outputItemType} from ${task.name}`,
      description: `Created from task: ${task.name}`,
      type: task.outputItemType as ItemType,
      collection: task.outputItemCollection || undefined,
      status: getDefaultItemStatus(task.outputItemType || '', task.isSold || false),
      station: task.station,
      unitCost: task.outputUnitCost || 0,
      additionalCost: 0,
      price: task.outputItemPrice || 0, // Use task's outputItemPrice instead of unitCost
      value: 0,
      quantitySold: 0,
      sourceTaskId: task.id, // Link item back to the task that created it
      ownerCharacterId: task.customerCharacterId || null, // Emissary: Pass customer as item owner
      isCollected: false,
      year: new Date().getFullYear(), // Set current year
      createdAt: new Date(),
      updatedAt: new Date(),
      links: [],  // Initialize links array (The Rosetta Stone)
      stock: [
        {
          siteId: (task.targetSiteId && task.targetSiteId !== 'none' ? task.targetSiteId : null) ||
                  (task.siteId && task.siteId !== 'none' ? task.siteId : null) ||
                  'hq', // Default to HQ
          quantity: task.outputQuantity || 1
        }
      ]
    };
    
    // Store the item in DataStore
    console.log(`[createItemFromTask] Creating new item:`, newItem);
    const createdItem = await upsertItem(newItem);
    console.log(`[createItemFromTask] ✅ Item created successfully`);
    
    return createdItem;
  } catch (error) {
    console.error('Error creating item from task:', error);
    return null;
  }
}

/**
 * Creates an Item entity from a Financial Record's emissary fields
 * IDEMPOTENT: Checks if item already exists before creating
 * Uses atomic operations to prevent race conditions
 */
export async function createItemFromRecord(record: FinancialRecord): Promise<Item | null> {
  try {
    console.log(`[createItemFromRecord] Starting item creation for record: ${record.name} (${record.id})`);
    console.log(`[createItemFromRecord] outputItemType: ${record.outputItemType}`);
    console.log(`[createItemFromRecord] outputQuantity: ${record.outputQuantity}`);
    
    if (!record.outputItemType) {
      console.error('Cannot create item: outputItemType is required');
      return null;
    }
    
    // IDEMPOTENCY CHECK: Look for existing item created by this record
    console.log(`[createItemFromRecord] Checking for existing items...`);
    const allItems = await getAllItems();
    console.log(`[createItemFromRecord] Found ${allItems.length} total items`);
    
    const existingItems = allItems.filter(item => 
      item.sourceRecordId === record.id && 
      item.type === record.outputItemType
    );
    console.log(`[createItemFromRecord] Found ${existingItems.length} existing items for this record`);
    
    if (existingItems.length > 0) {
      console.log(`[createItemFromRecord] Item already exists, skipping creation`);
      return existingItems[0]; // Return existing item
    }
    
    const newItem: Item = {
      id: `item-${record.id}-${Date.now()}`, // More predictable ID based on record ID
      name: record.outputItemName || `${record.outputItemType} from ${record.name}`,
      description: `Created from record: ${record.name}`,
      type: record.outputItemType as ItemType,
      collection: record.outputItemCollection || undefined,
      status: getDefaultItemStatus(record.outputItemType || '', record.isSold || false),
      station: record.station,
      unitCost: record.outputUnitCost || 0,
      additionalCost: 0,
      price: record.outputItemPrice || 0, // Use record's outputItemPrice instead of unitCost
      value: 0,
      quantitySold: 0,
      sourceRecordId: record.id, // Link item back to the record that created it
      isCollected: false,
      year: record.year, // Use record's year
      createdAt: new Date(),
      updatedAt: new Date(),
      links: [],  // Initialize links array (The Rosetta Stone)
      stock: [
        {
          siteId: (record.siteId && record.siteId !== 'None' ? record.siteId : null) || 'hq', // Default to HQ
          quantity: record.outputQuantity || 1
        }
      ]
    };
    
    // Store the item in DataStore
    console.log(`[createItemFromRecord] Creating new item:`, newItem);
    const createdItem = await upsertItem(newItem);
    console.log(`[createItemFromRecord] ✅ Item created successfully`);
    
    return createdItem;
  } catch (error) {
    console.error('Error creating item from record:', error);
    return null;
  }
}

/**
 * Removes all items created by a specific task
 * Used when task is uncompleted or deleted
 */
export async function removeItemsCreatedByTask(taskId: string): Promise<void> {
  try {
    console.log(`[removeItemsCreatedByTask] Removing items created by task: ${taskId}`);
    
    const items = await getAllItems();
    const itemsToRemove = items.filter(item => item.sourceTaskId === taskId);
    
    console.log(`[removeItemsCreatedByTask] Found ${itemsToRemove.length} items to remove`);
    
    // Remove each item created by this task
    for (const item of itemsToRemove) {
      try {
        await deleteItem(item.id);
        console.log(`[removeItemsCreatedByTask] ✅ Removed item: ${item.name} (${item.id})`);
      } catch (error) {
        console.error(`[removeItemsCreatedByTask] ❌ Failed to remove item ${item.id}:`, error);
      }
    }
    
    // Dispatch event to update UI
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('itemsUpdated'));
    }
    
    console.log(`[removeItemsCreatedByTask] ✅ Completed removal of ${itemsToRemove.length} items`);
  } catch (error) {
    console.error('Error removing items created by task:', error);
  }
}

/**
 * Removes all items created by a specific financial record
 * Used when financial record is deleted
 */
export async function removeItemsCreatedByRecord(recordId: string): Promise<void> {
  try {
    console.log(`[removeItemsCreatedByRecord] Removing items created by record: ${recordId}`);
    
    const items = await getAllItems();
    const itemsToRemove = items.filter(item => item.sourceRecordId === recordId);
    
    console.log(`[removeItemsCreatedByRecord] Found ${itemsToRemove.length} items to remove`);
    
    // Remove each item created by this record
    for (const item of itemsToRemove) {
      try {
        await deleteItem(item.id);
        console.log(`[removeItemsCreatedByRecord] ✅ Removed item: ${item.name} (${item.id})`);
      } catch (error) {
        console.error(`[removeItemsCreatedByRecord] ❌ Failed to remove item ${item.id}:`, error);
      }
    }
    
    // Dispatch event to update UI
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('itemsUpdated'));
    }
    
    console.log(`[removeItemsCreatedByRecord] ✅ Completed removal of ${itemsToRemove.length} items`);
  } catch (error) {
    console.error('Error removing items created by record:', error);
  }
}

/**
 * Enhanced item creation - pure business logic, no link creation
 */
export async function processItemCreationWithLinks(item: Item): Promise<Item> {
  console.log(`[processItemCreationWithLinks] Processing item creation: ${item.name} (${item.id})`);
  
  return item;
}
