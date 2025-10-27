// workflows/financial-record-utils.ts
// Financial record creation and management utilities

import type { Task, FinancialRecord, Sale } from '@/types/entities';
import { LinkType, EntityType, LogEventType } from '@/types/enums';
import { upsertFinancial, getAllFinancials, getFinancialsBySourceTaskId, deleteFinancial } from '@/data-store/repositories/financial.repo';
import { makeLink } from '@/links/links-workflows';
import { createLink } from '@/links/link-registry';
import { appendEntityLog } from './entities-logging';
import { getFinancialTypeForStation } from '@/lib/utils/business-structure-utils';
import type { Station } from '@/types/type-aliases';

/**
 * Create a financial record from a task (when task has cost or revenue)
 * This implements the emissary pattern: Task DNA → FinancialRecord entity
 */
export async function createFinancialRecordFromTask(task: Task): Promise<FinancialRecord | null> {
  try {
    console.log(`[createFinancialRecordFromTask] Starting financial record creation for task: ${task.name} (${task.id})`);
    
    // Check if task has cost or revenue
    if (!task.cost && !task.revenue) {
      console.log(`[createFinancialRecordFromTask] Task ${task.name} has no cost or revenue, skipping financial record creation`);
      return null;
    }
    
    // OPTIMIZED: No need to check for existing records - Effects Registry already did!
    // The workflow only calls this when hasEffect('task:{id}:financialCreated') === false
    console.log(`[createFinancialRecordFromTask] Creating new financial record (Effect Registry confirmed no existing record)`);
    
    const currentDate = new Date();
    const newFinrec: FinancialRecord = {
      id: `finrec-${task.id}-${Date.now()}`,
      name: task.name,
      description: `Financial record from task: ${task.name}`,
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
      station: task.station,
      type: getFinancialTypeForStation(task.station),
      siteId: task.siteId,
      targetSiteId: task.targetSiteId,
      sourceTaskId: task.id, // AMBASSADOR field - points back to Task
      cost: task.cost || 0,
      revenue: task.revenue || 0,
      jungleCoins: 0, // J$ no longer awarded as task rewards
      isNotPaid: task.isNotPaid,       // Copy payment status from Task
      isNotCharged: task.isNotCharged, // Copy payment status from Task
      rewards: undefined, // ← FIXED: Don't copy rewards when created from task
      netCashflow: (task.revenue || 0) - (task.cost || 0),
      jungleCoinsValue: 0, // J$ no longer awarded as task rewards
      isCollected: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      links: []
    };
    
    // Store the financial record
    console.log(`[createFinancialRecordFromTask] Creating new financial record:`, newFinrec);
    const createdFinrec = await upsertFinancial(newFinrec);
    
    // Create TASK_FINREC link with metadata
    const linkMetadata = {
      cost: task.cost || 0,
      revenue: task.revenue || 0,
      isNotPaid: task.isNotPaid || false,
      isNotCharged: task.isNotCharged || false,
      rewards: task.rewards,
      netCashflow: newFinrec.netCashflow,
      createdFrom: 'task'
    };
    
    const link = makeLink(
      LinkType.TASK_FINREC,
      { type: EntityType.TASK, id: task.id },
      { type: EntityType.FINANCIAL, id: createdFinrec.id },
      linkMetadata
    );
    
    await createLink(link);
    
    console.log(`[createFinancialRecordFromTask] ✅ Financial record created and TASK_FINREC link established: ${createdFinrec.name}`);
    
    return createdFinrec;
    
  } catch (error) {
    console.error(`[createFinancialRecordFromTask] ❌ Failed to create financial record from task ${task.id}:`, error);
    throw error;
  }
}

/**
 * Update an existing financial record when task properties change
 * This ensures financial records stay in sync with their source tasks
 */
