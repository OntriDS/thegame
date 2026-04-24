// workflows/update-propagation-utils.ts
// Comprehensive update propagation across ALL entity relationships

import type { Task, Item, Sale, FinancialRecord, Character, Player } from '@/types/entities';
import { EntityType, FOUNDER_CHARACTER_ID, TaskStatus, CharacterRole, LinkType, SaleType, SaleStatus } from '@/types/enums';
import { clearEffect, hasEffect, markEffect } from '@/data-store/effects-registry';
import { EffectKeys } from '@/data-store/keys';
import { getFinancialsBySourceTaskId, getFinancialsBySourceSaleId, getFinancialById, upsertFinancial, removeFinancial } from '@/data-store/datastore';
import { getItemsBySourceTaskId, getItemsBySourceRecordId, getItemById, upsertItem, removeItem } from '@/data-store/datastore';
import { getTaskById, upsertTask } from '@/data-store/datastore';
import { getPlayerById, upsertPlayer } from '@/data-store/datastore';
import { getAllCharacters, upsertCharacter } from '@/data-store/datastore';
import { resolveToPlayerIdMaybeCharacter } from './points-rewards-utils';
import { getUTCNow } from '@/lib/utils/utc-utils';
import { getLinksFor } from '@/links/link-registry';
import { getTaskCounterpartyId } from '@/workflows/task-counterparty-resolution';

const normalizeDate = (value: Date | string | null | undefined): Date => {
  const parsed = parseDateOrNull(value);
  return parsed ? parsed : new Date();
};

const parseDateOrNull = (value: Date | string | null | undefined): Date | null => {
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? value : null;
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    const time = parsed.getTime();
    return Number.isNaN(time) ? null : parsed;
  }
  return null;
};

const toDateTimestamp = (value: Date | string | null | undefined): number => {
  return parseDateOrNull(value)?.getTime() ?? 0;
};

const dedupeById = <T extends { id?: string }>(values: (T | null | undefined)[]): T[] => {
  const byId = new Map<string, T>();
  for (const item of values) {
    if (!item?.id) continue;
    if (!byId.has(item.id)) {
      byId.set(item.id, item);
    }
  }
  return Array.from(byId.values());
};

async function getFinancialRecordsForTask(taskId: string): Promise<FinancialRecord[]> {
  const bySourceTaskId = await getFinancialsBySourceTaskId(taskId);
  if (bySourceTaskId.length > 0) return bySourceTaskId;

  console.log(`[updateFinancialRecordsFromTask] No index rows for sourceTaskId=${taskId}. Using fallback lookup.`);

  const fallbackRows: FinancialRecord[] = [];
  const directId = `finrec-${taskId}`;
  const directRecord = await getFinancialById(directId);
  if (directRecord) {
    fallbackRows.push(directRecord);
  }

  const taskLinks = await getLinksFor({ type: EntityType.TASK, id: taskId });
  const finrecLinks = taskLinks.filter((link) => link.linkType === LinkType.TASK_FINREC);
  for (const link of finrecLinks) {
    if (link.target.type !== EntityType.FINANCIAL || !link.target.id) continue;
    const record = await getFinancialById(link.target.id);
    if (record) {
      fallbackRows.push(record);
    }
  }

  return dedupeById([...bySourceTaskId, ...fallbackRows]);
}
// ============================================================================
// TASK → FINANCIAL RECORD PROPAGATION
// ============================================================================

export async function updateFinancialRecordsFromTask(
  task: Task,
  previousTask: Task
): Promise<void> {
  try {
    console.log(`[updateFinancialRecordsFromTask] Updating financial records for task: ${task.name}`);

    // OPTIMIZED: Only load financials created by this task (already filtered by index)
    const relatedRecords = await getFinancialRecordsForTask(task.id);

    for (const record of relatedRecords) {
      const updateKey = EffectKeys.sideEffect('task', task.id, `updateFinancial:${record.id}:${toDateTimestamp(task.updatedAt)}`);

      if (await hasEffect(updateKey)) {
        console.log(`[updateFinancialRecordsFromTask] ⏭️ Already updated record: ${record.id}`);
        continue;
      }

      // Check if financial properties changed
      const financialPropsChanged =
        task.cost !== previousTask.cost ||
        task.revenue !== previousTask.revenue ||
        task.isNotPaid !== previousTask.isNotPaid ||
        task.isNotCharged !== previousTask.isNotCharged ||
        getTaskCounterpartyId(task) !== getTaskCounterpartyId(previousTask) ||
        task.customerCharacterRole !== previousTask.customerCharacterRole ||
        task.name !== previousTask.name ||
        task.station !== previousTask.station;

      const statePropsChanged = hasStatePropsChanged(task, previousTask);

      if (financialPropsChanged || statePropsChanged) {
        let year = record.year;
        let month = record.month;
        if (statePropsChanged) {
          const dateToUse = task.collectedAt || task.doneAt || record.createdAt;
          const safeDate = normalizeDate(dateToUse);
          year = safeDate.getFullYear();
          month = safeDate.getMonth() + 1;
        }

        const updatedRecord = {
          ...record,
          cost: task.cost,
          revenue: task.revenue,
          isNotPaid: task.isNotPaid,
          isNotCharged: task.isNotCharged,
          characterId: getTaskCounterpartyId(task),
          customerCharacterRole: task.customerCharacterRole || CharacterRole.CUSTOMER,
          name: task.name,
          station: task.station,
          year,
          month,
          updatedAt: getUTCNow()
        };

        await upsertFinancial(updatedRecord);
        await markEffect(updateKey);

        console.log(`[updateFinancialRecordsFromTask] ✅ Updated financial record: ${record.id}`);
      } else {
        console.log(
          `[updateFinancialRecordsFromTask] ⏭️ Skipped financial record ${record.id}: no financial/state delta detected after resolution`
        );
      }
    }
  } catch (error) {
    console.error(`[updateFinancialRecordsFromTask] Error updating financial records:`, error);
  }
}

