// @ts-nocheck
// workflows/update-propagation-utils.ts
// Comprehensive update propagation across ALL entity relationships

import type { Task, Item, Sale, FinancialRecord, Character, Player } from '@/types/entities';
import { EntityType, TaskStatus, CharacterRole, LinkType, SaleType, SaleStatus } from '@/types/enums';
import { deleteEffectClaim, isEffectCompleted, acquireEffectClaim, resolveEffectClaim } from '@/lib/domain/effects/effect-claim-store';
import { EffectClaimStatus } from '@/types/enums';
import { EffectKeys } from '@/data-store/keys';
import { getFinancialsBySourceTaskId, getFinancialsBySourceSaleId, getFinancialById, upsertFinancial, removeFinancial } from '@/data-store/datastore';
import { getItemsBySourceTaskId, getItemsBySourceRecordId, getItemById, upsertItem, removeItem } from '@/data-store/datastore';
import { getTaskById, upsertTask } from '@/data-store/datastore';
import { getPlayerById, upsertPlayer } from '@/data-store/datastore';
import { getAllCharacters, upsertCharacter } from '@/data-store/datastore';
import { getPlayerRewards, resolveToPlayerIdMaybeCharacter } from './points-rewards-utils';
import { getUTCNow } from '@/lib/utils/utc-utils';
import { getLinksFor } from '@/links/link-registry';
import { getTaskCounterpartyId } from '@/workflows/task-counterparty-resolution';
import { extractMoneyValue, toMoney } from '@/lib/utils/financial-utils';

import { resolveTaskOwnerPlayerId } from './task-player-resolution';
import { resolveSaleOwnerId } from '@/lib/sale-relationship-selectors';
import { getTaskCollectedAt, getTaskDoneAt } from '@/lib/utils/task-lifecycle-utils';

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