export async function updateFinancialRecordFromTask(task: Task, previousTask: Task): Promise<void> {
  try {
    console.log(`[updateFinancialRecordFromTask] Updating financial record for task: ${task.name} (${task.id})`);
    
    // Find the existing financial record created by this task
    const allFinancials = await getAllFinancials();
    const existingFinrec = allFinancials.find(fr => fr.sourceTaskId === task.id);
    
    if (!existingFinrec) {
      console.log(`[updateFinancialRecordFromTask] No financial record found for task ${task.id}, creating new one`);
      await createFinancialRecordFromTask(task);
      return;
    }
    
    // Check if any financial properties changed
    const financialPropsChanged = 
      previousTask.cost !== task.cost ||
      previousTask.revenue !== task.revenue ||
      previousTask.isNotPaid !== task.isNotPaid ||
      previousTask.isNotCharged !== task.isNotCharged ||
      previousTask.name !== task.name ||
      previousTask.station !== task.station ||
      previousTask.siteId !== task.siteId ||
      previousTask.targetSiteId !== task.targetSiteId;
    
    if (!financialPropsChanged) {
      console.log(`[updateFinancialRecordFromTask] No financial properties changed for task ${task.id}, skipping update`);
      return;
    }
    
    // Update the financial record with new task data
    const updatedFinrec = {
      ...existingFinrec,
      name: task.name,
      description: `Financial record from task: ${task.name}`,
      cost: task.cost || 0,
      revenue: task.revenue || 0,
      station: task.station,
      siteId: task.siteId,
      targetSiteId: task.targetSiteId,
      isNotPaid: task.isNotPaid,
      isNotCharged: task.isNotCharged,
      rewards: task.rewards,
      netCashflow: (task.revenue || 0) - (task.cost || 0),
      updatedAt: new Date()
    };
    
    // Store the updated financial record
    console.log(`[updateFinancialRecordFromTask] Updating financial record:`, updatedFinrec);
    await upsertFinancial(updatedFinrec);
    
    // Log the update
    await appendEntityLog(EntityType.FINANCIAL, existingFinrec.id, LogEventType.UPDATED, {
      name: task.name,
      updatedFrom: EntityType.TASK,
      changes: {
        cost: { from: previousTask.cost || 0, to: task.cost || 0 },
        revenue: { from: previousTask.revenue || 0, to: task.revenue || 0 },
        isNotPaid: { from: previousTask.isNotPaid || false, to: task.isNotPaid || false },
        isNotCharged: { from: previousTask.isNotCharged || false, to: task.isNotCharged || false }
      },
      updatedAt: new Date().toISOString()
    });
    
    console.log(`[updateFinancialRecordFromTask] ✅ Financial record updated successfully for task: ${task.name}`);
    
  } catch (error) {
    console.error(`[updateFinancialRecordFromTask] ❌ Failed to update financial record for task ${task.id}:`, error);
    throw error;
  }
}

/**
 * Remove financial records created by a specific task
 * This is used when a task is deleted to clean up associated financial records
 * OPTIMIZED: Uses indexed query instead of loading all financials
 */
export async function removeFinancialRecordsCreatedByTask(taskId: string): Promise<void> {
  try {
    console.log(`[removeFinancialRecordsCreatedByTask] Removing financial records created by task: ${taskId}`);
    
    // OPTIMIZED: Only load financials created by this task, not all financials
    const taskFinancials = await getFinancialsBySourceTaskId(taskId);
    
    if (taskFinancials.length === 0) {
      console.log(`[removeFinancialRecordsCreatedByTask] No financial records found for task ${taskId}`);
      return;
    }
    
    console.log(`[removeFinancialRecordsCreatedByTask] Found ${taskFinancials.length} financial record(s) to remove`);
    
    // Remove each financial record
    for (const financial of taskFinancials) {
      try {
        await deleteFinancial(financial.id);
        console.log(`[removeFinancialRecordsCreatedByTask] ✅ Removed financial record: ${financial.name}`);
      } catch (error) {
        console.error(`[removeFinancialRecordsCreatedByTask] ❌ Failed to remove financial record ${financial.id}:`, error);
      }
    }
    
    console.log(`[removeFinancialRecordsCreatedByTask] ✅ Removed ${taskFinancials.length} financial record(s) for task ${taskId}`);
    
  } catch (error) {
    console.error(`[removeFinancialRecordsCreatedByTask] ❌ Failed to remove financial records for task ${taskId}:`, error);
    throw error;
  }
}