// ============================================================================
// FINANCIAL RECORD → TASK PROPAGATION
// ============================================================================

export async function updateTasksFromFinancialRecord(
  record: FinancialRecord,
  previousRecord: FinancialRecord
): Promise<void> {
  try {
    console.log(`[updateTasksFromFinancialRecord] Updating tasks for financial record: ${record.name}`);

    // Find task that created this financial record
    if (!record.sourceTaskId) {
      console.log(`[updateTasksFromFinancialRecord] No sourceTaskId, skipping`);
      return;
    }

    const task = await getTaskById(record.sourceTaskId);
    if (!task) {
      console.log(`[updateTasksFromFinancialRecord] Task ${record.sourceTaskId} not found, skipping`);
      return;
    }

    // Create array with single task for compatibility with rest of code
    const relatedTasks = [task];

    for (const task of relatedTasks) {
      const updateKey = EffectKeys.sideEffect('financial', record.id, `updateTask:${task.id}:${toDateTimestamp(record.updatedAt)}`);

      if (await hasEffect(updateKey)) {
        console.log(`[updateTasksFromFinancialRecord] ⏭️ Already updated task: ${task.id}`);
        continue;
      }

      // Check if financial properties changed
      const financialPropsChanged =
        record.cost !== previousRecord.cost ||
        record.revenue !== previousRecord.revenue ||
        record.isNotPaid !== previousRecord.isNotPaid ||
        record.isNotCharged !== previousRecord.isNotCharged ||
        getTaskCounterpartyId(record as unknown as Task) !== getTaskCounterpartyId(previousRecord as unknown as Task) ||
        record.customerCharacterRole !== previousRecord.customerCharacterRole ||
        record.name !== previousRecord.name ||
        record.station !== previousRecord.station;

      const statePropsChanged = hasStatePropsChanged(record, previousRecord);

      if (financialPropsChanged || statePropsChanged) {
        const updatedTask = {
          ...task,
          cost: record.cost,
          revenue: record.revenue,
          isNotPaid: record.isNotPaid,
          isNotCharged: record.isNotCharged,
          characterId: getTaskCounterpartyId(record as unknown as Task),
          customerCharacterRole: record.customerCharacterRole || CharacterRole.CUSTOMER,
          name: record.name,
          station: record.station,
          updatedAt: getUTCNow()
        };

        await upsertTask(updatedTask);
        await markEffect(updateKey);

        console.log(`[updateTasksFromFinancialRecord] ✅ Updated task: ${task.id}`);
      }
    }
  } catch (error) {
    console.error(`[updateTasksFromFinancialRecord] Error updating tasks:`, error);
  }
}

// ============================================================================
// TASK → ITEM PROPAGATION (Enhanced)
// ============================================================================

