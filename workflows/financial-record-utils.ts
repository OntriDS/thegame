// workflows/financial-record-utils.ts
// Financial record creation and management utilities

import type { Task, FinancialRecord, Sale, ItemSaleLine, Character, Contract, ServiceLine } from '@/types/entities';
import { LinkType, EntityType, LogEventType, BUSINESS_STRUCTURE, SaleType, SaleStatus, ContractClauseType, ContractStatus, FinancialStatus } from '@/types/enums';
import {
  upsertFinancial,
  getAllFinancials,
  getFinancialsBySourceTaskId,
  removeFinancial,
  getItemById,
  getCharacterById,
  getFinancialConversionRates,
  getContractById,
  getFinancialsBySourceSaleId,
  upsertCharacter,
  getSiteById,
} from '@/data-store/datastore';
import { makeLink } from '@/links/links-workflows';
import { createLink, getLinksFor } from '@/links/link-registry';
import { appendEntityLog } from './entities-logging';
import { getFinancialTypeForStation, getSalesChannelFromSaleType } from '@/lib/utils/business-structure-utils';
import type { Station } from '@/types/type-aliases';

import { BITCOIN_SATOSHIS_PER_BTC, DEFAULT_CURRENCY_EXCHANGE_RATES } from '@/lib/constants/financial-constants';
import { formatDisplayDate, parseFlexibleDate } from '@/lib/utils/date-utils';

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

/** Sale-sourced finrec period: doneAt, then saleDate, then createdAt — not collectedAt. */
function coerceSaleFinrecDate(
  sale: Sale,
  fallback: Date
): Date {
  try {
    const raw = sale.doneAt || sale.saleDate || sale.createdAt || fallback;
    const d = raw instanceof Date ? raw : parseFlexibleDate(raw as string);
    return Number.isFinite(d.getTime()) ? d : fallback;
  } catch {
    return fallback;
  }
}

function saleTypeToFinrecTitlePrefix(type: SaleType | string | undefined): string {
  switch (type) {
    case SaleType.DIRECT:
    case 'DIRECT':
      return 'Direct Sale';
    case SaleType.BOOTH:
    case 'BOOTH':
      return 'Booth Sale';
    case SaleType.NETWORK:
    case 'NETWORK':
      return 'Network Sale';
    case SaleType.ONLINE:
    case 'ONLINE':
      return 'Online Sale';
    case SaleType.NFT:
    case 'NFT':
      return 'NFT Sale';
    default:
      return 'Sale';
  }
}

/** Customer / site strings for finrec titles only. Use "" when missing — no placeholders. */
async function resolveSaleCustomerAndSiteLabels(sale: Sale): Promise<{ customerLabel: string; siteLabel: string }> {
  let customerLabel = (sale.counterpartyName && String(sale.counterpartyName).trim()) || '';
  if (!customerLabel && sale.customerId) {
    const ch = await getCharacterById(sale.customerId);
    customerLabel = (ch?.name && String(ch.name).trim()) || '';
  }

  let siteLabel = '';
  if (sale.siteId) {
    try {
      const site = await getSiteById(sale.siteId);
      siteLabel = (site?.name && String(site.name).trim()) || '';
    } catch (e) {
      console.warn('[resolveSaleCustomerAndSiteLabels] site lookup failed', e);
    }
  }

  return { customerLabel, siteLabel };
}

/**
 * "{Type} Sale" + optional customer + optional site + date (DD-MM-YY…).
 * Blank customer/site are omitted (no "Unknown", "—", or sale-type fallbacks).
 */
function composeSaleSourcedFinrecName(
  sale: Sale,
  customerLabel: string,
  siteLabel: string,
  dateLabel: string
): string {
  const parts: string[] = [saleTypeToFinrecTitlePrefix(sale.type)];
  const c = customerLabel.trim();
  const s = siteLabel.trim();
  if (c) parts.push(c);
  if (s) parts.push(s);
  parts.push(dateLabel);
  return parts.join(' ');
}

export interface BoothFinancialSplit {
  myGross: number;        // Total of Akiles items
  myBoothCost: number;     // Akiles share of booth (e.g. $20)
  myCommFromAssoc: number; // Akiles commission on Associate items (e.g. $2)
  assocCommFromMe: number; // Associate commission on Akiles items (e.g. $28)
  date: Date;
  targetEntityId?: string | null;
  targetEntityName: string;
}

/**
 * NEW: Calculate components for Performance Ledger split (Option C)
 */
