// workflows/financial-record-utils.ts
// Financial record creation and management utilities

import type { Task, FinancialRecord, Sale, ItemSaleLine, Character, Contract, ServiceLine, BundleSaleLine } from '@/types/entities';
import { LinkType, EntityType, LogEventType, BUSINESS_STRUCTURE, CharacterRole, SaleType, SaleStatus, ContractClauseType, ContractStatus } from '@/types/enums';
import { upsertFinancial, getAllFinancials, getFinancialsBySourceTaskId, removeFinancial, getItemById, getCharacterById, getFinancialConversionRates, getContractById } from '@/data-store/datastore';
import { makeLink } from '@/links/links-workflows';
import { createLink } from '@/links/link-registry';
import { appendEntityLog } from './entities-logging';
import { appendLinkLog } from '@/links/links-logging';
import { getFinancialTypeForStation, getSalesChannelFromSaleType } from '@/lib/utils/business-structure-utils';
import type { Station } from '@/types/type-aliases';

import { BITCOIN_SATOSHIS_PER_BTC } from '@/lib/constants/financial-constants';

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
      outputItemId: task.isNewItem ? null : (task.outputItemId || null),
      isNewItem: task.isNewItem,
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
    await appendLinkLog(link, 'created');

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
    // Determine sales channel from Sale entity or derive from SaleType
    const salesChannel = sale.salesChannel || getSalesChannelFromSaleType(sale.type) || ('Direct Sales' as Station);
    // Use salesChannel as station for sales-derived financial records
    const station = salesChannel;

    // Naming Logic: Use counterparty name or descriptive fallback based on type
    const fallbackName = sale.type === SaleType.BOOTH ? `Booth Sale` : 'Walk-in Customer';
    const displayName = sale.counterpartyName || fallbackName;

    const newFinrec: FinancialRecord = {
      id: `finrec-${sale.id}-${Date.now()}`,
      name: `Sale: ${displayName}`,
      description: `Financial record from sale: ${displayName}`,
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
      station: station,
      type: getFinancialTypeForStation(station),
      siteId: sale.siteId,
      targetSiteId: undefined,
      sourceSaleId: sale.id, // AMBASSADOR field - points back to Sale
      salesChannel: salesChannel, // Persist sales channel explicitly
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
    await appendLinkLog(link, 'created');

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
              { type: EntityType.ITEM, id: itemLine.itemId },
              {
                quantity: itemLine.quantity,
                unitPrice: itemLine.unitPrice,
                totalRevenue: itemLine.quantity * itemLine.unitPrice,
                itemType: item.type,
                createdFrom: 'sale'
              }
            );
            await createLink(itemLink);
            await appendLinkLog(itemLink, 'created');
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
 * Create split financial records for Booth Sales
 * - Record 1: Gross Income (Total Sales)
 * - Record 2: Associate Payout (Expense)
 */
