// workflows/financial-record-utils.ts
// Financial record creation and management utilities

import type { Task, FinancialRecord, Sale, ItemSaleLine, Character, Contract, ServiceLine, BundleSaleLine } from '@/types/entities';
import { LinkType, EntityType, LogEventType, BUSINESS_STRUCTURE, SaleType, SaleStatus, ContractClauseType, ContractStatus } from '@/types/enums';
import { upsertFinancial, getAllFinancials, getFinancialsBySourceTaskId, removeFinancial, getItemById, getCharacterById, getFinancialConversionRates, getContractById, getFinancialsBySourceSaleId, upsertCharacter } from '@/data-store/datastore';
import { makeLink } from '@/links/links-workflows';
import { createLink, getLinksFor } from '@/links/link-registry';
import { appendEntityLog } from './entities-logging';
import { getFinancialTypeForStation, getSalesChannelFromSaleType } from '@/lib/utils/business-structure-utils';
import type { Station } from '@/types/type-aliases';

import { BITCOIN_SATOSHIS_PER_BTC, DEFAULT_CURRENCY_EXCHANGE_RATES } from '@/lib/constants/financial-constants';

/**
 * Get the current J$ Balance for an entity (Character or Player)
 * Source of Truth: Sum of 'jungleCoins' field in all linked Financial Records
 */
export async function getJungleCoinBalance(entityId: string): Promise<number> {
  try {
    console.log(`[getJungleCoinBalance] Calculating J$ balance for entity: ${entityId}`);

    // 1. Get all financial records linked to this entity via FINREC_CHARACTER or FINREC_PLAYER or PLAYER_FINREC
    // We check multiple link types to be robust, though strictly it should be FINREC_CHARACTER for characters
    const links = await getLinksFor({ type: EntityType.CHARACTER, id: entityId }); // Try character first

    // Determine if it's a character or player based on ID (or just query both link types if unsure)
    // For now, we fetch links for the ID assuming it's a Character. 
    // If it's a Player, we might need to query explicitly if using different ID.
    // However, the caller usually knows the ID.

    const relevantLinkTypes = [
      LinkType.FINREC_CHARACTER, // Standard for Characters
      LinkType.PLAYER_FINREC,    // Standard for Player (Reverse link direction in some legacy logic, check both)
      LinkType.FINREC_PLAYER     // Potential consistency fix
    ];

    const financialLinks = links.filter(l => relevantLinkTypes.includes(l.linkType));

    if (financialLinks.length === 0) {
      // Logic for Player: Player ID might be different or links might be on the other side?
      // For Player, we often check 'PLAYER_FINREC' where Source=Player, Target=FinRec
      // The getLinksFor({id: entityId}) handles bidirectional, so if Source=Player, it returns it.
      console.log(`[getJungleCoinBalance] No linked financial records found for ${entityId}`);
      return 0;
    }

    // 2. Map to Financial Record IDs
    // Be careful with direction:
    // FINREC_CHARACTER: Source=FinRec, Target=Character. We want Source.
    // PLAYER_FINREC: Source=Player, Target=FinRec. We want Target.
    const finRecIds = financialLinks.map(l => {
      if (l.target.type === EntityType.FINANCIAL) return l.target.id;
      if (l.source.type === EntityType.FINANCIAL) return l.source.id;
      return null;
    }).filter(id => id !== null) as string[];

    const uniqueFinRecIds = Array.from(new Set(finRecIds));

    if (uniqueFinRecIds.length === 0) return 0;

    // 3. Fetch Records and Sum JungleCoins
    // We can use Promise.all or an optimized batch fetch if available.
    // For now, using getFinancialById in parallel.
    let totalBalance = 0;

    const records = await Promise.all(uniqueFinRecIds.map(id => import('@/data-store/datastore').then(ds => ds.getFinancialById(id))));

    for (const record of records) {
      if (record && record.jungleCoins) {
        // Only count if it's the correct record type? 
        // Actually, any J$ attached to a record linked to me is mine.
        // Except maybe if I'm just an "Associate" on a large sale?
        // Rule: If I am linked to the FinancialRecord, does it mean I own the J$?
        // In "Bonus", yes. In "Exchange", yes.
        // In "Sale Payout", the record has cost/revenue, does it have J$? 
        // Usually J$ is 0 on Sales.

        // IMPORTANT: We trust the 'jungleCoins' field on the record.
        totalBalance += record.jungleCoins || 0;
      }
    }

    console.log(`[getJungleCoinBalance] Calculated Balance for ${entityId}: ${totalBalance} J$ (${uniqueFinRecIds.length} records)`);
    return totalBalance;

  } catch (error) {
    console.error(`[getJungleCoinBalance] ❌ Error calculating balance:`, error);
    return 0; // Fail safe
  }
}

