// @ts-nocheck
// workflows/financial-record-utils.ts
// Financial record creation and management utilities

import type { Task, FinancialRecord, FinancialRecordRuntime, FinancialRecordRelationInput, Sale, ItemSaleLine, Character, Contract, ServiceLine } from '@/types/entities';
import { LinkType, EntityType, LogEventType, BUSINESS_STRUCTURE, SaleType, SaleStatus, TaskStatus, ContractClauseType, ContractStatus, FinancialStatus, CharacterRole, EntitySchemaVersion } from '@/types/enums';
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
import { createLink, getLinksFor, removeLink } from '@/links/link-registry';
import { appendEntityLog } from './entities-logging';
import { getFinancialTypeForStation, getSalesChannelFromSaleType, normalizeStationValue } from '@/lib/utils/business-structure-utils';
import { SalesStation } from '@/lib/storage/taxonomy';
import type { Station } from '@/types/type-aliases';

import { BITCOIN_SATOSHIS_PER_BTC, DEFAULT_CURRENCY_EXCHANGE_RATES } from '@/lib/constants/financial-constants';
import { buildFinrecTitleFromSaleParts, resolveCanonicalSaleTimelineDate } from '@/lib/utils/sale-auto-name-utils';
import { getUTCNow } from '@/lib/utils/utc-utils';
import { parseDateToUTC } from '@/lib/utils/date-parsers';
import { getTaskCounterpartyId } from '@/workflows/task-counterparty-resolution';
import { getSaleCharacterId } from '@/lib/sale-character-id';
import { resolveSaleCharacterId, resolveSaleOwnerId } from '@/lib/sale-relationship-selectors';
import { extractMoneyValue, toMoney } from '@/lib/utils/financial-utils';

const getTaskMoneyValue = (task: Task, field: 'costIntent' | 'revenueIntent'): number => {
  const money = task.context?.financialIntent?.[field];
  return money ? extractMoneyValue(money) : Number((task as any)[field === 'costIntent' ? 'cost' : 'revenue'] || 0);
};

const getTaskIsNewItem = (task: Task): boolean =>
  Boolean(task.context?.productionPlan?.isNewItem ?? (task as any).isNewItem);