const taskProductionPlan = (task: Task) => task.context?.productionPlan;
const taskIsNewItem = (task: Task): boolean => Boolean(taskProductionPlan(task)?.isNewItem ?? (task as any).isNewItem);
const taskOutputQuantity = (task: Task): number => Number(taskProductionPlan(task)?.outputQuantity ?? (task as any).outputQuantity ?? 0);
const taskOutputName = (task: Task): string | undefined => taskProductionPlan(task)?.outputItemName ?? (task as any).outputItemName;
const taskOutputUnitCost = (task: Task): number => extractMoneyValue(taskProductionPlan(task)?.outputUnitCost) || Number((task as any).outputUnitCost || 0);
const taskOutputPrice = (task: Task): number => extractMoneyValue(taskProductionPlan(task)?.outputItemPrice) || Number((task as any).outputItemPrice || 0);

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

      const claim = await acquireEffectClaim({ idempotencyKey: updateKey, ownerId: `update-prop-workflow`, commandId: `update-prop`, leaseSeconds: 60 });
      if (!claim) {
        console.log(`[updateFinancialRecordsFromTask] ⏭️ Already updated record: ${record.id}`);
        continue;
      }

      // Check if financial properties changed
      const financialPropsChanged =
        task.cost !== previousTask.cost ||
        task.revenue !== previousTask.revenue ||
        (task.status === "PENDING") !== (previousTask.status === "PENDING") ||
        task.status !== previousTask.status ||
        getTaskCounterpartyId(task) !== getTaskCounterpartyId(previousTask) ||
        task.customerCharacterRole !== previousTask.customerCharacterRole ||
        task.name !== previousTask.name ||
        task.station !== previousTask.station;

      const statePropsChanged = hasStatePropsChanged(task, previousTask);

      if (financialPropsChanged || statePropsChanged) {
        let year = record.year;
        let month = record.month;
        if (statePropsChanged) {
          const dateToUse = getTaskCollectedAt(task) || getTaskDoneAt(task) || record.createdAt;
          const safeDate = normalizeDate(dateToUse);
          year = safeDate.getFullYear();
          month = safeDate.getMonth() + 1;
        }

        const nextCost = Number(task.cost || 0);
        const nextRevenue = Number(task.revenue || 0);
        const updatedRecord = {
          ...record,
          cost: toMoney(nextCost),
          revenue: toMoney(nextRevenue),
          netCashflow: toMoney(nextRevenue - nextCost),
          status: task.status === "PENDING" ? FinancialStatus.PENDING : record.status,
          lifecycle: {
            ...record.lifecycle,
            doneAt: record.lifecycle?.doneAt || record.createdAt,
          },
          context: {
            ...record.context,
          },
          __financialRelations: {
            sourceTaskId: task.id,
            siteId: task.siteId,
            targetSiteId: task.targetSiteId,
            characterId: getTaskCounterpartyId(task),
            characterRelationship: task.context?.counterparty?.role || task.customerCharacterRole || CharacterRole.CUSTOMER,
          },
          name: task.name,
          station: task.station,
          year,
          month,
          updatedAt: getUTCNow()
        };

        await upsertFinancial(updatedRecord);
        await resolveEffectClaim({ idempotencyKey: updateKey, leaseToken: claim.leaseToken, status: EffectClaimStatus.COMPLETED });

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

async function getFinancialSourceTaskId(record: FinancialRecord): Promise<string | null> {
  const legacy = (record as any).sourceTaskId;
  if (legacy) return legacy;
  const links = await getLinksFor({ type: EntityType.FINANCIAL, id: record.id });
  const link = links.find((candidate: any) =>
    candidate.linkType === LinkType.TASK_FINREC && candidate.source?.type === EntityType.TASK
  ) as any;
  return link?.source?.id || null;
}

async function getFinancialSiteId(record: FinancialRecord): Promise<string | null> {
  const legacy = (record as any).targetSiteId || (record as any).siteId;
  if (legacy) return legacy;
  const links = await getLinksFor({ type: EntityType.FINANCIAL, id: record.id });
  const target = links.find((candidate: any) =>
    candidate.linkType === LinkType.FINREC_SITE &&
    String(candidate.relationship || '').toLowerCase() === 'target-site' &&
    candidate.target?.type === EntityType.SITE
  );
  const source = links.find((candidate: any) =>
    candidate.linkType === LinkType.FINREC_SITE && candidate.target?.type === EntityType.SITE
  );
  return target?.target?.id || source?.target?.id || null;
}

export async function updateTasksFromFinancialRecord(
  record: FinancialRecord,
  previousRecord: FinancialRecord
): Promise<void> {
  try {
    console.log(`[updateTasksFromFinancialRecord] Updating tasks for financial record: ${record.name}`);

    // Find task that created this financial record
    const sourceTaskId = await getFinancialSourceTaskId(record);
    if (!sourceTaskId) {
      console.log(`[updateTasksFromFinancialRecord] No sourceTaskId, skipping`);
      return;
    }

    const task = await getTaskById(sourceTaskId);
    if (!task) {
      console.log(`[updateTasksFromFinancialRecord] Task ${sourceTaskId} not found, skipping`);
      return;
    }

    // Create array with single task for compatibility with rest of code
    const relatedTasks = [task];

    for (const task of relatedTasks) {
      const updateKey = EffectKeys.sideEffect('financial', record.id, `updateTask:${task.id}:${toDateTimestamp(record.updatedAt)}`);

      const claim = await acquireEffectClaim({ idempotencyKey: updateKey, ownerId: `update-prop-workflow`, commandId: `update-prop`, leaseSeconds: 60 });
      if (!claim) {
        console.log(`[updateTasksFromFinancialRecord] ⏭️ Already updated task: ${task.id}`);
        continue;
      }

      // Check if financial properties changed
      const financialPropsChanged =
        extractMoneyValue(record.cost) !== extractMoneyValue(previousRecord.cost) ||
        extractMoneyValue(record.revenue) !== extractMoneyValue(previousRecord.revenue) ||
        (record.status === FinancialStatus.PENDING) !== (previousRecord.status === "PENDING") ||
        record.context?.paymentObservation?.charged !== previousRecord.context?.paymentObservation?.charged ||
        getTaskCounterpartyId(record as unknown as Task) !== getTaskCounterpartyId(previousRecord as unknown as Task) ||
        (record as any).customerCharacterRole !== previousRecord.customerCharacterRole ||
        record.name !== previousRecord.name ||
        record.station !== previousRecord.station;

      const statePropsChanged = hasStatePropsChanged(record, previousRecord);

      if (financialPropsChanged || statePropsChanged) {
        const updatedTask = {
          ...task,
          cost: record.cost,
          revenue: record.revenue,
          characterId: getTaskCounterpartyId(record as unknown as Task),
          customerCharacterRole: (record as any).customerCharacterRole || CharacterRole.CUSTOMER,
          name: record.name,
          station: record.station,
          updatedAt: getUTCNow()
        };

        await upsertTask(updatedTask);
        await resolveEffectClaim({ idempotencyKey: updateKey, leaseToken: claim.leaseToken, status: EffectClaimStatus.COMPLETED });

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

    if (!taskIsNewItem(task) && taskIsNewItem(previousTask) && relatedItems.length > 0) {
      const removalKey = EffectKeys.sideEffect('task', task.id, `removeCreatedItems:${toDateTimestamp(task.updatedAt)}`);
      const claim = await acquireEffectClaim({ idempotencyKey: removalKey, ownerId: `update-prop-workflow`, commandId: `update-prop`, leaseSeconds: 60 });
      if (claim) {
        for (const item of relatedItems) {
          try {
            await removeItem(item.id);
            console.log(`[updateItemsCreatedByTask] 🗑️ Removed task-created item ${item.id} after switching to existing inventory`);
          } catch (error) {
            console.error(`[updateItemsCreatedByTask] ❌ Failed to remove task-created item ${item.id}:`, error);
          }
        }
        await resolveEffectClaim({ idempotencyKey: removalKey, leaseToken: claim.leaseToken, status: EffectClaimStatus.COMPLETED });
      }
    }

    if (taskIsNewItem(task) || taskIsNewItem(previousTask)) {
      for (const item of relatedItems) {
        const updateKey = EffectKeys.sideEffect('task', task.id, `updateItem:${item.id}:${toDateTimestamp(task.updatedAt)}`);

        const claim = await acquireEffectClaim({ idempotencyKey: updateKey, ownerId: `update-prop-workflow`, commandId: `update-prop`, leaseSeconds: 60 });
      if (!claim) {
          console.log(`[updateItemsCreatedByTask] ⏭️ Already updated item: ${item.id}`);
          continue;
        }

        // Check if output properties changed
        const outputPropsChanged =
          taskOutputQuantity(task) !== taskOutputQuantity(previousTask) ||
          taskOutputName(task) !== taskOutputName(previousTask) ||
          taskOutputUnitCost(task) !== taskOutputUnitCost(previousTask) ||
          taskOutputPrice(task) !== taskOutputPrice(previousTask);

        const statePropsChanged = hasStatePropsChanged(task, previousTask);

        if (outputPropsChanged || statePropsChanged) {
          let year = item.context?.year;
          if (statePropsChanged) {
            const dateToUse = normalizeDate(getTaskCollectedAt(task) || getTaskDoneAt(task) || item.createdAt);
            year = dateToUse.getFullYear();
          }

          const updatedItem = {
            ...item,
            name: outputPropsChanged ? (taskOutputName(task) || item.name) : item.name,
            pricing: outputPropsChanged
              ? {
                  ...item.pricing,
                  unitCost: toMoney(taskOutputUnitCost(task)),
                  targetPrice: toMoney(taskOutputPrice(task)),
                }
              : item.pricing,
            context: {
              ...item.context,
              year,
            },
            updatedAt: getUTCNow()
          };

          // Update stock quantity if it changed
          // FIX: Skip delta calculation if the item was JUST created in this same workflow transaction
          // otherwise we add the delta (e.g. +3) to the initial value (e.g. 4), resulting in 7.
          const wasJustCreated = await isEffectCompleted(EffectKeys.sideEffect('task', task.id, 'itemCreated'));

          if (!wasJustCreated && taskOutputQuantity(task) !== taskOutputQuantity(previousTask)) {
            const quantityDiff = taskOutputQuantity(task) - taskOutputQuantity(previousTask);
            if (quantityDiff !== 0) {
              // Update the first stock point (or create one if none exists)
              if (updatedItem.stock && updatedItem.stock.length > 0) {
                updatedItem.stock[0].quantity += quantityDiff;
              } else {
                updatedItem.stock = [{
                siteId: task.siteId || '',
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

          await resolveEffectClaim({ idempotencyKey: updateKey, leaseToken: claim.leaseToken, status: EffectClaimStatus.COMPLETED });

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

      const siteId = preferredSiteId || existingItem.stock?.[0]?.siteId || '';
      const updateKey = EffectKeys.sideEffect('task', task.id, `updateExistingItem:${itemId}:${siteId}:${effectLabel}:${toDateTimestamp(task.updatedAt)}`);

      const claim = await acquireEffectClaim({ idempotencyKey: updateKey, ownerId: `update-prop-workflow`, commandId: `update-prop`, leaseSeconds: 60 });
      if (!claim) {
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
      await resolveEffectClaim({ idempotencyKey: updateKey, leaseToken: claim.leaseToken, status: EffectClaimStatus.COMPLETED });
      console.log(`[updateItemsCreatedByTask] ✅ Adjusted stock for existing item ${itemId} (Δ${quantityDelta} @ ${siteId})`);
    };

    const currentExistingItemId = (!taskIsNewItem(task) && task.outputItemId) ? task.outputItemId : null;
    const previousExistingItemId = (!taskIsNewItem(previousTask) && previousTask.outputItemId) ? previousTask.outputItemId : null;

    if (currentExistingItemId || previousExistingItemId) {
      const currentSite = resolveSiteFromTask(task);
      const previousSite = resolveSiteFromTask(previousTask);
      const currentQuantity = taskOutputQuantity(task);
      const previousQuantity = taskOutputQuantity(previousTask);

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

      const claim = await acquireEffectClaim({ idempotencyKey: updateKey, ownerId: `update-prop-workflow`, commandId: `update-prop`, leaseSeconds: 60 });
      if (!claim) {
        console.log(`[updateItemsCreatedByRecord] ⏭️ Already updated item: ${item.id}`);
        continue;
      }

      // Check if output properties changed
      const outputPropsChanged =
        JSON.stringify(record.context?.productionPlan ?? null) !== JSON.stringify(previousRecord.context?.productionPlan ?? null);

      const statePropsChanged = hasStatePropsChanged(record, previousRecord);

      if (outputPropsChanged || statePropsChanged) {
        const updatedItem = {
          ...item,
          name: outputPropsChanged ? (record.context?.productionPlan?.outputItemName || item.name) : item.name,
          pricing: outputPropsChanged
            ? {
                ...item.pricing,
                unitCost: record.context?.productionPlan?.outputUnitCost || item.pricing?.unitCost,
                targetPrice: record.context?.productionPlan?.outputItemPrice || item.pricing?.targetPrice,
              }
            : item.pricing,
          year: record.year, // inherit year
          updatedAt: getUTCNow()
        };

        // Update stock quantity if it changed
        if (record.context?.productionPlan?.outputQuantity !== previousRecord.context?.productionPlan?.outputQuantity) {
          const quantityDiff = (record.context?.productionPlan?.outputQuantity || 0) - (previousRecord.context?.productionPlan?.outputQuantity || 0);
          if (quantityDiff !== 0) {
            // Update the first stock point (or create one if none exists)
            if (updatedItem.stock && updatedItem.stock.length > 0) {
              updatedItem.stock[0].quantity += quantityDiff;
            } else {
              updatedItem.stock = [{
                siteId: (await getFinancialSiteId(record)) || '',
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

        await resolveEffectClaim({ idempotencyKey: updateKey, leaseToken: claim.leaseToken, status: EffectClaimStatus.COMPLETED });

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
                     (sale.status === SaleStatus.CHARGED || sale.status === SaleStatus.CHARGED || sale.status === SaleStatus.COLLECTED);
    
    const isCollected = sale.status === SaleStatus.COLLECTED ;
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
        await deleteEffectClaim(EffectKeys.sideEffect('sale', sale.id, 'financialCreated'));
      }
      return;
    }

    const { createFinancialRecordFromBoothSale, createFinancialRecordFromSale } = await import('./financial-record-utils');

    // NEW SALE HANDLING: If no previous sale, strictly create records
    if (!previousSale) {
      if (sale.type === SaleType.BOOTH) {
        await createFinancialRecordFromBoothSale(sale);
      } else if (extractMoneyValue(sale.totals?.totalRevenue) > 0) {
        const effectKey = EffectKeys.sideEffect('sale', sale.id, 'financialCreated');
        const claim = await acquireEffectClaim({ idempotencyKey: effectKey, ownerId: `update-prop-workflow`, commandId: `update-prop`, leaseSeconds: 60 });
      if (claim) {
          await createFinancialRecordFromSale(sale);
          await resolveEffectClaim({ idempotencyKey: effectKey, leaseToken: claim.leaseToken, status: EffectClaimStatus.COMPLETED });
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
  if (extractMoneyValue(sale.totals.totalRevenue) > 0) {
      await createFinancialRecordFromSale(sale);
      const effectKey = EffectKeys.sideEffect('sale', sale.id, 'financialCreated');
      const claim = await acquireEffectClaim({ idempotencyKey: effectKey, ownerId: `update-prop-workflow`, commandId: `update-prop`, leaseSeconds: 60 });
      if (claim) {
        await resolveEffectClaim({ idempotencyKey: effectKey, leaseToken: claim.leaseToken, status: EffectClaimStatus.COMPLETED });
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
        const linePrice = extractMoneyValue(line.unitPrice);
        const lineSig = `${line.itemId}:${line.quantity ?? 0}:${linePrice}`;
        const updateKey = EffectKeys.sideEffect('sale', sale.id, `updateItem:${lineId}:${lineSig}`);

        const claim = await acquireEffectClaim({ idempotencyKey: updateKey, ownerId: `update-prop-workflow`, commandId: `update-prop`, leaseSeconds: 60 });
      if (!claim) {
          console.log(`[updateItemsFromSale] ⏭️ Already updated for line: ${lineId}`);
          continue;
        }

        const item = await getItemById(line.itemId);
        if (!item) {
          console.warn(`[updateItemsFromSale] Item not found: ${line.itemId}`);
          continue;
        }

        const lineValue = linePrice * (line.quantity || 0);
        const updatedItem = {
          ...item,
          context: {
            ...item.context,
            soldAt: item.context?.soldAt || (sale.lifecycle?.doneAt || sale.createdAt || sale.saleDate || getUTCNow()),
          },
          pricing: {
            ...item.pricing,
            actualSaleValue: toMoney(lineValue, item.pricing?.targetPrice?.currency || 'USD'),
          },
          updatedAt: getUTCNow()
        };

        await upsertItem(updatedItem, { skipWorkflowEffects: true });
        console.log(`[updateItemsFromSale] ✅ Updated item: ${line.itemId}`);

        await resolveEffectClaim({ idempotencyKey: updateKey, leaseToken: claim.leaseToken, status: EffectClaimStatus.COMPLETED });
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
    // Guardrails: Only propagate points when the source is truly finalized.
    // Collected is a canonical status, not the retired isCollected flag.
    if (sourceType === EntityType.TASK) {
      const wasCompleted =
        (oldSource?.status === TaskStatus.DONE || oldSource?.status === TaskStatus.COLLECTED) &&
        !!getTaskDoneAt(oldSource as Task);
      const isCompleted =
        (newSource?.status === TaskStatus.DONE || newSource?.status === TaskStatus.COLLECTED) &&
        !!getTaskDoneAt(newSource as Task);
      if (!wasCompleted || !isCompleted) {
        console.log('[updatePlayerPointsFromSource] Task not completed in both versions, skipping delta');
        return;
      }
    }

    // Calculate points delta
    let pointsDelta = { xp: 0, rp: 0, fp: 0, hp: 0 };

    const newPoints = newSource.context?.rewardIntent?.points || { xp: 0, rp: 0, fp: 0, hp: 0 };
    const oldPoints = oldSource.context?.rewardIntent?.points || { xp: 0, rp: 0, fp: 0, hp: 0 };

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

    // Find the target Player from the Sale owner Character or Task owner.
    const playerIdCandidate = sourceType === EntityType.TASK
      ? await resolveTaskOwnerPlayerId(newSource as Task) || await resolveTaskOwnerPlayerId(oldSource as Task)
      : sourceType === EntityType.SALE
        ? await resolveSaleOwnerId(newSource as Sale) || await resolveSaleOwnerId(oldSource as Sale)
        : newSource?.playerCharacterId || oldSource?.playerCharacterId || null;
    if (!playerIdCandidate) {
      console.warn(`[updatePlayerPointsFromSource] Task ${newSource.id} owner has no Player`);
      return;
    }
    const playerId = await resolveToPlayerIdMaybeCharacter(playerIdCandidate);
    const player = await getPlayerById(playerId);

    if (!player) {
      console.warn(`[updatePlayerPointsFromSource] Player ${playerId} not found`);
      return;
    }

    const updateKey = EffectKeys.sideEffect(sourceType, newSource.id, `updatePlayerPoints:${player.id}:${toDateTimestamp(newSource.updatedAt)}`);

    const claim = await acquireEffectClaim({ idempotencyKey: updateKey, ownerId: `update-prop-workflow`, commandId: `update-prop`, leaseSeconds: 60 });
      if (!claim) {
      console.log(`[updatePlayerPointsFromSource] ⏭️ Already updated player: ${player.id}`);
      return;
    }

    // Update the canonical PlayerRewardsV1 projection.
    const isCollected = newSource.status === TaskStatus.COLLECTED;

    const rewards = getPlayerRewards(player);
    const delta = (bucket: keyof typeof rewards.points) => ({
      xp: Math.max(0, (rewards.points[bucket]?.xp || 0) + pointsDelta.xp),
      rp: Math.max(0, (rewards.points[bucket]?.rp || 0) + pointsDelta.rp),
      fp: Math.max(0, (rewards.points[bucket]?.fp || 0) + pointsDelta.fp),
      hp: Math.max(0, (rewards.points[bucket]?.hp || 0) + pointsDelta.hp),
    });

    let updatedPlayer: any;

    if (isCollected) {
      // If collected, update Rewarded Points and Lifetime Points
      console.log(`[updatePlayerPointsFromSource] Updating REWARDED points (Source Collected)`);
      updatedPlayer = {
        ...player,
        rewards: {
          ...rewards,
          points: {
            ...rewards.points,
            vested: delta('vested'),
            current: delta('current'),
            historic: delta('historic'),
          },
          },
        updatedAt: getUTCNow()
      };
    } else {
      // If NOT collected, update Pending (Staged) Points only
      console.log(`[updatePlayerPointsFromSource] Updating PENDING points (Source Not Collected)`);
      updatedPlayer = {
        ...player,
        rewards: {
          ...rewards,
          points: {
            ...rewards.points,
            pending: delta('pending'),
            historic: delta('historic'),
          },
        },
        updatedAt: getUTCNow()
      };
    }

    await upsertPlayer(updatedPlayer);
    await resolveEffectClaim({ idempotencyKey: updateKey, leaseToken: claim.leaseToken, status: EffectClaimStatus.COMPLETED });

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
    toDateTimestamp(getTaskDoneAt(newEntity as Task)) !== toDateTimestamp(getTaskDoneAt(oldEntity as Task)) ||
    toDateTimestamp(getTaskCollectedAt(newEntity as Task)) !== toDateTimestamp(getTaskCollectedAt(oldEntity as Task)) ||
    toDateTimestamp(newEntity.createdAt) !== toDateTimestamp(oldEntity.createdAt)
  );
}

export function hasFinancialPropsChanged(newEntity: any, oldEntity: any): boolean {
  return (
    extractMoneyValue(newEntity.cost) !== extractMoneyValue(oldEntity.cost) ||
    extractMoneyValue(newEntity.revenue) !== extractMoneyValue(oldEntity.revenue) ||
    (newEntity.status === "PENDING") !== (oldEntity.status === "PENDING") ||
    newEntity.context?.paymentObservation?.charged !== oldEntity.context?.paymentObservation?.charged ||
    newEntity.name !== oldEntity.name ||
    newEntity.station !== oldEntity.station ||
    getTaskCounterpartyId(newEntity as any) !== getTaskCounterpartyId(oldEntity as any) ||
    newEntity.customerCharacterRole !== oldEntity.customerCharacterRole
  );
}

export function hasOutputPropsChanged(newEntity: any, oldEntity: any): boolean {
  return (
    JSON.stringify(newEntity.context?.productionPlan ?? null) !== JSON.stringify(oldEntity.context?.productionPlan ?? null) ||
    newEntity.station !== oldEntity.station
  );
}

export function hasRewardsChanged(newEntity: any, oldEntity: any): boolean {
  const newRewards = newEntity.context?.rewardIntent?.points || { xp: 0, rp: 0, fp: 0, hp: 0 };
  const oldRewards = oldEntity.context?.rewardIntent?.points || { xp: 0, rp: 0, fp: 0, hp: 0 };

  return (
    newRewards.xp !== oldRewards.xp ||
    newRewards.rp !== oldRewards.rp ||
    newRewards.fp !== oldRewards.fp ||
    newRewards.hp !== oldRewards.hp
  );
}

export function hasRevenueChanged(newEntity: any, oldEntity: any): boolean {
  return extractMoneyValue(newEntity.totals?.totalRevenue) !== extractMoneyValue(oldEntity.totals?.totalRevenue);
}

export function hasCostChanged(newEntity: any, oldEntity: any): boolean {
  return extractMoneyValue(newEntity.totals?.totalCost) !== extractMoneyValue(oldEntity.totals?.totalCost);
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
    extractMoneyValue(item.pricing?.targetPrice) !== extractMoneyValue(previousItem.pricing?.targetPrice) ||
    extractMoneyValue(item.pricing?.unitCost) !== extractMoneyValue(previousItem.pricing?.unitCost);

  if (!dataChanged) return;

  try {
    console.log(`[updateTasksFromItem] Item data changed for ${item.id}. Propagating to linked tasks.`);
    
    // Find all tasks that have this item as output
    const { getAllTasks } = await import('@/data-store/datastore');
    const allTasks = await getAllTasks();
    const relatedTasks = allTasks.filter((t: Task) => t.outputItemId === item.id);

    for (const task of relatedTasks) {
      const plan = task.context?.productionPlan;
      const needsUpdate =
        plan?.outputItemName !== item.name ||
        extractMoneyValue(plan?.outputItemPrice) !== extractMoneyValue(item.pricing?.targetPrice) ||
        extractMoneyValue(plan?.outputUnitCost) !== extractMoneyValue(item.pricing?.unitCost);

      if (needsUpdate) {
        const updatedTask = {
          ...task,
          context: {
            ...task.context,
            productionPlan: {
              ...plan,
              outputItemName: item.name,
              outputItemPrice: item.pricing?.targetPrice,
              outputUnitCost: item.pricing?.unitCost,
            },
          },
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
    extractMoneyValue(item.pricing?.targetPrice) !== extractMoneyValue(previousItem.pricing?.targetPrice) ||
    extractMoneyValue(item.pricing?.unitCost) !== extractMoneyValue(previousItem.pricing?.unitCost);

  if (!dataChanged) return;

  try {
    console.log(`[updateFinancialRecordsFromItem] Item data changed for ${item.id}. Propagating to linked records.`);
    
    const { getAllFinancials, upsertFinancial } = await import('@/data-store/datastore');
    const allRecords = await getAllFinancials();
    const relatedRecords: FinancialRecord[] = [];
    for (const candidate of allRecords) {
      const links = await getLinksFor({ type: EntityType.FINANCIAL, id: candidate.id });
      if (links.some(link =>
        link.linkType === LinkType.FINREC_ITEM &&
        ((link.source.type === EntityType.ITEM && link.source.id === item.id) ||
          (link.target.type === EntityType.ITEM && link.target.id === item.id))
      )) {
        relatedRecords.push(candidate);
      }
    }

    for (const record of relatedRecords) {
      const plan = record.context?.productionPlan;
      const itemPrice = item.pricing?.targetPrice;
      const itemUnitCost = item.pricing?.unitCost;
      const needsUpdate =
        plan?.outputItemName !== item.name ||
        extractMoneyValue(plan?.outputItemPrice) !== extractMoneyValue(itemPrice) ||
        extractMoneyValue(plan?.outputUnitCost) !== extractMoneyValue(itemUnitCost);

      if (needsUpdate) {
        const updatedRecord = {
          ...record,
          context: {
            ...record.context,
            productionPlan: {
              ...plan,
              outputItemName: item.name,
              outputItemPrice: itemPrice || plan?.outputItemPrice,
              outputUnitCost: itemUnitCost || plan?.outputUnitCost,
            },
          },
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