export async function updateItemsCreatedByTask(
  task: Task,
  previousTask: Task
): Promise<void> {
  try {
    console.log(`[updateItemsCreatedByTask] Updating items for task: ${task.name}`);

    // OPTIMIZED: Only load items created by this task (already filtered by index)
    const relatedItems = await getItemsBySourceTaskId(task.id);

    if (!task.isNewItem && previousTask.isNewItem && relatedItems.length > 0) {
      const removalKey = EffectKeys.sideEffect('task', task.id, `removeCreatedItems:${toDateTimestamp(task.updatedAt)}`);
      if (!(await hasEffect(removalKey))) {
        for (const item of relatedItems) {
          try {
            await removeItem(item.id);
            console.log(`[updateItemsCreatedByTask] 🗑️ Removed task-created item ${item.id} after switching to existing inventory`);
          } catch (error) {
            console.error(`[updateItemsCreatedByTask] ❌ Failed to remove task-created item ${item.id}:`, error);
          }
        }
        await markEffect(removalKey);
      }
    }

    if (task.isNewItem || previousTask.isNewItem) {
      for (const item of relatedItems) {
        const updateKey = EffectKeys.sideEffect('task', task.id, `updateItem:${item.id}:${toDateTimestamp(task.updatedAt)}`);

        if (await hasEffect(updateKey)) {
          console.log(`[updateItemsCreatedByTask] ⏭️ Already updated item: ${item.id}`);
          continue;
        }

        // Check if output properties changed
        const outputPropsChanged =
          task.outputQuantity !== previousTask.outputQuantity ||
          task.outputItemName !== previousTask.outputItemName ||
          task.outputUnitCost !== previousTask.outputUnitCost ||
          task.outputItemPrice !== previousTask.outputItemPrice ||
          task.station !== previousTask.station;

        const statePropsChanged = hasStatePropsChanged(task, previousTask);

        if (outputPropsChanged || statePropsChanged) {
          let year = item.year;
          if (statePropsChanged) {
            const dateToUse = normalizeDate(task.collectedAt || task.doneAt || item.createdAt);
            year = dateToUse.getFullYear();
          }

          const updatedItem = {
            ...item,
            name: outputPropsChanged ? (task.outputItemName || item.name) : item.name,
            unitCost: outputPropsChanged ? (task.outputUnitCost || item.unitCost) : item.unitCost,
            price: outputPropsChanged ? (task.outputItemPrice || item.price) : item.price,
            station: outputPropsChanged ? (task.station || item.station) : item.station,
            year,
            updatedAt: getUTCNow()
          };

          // Update stock quantity if it changed
          // FIX: Skip delta calculation if the item was JUST created in this same workflow transaction
          // otherwise we add the delta (e.g. +3) to the initial value (e.g. 4), resulting in 7.
          const wasJustCreated = await hasEffect(EffectKeys.sideEffect('task', task.id, 'itemCreated'));

          if (!wasJustCreated && task.outputQuantity !== previousTask.outputQuantity) {
            const quantityDiff = (task.outputQuantity || 0) - (previousTask.outputQuantity || 0);
            if (quantityDiff !== 0) {
              // Update the first stock point (or create one if none exists)
              if (updatedItem.stock && updatedItem.stock.length > 0) {
                updatedItem.stock[0].quantity += quantityDiff;
              } else {
                updatedItem.stock = [{
                  siteId: task.siteId || 'default',
                  quantity: quantityDiff
                }];
              }
            }
          }

          await upsertItem(updatedItem, { skipWorkflowEffects: true });

          // Log detailed update event
          const { appendEntityLog } = await import('./entities-logging');
          const { LogEventType } = await import('@/types/enums');

          await appendEntityLog(EntityType.ITEM, item.id, LogEventType.UPDATED, {
            name: updatedItem.name,
            itemType: updatedItem.type,
            subItemType: updatedItem.subItemType,
            quantity: updatedItem.stock?.reduce((sum, s) => sum + s.quantity, 0) || 0
          }, task.updatedAt || getUTCNow());

          await markEffect(updateKey);

          console.log(`[updateItemsCreatedByTask] ✅ Updated item: ${item.id}`);
        }
      }
    }

    const resolveSiteFromTask = (t: Task): string | null => {
      if (t.targetSiteId && t.targetSiteId !== 'none') return t.targetSiteId;
      if (t.siteId && t.siteId !== 'none') return t.siteId;
      return null;
    };

    const adjustExistingItem = async (
      itemId: string,
      preferredSiteId: string | null,
      quantityDelta: number,
      effectLabel: string
    ): Promise<void> => {
      if (!itemId || quantityDelta === 0) return;

      const existingItem = await getItemById(itemId);
      if (!existingItem) {
        console.warn(`[updateItemsCreatedByTask] Existing item ${itemId} not found, skipping stock adjustment`);
        return;
      }

      const siteId = preferredSiteId || existingItem.stock?.[0]?.siteId || 'hq';
      const updateKey = EffectKeys.sideEffect('task', task.id, `updateExistingItem:${itemId}:${siteId}:${effectLabel}:${toDateTimestamp(task.updatedAt)}`);

      if (await hasEffect(updateKey)) {
        console.log(`[updateItemsCreatedByTask] ⏭️ Already adjusted existing item ${itemId} @ ${siteId}`);
        return;
      }

      const updatedStock = Array.isArray(existingItem.stock)
        ? existingItem.stock.map(stockPoint => ({ ...stockPoint }))
        : [];

      const stockIndex = updatedStock.findIndex(stockPoint => stockPoint.siteId === siteId);
      if (stockIndex >= 0) {
        const newQuantity = updatedStock[stockIndex].quantity + quantityDelta;
        if (newQuantity <= 0) {
          updatedStock.splice(stockIndex, 1);
        } else {
          updatedStock[stockIndex] = { ...updatedStock[stockIndex], quantity: newQuantity };
        }
      } else if (quantityDelta > 0) {
        updatedStock.push({ siteId, quantity: quantityDelta });
      } else {
        console.warn(`[updateItemsCreatedByTask] Attempted to subtract ${Math.abs(quantityDelta)} from site ${siteId} on item ${itemId}, but site not found. Skipping.`);
        return;
      }

      const updatedItem = {
        ...existingItem,
        stock: updatedStock,
        updatedAt: getUTCNow()
      };

      await upsertItem(updatedItem);
      await markEffect(updateKey);
      console.log(`[updateItemsCreatedByTask] ✅ Adjusted stock for existing item ${itemId} (Δ${quantityDelta} @ ${siteId})`);
    };

    const currentExistingItemId = (!task.isNewItem && task.outputItemId) ? task.outputItemId : null;
    const previousExistingItemId = (!previousTask.isNewItem && previousTask.outputItemId) ? previousTask.outputItemId : null;

    if (currentExistingItemId || previousExistingItemId) {
      const currentSite = resolveSiteFromTask(task);
      const previousSite = resolveSiteFromTask(previousTask);
      const currentQuantity = task.outputQuantity || 0;
      const previousQuantity = previousTask.outputQuantity || 0;

      if (currentExistingItemId && previousExistingItemId && currentExistingItemId === previousExistingItemId) {
        if (currentSite === previousSite) {
          const delta = currentQuantity - previousQuantity;
          await adjustExistingItem(currentExistingItemId, currentSite, delta, 'same');
        } else {
          if (previousQuantity !== 0) {
            await adjustExistingItem(previousExistingItemId, previousSite, -previousQuantity, 'site-prev');
          }
          if (currentQuantity !== 0) {
            await adjustExistingItem(currentExistingItemId, currentSite, currentQuantity, 'site-new');
          }
        }
      } else {
        if (previousExistingItemId && previousQuantity !== 0) {
          await adjustExistingItem(previousExistingItemId, previousSite, -previousQuantity, 'switch-prev');
        }
        if (currentExistingItemId && currentQuantity !== 0) {
          await adjustExistingItem(currentExistingItemId, currentSite, currentQuantity, 'switch-new');
        }
      }
    }
  } catch (error) {
    console.error(`[updateItemsCreatedByTask] Error updating items:`, error);
  }
}