const withFinancialRelations = (
  record: FinancialRecord,
  relations: FinancialRecordRelationInput,
): FinancialRecordRuntime => ({
  ...record,
  __financialRelations: relations,
});

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
      if (record && (record.context?.jungleCoins ?? 0) !== 0) {
        // Only count if it's the correct record type? 
        // Actually, any J$ attached to a record linked to me is mine.
        // Except maybe if I'm just a contract counterparty on a large sale?
        // Rule: If I am linked to the FinancialRecord, does it mean I own the J$?
        // In "Bonus", yes. In "Exchange", yes.
        // In "Sale Payout", the record has cost/revenue, does it have J$? 
        // Usually J$ is 0 on Sales.

        // IMPORTANT: We trust the 'jungleCoins' field on the record.
        totalBalance += record.context?.jungleCoins ?? 0;
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
    const taskCost = getTaskMoneyValue(task, 'costIntent');
    const taskRevenue = getTaskMoneyValue(task, 'revenueIntent');
    if (!taskCost && !taskRevenue) {
      console.log(`[createFinancialRecordFromTask] Task ${task.name} has no cost or revenue, skipping financial record creation`);
      return null;
    }

    // OPTIMIZED: No need to check for existing records - Effects Registry already did!
    // The workflow only calls this when hasEffect('task:{id}:financialCreated') === false
    console.log(`[createFinancialRecordFromTask] Creating new financial record (Effect Registry confirmed no existing record)`);

    const currentDate = getUTCNow();
    const rawDate = task.collectedAt || task.doneAt || currentDate;
    const dateToUse =
      rawDate instanceof Date ? rawDate : parseDateToUTC(rawDate as string | number);
    const cost = taskCost;
    const revenue = taskRevenue;
    const counterpartyId = getTaskCounterpartyId(task);
    const newFinrec = withFinancialRelations({
      id: `finrec-${task.id}`,
      schemaVersion: EntitySchemaVersion.V1,
      version: 0,
      name: task.name,
      description: `Financial record from task: ${task.name}`,
      year: dateToUse.getFullYear(),
      month: dateToUse.getMonth() + 1,
      station: task.station,
      type: getFinancialTypeForStation(task.station),
      cost: toMoney(cost),
      revenue: toMoney(revenue),
      netCashflow: toMoney(revenue - cost),
      status: task.status === TaskStatus.COLLECTED
        ? FinancialStatus.COLLECTED
        : task.status === TaskStatus.DONE
          ? FinancialStatus.DONE
          : FinancialStatus.PENDING,
      lifecycle: {
        ...(task.status !== TaskStatus.PENDING ? { doneAt: task.doneAt || dateToUse } : {}),
        ...(task.status === TaskStatus.COLLECTED && task.collectedAt ? { collectedAt: task.collectedAt } : {}),
      },
      context: {
        jungleCoins: 0,
        productionPlan: task.context?.productionPlan,
      },
      createdAt: currentDate,
      updatedAt: currentDate,
    }, {
      siteId: task.siteId,
      targetSiteId: task.targetSiteId,
      sourceTaskId: task.id,
      characterId: counterpartyId,
      characterRelationship: task.context?.counterparty?.role || task.customerCharacterRole || CharacterRole.CUSTOMER,
    });

    // Store the financial record
    console.log(`[createFinancialRecordFromTask] Creating new financial record:`, newFinrec);
    const createdFinrec = await upsertFinancial(newFinrec, { forceSave: true });

    const link = makeLink(
      LinkType.TASK_FINREC,
      { type: EntityType.TASK, id: task.id },
      { type: EntityType.FINANCIAL, id: createdFinrec.id },
      'task-record'
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
      getTaskMoneyValue(previousTask, 'costIntent') !== getTaskMoneyValue(task, 'costIntent') ||
      getTaskMoneyValue(previousTask, 'revenueIntent') !== getTaskMoneyValue(task, 'revenueIntent') ||
      (previousTask.status === "PENDING") !== (task.status === "PENDING") ||
      previousTask.isNotCharged !== task.isNotCharged ||
      previousTask.outputItemId !== task.outputItemId ||
      getTaskIsNewItem(previousTask) !== getTaskIsNewItem(task) ||
      previousTask.name !== task.name ||
      previousTask.station !== task.station ||
      previousTask.siteId !== task.siteId ||
      previousTask.targetSiteId !== task.targetSiteId ||
      getTaskCounterpartyId(previousTask) !== getTaskCounterpartyId(task) ||
      (previousTask.context?.counterparty?.role || previousTask.customerCharacterRole) !==
      (task.context?.counterparty?.role || task.customerCharacterRole);

    if (!financialPropsChanged) {
      console.log(`[updateFinancialRecordFromTask] No financial properties changed for task ${task.id}, skipping update`);
      return;
    }

    // Update the financial record with new task data
    const updatedFinrec = withFinancialRelations({
      ...existingFinrec,
      name: task.name,
      description: `Financial record from task: ${task.name}`,
      cost: toMoney(getTaskMoneyValue(task, 'costIntent')),
      revenue: toMoney(getTaskMoneyValue(task, 'revenueIntent')),
      station: task.station,
      netCashflow: toMoney(getTaskMoneyValue(task, 'revenueIntent') - getTaskMoneyValue(task, 'costIntent')),
      context: {
        ...(existingFinrec.context || {}),
        ...(task.context?.productionPlan ? { productionPlan: task.context.productionPlan } : {}),
      },
      lifecycle: {
        ...(existingFinrec.lifecycle || {}),
        ...((task.doneAt || task.collectedAt) ? { doneAt: existingFinrec.lifecycle?.doneAt || task.doneAt || task.collectedAt } : {}),
        ...(task.collectedAt ? { collectedAt: task.collectedAt } : {}),
      },
      updatedAt: getUTCNow()
    }, {
      siteId: task.siteId,
      targetSiteId: task.targetSiteId,
      sourceTaskId: task.id,
      characterId: getTaskCounterpartyId(task),
      characterRelationship: task.context?.counterparty?.role || task.customerCharacterRole || CharacterRole.CUSTOMER,
    });

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

/** Sale-sourced finrec period: same chain as sale lifecycle (doneAt → chargedAt → createdAt). */
function coerceSaleFinrecDate(sale: Sale, fallback: Date): Date {
  return resolveCanonicalSaleTimelineDate(
    {
      doneAt: sale.lifecycle?.doneAt,
      saleDate: sale.saleDate ?? sale.createdAt,
      createdAt: sale.createdAt,
    },
    fallback
  );
}

/** Customer / site strings for finrec titles only. Use "" when missing — no placeholders. */
async function resolveSaleCustomerAndSiteLabels(sale: Sale): Promise<{ customerLabel: string; siteLabel: string }> {
  let customerLabel = (sale.counterpartyName && String(sale.counterpartyName).trim()) || '';
  const saleCharacterId = await resolveSaleCharacterId(sale);
  if (!customerLabel && saleCharacterId) {
    const ch = await getCharacterById(saleCharacterId);
    customerLabel = (ch?.name && String(ch.name).trim()) || '';
  }

  const saleLinks = await getLinksFor({ type: EntityType.SALE, id: sale.id });
  const linkedSiteId = saleLinks.find(l => l.linkType === LinkType.SALE_SITE && l.target.type === EntityType.SITE)?.target.id;
  const saleSiteId = linkedSiteId ?? sale.siteId;
  let siteLabel = '';
  if (saleSiteId) {
    try {
      const site = await getSiteById(sale.siteId);
      siteLabel =
        (site?.name && String(site.name).trim()) ||
        String(saleSiteId).trim() ||
        '';
    } catch (e) {
      console.warn('[resolveSaleCustomerAndSiteLabels] site lookup failed', e);
      siteLabel = String(saleSiteId).trim() || '';
    }
  }

  return { customerLabel, siteLabel };
}

/**
 * Sale-sourced finrec title: same bullet pattern as sale auto names (`Direct Sale • Site • DD-MM-YY`).
 * Customer is not included. Idempotent for a given sale type, resolved site label, and date.
 */
function composeSaleSourcedFinrecName(sale: Sale, siteLabel: string, dateToUse: Date): string {
  return buildFinrecTitleFromSaleParts(sale.type, siteLabel, dateToUse);
}

export interface BoothFinancialSplit {
  myGross: number;        // Total of Akiles items
  myBoothCost: number;     // Akiles share of booth (e.g. $20)
  myCommFromPartner: number; // Akiles commission on Partner items (e.g. $2)
  partnerCommFromMe: number; // Partner commission on Akiles items (e.g. $28)
  date: Date;
  targetEntityId?: string | null;
  targetEntityName: string;
}

/**
 * NEW: Calculate components for Performance Ledger split (Option C)
 */
export async function calculateBoothFinancials(sale: Sale): Promise<BoothFinancialSplit> {
  const rates = await getFinancialConversionRates();
  const rate = rates?.colonesToUsd ?? DEFAULT_CURRENCY_EXCHANGE_RATES.colonesToUsd;
  const legacyContext = sale.context as (Sale['context'] & {
    boothFee?: Money;
    boothSaleContext?: Sale['context']['boothSaleContext'] & {
      boothCost?: number;
      contractId?: EntityId | null;
    };
  }) | undefined;
  const boothCostUSD = sale.context?.boothCost !== undefined
    ? extractMoneyValue(sale.context.boothCost)
    : legacyContext?.boothFee !== undefined
      ? extractMoneyValue(legacyContext.boothFee) / rate
      : Number(legacyContext?.boothSaleContext?.boothCost || 0) / rate;

  const dateToUse = coerceSaleFinrecDate(sale, getUTCNow());

  // Default shares
  let shareOfMyItems_Me = 1.0;
  let shareOfPartnerItems_Me = 0.0; // My commission on their items
  let shareOfExpenses_Me = 1.0;

  // Fetch Contract Clauses
  const contractId = sale.context?.contractId ?? legacyContext?.boothSaleContext?.contractId;
  if (contractId) {
    const contract = await getContractById(contractId);
    if (contract && contract.status === ContractStatus.ACTIVE && Array.isArray(contract.clauses)) {
      const commClause = contract.clauses.find(c => c.type === ContractClauseType.SALES_COMMISSION);
      if (commClause) shareOfMyItems_Me = commClause.companyShare;

      const serviceClause = contract.clauses.find(c => c.type === ContractClauseType.SALES_SERVICE);
      if (serviceClause) shareOfPartnerItems_Me = serviceClause.companyShare;

      const expenseClause = contract.clauses.find(c => c.type === ContractClauseType.EXPENSE_SHARING);
      if (expenseClause) shareOfExpenses_Me = expenseClause.companyShare;
    }
  }

  let myItemsTotal = 0;
  let partnerItemsTotal = 0;

  if (sale.lines) {
    const founderEntityIds = new Set<string>(
      [
        await resolveSaleOwnerId(sale),
      ].filter(Boolean) as string[]
    );

    sale.lines.forEach(line => {
      // Determine if it's a Partner line from explicit partner/counterparty metadata
      const linePartnerId = (line.settlement as any)?.partnerId || (line.settlement as any)?.customerCharacterId;
      const isPartnerItem = !!(
        linePartnerId &&
        typeof linePartnerId === 'string' &&
        !founderEntityIds.has(linePartnerId)
      );
      
      let lineTotal = 0;
      if (line.kind === 'item') lineTotal = extractMoneyValue((line as ItemSaleLine).unitPrice) * ((line as ItemSaleLine).quantity || 0);
      else if (line.kind === 'service') lineTotal = extractMoneyValue((line as ServiceLine).revenue);

      if (isPartnerItem) partnerItemsTotal += lineTotal;
      else myItemsTotal += lineTotal;
    });
  }

  // Final Split Components
  const myBoothCost = boothCostUSD * shareOfExpenses_Me;
  const myCommFromPartner = partnerItemsTotal * shareOfPartnerItems_Me;
  const partnerCommFromMe = myItemsTotal * (1 - shareOfMyItems_Me);

  // Target Entity Resolution
  let targetEntityId = sale.partnerId || await resolveSaleCharacterId(sale);
  let targetEntityName = 'Partner';
  if (targetEntityId) {
    const { getBusinessById } = await import('@/data-store/repositories/character.repo');
    const business = await getBusinessById(targetEntityId);
    if (business) {
      targetEntityName = business.name;
      const businessLinks = await getLinksFor({ type: EntityType.BUSINESS, id: business.id });
      const ownerLink = businessLinks.find((link) =>
        link.linkType === LinkType.CHARACTER_BUSINESS &&
        link.source.type === EntityType.CHARACTER &&
        link.target.type === EntityType.BUSINESS &&
        link.target.id === business.id
      );
      if (ownerLink) targetEntityId = ownerLink.source.id;
    } else {
      const character = await getCharacterById(targetEntityId);
      if (character) targetEntityName = character.name;
    }
  }

  return {
    myGross: myItemsTotal,
    myBoothCost,
    myCommFromPartner,
    partnerCommFromMe,
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
  /** e.g. Direct Sale • Jungle Matt • 10-11-25 (matches sale list; no customer in title). */
  finrecName: string;
}> {
  const currentDate = getUTCNow();
  const dateToUse = coerceSaleFinrecDate(sale, currentDate);
  const salesChannel =
    getSalesChannelFromSaleType(String(sale.type)) ||
    (SalesStation.DIRECT_SALES as Station);
  const station = salesChannel;

  const { customerLabel, siteLabel } = await resolveSaleCustomerAndSiteLabels(sale);
  const finrecName = composeSaleSourcedFinrecName(sale, siteLabel, dateToUse);

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
  const now = getUTCNow();
  const totalRevenue = extractMoneyValue(sale.totals?.totalRevenue);
  const cost = extractMoneyValue(sale.totals?.totalCost);
  const netCashflow = totalRevenue - cost;
  const saleCharacterId = await resolveSaleCharacterId(sale);
  const saleSiteId = await resolveSaleSiteId(sale);
  const next = withFinancialRelations({
    ...existing,
    name: derived.finrecName,
    description: derived.description,
    year: derived.year,
    month: derived.month,
    station: derived.station,
    type: derived.financialType,
    salesChannel: derived.salesChannel,
    cost: toMoney(cost, 'USD'),
    revenue: toMoney(totalRevenue, 'USD'),
    netCashflow: toMoney(netCashflow, 'USD'),
    
    lifecycle: { ...(existing.lifecycle || {}), doneAt: derived.dateToUse },
    updatedAt: now,
  }, {
    siteId: saleSiteId,
    sourceSaleId: sale.id,
    characterId: saleCharacterId,
    characterRelationship: saleCharacterId ? CharacterRole.CUSTOMER : null,
  });

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
        { type: EntityType.FINANCIAL, id: saved.id },
        'sale-record'
      )
    );
  }

  return saved;
}