export async function calculateBoothFinancials(sale: Sale): Promise<BoothFinancialSplit> {
  const boothFee = sale.boothFee ?? sale.metadata?.boothSaleContext?.boothCost ?? 0;
  const rates = await getFinancialConversionRates();
  const rate = rates?.colonesToUsd ?? DEFAULT_CURRENCY_EXCHANGE_RATES.colonesToUsd;
  const boothFeeUSD = boothFee / rate;

  const dateToUse = coerceSaleFinrecDate(sale, new Date());

  // Default shares
  let shareOfMyItems_Me = 1.0;
  let shareOfAssocItems_Me = 0.0; // My commission on their items
  let shareOfExpenses_Me = 1.0;

  // Fetch Contract Clauses
  const contractId = sale.metadata?.boothSaleContext?.contractId;
  if (contractId) {
    const contract = await getContractById(contractId);
    if (contract && contract.status === ContractStatus.ACTIVE && Array.isArray(contract.clauses)) {
      const commClause = contract.clauses.find(c => c.type === ContractClauseType.SALES_COMMISSION);
      if (commClause) shareOfMyItems_Me = commClause.companyShare;

      const serviceClause = contract.clauses.find(c => c.type === ContractClauseType.SALES_SERVICE);
      if (serviceClause) shareOfAssocItems_Me = serviceClause.companyShare;

      const expenseClause = contract.clauses.find(c => c.type === ContractClauseType.EXPENSE_SHARING);
      if (expenseClause) shareOfExpenses_Me = expenseClause.companyShare;
    }
  }

  let myItemsTotal = 0;
  let assocItemsTotal = 0;

  if (sale.lines) {
    sale.lines.forEach(line => {
      // Determine if it's an Associate line (service in booth channel OR explicit associateId in metadata)
      const lineAssocId = (line.metadata as any)?.associateId;
      const isAssociateItem = !!(lineAssocId && lineAssocId !== 'akiles' && lineAssocId !== sale.playerCharacterId);
      
      let lineTotal = 0;
      if (line.kind === 'item') lineTotal = ((line as ItemSaleLine).unitPrice || 0) * ((line as ItemSaleLine).quantity || 0);
      else if (line.kind === 'service') lineTotal = (line as ServiceLine).revenue || 0;

      if (isAssociateItem) assocItemsTotal += lineTotal;
      else myItemsTotal += lineTotal;
    });
  }

  // Final Split Components
  const myBoothCost = boothFeeUSD * shareOfExpenses_Me;
  const myCommFromAssoc = assocItemsTotal * shareOfAssocItems_Me;
  const assocCommFromMe = myItemsTotal * (1 - shareOfMyItems_Me);

  // Target Entity Resolution
  let targetEntityId = sale.associateId || sale.partnerId || sale.customerId;
  let targetEntityName = 'Associate';
  if (targetEntityId) {
    const { getBusinessById } = await import('@/data-store/repositories/character.repo');
    const business = await getBusinessById(targetEntityId);
    if (business) {
      targetEntityName = business.name;
      if (business.linkedCharacterId) targetEntityId = business.linkedCharacterId;
    } else {
      const character = await getCharacterById(targetEntityId);
      if (character) targetEntityName = character.name;
    }
  }

  return {
    myGross: myItemsTotal,
    myBoothCost,
    myCommFromAssoc,
    assocCommFromMe,
    date: dateToUse,
    targetEntityId,
    targetEntityName
  };
}

/** Shared sale → finrec identity (name, station, period) for create + booth update paths */
async function resolveSaleDerivedFinrecFields(
  sale: Sale
): Promise<{
  dateToUse: Date;
  salesChannel: Station;
  station: Station;
  year: number;
  month: number;
  financialType: 'company' | 'personal';
  description: string;
  customerLabel: string;
  siteLabel: string;
  /** e.g. Direct Sale 01-01-26 | Booth Sale Eco-Feria 01-01-26 | Network Sale Alvaro 01-01-26 */
  finrecName: string;
}> {
  const currentDate = new Date();
  const dateToUse = coerceSaleFinrecDate(sale, currentDate);
  const hasChannel =
    sale.salesChannel != null && String(sale.salesChannel).trim() !== '';
  const salesChannel =
    (hasChannel ? sale.salesChannel : null) ||
    getSalesChannelFromSaleType(String(sale.type)) ||
    ('Direct-Sales' as Station);
  const station = salesChannel;

  const { customerLabel, siteLabel } = await resolveSaleCustomerAndSiteLabels(sale);
  const dateLabel = formatDisplayDate(dateToUse);
  const finrecName = composeSaleSourcedFinrecName(sale, customerLabel, siteLabel, dateLabel);

  return {
    dateToUse,
    salesChannel,
    station,
    year: dateToUse.getFullYear(),
    month: dateToUse.getMonth() + 1,
    financialType: getFinancialTypeForStation(station),
    description: `Sale-sourced financial · ${sale.id}`,
    customerLabel,
    siteLabel,
    finrecName,
  };
}