// ============================================================================
// FINANCIAL RECORD → ITEM PROPAGATION (Enhanced)
// ============================================================================

export async function updateItemsCreatedByRecord(
  record: FinancialRecord,
  previousRecord: FinancialRecord
): Promise<void> {
  try {
    console.log(`[updateItemsCreatedByRecord] Updating items for financial record: ${record.name}`);

    // OPTIMIZED: Only load items created by this record (already filtered by index)
    const relatedItems = await getItemsBySourceRecordId(record.id);

    for (const item of relatedItems) {
      const updateKey = EffectKeys.sideEffect('financial', record.id, `updateItem:${item.id}:${toDateTimestamp(record.updatedAt)}`);

      if (await hasEffect(updateKey)) {
        console.log(`[updateItemsCreatedByRecord] ⏭️ Already updated item: ${item.id}`);
        continue;
      }

      // Check if output properties changed
      const outputPropsChanged =
        record.outputQuantity !== previousRecord.outputQuantity ||
        record.outputItemName !== previousRecord.outputItemName ||
        record.outputUnitCost !== previousRecord.outputUnitCost ||
        record.outputItemPrice !== previousRecord.outputItemPrice ||
        record.station !== previousRecord.station;

      const statePropsChanged = hasStatePropsChanged(record, previousRecord);

      if (outputPropsChanged || statePropsChanged) {
        const updatedItem = {
          ...item,
          name: outputPropsChanged ? (record.outputItemName || item.name) : item.name,
          unitCost: outputPropsChanged ? (record.outputUnitCost || item.unitCost) : item.unitCost,
          price: outputPropsChanged ? (record.outputItemPrice || item.price) : item.price,
          station: outputPropsChanged ? (record.station || item.station) : item.station,
          year: record.year, // inherit year
          updatedAt: getUTCNow()
        };

        // Update stock quantity if it changed
        if (record.outputQuantity !== previousRecord.outputQuantity) {
          const quantityDiff = (record.outputQuantity || 0) - (previousRecord.outputQuantity || 0);
          if (quantityDiff !== 0) {
            // Update the first stock point (or create one if none exists)
            if (updatedItem.stock && updatedItem.stock.length > 0) {
              updatedItem.stock[0].quantity += quantityDiff;
            } else {
              updatedItem.stock = [{
                siteId: record.siteId || 'default',
                quantity: quantityDiff
              }];
            }
          }
        }

        await upsertItem(updatedItem, { skipWorkflowEffects: true });

        // Log detailed update event
        const { appendEntityLog } = await import('./entities-logging');
        const { LogEventType } = await import('@/types/enums');

        await appendEntityLog(EntityType.ITEM, item.id, LogEventType.UPDATED, {
          name: updatedItem.name,
          itemType: updatedItem.type,
          subItemType: updatedItem.subItemType,
          quantity: updatedItem.stock?.reduce((sum, s) => sum + s.quantity, 0) || 0
        }, record.updatedAt || new Date(record.year, record.month - 1, 1));

        await markEffect(updateKey);

        console.log(`[updateItemsCreatedByRecord] ✅ Updated item: ${item.id}`);
      }
    }
  } catch (error) {
    console.error(`[updateItemsCreatedByRecord] Error updating items:`, error);
  }
}

