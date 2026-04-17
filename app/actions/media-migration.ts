'use server';

import { getAllItems, upsertItem } from '@/data-store/repositories/item.repo';
import { Item } from '@/types/entities';

/**
 * Migration Action: Initialize Item Media Schema
 * 
 * Safely adds the new structured 'media' object and 'sourceFileUrl' field 
 * to items that don't have them yet.
 */
export async function initializeItemMedia(dryRun: boolean = true) {
  try {
    const items = await getAllItems();
    let updatedCount = 0;
    const totalCount = items.length;

    for (const item of items) {
      if (!item.media) {
        updatedCount++;
        if (!dryRun) {
          const updatedItem: Item = {
            ...item,
            media: {
              main: "",
              thumb: "",
              gallery: [],
            },
            sourceFileUrl: "",
            updatedAt: new Date(),
          };
          await upsertItem(updatedItem);
        }
      }
    }

    return {
      success: true,
      totalCount,
      updatedCount,
      message: dryRun 
        ? `Dry run complete. ${updatedCount} items would be updated.`
        : `Migration complete. ${updatedCount} items successfully updated.`,
    };
  } catch (error) {
    console.error('[MIGRATION_ERROR]', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Critical error during migration.',
    };
  }
}