/**
 * Recalculate and update the cached J$ balance on the Character entity
 * This ensures the UI is always instant, while the source of truth remains the ledger
 */
export async function recalculateCharacterWallet(characterId: string): Promise<void> {
  try {
    const balance = await getJungleCoinBalance(characterId);
    const character = await getCharacterById(characterId);

    if (character) {
      const currentWallet = character.wallet || { jungleCoins: -1 }; // Force update if missing

      // Only update if changed to avoid write loops
      if (currentWallet.jungleCoins !== balance) {
        console.log(`[recalculateCharacterWallet] Updating wallet cache for ${character.name}: ${currentWallet.jungleCoins} -> ${balance}`);

        await upsertCharacter({
          ...character,
          wallet: { ...currentWallet, jungleCoins: balance }
        }, { skipWorkflowEffects: true });
      } else {
        console.log(`[recalculateCharacterWallet] Wallet cache already in sync for ${character.name}: ${balance}`);
      }
    }
  } catch (error) {
    console.error(`[recalculateCharacterWallet] ❌ Failed to update wallet cache for ${characterId}:`, error);
  }
}

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
    const dateToUse = task.collectedAt || task.doneAt || currentDate;
    const newFinrec: FinancialRecord = {
      id: `finrec-${task.id}`,
      name: task.name,
      description: `Financial record from task: ${task.name}`,
      year: dateToUse.getFullYear(),
      month: dateToUse.getMonth() + 1,
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
      outputItemId: task.isNewItem ? null : (task.outputItemId || null),
      isNewItem: task.isNewItem,
      rewards: undefined,
      netCashflow: (task.revenue || 0) - (task.cost || 0),
      jungleCoinsValue: 0, // J$ no longer awarded as task rewards
      isCollected: false,
      collectedAt: undefined,
      createdAt: currentDate,
      updatedAt: currentDate,
      links: []
    };

    // Store the financial record
    console.log(`[createFinancialRecordFromTask] Creating new financial record:`, newFinrec);
    const createdFinrec = await upsertFinancial(newFinrec, { forceSave: true });

    const link = makeLink(
      LinkType.TASK_FINREC,
      { type: EntityType.TASK, id: task.id },
      { type: EntityType.FINANCIAL, id: createdFinrec.id }
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
    const taskFinancials = await getFinancialsBySourceTaskId(task.id);
    const existingFinrec = taskFinancials.length > 0 ? taskFinancials[0] : null;

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
      previousTask.outputItemId !== task.outputItemId ||
      previousTask.isNewItem !== task.isNewItem ||
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
      outputItemId: task.isNewItem ? null : (task.outputItemId || null),
      isNewItem: task.isNewItem,
      rewards: undefined,
      netCashflow: (task.revenue || 0) - (task.cost || 0),
      updatedAt: new Date()
    };

    // Store the updated financial record
    console.log(`[updateFinancialRecordFromTask] Updating financial record:`, updatedFinrec);
    await upsertFinancial(updatedFinrec);

    // Log the update
    await appendEntityLog(EntityType.FINANCIAL, existingFinrec.id, LogEventType.UPDATED, {
      name: `Update: ${task.name}`,
      type: existingFinrec.type,
      station: existingFinrec.station,
      cost: task.cost || 0,
      revenue: task.revenue || 0
    }, task.updatedAt || new Date());

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
        await removeFinancial(financial.id);
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

function coerceSaleFinrecDate(
  sale: Sale,
  fallback: Date
): Date {
  const raw = sale.collectedAt || sale.doneAt || sale.saleDate || fallback;
  const d = raw instanceof Date ? raw : new Date(raw as string);
  return Number.isFinite(d.getTime()) ? d : fallback;
}