async function upsertPrimarySaleFinrecFromSale(
  sale: Sale,
  existing: FinancialRecord,
  derived: Awaited<ReturnType<typeof resolveSaleDerivedFinrecFields>>
): Promise<FinancialRecord> {
  const now = new Date();
  const next: FinancialRecord = {
    ...existing,
    name: derived.finrecName,
    description: derived.description,
    year: derived.year,
    month: derived.month,
    station: derived.station,
    type: derived.financialType,
    siteId: sale.siteId ?? existing.siteId,
    targetSiteId: existing.targetSiteId,
    sourceSaleId: sale.id,
    salesChannel: derived.salesChannel,
    cost: 0,
    revenue: sale.totals.totalRevenue,
    jungleCoins: existing.jungleCoins ?? 0,
    isNotPaid: !!sale.isNotPaid,
    isNotCharged: !!sale.isNotCharged,
    rewards: undefined,
    netCashflow: sale.totals.totalRevenue,
    jungleCoinsValue: existing.jungleCoinsValue ?? 0,
    isCollected: existing.isCollected,
    collectedAt: existing.collectedAt,
    updatedAt: now,
  };

  const saved = await upsertFinancial(next, { forceSave: true });

  const saleLinks = await getLinksFor({ type: EntityType.SALE, id: sale.id });
  const hasSaleFinrec = saleLinks.some(
    l =>
      l.linkType === LinkType.SALE_FINREC &&
      l.target.type === EntityType.FINANCIAL &&
      l.target.id === saved.id
  );
  if (!hasSaleFinrec) {
    await createLink(
      makeLink(
        LinkType.SALE_FINREC,
        { type: EntityType.SALE, id: sale.id },
        { type: EntityType.FINANCIAL, id: saved.id }
      )
    );
  }

  return saved;
}

/**
 * Create or update the single primary financial record for a non-booth sale (revenue > 0).
 * Idempotent by sourceSaleId: never creates a second row; dedupes legacy duplicates (keeps oldest).
 */
export async function createFinancialRecordFromSale(sale: Sale): Promise<FinancialRecord | null> {
  try {
    if (sale.totals.totalRevenue <= 0) {
      console.log(`[createFinancialRecordFromSale] Sale ${sale.id} has no revenue, skipping`);
      return null;
    }

    const derived = await resolveSaleDerivedFinrecFields(sale);
    const allForSale = await getFinancialsBySourceSaleId(sale.id);
    const nonPayout = allForSale.filter(r => !r.id.includes('payout'));

    if (nonPayout.length > 1) {
      const sorted = [...nonPayout].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      const keeper = sorted[0]!;
      for (let i = 1; i < sorted.length; i++) {
        const dup = sorted[i]!;
        try {
          await removeFinancial(dup.id);
          console.log(`[createFinancialRecordFromSale] Removed duplicate finrec ${dup.id} for sale ${sale.id}`);
        } catch (e) {
          console.error(`[createFinancialRecordFromSale] Failed to remove duplicate ${dup.id}:`, e);
        }
      }
      const saved = await upsertPrimarySaleFinrecFromSale(sale, keeper, derived);
      console.log(`[createFinancialRecordFromSale] ✅ Deduped and updated finrec: ${saved.name}`);
      return saved;
    }

    if (nonPayout.length === 1) {
      const saved = await upsertPrimarySaleFinrecFromSale(sale, nonPayout[0]!, derived);
      console.log(`[createFinancialRecordFromSale] ✅ Updated existing finrec: ${saved.name}`);
      return saved;
    }

    const currentDate = new Date();
    const canonicalId = `finrec-${sale.id}`;
    const newFinrec: FinancialRecord = {
      id: canonicalId,
      name: derived.finrecName,
      description: derived.description,
      year: derived.year,
      month: derived.month,
      station: derived.station,
      type: derived.financialType,
      siteId: sale.siteId,
      targetSiteId: undefined,
      sourceSaleId: sale.id,
      salesChannel: derived.salesChannel,
      cost: 0,
      revenue: sale.totals.totalRevenue,
      jungleCoins: 0,
      isNotPaid: !!sale.isNotPaid,
      isNotCharged: !!sale.isNotCharged,
      rewards: undefined,
      netCashflow: sale.totals.totalRevenue,
      jungleCoinsValue: 0,
      isCollected: false,
      collectedAt: undefined,
      createdAt: currentDate,
      updatedAt: currentDate,
      links: [],
    };

    console.log(`[createFinancialRecordFromSale] Creating finrec:`, newFinrec);
    const createdFinrec = await upsertFinancial(newFinrec, { forceSave: true });

    await createLink(
      makeLink(
        LinkType.SALE_FINREC,
        { type: EntityType.SALE, id: sale.id },
        { type: EntityType.FINANCIAL, id: createdFinrec.id }
      )
    );

    if (sale.lines && sale.lines.length > 0) {
      for (const line of sale.lines) {
        if (line.kind === 'item' && 'itemId' in line && line.itemId) {
          const itemLine = line as ItemSaleLine;
          const item = await getItemById(itemLine.itemId);
          if (item) {
            await createLink(
              makeLink(
                LinkType.FINREC_ITEM,
                { type: EntityType.FINANCIAL, id: createdFinrec.id },
                { type: EntityType.ITEM, id: itemLine.itemId }
              )
            );
            console.log(
              `[createFinancialRecordFromSale] ✅ FINREC_ITEM link: ${item.name} (${itemLine.quantity} @ ${itemLine.unitPrice})`
            );
          }
        }
      }
    }

    console.log(`[createFinancialRecordFromSale] ✅ Created finrec and SALE_FINREC: ${createdFinrec.name}`);
    return createdFinrec;
  } catch (error) {
    console.error(`[createFinancialRecordFromSale] ❌ Failed for sale ${sale.id}:`, error);
    throw error;
  }
}