/**
 * Create a financial record from a sale (when sale has revenue)
 * This implements the emissary pattern: Sale DNA → FinancialRecord entity
 * IDEMPOTENT: Relies on Effects Registry to prevent duplicate creation
 */
export async function createFinancialRecordFromSale(sale: Sale): Promise<FinancialRecord | null> {
  try {
    console.log(`[createFinancialRecordFromSale] Creating financial record from sale: ${sale.counterpartyName}`);
    
    // Check if sale has revenue
    if (sale.totals.totalRevenue <= 0) {
      console.log(`[createFinancialRecordFromSale] Sale ${sale.id} has no revenue, skipping financial record creation`);
      return null;
    }
    
    // OPTIMIZED: No need to check for existing records - Effects Registry already did!
    // The workflow only calls this when hasEffect('sale:{id}:financialCreated') === false
    console.log(`[createFinancialRecordFromSale] Creating new financial record (Effect Registry confirmed no existing record)`);
    
    const currentDate = new Date();
    const newFinrec: FinancialRecord = {
      id: `finrec-${sale.id}-${Date.now()}`,
      name: `Sale: ${sale.counterpartyName}`,
      description: `Financial record from sale: ${sale.counterpartyName}`,
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
      station: 'Direct Sales' as Station,
      type: getFinancialTypeForStation('Direct Sales' as Station),
      siteId: sale.siteId,
      targetSiteId: undefined,
      sourceSaleId: sale.id, // AMBASSADOR field - points back to Sale
      cost: 0, // Sales typically don't have costs
      revenue: sale.totals.totalRevenue,
      jungleCoins: 0, // J$ no longer awarded as sale rewards
      isNotPaid: sale.isNotPaid || false,
      isNotCharged: sale.isNotCharged || false,
      rewards: { points: { xp: 0, rp: 0, fp: 0, hp: 0 } }, // Points handled separately
      netCashflow: sale.totals.totalRevenue,
      jungleCoinsValue: 0,
      isCollected: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      links: []
    };
    
    // Store the financial record
    console.log(`[createFinancialRecordFromSale] Creating financial record:`, newFinrec);
    const createdFinrec = await upsertFinancial(newFinrec);
    
    // Create SALE_FINREC link
    const linkMetadata = {
      revenue: sale.totals.totalRevenue,
      isNotPaid: sale.isNotPaid || false,
      isNotCharged: sale.isNotCharged || false,
      netCashflow: newFinrec.netCashflow,
      createdFrom: 'sale'
    };
    
    const link = makeLink(
      LinkType.SALE_FINREC,
      { type: EntityType.SALE, id: sale.id },
      { type: EntityType.FINANCIAL, id: createdFinrec.id },
      linkMetadata
    );
    
    await createLink(link);
    
    console.log(`[createFinancialRecordFromSale] ✅ Financial record created and SALE_FINREC link established: ${createdFinrec.name}`);
    
    return createdFinrec;
    
  } catch (error) {
    console.error(`[createFinancialRecordFromSale] ❌ Failed to create financial record from sale ${sale.id}:`, error);
    throw error;
  }
}

/**
 * Enhanced financial record creation - pure business logic, no link creation
 */
export async function processFinancialRecordCreationWithLinks(record: FinancialRecord): Promise<FinancialRecord> {
  console.log(`[processFinancialRecordCreationWithLinks] Processing financial record creation: ${record.name} (${record.id})`);
  
  return record;
}