/** Shared sale → finrec identity (name, station, period) for create + booth update paths */
async function resolveSaleDerivedFinrecFields(
  sale: Sale
): Promise<{
  dateToUse: Date;
  salesChannel: Station;
  station: Station;
  displayName: string;
  year: number;
  month: number;
  financialType: 'company' | 'personal';
  description: string;
}> {
  const currentDate = new Date();
  const dateToUse = coerceSaleFinrecDate(sale, currentDate);
  const salesChannel =
    sale.salesChannel ||
    getSalesChannelFromSaleType(sale.type) ||
    ('Direct-Sales' as Station);
  const station = salesChannel;

  let displayName = sale.counterpartyName;

  if (!displayName) {
    if (sale.type === SaleType.BOOTH) {
      if (sale.siteId) {
        try {
          const { getSiteById } = await import('@/data-store/datastore');
          const site = await getSiteById(sale.siteId);
          displayName = site?.name || 'Booth Sale';
        } catch (e) {
          console.warn('Failed to fetch site for naming', e);
          displayName = 'Booth Sale';
        }
      } else {
        displayName = 'Booth Sale';
      }
    } else {
      displayName = 'Walk-in Customer';
    }
  }

  return {
    dateToUse,
    salesChannel,
    station,
    displayName,
    year: dateToUse.getFullYear(),
    month: dateToUse.getMonth() + 1,
    financialType: getFinancialTypeForStation(station),
    description: `Financial record from sale: ${displayName}`,
  };
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
    const derived = await resolveSaleDerivedFinrecFields(sale);

    const newFinrec: FinancialRecord = {
      id: `finrec-${sale.id}`,
      name: `Sale: ${derived.displayName}`,
      description: derived.description,
      year: derived.year,
      month: derived.month,
      station: derived.station,
      type: derived.financialType,
      siteId: sale.siteId,
      targetSiteId: undefined,
      sourceSaleId: sale.id, // AMBASSADOR field - points back to Sale
      salesChannel: derived.salesChannel, // Persist sales channel explicitly
      cost: 0, // Sales typically don't have costs
      revenue: sale.totals.totalRevenue,
      jungleCoins: 0, // J$ no longer awarded as sale rewards
      isNotPaid: sale.isNotPaid || false,
      isNotCharged: sale.isNotCharged || false,
      rewards: undefined,
      netCashflow: sale.totals.totalRevenue,
      jungleCoinsValue: 0,
      isCollected: false,
      collectedAt: undefined,
      createdAt: currentDate,
      updatedAt: currentDate,
      links: []
    };

    // Store the financial record
    console.log(`[createFinancialRecordFromSale] Creating financial record:`, newFinrec);
    const createdFinrec = await upsertFinancial(newFinrec, { forceSave: true });

    const link = makeLink(
      LinkType.SALE_FINREC,
      { type: EntityType.SALE, id: sale.id },
      { type: EntityType.FINANCIAL, id: createdFinrec.id }
    );

    await createLink(link);

    // Create FINREC_ITEM links for each sold item
    if (sale.lines && sale.lines.length > 0) {
      for (const line of sale.lines) {
        if (line.kind === 'item' && 'itemId' in line && line.itemId) {
          const itemLine = line as ItemSaleLine;
          const item = await getItemById(itemLine.itemId);

          if (item) {
            const itemLink = makeLink(
              LinkType.FINREC_ITEM,
              { type: EntityType.FINANCIAL, id: createdFinrec.id },
              { type: EntityType.ITEM, id: itemLine.itemId }
            );
            await createLink(itemLink);
            console.log(`[createFinancialRecordFromSale] ✅ Created FINREC_ITEM link for item ${item.name} (${itemLine.quantity} @ ${itemLine.unitPrice})`);
          }
        }
      }
    }

    console.log(`[createFinancialRecordFromSale] ✅ Financial record created and SALE_FINREC link established: ${createdFinrec.name}`);

    return createdFinrec;

  } catch (error) {
    console.error(`[createFinancialRecordFromSale] ❌ Failed to create financial record from sale ${sale.id}:`, error);
    throw error;
  }
}