/**
 * Calculate the associate's share of a sale (Legacy wrapper for compatibility)
 */
export async function calculateAssociatePayout(sale: Sale): Promise<number> {
  const split = await calculateBoothFinancials(sale);
  
  // Total Revenue contained in the Sale object
  const totalRevenue = sale.totals.totalRevenue || 0;
  // Assoc Gross = What she actually sold (cash Akiles is holding)
  const assocGross = totalRevenue - split.myGross;
  
  // Total Payout = (Assoc Income from Me) - (My Income from Her) + (Her Gross Sales we are holding)
  // Example: $28 - $2 + $8 = $34.
  const payout = split.assocCommFromMe - split.myCommFromAssoc + assocGross;
  return payout;
}

/**
 * Create/Update split financial records for Booth-Sales (Option C)
 * Separates your core performance from the partnership contract impact.
 */
export async function createFinancialRecordFromBoothSale(sale: Sale): Promise<void> {
  try {
    console.log(`[createFinancialRecordFromBoothSale] Processing Option C financials for Booth Sale: ${sale.id}`);

    // 1. Calculate Comprehensive Split via Contract Clauses
    const split = await calculateBoothFinancials(sale);
    const dateStr = formatDisplayDate(split.date);
    const derived = await resolveSaleDerivedFinrecFields(sale);
    const boothTitleBase = composeSaleSourcedFinrecName(sale, derived.customerLabel, derived.siteLabel, dateStr);

    // [IDEMPOTENCY CHECK] Load existing records linked to this sale
    const existingRecords = await getFinancialsBySourceSaleId(sale.id);

    // =========================================================================
    // RECORD 1: Akiles Core Business Performance
    // =========================================================================
    const incomeRecordId = `finrec-${sale.id}`;
    const incomeRecord = existingRecords.find(r => r.id === incomeRecordId) || 
                         existingRecords.find(r => r.id.startsWith('finrec-') && !r.id.includes('payout'));

    const incomeData: FinancialRecord = {
      ...(incomeRecord || {}),
      id: incomeRecordId,
      name: boothTitleBase,
      description: `Performance Ledger: My items and booth cost share`,
      year: split.date.getFullYear(),
      month: split.date.getMonth() + 1,
      station: derived.station,
      type: derived.financialType,
      siteId: sale.siteId,
      sourceSaleId: sale.id,
      salesChannel: derived.salesChannel,
      revenue: split.myGross,
      cost: split.myBoothCost,
      netCashflow: split.myGross - split.myBoothCost,
      status: (!sale.isNotPaid && !sale.isNotCharged || sale.isCollected) ? FinancialStatus.DONE : FinancialStatus.PENDING,
      isNotPaid: sale.isNotPaid || false,
      isNotCharged: sale.isNotCharged || false,
      updatedAt: new Date(),
      createdAt: incomeRecord?.createdAt || new Date(),
      links: incomeRecord?.links || []
    } as FinancialRecord;

    await upsertFinancial(incomeData, { forceSave: true });
    console.log(`[createFinancialRecordFromBoothSale] ✅ Synced Record 1 (${incomeRecordId}): Net=${incomeData.netCashflow}`);

    // Verify/Create SALE_FINREC Link
    const saleLinks = await getLinksFor({ type: EntityType.SALE, id: sale.id });
    const hasIncomeLink = saleLinks.some(l => l.linkType === LinkType.SALE_FINREC && l.target.id === incomeRecordId);
    if (!hasIncomeLink) {
      const link = makeLink(LinkType.SALE_FINREC, { type: EntityType.SALE, id: sale.id }, { type: EntityType.FINANCIAL, id: incomeRecordId });
      await createLink(link);
    }

    // =========================================================================
    // RECORD 2: Contract Impact (Associate Impact)
    // =========================================================================
    const hasContractImpact = split.myCommFromAssoc > 0 || split.assocCommFromMe > 0;
    const payoutRecordId = `finrec-payout-${sale.id}`;
    const payoutRecord = existingRecords.find(r => r.id === payoutRecordId) || 
                         existingRecords.find(r => r.id.includes('payout'));

    if (hasContractImpact) {
      const payoutData: FinancialRecord = {
        ...(payoutRecord || {}),
        id: payoutRecordId,
        name: `${boothTitleBase} • Associate`,
        description: `Impact Ledger: Commission split with associate`,
        year: split.date.getFullYear(),
        month: split.date.getMonth() + 1,
        station: 'Booth-Sales' as Station,
        type: 'company',
        siteId: sale.siteId,
        sourceSaleId: sale.id,
        salesChannel: 'Booth-Sales' as Station,
        revenue: split.myCommFromAssoc,
        cost: split.assocCommFromMe,
        netCashflow: split.myCommFromAssoc - split.assocCommFromMe,
        status: (sale.status !== SaleStatus.PENDING) ? FinancialStatus.DONE : FinancialStatus.PENDING,
        isNotPaid: sale.status !== SaleStatus.CHARGED,
        isNotCharged: false,
        updatedAt: new Date(),
        createdAt: payoutRecord?.createdAt || new Date(),
        links: payoutRecord?.links || []
      } as FinancialRecord;

      await upsertFinancial(payoutData, { forceSave: true });
      console.log(`[createFinancialRecordFromBoothSale] ✅ Synced Record 2 (${payoutRecordId}): Net=${payoutData.netCashflow}`);

      // Verify/Create SALE_FINREC Link
      const hasPayoutSaleLink = saleLinks.some(l => l.linkType === LinkType.SALE_FINREC && l.target.id === payoutRecordId);
      if (!hasPayoutSaleLink) {
        const saleLink = makeLink(LinkType.SALE_FINREC, { type: EntityType.SALE, id: sale.id }, { type: EntityType.FINANCIAL, id: payoutRecordId });
        await createLink(saleLink);
      }

      // Verify/Create FINREC_CHARACTER Link
      if (split.targetEntityId) {
        const finrecLinks = await getLinksFor({ type: EntityType.FINANCIAL, id: payoutRecordId });
        const hasCharLink = finrecLinks.some(l => l.linkType === LinkType.FINREC_CHARACTER && l.target.id === split.targetEntityId);
        if (!hasCharLink) {
          const charLink = makeLink(LinkType.FINREC_CHARACTER, { type: EntityType.FINANCIAL, id: payoutRecordId }, { type: EntityType.CHARACTER, id: split.targetEntityId });
          await createLink(charLink);
        }
      }
    } else if (payoutRecord) {
      // If was there but no longer has impact, zero it
      const zeroedPayout = { 
        ...payoutRecord, 
        revenue: 0, 
        cost: 0, 
        netCashflow: 0, 
        description: 'No contract impact for this revision', 
        status: FinancialStatus.DONE,
        updatedAt: new Date() 
      };
      await upsertFinancial(zeroedPayout as FinancialRecord);
    }

  } catch (error) {
    console.error(`[createFinancialRecordFromBoothSale] ❌ Failed to create booth records:`, error);
    throw error;
  }
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
      jungleCoinsValue: j$Received * 10, // J$ value in USD (1 J$ = $10)
      netCashflow: 0, // No cashflow, just currency exchange
      status: FinancialStatus.DONE,
      createdAt: new Date(),
      updatedAt: new Date(),
      links: []
    } as FinancialRecord;

    // Store the financial record
    const createdFinrec = await upsertFinancial(newFinrec);

    const link = makeLink(
      LinkType.PLAYER_FINREC,
      { type: EntityType.PLAYER, id: playerId },
      { type: EntityType.FINANCIAL, id: createdFinrec.id }
    );

    await createLink(link);
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