async function resolveSaleSiteId(sale: Sale): Promise<string | undefined> {
  const links = await getLinksFor({ type: EntityType.SALE, id: sale.id });
  return links.find(l => l.linkType === LinkType.SALE_SITE && l.target.type === EntityType.SITE)?.target.id ?? sale.siteId;
}

/**
 * Sale-created FinancialRecords are revenue/settlement records. Their Item
 * relationship is already represented by SALE_ITEM, so remove any legacy
 * FINREC_ITEM links instead of recreating them with purchase semantics.
 */
async function removeSaleFinrecItemLinks(finrecId: string): Promise<void> {
  const links = await getLinksFor({ type: EntityType.FINANCIAL, id: finrecId });
  for (const link of links) {
    if (
      link.linkType === LinkType.FINREC_ITEM &&
      link.source.type === EntityType.FINANCIAL &&
      link.source.id === finrecId &&
      link.target.type === EntityType.ITEM
    ) {
      await removeLink(link.id);
    }
  }
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
      await removeSaleFinrecItemLinks(saved.id);
      console.log(`[createFinancialRecordFromSale] ✅ Deduped and updated finrec: ${saved.name}`);
      return saved;
    }

    if (nonPayout.length === 1) {
      const saved = await upsertPrimarySaleFinrecFromSale(sale, nonPayout[0]!, derived);
      await removeSaleFinrecItemLinks(saved.id);
      console.log(`[createFinancialRecordFromSale] ✅ Updated existing finrec: ${saved.name}`);
      return saved;
    }

    const canonicalId = `finrec-${sale.id}`;
    const initialRevenue = extractMoneyValue(sale.totals?.totalRevenue);
    const cost = extractMoneyValue(sale.totals?.totalCost);
    const netCashflow = initialRevenue - cost;
    const saleCounterpartyId = await resolveSaleCharacterId(sale);
    const newFinrec = withFinancialRelations({
      id: canonicalId,
      name: derived.finrecName,
      description: derived.description,
      year: derived.year,
      month: derived.month,
      station: derived.station,
      type: derived.financialType,
      salesChannel: derived.salesChannel,
      cost: toMoney(cost, 'USD'),
      revenue: toMoney(initialRevenue, 'USD'),
      netCashflow: toMoney(netCashflow, 'USD'),
      
      lifecycle: { doneAt: derived.dateToUse },
      createdAt: getUTCNow(),
      updatedAt: getUTCNow(),
    }, {
      siteId: await resolveSaleSiteId(sale),
      sourceSaleId: sale.id,
      characterId: saleCounterpartyId,
      characterRelationship: saleCounterpartyId ? CharacterRole.CUSTOMER : null,
    });

    console.log(`[createFinancialRecordFromSale] Creating finrec:`, newFinrec);
    const createdFinrec = await upsertFinancial(newFinrec, { forceSave: true });

    await createLink(
      makeLink(
        LinkType.SALE_FINREC,
        { type: EntityType.SALE, id: sale.id },
        { type: EntityType.FINANCIAL, id: createdFinrec.id },
        'sale-record'
      )
    );

    await removeSaleFinrecItemLinks(createdFinrec.id);

    console.log(`[createFinancialRecordFromSale] ✅ Created finrec and SALE_FINREC: ${createdFinrec.name}`);
    return createdFinrec;
  } catch (error) {
    console.error(`[createFinancialRecordFromSale] ❌ Failed for sale ${sale.id}:`, error);
    throw error;
  }
}