/**
 * Create split financial records for Booth-Sales
 * - Record 1: Gross Income (Total Sales)
 * - Record 2: Associate Payout (Expense)
 * IDEMPOTENT: Updates existing records if they exist.
 */
/**
 * Calculate the associate's share of a sale
 */
export async function calculateAssociatePayout(sale: Sale): Promise<number> {
  const boothFee = sale.boothFee ?? sale.metadata?.boothSaleContext?.boothCost ?? 0;

  // Determine Target Entity ID
  const targetEntityId = sale.associateId || sale.partnerId || sale.customerId;
  if (!targetEntityId) return 0;

  // CALCULATION LOGIC (SERVER SIDE)
  // Categorize Lines to calculate split
  let myItemsTotal = 0;
  let assocItemsTotal = 0;
  let shareOfMyItems_Me = 1.0;
  let shareOfAssocItems_Me = 0.0; // My commission on their items
  let shareOfExpenses_Me = 1.0; // I pay 100% of booth fee by default

  // Determine Contract ID
  const contractId = sale.metadata?.boothSaleContext?.contractId;
  let contract: Contract | null = null;
  if (contractId) {
    contract = await getContractById(contractId);
  }

  if (contract && contract.status === ContractStatus.ACTIVE && Array.isArray(contract.clauses)) {
    // Apply Clauses
    const commClause = contract.clauses.find(c => c.type === ContractClauseType.SALES_COMMISSION);
    if (commClause) shareOfMyItems_Me = commClause.companyShare;

    const serviceClause = contract.clauses.find(c => c.type === ContractClauseType.SALES_SERVICE);
    if (serviceClause) shareOfAssocItems_Me = serviceClause.companyShare;

    const expenseClause = contract.clauses.find(c => c.type === ContractClauseType.EXPENSE_SHARING);
    if (expenseClause) shareOfExpenses_Me = expenseClause.companyShare;
  }

  // Sum Items (USD)
  if (sale.lines) {
    sale.lines.forEach(line => {
      // Associate-side lines within a booth sale (service lines on booth channel)
      const isAssociateItem = line.kind === 'service' && (line as ServiceLine).station === 'Booth-Sales';

      let lineTotal = 0;
      if (line.kind === 'item') lineTotal = ((line as ItemSaleLine).unitPrice || 0) * ((line as ItemSaleLine).quantity || 0);
      else if (line.kind === 'bundle') lineTotal = ((line as BundleSaleLine).unitPrice || 0) * ((line as BundleSaleLine).quantity || 0);
      else if (line.kind === 'service') lineTotal = (line as ServiceLine).revenue || 0;

      if (isAssociateItem) assocItemsTotal += lineTotal;
      else myItemsTotal += lineTotal;
    });
  }

  // Calculate Associate Share (USD)
  const rates = await getFinancialConversionRates();
  const rate = rates?.colonesToUsd ?? DEFAULT_CURRENCY_EXCHANGE_RATES.colonesToUsd;
  const boothFeeUSD = boothFee / rate;

  const revenueMyItems_Assoc = myItemsTotal * (1 - shareOfMyItems_Me);
  const revenueAssocItems_Assoc = assocItemsTotal * (1 - shareOfAssocItems_Me);
  const cost_Assoc = boothFeeUSD * (1 - shareOfExpenses_Me);

  const associateNet = revenueMyItems_Assoc + revenueAssocItems_Assoc - cost_Assoc;
  console.log(`[calculateAssociatePayout] Calculated Split (USD): MyItems=${myItemsTotal} AssocItems=${assocItemsTotal} => AssociateNet=${associateNet}`);

  return associateNet;
}