// ============================================================================
// SALE → FINANCIAL RECORD PROPAGATION
// ============================================================================

export async function updateFinancialRecordsFromSale(
  sale: Sale,
  previousSale?: Sale
): Promise<void> {
  try {
    console.log(`[updateFinancialRecordsFromSale] Updating financial records for sale: ${sale.name}`);
    
    // [STATUS GUARD] Only emit/update financial records when the sale is CHARGED or COLLECTED
    const isCharged = sale.status !== SaleStatus.CANCELLED && 
                     (sale.status === SaleStatus.CHARGED || sale.status === SaleStatus.COLLECTED) && 
                     !sale.isNotPaid && !sale.isNotCharged;
    
    const isCollected = sale.status === SaleStatus.COLLECTED || !!sale.isCollected;
    const shouldHaveFinancials = isCharged || isCollected;

    if (!shouldHaveFinancials) {
      // If we are pending or cancelled, but records exist (from a previous charged state), we MUST remove them
      const existingRecords = await getFinancialsBySourceSaleId(sale.id);
      if (existingRecords.length > 0) {
        console.log(`[updateFinancialRecordsFromSale] Sale is ${sale.status} (Not Charged); Removing ${existingRecords.length} existing records.`);
        for (const record of existingRecords) {
          await removeFinancial(record.id);
        }
        // Also clear any 'financialCreated' effects to allow re-creation later
        await clearEffect(EffectKeys.sideEffect('sale', sale.id, 'financialCreated'));
      }
      return;
    }

    const { createFinancialRecordFromBoothSale, createFinancialRecordFromSale } = await import('./financial-record-utils');

    // NEW SALE HANDLING: If no previous sale, strictly create records
    if (!previousSale) {
      if (sale.type === SaleType.BOOTH) {
        await createFinancialRecordFromBoothSale(sale);
      } else if (sale.totals.totalRevenue > 0) {
        const effectKey = EffectKeys.sideEffect('sale', sale.id, 'financialCreated');
        if (!(await hasEffect(effectKey))) {
          await createFinancialRecordFromSale(sale);
          await markEffect(effectKey);
        }
      }
      return;
    }

    // UPDATE EXISTING SALE HANDLING
    // SPECIAL HANDLING for Booth-Sales (Split Records)
    if (sale.type === SaleType.BOOTH) {
      // Booth sales manage their own complex record creation/updates (Split Income/Expense)
      // If we are here, something relevant changed (Revenue, Fee, Counterparty, etc - driven by caller)

      // If records don't exist, create them. If they do, update them.
      const relatedRecords = await getFinancialsBySourceSaleId(sale.id);

      if (relatedRecords.length === 0) {
        await createFinancialRecordFromBoothSale(sale);
      } else {
        // We defer to the smart utility to handle the complex update logic (idempotent Upsert)
        // because createFinancialRecordFromBoothSale now has "Update Path" logic inside it
        await createFinancialRecordFromBoothSale(sale);
      }
      return;
    }

    // STANDARD LOGIC (Non-Booth-Sales): createFinancialRecordFromSale is the single writer
    // (upsert, correct name/month from sale, dedupe legacy duplicates — do not also create from processSaleLines).
  if (sale.totals.totalRevenue > 0) {
      await createFinancialRecordFromSale(sale);
      const effectKey = EffectKeys.sideEffect('sale', sale.id, 'financialCreated');
      if (!(await hasEffect(effectKey))) {
        await markEffect(effectKey);
      }
    }
  } catch (error) {
    console.error(`[updateFinancialRecordsFromSale] Error updating financial records:`, error);
  }
}

// ============================================================================
// SALE → ITEM PROPAGATION (Stock Updates)
// ============================================================================

