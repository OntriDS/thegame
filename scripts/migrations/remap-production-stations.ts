// scripts/migrations/remap-production-stations.ts
// Remap PRODUCTION stations from product names to process names

import { getAllFinancials, upsertFinancial } from '@/data-store/datastore';
import { getAllTasks, upsertTask } from '@/data-store/datastore';
import { getAllItems, upsertItem } from '@/data-store/datastore';
import type { FinancialRecord, Task, Item } from '@/types/entities';
import type { Station } from '@/types/type-aliases';

/**
 * Mapping from old product-based stations to new process-based stations
 * This is a best-effort mapping - manual review may be needed
 */
const STATION_REMAP: Record<string, Station> = {
  // Old product stations -> New process stations
  'Artworks': 'Buy Orders' as Station,
  'Murals': 'Buy Orders' as Station,
  'Prints': 'Buy Orders' as Station,
  'Stickers': 'Buy Orders' as Station,
  'Merch': 'Buy Orders' as Station,
  'Woodworks': 'Buy Orders' as Station, // Note: Woodworks -> Craft (ItemType), but station -> Buy Orders
  'NFTs': 'Buy Orders' as Station,
  
  // If you have more specific mappings, add them here
  // For example, if you know certain tasks were "Making" vs "Buy Orders"
  // You could add task-specific logic below
};

/**
 * Remap PRODUCTION stations in FinancialRecords, Tasks, and Items
 * from product names to process names
 */
export async function remapProductionStations(): Promise<{
  finrecsUpdated: number;
  tasksUpdated: number;
  itemsUpdated: number;
  errors: number;
}> {
  console.log('[remapProductionStations] Starting PRODUCTION station remap...');
  
  const stats = {
    finrecsUpdated: 0,
    tasksUpdated: 0,
    itemsUpdated: 0,
    errors: 0
  };

  try {
    // Remap FinancialRecords
    console.log('[remapProductionStations] Processing FinancialRecords...');
    const allFinrecs = await getAllFinancials();
    for (const finrec of allFinrecs) {
      if (STATION_REMAP[finrec.station]) {
        const newStation = STATION_REMAP[finrec.station];
        const updatedFinrec: FinancialRecord = {
          ...finrec,
          station: newStation,
          updatedAt: new Date()
        };
        await upsertFinancial(updatedFinrec);
        stats.finrecsUpdated++;
        console.log(`[remapProductionStations] ✅ Updated finrec ${finrec.id}: ${finrec.station} -> ${newStation}`);
      }
    }

    // Remap Tasks
    console.log('[remapProductionStations] Processing Tasks...');
    const allTasks = await getAllTasks();
    for (const task of allTasks) {
      if (STATION_REMAP[task.station]) {
        const newStation = STATION_REMAP[task.station];
        const updatedTask: Task = {
          ...task,
          station: newStation,
          updatedAt: new Date()
        };
        await upsertTask(updatedTask);
        stats.tasksUpdated++;
        console.log(`[remapProductionStations] ✅ Updated task ${task.id}: ${task.station} -> ${newStation}`);
      }
    }

    // Remap Items
    // Note: Items might keep product-based stations, or you might want to remap them too
    // For now, we'll remap them to match the new structure
    console.log('[remapProductionStations] Processing Items...');
    const allItems = await getAllItems();
    for (const item of allItems) {
      if (STATION_REMAP[item.station]) {
        const newStation = STATION_REMAP[item.station];
        const updatedItem: Item = {
          ...item,
          station: newStation,
          updatedAt: new Date()
        };
        await upsertItem(updatedItem);
        stats.itemsUpdated++;
        console.log(`[remapProductionStations] ✅ Updated item ${item.id}: ${item.station} -> ${newStation}`);
      }
    }

    console.log(`[remapProductionStations] ✅ Completed:`);
    console.log(`  - FinancialRecords: ${stats.finrecsUpdated} updated`);
    console.log(`  - Tasks: ${stats.tasksUpdated} updated`);
    console.log(`  - Items: ${stats.itemsUpdated} updated`);
    console.log(`  - Errors: ${stats.errors}`);

    return stats;

  } catch (error) {
    console.error('[remapProductionStations] ❌ Failed:', error);
    throw error;
  }
}

/**
 * Dry run - preview what would be changed without actually updating
 */
export async function previewRemapProductionStations(): Promise<{
  finrecsToUpdate: Array<{ id: string; old: string; new: string }>;
  tasksToUpdate: Array<{ id: string; old: string; new: string }>;
  itemsToUpdate: Array<{ id: string; old: string; new: string }>;
}> {
  console.log('[previewRemapProductionStations] Previewing PRODUCTION station remap...');
  
  const preview = {
    finrecsToUpdate: [] as Array<{ id: string; old: string; new: string }>,
    tasksToUpdate: [] as Array<{ id: string; old: string; new: string }>,
    itemsToUpdate: [] as Array<{ id: string; old: string; new: string }>
  };

  try {
    // Preview FinancialRecords
    const allFinrecs = await getAllFinancials();
    for (const finrec of allFinrecs) {
      if (STATION_REMAP[finrec.station]) {
        preview.finrecsToUpdate.push({
          id: finrec.id,
          old: finrec.station,
          new: STATION_REMAP[finrec.station]
        });
      }
    }

    // Preview Tasks
    const allTasks = await getAllTasks();
    for (const task of allTasks) {
      if (STATION_REMAP[task.station]) {
        preview.tasksToUpdate.push({
          id: task.id,
          old: task.station,
          new: STATION_REMAP[task.station]
        });
      }
    }

    // Preview Items
    const allItems = await getAllItems();
    for (const item of allItems) {
      if (STATION_REMAP[item.station]) {
        preview.itemsToUpdate.push({
          id: item.id,
          old: item.station,
          new: STATION_REMAP[item.station]
        });
      }
    }

    console.log(`[previewRemapProductionStations] Preview complete:`);
    console.log(`  - FinancialRecords: ${preview.finrecsToUpdate.length} would be updated`);
    console.log(`  - Tasks: ${preview.tasksToUpdate.length} would be updated`);
    console.log(`  - Items: ${preview.itemsToUpdate.length} would be updated`);

    return preview;

  } catch (error) {
    console.error('[previewRemapProductionStations] ❌ Failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const isPreview = args.includes('--preview') || args.includes('-p');

  if (isPreview) {
    previewRemapProductionStations()
      .then(preview => {
        console.log('\nPreview results:');
        console.log(JSON.stringify(preview, null, 2));
        process.exit(0);
      })
      .catch(error => {
        console.error('Preview failed:', error);
        process.exit(1);
      });
  } else {
    remapProductionStations()
      .then(stats => {
        console.log('Remap complete:', stats);
        process.exit(0);
      })
      .catch(error => {
        console.error('Remap failed:', error);
        process.exit(1);
      });
  }
}