export async function createFinancialRecordFromBoothSale(sale: Sale): Promise<void> {
  try {
    console.log(`[createFinancialRecordFromBoothSale] Processing financial records for Booth Sale: ${sale.counterpartyName}`);

    // [IDEMPOTENCY CHECK] Check for existing records first
    const existingRecords = await getFinancialsBySourceSaleId(sale.id);

    // Calculate associate net using shared helper
    const associateNet = await calculateAssociatePayout(sale);

    const targetEntityId = sale.associateId || sale.partnerId || sale.customerId;
    let targetEntityName = 'Associate';
    let targetType = EntityType.CHARACTER;

    if (targetEntityId) {
      const { getBusinessById } = await import('@/data-store/repositories/character.repo');
      const business = await getBusinessById(targetEntityId);
      if (business) {
        targetType = EntityType.BUSINESS;
        targetEntityName = business.name;
      } else {
        const character = await getCharacterById(targetEntityId);
        if (character) {
          targetEntityName = character.name;
        }
      }
    }

    if (existingRecords.length > 0) {
      // === UPDATE PATH ===
      console.log(`[createFinancialRecordFromBoothSale] Updating ${existingRecords.length} existing records for Booth Sale ${sale.id}`);

      const derived = await resolveSaleDerivedFinrecFields(sale);

      // 1. Update Gross Income Record (prefer canonical id when multiple income-like rows exist)
      const incomeRecord =
        existingRecords.find(
          (r) => r.id === `finrec-${sale.id}` && r.revenue > 0 && r.cost === 0
        ) ?? existingRecords.find((r) => r.revenue > 0 && r.cost === 0);
      if (incomeRecord) {
        const updatedIncome = {
          ...incomeRecord,
          name: `Sale: ${derived.displayName}`,
          description: derived.description,
          station: derived.station,
          salesChannel: derived.salesChannel,
          type: derived.financialType,
          siteId: sale.siteId,
          year: derived.year,
          month: derived.month,
          revenue: sale.totals.totalRevenue,
          netCashflow: sale.totals.totalRevenue,
          isNotPaid: sale.isNotPaid || false,
          isNotCharged: sale.isNotCharged || false,
          updatedAt: new Date()
        };
        await upsertFinancial(updatedIncome, { forceSave: true });
        console.log(`[createFinancialRecordFromBoothSale] ✅ Updated Gross Income Record: ${incomeRecord.id}`);

        const saleLinks = await getLinksFor({ type: EntityType.SALE, id: sale.id });
        const hasIncomeFinrecLink = saleLinks.some(
          (link) =>
            link.linkType === LinkType.SALE_FINREC &&
            link.target.type === EntityType.FINANCIAL &&
            link.target.id === incomeRecord.id
        );
        if (!hasIncomeFinrecLink) {
          const saleFinrecLink = makeLink(
            LinkType.SALE_FINREC,
            { type: EntityType.SALE, id: sale.id },
            { type: EntityType.FINANCIAL, id: incomeRecord.id }
          );
          await createLink(saleFinrecLink);
          console.log(
            `[createFinancialRecordFromBoothSale] ✅ Restored SALE_FINREC sale → ${incomeRecord.id}`
          );
        }
      }

      // 2. Update/Manage Payout Record
      const payoutRecord = existingRecords.find(r => r.type === 'company' && r.revenue === 0 && r.cost > 0);

      if (associateNet > 0) {
        if (payoutRecord) {
          // Update existing payout
          const updatedPayout = {
            ...payoutRecord,
            cost: associateNet,
            netCashflow: -associateNet,
            name: `Payout: ${targetEntityName}`,
            isNotPaid: sale.status !== SaleStatus.CHARGED,
            updatedAt: new Date()
          };
          await upsertFinancial(updatedPayout, { forceSave: true });
          console.log(`[createFinancialRecordFromBoothSale] ✅ Updated Payout Record: ${payoutRecord.id}`);
        } else {
          // Create new payout logic if it was missing but now needed
          await createBoothPayoutRecord(sale, associateNet, targetEntityName, targetEntityId, targetType);
        }
      } else if (payoutRecord) {
        // If payout is no longer needed (associateNet <= 0), zero it out
        const updatedPayout = {
          ...payoutRecord,
          cost: 0,
          netCashflow: 0,
          description: `Payout adjustment: Associate share is 0`,
          updatedAt: new Date()
        };
        await upsertFinancial(updatedPayout);
        console.log(`[createFinancialRecordFromBoothSale] ✅ Zeroed Payout Record as Associate Share is 0`);
      }

      return; // EXIT UPDATE PATH
    }

    // === CREATE PATH ===
    console.log(`[createFinancialRecordFromBoothSale] Creating FRESH split financial records for Booth Sale`);

    // 1. Create Gross Income Record (Standard)
    const incomeRecord = await createFinancialRecordFromSale(sale);
    if (!incomeRecord) return;

    // 2. Create Payout Expense Record (If Associate owed money)
    if (associateNet > 0) {
      await createBoothPayoutRecord(sale, associateNet, targetEntityName, targetEntityId, targetType);
    }

  } catch (error) {
    console.error(`[createFinancialRecordFromBoothSale] ❌ Failed to create booth records:`, error);
    throw error;
  }
}