export async function updateItemsFromSale(
  sale: Sale,
  previousSale?: Sale
): Promise<void> {
  try {
    console.log(`[updateItemsFromSale] Updating items for sale: ${sale.name}`);

    // Check if sale lines changed (skip if previousSale exists and lines are identical)
    if (previousSale) {
      const linesChanged =
        sale.lines?.length !== previousSale.lines?.length ||
        JSON.stringify(sale.lines) !== JSON.stringify(previousSale.lines);

      if (!linesChanged) {
        console.log(`[updateItemsFromSale] No line changes detected`);
        return;
      }
    }

    // Sold-item clones + archive/month indexes + extra SOLD logs: ensureSoldItemEntities (sale.workflow).
    // Here we only sync numeric/price fields on the line's item when lines change vs previous sale.
    for (const line of sale.lines || []) {
      if (line.kind === 'item' && 'itemId' in line && line.itemId) {
        const lineId = line.lineId || line.itemId;
        const lineSig = `${line.itemId}:${line.quantity ?? 0}:${line.unitPrice ?? 0}`;
        const updateKey = EffectKeys.sideEffect('sale', sale.id, `updateItem:${lineId}:${lineSig}`);

        if (await hasEffect(updateKey)) {
          console.log(`[updateItemsFromSale] ⏭️ Already updated for line: ${lineId}`);
          continue;
        }

        const item = await getItemById(line.itemId);
        if (!item) {
          console.warn(`[updateItemsFromSale] Item not found: ${line.itemId}`);
          continue;
        }

        const updatedItem = {
          ...item,
          quantitySold: (item.quantitySold || 0) + (line.quantity || 0),
          soldAt: item.soldAt || (sale.doneAt || sale.saleDate || getUTCNow()),
          value: line.unitPrice * line.quantity,
          price: line.unitPrice,
          updatedAt: getUTCNow()
        };

        await upsertItem(updatedItem, { skipWorkflowEffects: true });
        console.log(`[updateItemsFromSale] ✅ Updated item: ${line.itemId}`);

        await markEffect(updateKey);
      }
    }
  } catch (error) {
    console.error(`[updateItemsFromSale] Error updating items:`, error);
  }
}


// ============================================================================
// TASK/FINANCIAL → PLAYER PROPAGATION (Points Delta)
// (Sale rewards: staged/collect in sale.workflow — explicit sale.rewards only.)
// ============================================================================

export async function updatePlayerPointsFromSource(
  sourceType: EntityType.TASK | EntityType.FINANCIAL,
  newSource: any,
  oldSource: any
): Promise<void> {
  try {
    console.log(`[updatePlayerPointsFromSource] Updating player points from ${sourceType}: ${newSource.name}`);
    // Guardrails: Only propagate points when the source is truly finalized
    // - Task: must be Done in both old and new versions
    if (sourceType === EntityType.TASK) {
      const wasCompleted = oldSource?.status === TaskStatus.DONE && !!oldSource?.doneAt;
      const isCompleted = newSource?.status === TaskStatus.DONE && !!newSource?.doneAt;
      if (!wasCompleted || !isCompleted) {
        console.log('[updatePlayerPointsFromSource] Task not completed in both versions, skipping delta');
        return;
      }
    }

    // Calculate points delta
    let pointsDelta = { xp: 0, rp: 0, fp: 0, hp: 0 };

    const newPoints = newSource.rewards?.points || { xp: 0, rp: 0, fp: 0, hp: 0 };
    const oldPoints = oldSource.rewards?.points || { xp: 0, rp: 0, fp: 0, hp: 0 };

    pointsDelta = {
      xp: (newPoints.xp || 0) - (oldPoints.xp || 0),
      rp: (newPoints.rp || 0) - (oldPoints.rp || 0),
      fp: (newPoints.fp || 0) - (oldPoints.fp || 0),
      hp: (newPoints.hp || 0) - (oldPoints.hp || 0)
    };

    // Skip if no points change
    if (pointsDelta.xp === 0 && pointsDelta.rp === 0 && pointsDelta.fp === 0 && pointsDelta.hp === 0) {
      console.log(`[updatePlayerPointsFromSource] No points change detected`);
      return;
    }

    // Find the target player (resolve from playerCharacterId when present)
    const playerIdCandidate = newSource?.playerCharacterId || oldSource?.playerCharacterId || FOUNDER_CHARACTER_ID;
    const playerId = await resolveToPlayerIdMaybeCharacter(playerIdCandidate);
    const player = await getPlayerById(playerId);

    if (!player) {
      console.warn(`[updatePlayerPointsFromSource] Player ${playerId} not found`);
      return;
    }

    const updateKey = EffectKeys.sideEffect(sourceType, newSource.id, `updatePlayerPoints:${player.id}:${toDateTimestamp(newSource.updatedAt)}`);

    if (await hasEffect(updateKey)) {
      console.log(`[updatePlayerPointsFromSource] ⏭️ Already updated player: ${player.id}`);
      return;
    }

    // Update player points and totalPoints
    // Determine if we should update Rewarded (Available) or Pending/Staged points
    const isCollected = newSource.isCollected === true;

    let updatedPlayer: any;

    if (isCollected) {
      // If collected, update Rewarded Points and Lifetime Points
      console.log(`[updatePlayerPointsFromSource] Updating REWARDED points (Source Collected)`);
      updatedPlayer = {
        ...player,
        points: {
          xp: Math.round((player.points?.xp || 0) + pointsDelta.xp),
          rp: Math.round((player.points?.rp || 0) + pointsDelta.rp),
          fp: Math.round((player.points?.fp || 0) + pointsDelta.fp),
          hp: Math.round((player.points?.hp || 0) + pointsDelta.hp)
        },
        totalPoints: {
          xp: Math.round((player.totalPoints?.xp || 0) + pointsDelta.xp),
          rp: Math.round((player.totalPoints?.rp || 0) + pointsDelta.rp),
          fp: Math.round((player.totalPoints?.fp || 0) + pointsDelta.fp),
          hp: Math.round((player.totalPoints?.hp || 0) + pointsDelta.hp)
        },
        updatedAt: getUTCNow()
      };
    } else {
      // If NOT collected, update Pending (Staged) Points only
      console.log(`[updatePlayerPointsFromSource] Updating PENDING points (Source Not Collected)`);
      updatedPlayer = {
        ...player,
        pendingPoints: {
          xp: Math.round((player.pendingPoints?.xp || 0) + pointsDelta.xp),
          rp: Math.round((player.pendingPoints?.rp || 0) + pointsDelta.rp),
          fp: Math.round((player.pendingPoints?.fp || 0) + pointsDelta.fp),
          hp: Math.round((player.pendingPoints?.hp || 0) + pointsDelta.hp)
        },
        updatedAt: getUTCNow()
      };
    }

    await upsertPlayer(updatedPlayer);
    await markEffect(updateKey);

    // If this is a task update, also update the log entries
    if (sourceType === EntityType.TASK) {
      const { logPlayerUpdateFromTask } = await import('./entities-workflows/player.workflow');
      await logPlayerUpdateFromTask(newSource, oldSource);
    }

    console.log(`[updatePlayerPointsFromSource] ✅ Updated player points: ${player.id}`);
  } catch (error) {
    console.error(`[updatePlayerPointsFromSource] Error updating player points:`, error);
  }
}