/**
 * Calculate the partner's share of a sale (legacy wrappers kept for compatibility).
 */
export async function calculatePartnerPayout(sale: Sale): Promise<number> {
  const split = await calculateBoothFinancials(sale);
  
  // Sale totals are canonical Money, not raw numbers.
  const totalRevenue = extractMoneyValue(sale.totals?.totalRevenue);
  // Partner Gross = What was sold as partner items (cash Akiles is holding)
  const partnerGross = totalRevenue - split.myGross;
  
  // Total Payout = (Partner Income from Me) - (My Income from Partner) + (Partner Gross Sales we are holding)
  const payout = split.partnerCommFromMe - split.myCommFromPartner + partnerGross;
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
    const derived = await resolveSaleDerivedFinrecFields(sale);
    const boothTitleBase = composeSaleSourcedFinrecName(sale, derived.siteLabel, split.date);
    const partnerPayoutRecordName = `${boothTitleBase} • partner`;
    const payoutCounterpartyId = split.targetEntityId || null;

    // [IDEMPOTENCY CHECK] Load existing records linked to this sale
    const existingRecords = await getFinancialsBySourceSaleId(sale.id);
    const saleCounterpartyId = await resolveSaleCharacterId(sale);

    const cleanupPayoutCharacterLinks = async (
      financialRecordId: string,
      keepCharacterId: string | null
    ): Promise<void> => {
      const finrecLinks = await getLinksFor({ type: EntityType.FINANCIAL, id: financialRecordId });
      for (const link of finrecLinks) {
        if (![LinkType.FINREC_CHARACTER, LinkType.CHARACTER_FINREC].includes(link.linkType)) continue;

        const linkedCharacterId =
          link.source.type === EntityType.FINANCIAL && link.source.id === financialRecordId && link.target.type === EntityType.CHARACTER
            ? link.target.id
            : link.source.type === EntityType.CHARACTER && link.target.type === EntityType.FINANCIAL && link.target.id === financialRecordId
              ? link.source.id
              : null;

        if (linkedCharacterId && linkedCharacterId !== keepCharacterId) {
          await removeLink(link.id);
        }
      }
    };

    // =========================================================================
    // RECORD 1: Akiles Core Business Performance
    // =========================================================================
    const incomeRecordId = `finrec-${sale.id}`;
    const incomeRecord = existingRecords.find(r => r.id === incomeRecordId) || 
                         existingRecords.find(r => r.id.startsWith('finrec-') && !r.id.includes('payout'));

    const incomeData = withFinancialRelations({
      ...(incomeRecord || {}),
      id: incomeRecordId,
      name: boothTitleBase,
      description: `Performance Ledger: My items and booth cost share`,
      year: split.date.getFullYear(),
      month: split.date.getMonth() + 1,
      station: derived.station,
      type: derived.financialType,
      salesChannel: derived.salesChannel,
      // Booth split arithmetic is performed in USD numbers; persist the
      // FinancialRecord through the canonical Money boundary.
      revenue: toMoney(split.myGross, 'USD'),
      cost: toMoney(split.myBoothCost, 'USD'),
      netCashflow: toMoney(split.myGross - split.myBoothCost, 'USD'),
      status: ((sale.status === SaleStatus.CHARGED || sale.status === SaleStatus.CHARGED || sale.status === SaleStatus.COLLECTED) ) ? FinancialStatus.DONE : FinancialStatus.PENDING,
      lifecycle: { doneAt: split.date },
      updatedAt: getUTCNow(),
      createdAt: incomeRecord?.createdAt || getUTCNow(),
    }, {
      siteId: sale.siteId,
      sourceSaleId: sale.id,
      characterId: saleCounterpartyId,
      characterRelationship: saleCounterpartyId ? CharacterRole.CUSTOMER : null,
    });

    await upsertFinancial(incomeData, { forceSave: true });
    console.log(`[createFinancialRecordFromBoothSale] ✅ Synced Record 1 (${incomeRecordId}): Net=${incomeData.netCashflow}`);

    // Verify/Create SALE_FINREC Link
    const saleLinks = await getLinksFor({ type: EntityType.SALE, id: sale.id });
    const hasIncomeLink = saleLinks.some(l => l.linkType === LinkType.SALE_FINREC && l.target.id === incomeRecordId);
    if (!hasIncomeLink) {
      const link = makeLink(LinkType.SALE_FINREC, { type: EntityType.SALE, id: sale.id }, { type: EntityType.FINANCIAL, id: incomeRecordId }, 'sale-record');
      await createLink(link);
    }

    // =========================================================================
    // RECORD 2: Contract Impact (Partner Impact)
    // =========================================================================
    const hasContractImpact = split.myCommFromPartner > 0 || split.partnerCommFromMe > 0;
    const payoutRecordId = `finrec-payout-${sale.id}`;
    const payoutRecord = existingRecords.find(r => r.id === payoutRecordId) || 
                         existingRecords.find(r => r.id.includes('payout'));

    if (hasContractImpact) {
      await cleanupPayoutCharacterLinks(payoutRecordId, payoutCounterpartyId);

      const payoutData = withFinancialRelations({
        ...(payoutRecord || {}),
        id: payoutRecordId,
        name: partnerPayoutRecordName,
        description: `Impact Ledger: Commission split with partner`,
        year: split.date.getFullYear(),
        month: split.date.getMonth() + 1,
        station: SalesStation.BOOTH_SALES as Station,
        type: 'company',
        salesChannel: SalesStation.BOOTH_SALES as Station,
        revenue: toMoney(split.myCommFromPartner, 'USD'),
        cost: toMoney(split.partnerCommFromMe, 'USD'),
        netCashflow: toMoney(split.myCommFromPartner - split.partnerCommFromMe, 'USD'),
        status: ((sale.status === SaleStatus.CHARGED || sale.status === SaleStatus.CHARGED || sale.status === SaleStatus.COLLECTED) ) ? FinancialStatus.DONE : FinancialStatus.PENDING,
        lifecycle: { doneAt: split.date },
        updatedAt: getUTCNow(),
        createdAt: payoutRecord?.createdAt || getUTCNow(),
      }, {
        siteId: sale.siteId,
        sourceSaleId: sale.id,
        characterId: payoutCounterpartyId,
        characterRelationship: payoutCounterpartyId ? CharacterRole.BENEFICIARY : null,
      });

      await upsertFinancial(payoutData, { forceSave: true });
      console.log(`[createFinancialRecordFromBoothSale] ✅ Synced Record 2 (${payoutRecordId}): Net=${payoutData.netCashflow}`);

      // Verify/Create SALE_FINREC Link
      const hasPayoutSaleLink = saleLinks.some(l => l.linkType === LinkType.SALE_FINREC && l.target.id === payoutRecordId);
      if (!hasPayoutSaleLink) {
        const saleLink = makeLink(LinkType.SALE_FINREC, { type: EntityType.SALE, id: sale.id }, { type: EntityType.FINANCIAL, id: payoutRecordId }, 'sale-record');
        await createLink(saleLink);
      }

      // Verify/Create FINREC_CHARACTER Link
      if (payoutCounterpartyId) {
        const finrecLinks = await getLinksFor({ type: EntityType.FINANCIAL, id: payoutRecordId });
        const hasCharLink = finrecLinks.some(
          l =>
            l.linkType === LinkType.FINREC_CHARACTER &&
            ((l.source.type === EntityType.FINANCIAL && l.source.id === payoutRecordId && l.target.type === EntityType.CHARACTER && l.target.id === payoutCounterpartyId) ||
             (l.target.type === EntityType.FINANCIAL && l.target.id === payoutRecordId && l.source.type === EntityType.CHARACTER && l.source.id === payoutCounterpartyId))
        );
        if (!hasCharLink) {
          const charLink = makeLink(LinkType.FINREC_CHARACTER, { type: EntityType.FINANCIAL, id: payoutRecordId }, { type: EntityType.CHARACTER, id: payoutCounterpartyId }, 'beneficiary');
          await createLink(charLink);
        }
      }
    } else if (payoutRecord) {
      // If was there but no longer has impact, zero it
      await cleanupPayoutCharacterLinks(payoutRecordId, null);

      const zeroedPayout = withFinancialRelations({
        ...payoutRecord, 
        name: partnerPayoutRecordName,
        description: 'No contract impact for this revision',
        revenue: 0, 
        cost: 0, 
        netCashflow: 0, 
        status: FinancialStatus.DONE,
        lifecycle: { ...(payoutRecord.lifecycle || {}) },
        updatedAt: getUTCNow() 
      }, {
        characterId: null,
        characterRelationship: null,
      });
      await upsertFinancial(zeroedPayout);
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

    const currentDate = getUTCNow();
    const rewardsStation = BUSINESS_STRUCTURE.personal.find((s) => s === 'rewards');
    if (!rewardsStation) throw new Error('rewards station not found in BUSINESS_STRUCTURE');
    const station = rewardsStation as Station;

    const newFinrec: FinancialRecord = {
      id: `finrec-exchange-${playerId}-${Date.now()}`,
      name: `Points Exchange: ${pointsExchanged.xp + pointsExchanged.rp + pointsExchanged.fp + pointsExchanged.hp} points`,
      description: `Points exchanged for J$: XP=${pointsExchanged.xp}, RP=${pointsExchanged.rp}, FP=${pointsExchanged.fp}, HP=${pointsExchanged.hp} → ${j$Received} J$`,
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
      station: station,
      type: 'personal', // Personal financial record
      cost: toMoney(0), // No cost, just points exchange
      revenue: toMoney(0), // No revenue, just currency exchange
      context: {
        jungleCoins: j$Received,
        exchangeType: 'POINTS_TO_J$',
        exchangeCounterAmount: j$Received,
      },
      netCashflow: toMoney(0), // No cashflow, just currency exchange
      status: FinancialStatus.DONE,
      createdAt: getUTCNow(),
      updatedAt: getUTCNow(),
    } as FinancialRecord;

    // Store the financial record
    const createdFinrec = await upsertFinancial(newFinrec);

    const link = makeLink(
      LinkType.PLAYER_FINREC,
      { type: EntityType.PLAYER, id: playerId },
      { type: EntityType.FINANCIAL, id: createdFinrec.id },
      'cash-out'
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
  j$Rate: number,
  cashOutType: 'USD' | 'ZAPS' = 'USD',
  zapsRate?: number // Optional: J$ to Zaps rate (sats per J$). If not provided, calculated from Bitcoin price
): Promise<{ personalRecord: FinancialRecord; companyRecord: FinancialRecord }> {
  try {
    if (!Number.isFinite(j$Rate) || j$Rate <= 0) {
      throw new Error('J$ conversion rate is not configured. Set it before cashing out.');
    }
    console.log(`[createFinancialRecordFromJ$CashOut] Creating financial records for cash-out: ${j$Sold} J$ for ${cashOutType}`);

    // Determine company station (always Team for buybacks now that Founder is removed as a station)
    const teamStation = BUSINESS_STRUCTURE.admin.find((s) => s === 'team');
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

        const j$ValueInUSD = j$Rate;

        // Calculate sats per J$: (j$ValueInUSD / bitcoinPrice) * satsPerBTC
        calculatedZapsRate = (j$ValueInUSD / bitcoinPrice) * BITCOIN_SATOSHIS_PER_BTC;
        console.log(`[createFinancialRecordFromJ$CashOut] Calculated Zaps rate: ${calculatedZapsRate.toFixed(0)} sats per J$ (Bitcoin price: $${bitcoinPrice})`);
      } else {
        calculatedZapsRate = zapsRate;
      }
      amountPaid = j$Sold * calculatedZapsRate; // Zaps amount (sats)
      amountLabel = `${amountPaid.toFixed(0)} sats`;
    }

    const currentDate = getUTCNow();
    const exchangeType = cashOutType === 'USD' ? 'J$_TO_USD' : 'J$_TO_ZAPS';

    const personalRewardsStation = BUSINESS_STRUCTURE.personal.find((s) => s === 'rewards');
    if (!personalRewardsStation) throw new Error('rewards station not found in BUSINESS_STRUCTURE');
    const personalStation = personalRewardsStation as Station;

    // Create personal FinancialRecord (J$ deduction)
    const personalFinrec: FinancialRecord = {
      id: `finrec-cashout-personal-${playerId}-${Date.now()}`,
      name: `J$ Cash-Out: ${j$Sold} J$ → ${cashOutType}`,
      description: `J$ cashed out for ${cashOutType}: ${j$Sold} J$ → ${amountLabel}`,
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
      station: personalStation,
      type: 'personal',
      cost: toMoney(0),
      revenue: toMoney(0),
      context: {
        jungleCoins: -j$Sold,
        exchangeType,
        exchangeCounterAmount: cashOutType === 'ZAPS' ? amountPaid : undefined,
      },
      netCashflow: toMoney(0),
      createdAt: getUTCNow(),
      updatedAt: getUTCNow(),
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
      cost: toMoney(cashOutType === 'USD' ? amountPaid : 0), // USD cost for USD cash-out, 0 for Zaps (Zaps tracked separately)
      revenue: toMoney(0),
      context: {
        jungleCoins: j$Sold,
        exchangeType,
        exchangeCounterAmount: cashOutType === 'ZAPS' ? amountPaid : undefined,
      },
      netCashflow: toMoney(cashOutType === 'USD' ? -amountPaid : 0),
      createdAt: getUTCNow(),
      updatedAt: getUTCNow(),
    };

    // Store records
    await upsertFinancial(personalFinrec);
    await upsertFinancial(companyFinrec);

    console.log(`[createFinancialRecordFromJ$CashOut] ✅ Financial records created: Personal=${personalFinrec.id}, Company=${companyFinrec.id}`);

    const pLink = makeLink(
      LinkType.PLAYER_FINREC,
      { type: EntityType.PLAYER, id: playerId },
      { type: EntityType.FINANCIAL, id: personalFinrec.id },
      'cash-out'
    );
    await createLink(pLink);

    const cLink = makeLink(
      LinkType.PLAYER_FINREC,
      { type: EntityType.PLAYER, id: playerId },
      { type: EntityType.FINANCIAL, id: companyFinrec.id },
      'cash-out'
    );
    await createLink(cLink);

    if (playerCharacterId) {
      const charLink = makeLink(
        LinkType.FINREC_CHARACTER,
        { type: EntityType.FINANCIAL, id: companyFinrec.id },
        { type: EntityType.CHARACTER, id: playerCharacterId },
        'beneficiary'
      );
      await createLink(charLink);
    }

    return { personalRecord: personalFinrec, companyRecord: companyFinrec };

  } catch (error) {
    console.error(`[createFinancialRecordFromJ$CashOut] ❌ Failed to create financial records for cash-out:`, error);
    throw error;
  }
}