// Helper to create the payout record to avoid code duplication
async function createBoothPayoutRecord(sale: Sale, associateNet: number, targetEntityName: string, targetEntityId: string | null | undefined, targetType: EntityType) {
  console.log(`[createBoothPayoutRecord] Creating Associate Payout Record: ${associateNet}`);
  const currentDate = new Date();
  // Payout Status Logic: Matches Sale Status
  const isPayoutPaid = sale.status === SaleStatus.CHARGED;

  const payoutFinrec: FinancialRecord = {
    id: `finrec-payout-${sale.id}`,
    name: `Payout: ${targetEntityName}`,
    description: `Associate payout for ${targetEntityName} (Split Share)`,
    year: currentDate.getFullYear(),
    month: currentDate.getMonth() + 1,
    station: 'Booth-Sales' as Station,
    type: 'company', // Expense
    siteId: sale.siteId,
    sourceSaleId: sale.id,
    salesChannel: 'Booth-Sales' as Station,

    cost: associateNet,
    revenue: 0,
    jungleCoins: 0,

    isNotPaid: !isPayoutPaid,
    isNotCharged: false, // Default

    netCashflow: -associateNet, // Expense
    jungleCoinsValue: 0,
    isCollected: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    links: []
  };

  const createdPayout = await upsertFinancial(payoutFinrec, { forceSave: true });

  // Link Payout to Sale
  const link = makeLink(
    LinkType.SALE_FINREC,
    { type: EntityType.SALE, id: sale.id },
    { type: EntityType.FINANCIAL, id: createdPayout.id }
  );
  await createLink(link);

  // Link Payout to Associate (Character or Business) if present
  if (targetEntityId) {
    const charLink = makeLink(
      targetType === EntityType.BUSINESS ? LinkType.FINREC_BUSINESS : LinkType.FINREC_CHARACTER,
      { type: EntityType.FINANCIAL, id: createdPayout.id },
      { type: targetType, id: targetEntityId }
    );
    await createLink(charLink);
  }
}

/**
 * Enhanced financial record creation - pure business logic, no link creation
 */
export async function processFinancialRecordCreationWithLinks(record: FinancialRecord): Promise<FinancialRecord> {
  console.log(`[processFinancialRecordCreationWithLinks] Processing financial record creation: ${record.name} (${record.id})`);

  return record;
}

/**
 * Create a financial record for points-to-J$ exchange
 * This implements the exchange pattern: Points → J$ (FinancialRecord)
 * IDEMPOTENT: Relies on Effects Registry to prevent duplicate creation
 */