// ============================================================================
// PROPERTY CHANGE DETECTION HELPERS
// ============================================================================

export function hasStatePropsChanged(newEntity: any, oldEntity: any): boolean {
  return (
    newEntity.status !== oldEntity.status ||
    newEntity.isCollected !== oldEntity.isCollected ||
    toDateTimestamp(newEntity.doneAt) !== toDateTimestamp(oldEntity.doneAt) ||
    toDateTimestamp(newEntity.collectedAt) !== toDateTimestamp(oldEntity.collectedAt) ||
    toDateTimestamp(newEntity.saleDate) !== toDateTimestamp(oldEntity.saleDate)
  );
}

export function hasFinancialPropsChanged(newEntity: any, oldEntity: any): boolean {
  return (
    newEntity.cost !== oldEntity.cost ||
    newEntity.revenue !== oldEntity.revenue ||
    newEntity.isNotPaid !== oldEntity.isNotPaid ||
    newEntity.isNotCharged !== oldEntity.isNotCharged ||
    newEntity.name !== oldEntity.name ||
    newEntity.station !== oldEntity.station ||
    getTaskCounterpartyId(newEntity as any) !== getTaskCounterpartyId(oldEntity as any) ||
    newEntity.customerCharacterRole !== oldEntity.customerCharacterRole
  );
}

export function hasOutputPropsChanged(newEntity: any, oldEntity: any): boolean {
  return (
    newEntity.outputQuantity !== oldEntity.outputQuantity ||
    newEntity.outputItemName !== oldEntity.outputItemName ||
    newEntity.outputUnitCost !== oldEntity.outputUnitCost ||
    newEntity.outputItemPrice !== oldEntity.outputItemPrice ||
    newEntity.station !== oldEntity.station
  );
}

export function hasRewardsChanged(newEntity: any, oldEntity: any): boolean {
  const newRewards = newEntity.rewards?.points || { xp: 0, rp: 0, fp: 0, hp: 0 };
  const oldRewards = oldEntity.rewards?.points || { xp: 0, rp: 0, fp: 0, hp: 0 };

  return (
    newRewards.xp !== oldRewards.xp ||
    newRewards.rp !== oldRewards.rp ||
    newRewards.fp !== oldRewards.fp ||
    newRewards.hp !== oldRewards.hp
  );
}

export function hasRevenueChanged(newEntity: any, oldEntity: any): boolean {
  return (newEntity.totals?.totalRevenue || 0) !== (oldEntity.totals?.totalRevenue || 0);
}

export function hasCostChanged(newEntity: any, oldEntity: any): boolean {
  return (newEntity.totals?.totalCost || 0) !== (oldEntity.totals?.totalCost || 0);
}