export async function createFinancialRecordFromBoothSale(sale: Sale): Promise<void> {
  try {
    console.log(`[createFinancialRecordFromBoothSale] Creating split financial records for Booth Sale: ${sale.counterpartyName}`);

    // [UPDATED] Robust Logic using First-Class Fields
    // If we have boothFee, we assume this is a Booth Sale with Split Logic
    // If not, we check metadata for legacy support.
    const boothFee = sale.boothFee ?? sale.archiveMetadata?.boothSaleContext?.boothCost ?? 0;
    const paymentBreakdown = sale.paymentBreakdown ?? sale.archiveMetadata?.boothSaleContext?.paymentDistribution;
    const boothMetadata = sale.archiveMetadata?.boothSaleContext; // Keep relative reference for fallback

    // Log the detailed transaction
    const logDetails = {
      gross: sale.totals.totalRevenue,
      boothFee,
      netCompany: boothMetadata?.calculatedTotals?.myNet || 0, // Legacy fallback
      netAssociate: boothMetadata?.calculatedTotals?.associateNet || 0, // Legacy fallback
      payments: paymentBreakdown ? `Cash: ${paymentBreakdown.cashCRC}/${paymentBreakdown.cashUSD}, BTC: ${paymentBreakdown.bitcoin}, Card: ${paymentBreakdown.card}` : 'Standard',
      associateId: sale.associateId || sale.partnerId || sale.customerId
    };

    await appendEntityLog(EntityType.SALE, sale.id, LogEventType.TRANSACTED, {
      message: `Booth Sale Finalized. Gross: ${sale.totals.totalRevenue}. Payments: ${JSON.stringify(paymentBreakdown || {})}`,
      ...logDetails
    });

    // 1. Create Gross Income Record (Standard)
    const grossRevenue = sale.totals.totalRevenue;
    console.log(`[createFinancialRecordFromBoothSale] Creating Gross Income Record: ${grossRevenue}`);
    const incomeRecord = await createFinancialRecordFromSale(sale);

    if (!incomeRecord) {
      console.error(`[createFinancialRecordFromBoothSale] Failed to create income record.`);
      return; // Stop if primary record fails
    }

    // [NEW] Link Sale to Associate (Character) if present
    const targetEntityId = sale.associateId || sale.partnerId || sale.customerId;
    let associateNet = 0; // Calculated Payout Amount

    if (targetEntityId) {
      // Determine role based on context
      const linkRole = sale.partnerId ? CharacterRole.PARTNER : CharacterRole.ASSOCIATE;

      const charLink = makeLink(
        LinkType.SALE_CHARACTER,
        { type: EntityType.SALE, id: sale.id },
        { type: EntityType.CHARACTER, id: targetEntityId },
        { role: linkRole, context: `Booth ${sale.partnerId ? 'Partner' : 'Associate'}` }
      );
      await createLink(charLink);
      await appendLinkLog(charLink, 'created');

      // CALCULATION LOGIC (SERVER SIDE)
      // Categorize Lines
      let myItemsTotal = 0;
      let assocItemsTotal = 0;

      // Load Contract splits
      let shareOfMyItems_Me = 1.0;
      let shareOfAssocItems_Me = 0.0; // My commission on their items
      let shareOfExpenses_Me = 1.0; // I pay 100% of booth fee by default

      // Determine Contract ID
      const contractId = sale.archiveMetadata?.boothSaleContext?.contractId;
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
      } else if (contract && !Array.isArray(contract.clauses)) {
        console.warn(`[createFinancialRecordFromBoothSale] Contract ${contract.id} has invalid clauses structure. Using defaults.`);
      }

      // Sum Items (USD)
      sale.lines.forEach(line => {
        // Is it an Associate Item? (Ref BoothSalesView logic)
        const isAssociateItem = line.kind === 'service' && (line as ServiceLine).station === 'Associate Sales';

        let lineTotal = 0;
        if (line.kind === 'item') lineTotal = ((line as ItemSaleLine).unitPrice || 0) * ((line as ItemSaleLine).quantity || 0);
        else if (line.kind === 'bundle') lineTotal = ((line as BundleSaleLine).unitPrice || 0) * ((line as BundleSaleLine).quantity || 0);
        else if (line.kind === 'service') lineTotal = (line as ServiceLine).revenue || 0;

        if (isAssociateItem) assocItemsTotal += lineTotal;
        else myItemsTotal += lineTotal;
      });

      // Calculate Associate Share (USD)
      const rates = await getFinancialConversionRates();
      const rate = rates.colonesToUsd || 500;
      const boothFeeUSD = boothFee / rate;

      const revenueMyItems_Assoc = myItemsTotal * (1 - shareOfMyItems_Me);
      const revenueAssocItems_Assoc = assocItemsTotal * (1 - shareOfAssocItems_Me);
      const cost_Assoc = boothFeeUSD * (1 - shareOfExpenses_Me);

      associateNet = revenueMyItems_Assoc + revenueAssocItems_Assoc - cost_Assoc;

      console.log(`[createFinancialRecordFromBoothSale] Calculated Split (USD): MyItems=${myItemsTotal} AssocItems=${assocItemsTotal} => AssociateNet=${associateNet}`);
    }

    // 2. Create Payout Expense Record (If Associate owed money)
    if (associateNet > 0) {
      console.log(`[createFinancialRecordFromBoothSale] Creating Associate Payout Record: ${associateNet}`);

      const currentDate = new Date();
      // Payout Status Logic: Matches Sale Status
      const isPayoutPaid = sale.status === SaleStatus.CHARGED;

      const payoutFinrec: FinancialRecord = {
        id: `finrec-payout-${sale.id}-${Date.now()}`,
        name: `Payout: ${sale.counterpartyName || 'Associate'}`,
        description: `Associate payout for ${sale.counterpartyName || 'Associate'} (Split Share)`,
        year: currentDate.getFullYear(),
        month: currentDate.getMonth() + 1,
        station: 'Booth Sales' as Station,
        type: 'company', // Expense
        siteId: sale.siteId,
        sourceSaleId: sale.id,
        salesChannel: 'Booth Sales' as Station,

        cost: associateNet,
        revenue: 0,
        jungleCoins: 0,

        isNotPaid: !isPayoutPaid,
        isNotCharged: false,

        netCashflow: -associateNet, // Expense
        jungleCoinsValue: 0,
        isCollected: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        links: []
      };

      const createdPayout = await upsertFinancial(payoutFinrec);

      // Link Payout to Sale
      const link = makeLink(
        LinkType.SALE_FINREC,
        { type: EntityType.SALE, id: sale.id },
        { type: EntityType.FINANCIAL, id: createdPayout.id },
        { type: 'payout', netCashflow: -associateNet }
      );
      await createLink(link);
      await appendLinkLog(link, 'created');

      // Link Payout to Associate (Character) if present
      if (targetEntityId) {
        const linkRole = sale.partnerId ? CharacterRole.PARTNER : CharacterRole.ASSOCIATE;
        const charLink = makeLink(
          LinkType.FINREC_CHARACTER,
          { type: EntityType.FINANCIAL, id: createdPayout.id },
          { type: EntityType.CHARACTER, id: targetEntityId },
          { role: linkRole }
        );
        await createLink(charLink);
        await appendLinkLog(charLink, 'created');
      }

      console.log(`[createFinancialRecordFromBoothSale] ✅ Created Payout Record: ${createdPayout.name}`);
    }

  } catch (error) {
    console.error(`[createFinancialRecordFromBoothSale] ❌ Failed to create booth records:`, error);
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
    // Use 'Rewards' station from BUSINESS_STRUCTURE.PERSONAL (single source of truth)
    const rewardsStation = BUSINESS_STRUCTURE.PERSONAL.find(s => s === 'Rewards');
    if (!rewardsStation) throw new Error('Rewards station not found in BUSINESS_STRUCTURE');
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
      rewards: {
        points: {
          xp: -pointsExchanged.xp, // Negative points (spent)
          rp: -pointsExchanged.rp,
          fp: -pointsExchanged.fp,
          hp: -pointsExchanged.hp
        }
      },
      netCashflow: 0, // No cashflow, just currency exchange
      jungleCoinsValue: j$Received * 10, // J$ value in USD (1 J$ = $10)
      isCollected: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      links: []
    };

    // Store the financial record
    console.log(`[createFinancialRecordFromPointsExchange] Creating financial record:`, newFinrec);
    const createdFinrec = await upsertFinancial(newFinrec);

    // Create PLAYER_FINREC link (always create link to player)
    const linkMetadata = {
      pointsExchanged: pointsExchanged,
      j$Received: j$Received,
      exchangeType: 'POINTS_TO_J$',
      playerCharacterId: playerCharacterId || null,
      createdAt: new Date().toISOString()
    };

    const link = makeLink(
      LinkType.PLAYER_FINREC,
      { type: EntityType.PLAYER, id: playerId },
      { type: EntityType.FINANCIAL, id: createdFinrec.id },
      linkMetadata
    );

    await createLink(link);
    await appendLinkLog(link, 'created');
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

    // Determine company station based on character role
    let companyStation: Station;
    if (playerCharacterId) {
      const character = await getCharacterById(playerCharacterId);
      if (character?.roles.includes(CharacterRole.FOUNDER)) {
        const founderStation = BUSINESS_STRUCTURE.ADMIN.find(s => s === 'Founder');
        if (!founderStation) throw new Error('Founder station not found in BUSINESS_STRUCTURE');
        companyStation = founderStation as Station;
      } else if (character?.roles.includes(CharacterRole.TEAM)) {
        const teamStation = BUSINESS_STRUCTURE.ADMIN.find(s => s === 'Team');
        if (!teamStation) throw new Error('Team station not found in BUSINESS_STRUCTURE');
        companyStation = teamStation as Station;
      } else {
        // Default to Founder if role not found
        const founderStation = BUSINESS_STRUCTURE.ADMIN.find(s => s === 'Founder');
        if (!founderStation) throw new Error('Founder station not found in BUSINESS_STRUCTURE');
        companyStation = founderStation as Station;
      }
    } else {
      // Default to Founder if no character
      const founderStation = BUSINESS_STRUCTURE.ADMIN.find(s => s === 'Founder');
      if (!founderStation) throw new Error('Founder station not found in BUSINESS_STRUCTURE');
      companyStation = founderStation as Station;
    }

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
      netCashflow: cashOutType === 'USD' ? -amountPaid : 0, // Negative cashflow for USD, 0 for Zaps
      jungleCoinsValue: j$Sold * 10, // J$ value in USD
      isCollected: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      links: []
    };

    // Store both financial records
    const createdPersonalFinrec = await upsertFinancial(personalFinrec);
    const createdCompanyFinrec = await upsertFinancial(companyFinrec);

    // Create PLAYER_FINREC links for both records
    const personalLinkMetadata = {
      j$Sold: j$Sold,
      amountPaid: amountPaid,
      j$Rate: cashOutType === 'USD' ? j$Rate : undefined,
      zapsRate: cashOutType === 'ZAPS' ? (calculatedZapsRate || zapsRate) : undefined,
      cashOutType: cashOutType,
      exchangeType: exchangeType,
      playerCharacterId: playerCharacterId || null,
      createdAt: new Date().toISOString()
    };

    const personalLink = makeLink(
      LinkType.PLAYER_FINREC,
      { type: EntityType.PLAYER, id: playerId },
      { type: EntityType.FINANCIAL, id: createdPersonalFinrec.id },
      personalLinkMetadata
    );

    const companyLinkMetadata = {
      j$Sold: j$Sold,
      amountPaid: amountPaid,
      j$Rate: cashOutType === 'USD' ? j$Rate : undefined,
      zapsRate: cashOutType === 'ZAPS' ? (calculatedZapsRate || zapsRate) : undefined,
      cashOutType: cashOutType,
      exchangeType: exchangeType,
      playerCharacterId: playerCharacterId || null,
      companyStation: companyStation,
      createdAt: new Date().toISOString()
    };

    const companyLink = makeLink(
      LinkType.PLAYER_FINREC,
      { type: EntityType.PLAYER, id: playerId },
      { type: EntityType.FINANCIAL, id: createdCompanyFinrec.id },
      companyLinkMetadata
    );

    await createLink(personalLink);
    await appendLinkLog(personalLink, 'created');
    await createLink(companyLink);
    await appendLinkLog(companyLink, 'created');

    console.log(`[createFinancialRecordFromJ$CashOut] ✅ Created PLAYER_FINREC links for both records`);
    console.log(`[createFinancialRecordFromJ$CashOut] ✅ Personal record: ${createdPersonalFinrec.name}`);
    console.log(`[createFinancialRecordFromJ$CashOut] ✅ Company record: ${createdCompanyFinrec.name}`);

    return {
      personalRecord: createdPersonalFinrec,
      companyRecord: createdCompanyFinrec
    };

  } catch (error) {
    console.error(`[createFinancialRecordFromJ$CashOut] ❌ Failed to create financial records for cash-out:`, error);
    throw error;
  }
}