export async function createFinancialRecordFromPointsExchange(
  playerId: string,
  playerCharacterId: string | null,
  pointsExchanged: { xp: number; rp: number; fp: number; hp: number },
  j$Received: number
): Promise<FinancialRecord> {
  try {
    console.log(`[createFinancialRecordFromPointsExchange] Creating financial record for points exchange: ${j$Received} J$`);

    const currentDate = new Date();
    // Use 'Earnings' station from BUSINESS_STRUCTURE.PERSONAL (single source of truth for exchanged points)
    const rewardsStation = BUSINESS_STRUCTURE.PERSONAL.find(s => s === 'Earnings');
    if (!rewardsStation) throw new Error('Earnings station not found in BUSINESS_STRUCTURE');
    const station = rewardsStation as Station;

    const newFinrec: FinancialRecord = {
      id: `finrec-exchange-${playerId}-${Date.now()}`,
      name: `Points Exchange: ${pointsExchanged.xp + pointsExchanged.rp + pointsExchanged.fp + pointsExchanged.hp} points`,
      description: `Points exchanged for J$: XP=${pointsExchanged.xp}, RP=${pointsExchanged.rp}, FP=${pointsExchanged.fp}, HP=${pointsExchanged.hp} → ${j$Received} J$`,
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
      station: station,
      type: 'personal', // Personal financial record
      playerCharacterId: playerCharacterId, // Link to player's character
      cost: 0, // No cost, just points exchange
      revenue: 0, // No revenue, just currency exchange
      jungleCoins: j$Received, // J$ received from exchange
      isNotPaid: false,
      isNotCharged: false,
      rewards: undefined,
      netCashflow: 0, // No cashflow, just currency exchange
      jungleCoinsValue: j$Received * 10, // J$ value in USD (1 J$ = $10)
      isCollected: false,
      exchangeType: 'POINTS_TO_J$',
      createdAt: new Date(),
      updatedAt: new Date(),
      links: []
    };

    // Store the financial record
    console.log(`[createFinancialRecordFromPointsExchange] Creating financial record:`, newFinrec);
    const createdFinrec = await upsertFinancial(newFinrec);

    const link = makeLink(
      LinkType.PLAYER_FINREC,
      { type: EntityType.PLAYER, id: playerId },
      { type: EntityType.FINANCIAL, id: createdFinrec.id }
    );

    await createLink(link);
    console.log(`[createFinancialRecordFromPointsExchange] ✅ Created PLAYER_FINREC link for player ${playerId}`);

    console.log(`[createFinancialRecordFromPointsExchange] ✅ Financial record created for points exchange: ${createdFinrec.name}`);

    return createdFinrec;

  } catch (error) {
    console.error(`[createFinancialRecordFromPointsExchange] ❌ Failed to create financial record for points exchange:`, error);
    throw error;
  }
}

/**
 * Create financial records for J$ cash-out (J$ → USD or J$ → Zaps)
 * Creates two FinancialRecords: personal (J$ deduction) and company (J$ buyback with USD cost)
 */