export function hasLinesChanged(newEntity: any, oldEntity: any): boolean {
  return JSON.stringify(newEntity.lines) !== JSON.stringify(oldEntity.lines);
}
export async function updateTasksFromItem(
  item: Item,
  previousItem?: Item
): Promise<void> {
  if (!previousItem) return;

  // Detect if any shared metadata changed
  const dataChanged = 
    item.name !== previousItem.name ||
    item.station !== previousItem.station ||
    item.price !== previousItem.price ||
    item.unitCost !== previousItem.unitCost;

  if (!dataChanged) return;

  try {
    console.log(`[updateTasksFromItem] Item data changed for ${item.id}. Propagating to linked tasks.`);
    
    // Find all tasks that have this item as output
    const { getAllTasks } = await import('@/data-store/datastore');
    const allTasks = await getAllTasks();
    const relatedTasks = allTasks.filter((t: Task) => t.outputItemId === item.id);

    for (const task of relatedTasks) {
      const needsUpdate = 
        task.outputItemName !== item.name ||
        task.station !== item.station ||
        task.outputItemPrice !== item.price ||
        task.outputUnitCost !== item.unitCost;

      if (needsUpdate) {
        const updatedTask = {
          ...task,
          outputItemName: item.name,
          station: item.station || task.station,
          outputItemPrice: item.price || task.outputItemPrice,
          outputUnitCost: item.unitCost || task.outputUnitCost,
          updatedAt: getUTCNow()
        };
        const { upsertTask } = await import('@/data-store/datastore');
        await upsertTask(updatedTask, { skipWorkflowEffects: true });
        console.log(`[updateTasksFromItem] ✅ Synchronized task ${task.id} with latest item data.`);
      }
    }
  } catch (error) {
    console.error(`[updateTasksFromItem] Error syncing data from item to tasks:`, error);
  }
}

// ============================================================================
// ITEM → FINANCIAL RECORD PROPAGATION
// ============================================================================

export async function updateFinancialRecordsFromItem(
  item: Item,
  previousItem?: Item
): Promise<void> {
  if (!previousItem) return;

  const dataChanged = 
    item.name !== previousItem.name ||
    item.station !== previousItem.station ||
    item.price !== previousItem.price ||
    item.unitCost !== previousItem.unitCost;

  if (!dataChanged) return;

  try {
    console.log(`[updateFinancialRecordsFromItem] Item data changed for ${item.id}. Propagating to linked records.`);
    
    const { getAllFinancials, upsertFinancial } = await import('@/data-store/datastore');
    const allRecords = await getAllFinancials();
    const relatedRecords = allRecords.filter(r => r.outputItemId === item.id);

    for (const record of relatedRecords) {
      const needsUpdate = 
        record.outputItemName !== item.name ||
        record.station !== item.station ||
        record.outputItemPrice !== item.price ||
        record.outputUnitCost !== item.unitCost;

      if (needsUpdate) {
        const updatedRecord = {
          ...record,
          outputItemName: item.name,
          station: item.station || record.station,
          outputItemPrice: item.price || record.outputItemPrice,
          outputUnitCost: item.unitCost || record.outputUnitCost,
          updatedAt: getUTCNow()
        };
        await upsertFinancial(updatedRecord, { skipWorkflowEffects: true });
        console.log(`[updateFinancialRecordsFromItem] ✅ Synchronized financial record ${record.id} with latest item data.`);
      }
    }
  } catch (error) {
    console.error(`[updateFinancialRecordsFromItem] Error syncing data from item to financials:`, error);
  }
}

// ============================================================================
// ITEM → SALE PROPAGATION
// ============================================================================

export async function updateSalesFromItem(
  item: Item,
  previousItem?: Item
): Promise<void> {
  if (!previousItem || item.name === previousItem.name) return;

  try {
    console.log(`[updateSalesFromItem] Item name changed: ${previousItem.name} → ${item.name}. Updating sale lines.`);
    
    // Find all sales
    const { getAllSales, upsertSale } = await import('@/data-store/datastore');
    const allSales = await getAllSales();
    
    for (const sale of allSales) {
      let saleChanged = false;
      const updatedLines = sale.lines?.map(line => {
        if (line.kind === 'item') {
          const itemLine = line as any;
          if (itemLine.itemId === item.id && itemLine.description !== item.name) {
            saleChanged = true;
            return { ...itemLine, description: item.name };
          }
        }
        return line;
      });

      if (saleChanged) {
        const updatedSale = {
          ...sale,
          lines: updatedLines,
          updatedAt: getUTCNow()
        };
        await upsertSale(updatedSale, { skipWorkflowEffects: true });
        console.log(`[updateSalesFromItem] ✅ Updated sale ${sale.id} line with new item name: ${item.name}`);
      }
    }
  } catch (error) {
    console.error(`[updateSalesFromItem] Error updating sales:`, error);
  }
}