export async function createFinancialRecordFromJ$CashOut(
  playerId: string,
  playerCharacterId: string | null,
  j$Sold: number,
  j$Rate: number = 10, // Default: 1 J$ = $10 USD (for USD cash-out)
  cashOutType: 'USD' | 'ZAPS' = 'USD',
  zapsRate?: number // Optional: J$ to Zaps rate (sats per J$). If not provided, calculated from Bitcoin price
): Promise<{ personalRecord: FinancialRecord; companyRecord: FinancialRecord }> {
  try {
    console.log(`[createFinancialRecordFromJ$CashOut] Creating financial records for cash-out: ${j$Sold} J$ for ${cashOutType}`);

    // Determine company station (always Team for buybacks now that Founder is removed as a station)
    const teamStation = BUSINESS_STRUCTURE.ADMIN.find(s => s === 'Team');
    if (!teamStation) throw new Error('Team station not found in BUSINESS_STRUCTURE');
    const companyStation = teamStation as Station;

    // Calculate payment amount based on cash-out type
    let amountPaid: number;
    let amountLabel: string;
    let calculatedZapsRate: number | undefined;

    if (cashOutType === 'USD') {
      amountPaid = j$Sold * j$Rate; // USD amount
      amountLabel = `${amountPaid} USD`;
    } else {
      // ZAPS: Calculate rate from REAL Bitcoin price (no fallback - must be fetched)
      if (zapsRate === undefined) {
        // Calculate: 1 J$ = $10 USD, convert to sats via REAL Bitcoin price
        // Formula: (J$ value in USD) / (Bitcoin price in USD) * (sats per BTC) = sats per J$
        const rates = await getFinancialConversionRates();
        const bitcoinPrice = rates?.bitcoinToUsd;

        // REQUIRED: Real Bitcoin price must be available - no fallback
        if (!bitcoinPrice || bitcoinPrice <= 0) {
          throw new Error('Bitcoin price not available. Please fetch Bitcoin price before cashing out to Zaps.');
        }

        const j$ValueInUSD = j$Rate; // Default: 10 USD per J$

        // Calculate sats per J$: (j$ValueInUSD / bitcoinPrice) * satsPerBTC
        calculatedZapsRate = (j$ValueInUSD / bitcoinPrice) * BITCOIN_SATOSHIS_PER_BTC;
        console.log(`[createFinancialRecordFromJ$CashOut] Calculated Zaps rate: ${calculatedZapsRate.toFixed(0)} sats per J$ (Bitcoin price: $${bitcoinPrice})`);
      } else {
        calculatedZapsRate = zapsRate;
      }
      amountPaid = j$Sold * calculatedZapsRate; // Zaps amount (sats)
      amountLabel = `${amountPaid.toFixed(0)} sats`;
    }

    const currentDate = new Date();
    const exchangeType = cashOutType === 'USD' ? 'J$_TO_USD' : 'J$_TO_ZAPS';

    // Get Earnings station from BUSINESS_STRUCTURE.PERSONAL
    const earningsStation = BUSINESS_STRUCTURE.PERSONAL.find(s => s === 'Earnings');
    if (!earningsStation) throw new Error('Earnings station not found in BUSINESS_STRUCTURE');
    const personalStation = earningsStation as Station;

    // Create personal FinancialRecord (J$ deduction)
    const personalFinrec: FinancialRecord = {
      id: `finrec-cashout-personal-${playerId}-${Date.now()}`,
      name: `J$ Cash-Out: ${j$Sold} J$ → ${cashOutType}`,
      description: `J$ cashed out for ${cashOutType}: ${j$Sold} J$ → ${amountLabel}`,
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
      station: personalStation,
      type: 'personal',
      playerCharacterId: playerCharacterId,
      cost: 0,
      revenue: 0,
      jungleCoins: -j$Sold, // Negative: J$ deducted from player
      isNotPaid: false,
      isNotCharged: false,
      netCashflow: 0,
      jungleCoinsValue: j$Sold * 10, // J$ value in USD
      isCollected: false,
      exchangeType,
      exchangeCounterAmount: cashOutType === 'ZAPS' ? amountPaid : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      links: []
    };

    // Create company FinancialRecord (J$ buyback with cost)
    const companyFinrec: FinancialRecord = {
      id: `finrec-cashout-company-${playerId}-${Date.now()}`,
      name: `J$ Buyback: ${j$Sold} J$ from Player`,
      description: `Company bought back ${j$Sold} J$ from player for ${amountLabel}`,
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
      station: companyStation,
      type: 'company',
      playerCharacterId: playerCharacterId,
      cost: cashOutType === 'USD' ? amountPaid : 0, // USD cost for USD cash-out, 0 for Zaps (Zaps tracked separately)
      revenue: 0,
      jungleCoins: j$Sold, // Positive: J$ returns to company treasury
      isNotPaid: false,
      isNotCharged: false,
      netCashflow: cashOutType === 'USD' ? -amountPaid : 0,
      jungleCoinsValue: j$Sold * 10,
      isCollected: false,
      exchangeType,
      exchangeCounterAmount: cashOutType === 'ZAPS' ? amountPaid : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      links: []
    };

    // Store records
    await upsertFinancial(personalFinrec);
    await upsertFinancial(companyFinrec);

    console.log(`[createFinancialRecordFromJ$CashOut] ✅ Financial records created: Personal=${personalFinrec.id}, Company=${companyFinrec.id}`);

    const pLink = makeLink(
      LinkType.PLAYER_FINREC,
      { type: EntityType.PLAYER, id: playerId },
      { type: EntityType.FINANCIAL, id: personalFinrec.id }
    );
    await createLink(pLink);

    const cLink = makeLink(
      LinkType.PLAYER_FINREC,
      { type: EntityType.PLAYER, id: playerId },
      { type: EntityType.FINANCIAL, id: companyFinrec.id }
    );
    await createLink(cLink);

    if (playerCharacterId) {
      const charLink = makeLink(
        LinkType.FINREC_CHARACTER,
        { type: EntityType.FINANCIAL, id: companyFinrec.id },
        { type: EntityType.CHARACTER, id: playerCharacterId }
      );
      await createLink(charLink);
    }

    return { personalRecord: personalFinrec, companyRecord: companyFinrec };

  } catch (error) {
    console.error(`[createFinancialRecordFromJ$CashOut] ❌ Failed to create financial records for cash-out:`, error);
    throw error;
  }
}