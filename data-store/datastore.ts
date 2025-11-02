// data-store/datastore.ts
// Orchestration layer: repositories → workflows → links → logging

import type { Task, Item, FinancialRecord, Sale, Character, Player, Site, Settlement, Account } from '@/types/entities';
import { EntityType } from '@/types/enums';
import { 
  upsertTask as repoUpsertTask,
  getAllTasks as repoGetAllTasks,
  getTaskById as repoGetTaskById,
  deleteTask as repoDeleteTask
} from './repositories/task.repo';
import { 
  upsertItem as repoUpsertItem,
  getAllItems as repoGetAllItems,
  getItemById as repoGetItemById,
  deleteItem as repoDeleteItem,
  getItemsBySourceTaskId as repoGetItemsBySourceTaskId,
  getItemsBySourceRecordId as repoGetItemsBySourceRecordId
} from './repositories/item.repo';
import { 
  upsertFinancial as repoUpsertFinancial,
  getAllFinancials as repoGetAllFinancials,
  getFinancialById as repoGetFinancialById,
  deleteFinancial as repoDeleteFinancial,
  getFinancialsBySourceTaskId as repoGetFinancialsBySourceTaskId
} from './repositories/financial.repo';
import { 
  upsertSale as repoUpsertSale,
  getAllSales as repoGetAllSales,
  getSaleById as repoGetSaleById,
  deleteSale as repoDeleteSale
} from './repositories/sale.repo';
import { 
  upsertCharacter as repoUpsertCharacter,
  getAllCharacters as repoGetAllCharacters,
  getCharacterById as repoGetCharacterById,
  deleteCharacter as repoDeleteCharacter
} from './repositories/character.repo';
import { 
  upsertPlayer as repoUpsertPlayer,
  getAllPlayers as repoGetAllPlayers,
  getPlayerById as repoGetPlayerById,
  deletePlayer as repoDeletePlayer
} from './repositories/player.repo';
import { 
  upsertAccount as repoUpsertAccount,
  getAllAccounts as repoGetAllAccounts,
  getAccountById as repoGetAccountById,
  deleteAccount as repoDeleteAccount
} from './repositories/account.repo';
import { 
  upsertSite as repoUpsertSite,
  getAllSites as repoGetAllSites,
  getSiteById as repoGetSiteById,
  deleteSite as repoDeleteSite,
  getAllSettlements as repoGetAllSettlements,
  getSettlementById as repoGetSettlementById,
  upsertSettlement as repoUpsertSettlement,
  removeSettlement as repoRemoveSettlement,
  getSitesBySettlement as repoGetSitesBySettlement,
  getSitesByRadius as repoGetSitesByRadius
} from './repositories/site.repo';
import { kvGet, kvSet } from './kv';
// Import workflow functions dynamically to break circular dependency
import { processLinkEntity } from '@/links/links-workflows';
import { appendEntityLog } from '@/workflows/entities-logging';

// TASKS
export async function upsertTask(task: Task, options?: { skipWorkflowEffects?: boolean; skipLinkEffects?: boolean }): Promise<Task> {
  const previous = await repoGetTaskById(task.id);
  const saved = await repoUpsertTask(task);
  
  if (!options?.skipWorkflowEffects) {
    const { onTaskUpsert } = await import('@/workflows/entities-workflows/task.workflow');
    await onTaskUpsert(saved, previous || undefined);
  }
  
  if (!options?.skipLinkEffects) {
    await processLinkEntity(saved, EntityType.TASK);
  }
  
  return saved;
}

export async function getAllTasks(): Promise<Task[]> {
  return await repoGetAllTasks();
}

export async function getTaskById(id: string): Promise<Task | null> {
  return await repoGetTaskById(id);
}

export async function removeTask(id: string): Promise<void> {
  const existing = await repoGetTaskById(id);
  await repoDeleteTask(id);
  if (existing) {
    // Call task deletion workflow for cleanup - pass the task object since it's already deleted from DB
    const { removeTaskLogEntriesOnDelete } = await import('@/workflows/entities-workflows/task.workflow');
    await removeTaskLogEntriesOnDelete(existing);
  }
}

// ITEMS
// NOTE: Item is saved to KV BEFORE workflows run. This means:
// - If workflows fail, the item still exists in the database
// - This prevents data loss but may cause 500 errors if workflows throw
// - API routes MUST have try/catch to handle workflow failures gracefully
export async function upsertItem(item: Item, options?: { skipWorkflowEffects?: boolean; skipLinkEffects?: boolean }): Promise<Item> {
  const previous = await repoGetItemById(item.id);
  const saved = await repoUpsertItem(item);  // ✅ Item persisted here
  
  if (!options?.skipWorkflowEffects) {
    const { onItemUpsert } = await import('@/workflows/entities-workflows/item.workflow');
    await onItemUpsert(saved, previous || undefined);  // ⚠️ Can throw
  }
  
  if (!options?.skipLinkEffects) {
    await processLinkEntity(saved, EntityType.ITEM);   // ⚠️ Can throw
  }
  
  return saved;
}

export async function getAllItems(): Promise<Item[]> {
  return await repoGetAllItems();
}

export async function getItemById(id: string): Promise<Item | null> {
  return await repoGetItemById(id);
}

// OPTIMIZED: Indexed queries - only load items created by specific tasks/records
export async function getItemsBySourceTaskId(taskId: string): Promise<Item[]> {
  return await repoGetItemsBySourceTaskId(taskId);
}

export async function getItemsBySourceRecordId(recordId: string): Promise<Item[]> {
  return await repoGetItemsBySourceRecordId(recordId);
}

export async function removeItem(id: string): Promise<void> {
  const existing = await repoGetItemById(id);
  await repoDeleteItem(id);
  if (existing) {
    // Call item deletion workflow for cleanup
    const { removeItemEffectsOnDelete } = await import('@/workflows/entities-workflows/item.workflow');
    await removeItemEffectsOnDelete(id);
  }
}

// FINANCIALS
export async function upsertFinancial(financial: FinancialRecord, options?: { skipWorkflowEffects?: boolean; skipLinkEffects?: boolean }): Promise<FinancialRecord> {
  const previous = await repoGetFinancialById(financial.id);
  const saved = await repoUpsertFinancial(financial);
  
  if (!options?.skipWorkflowEffects) {
    const { onFinancialUpsert } = await import('@/workflows/entities-workflows/financial.workflow');
    await onFinancialUpsert(saved, previous || undefined);
  }
  
  if (!options?.skipLinkEffects) {
    await processLinkEntity(saved, EntityType.FINANCIAL);
  }
  
  return saved;
}

export async function getAllFinancials(): Promise<FinancialRecord[]> {
  return await repoGetAllFinancials();
}

export async function getFinancialById(id: string): Promise<FinancialRecord | null> {
  return await repoGetFinancialById(id);
}

// OPTIMIZED: Indexed queries - only load financials created by specific tasks
export async function getFinancialsBySourceTaskId(taskId: string): Promise<FinancialRecord[]> {
  return await repoGetFinancialsBySourceTaskId(taskId);
}

export async function removeFinancial(id: string): Promise<void> {
  const existing = await repoGetFinancialById(id);
  await repoDeleteFinancial(id);
  if (existing) {
    // Call financial deletion workflow for cleanup
    const { removeRecordEffectsOnDelete } = await import('@/workflows/entities-workflows/financial.workflow');
    await removeRecordEffectsOnDelete(id);
  }
}

// SALES
export async function upsertSale(sale: Sale, options?: { skipWorkflowEffects?: boolean; skipLinkEffects?: boolean }): Promise<Sale> {
  const previous = await repoGetSaleById(sale.id);
  const saved = await repoUpsertSale(sale);
  
  if (!options?.skipWorkflowEffects) {
    const { onSaleUpsert } = await import('@/workflows/entities-workflows/sale.workflow');
    await onSaleUpsert(saved, previous || undefined);
  }
  
  if (!options?.skipLinkEffects) {
    await processLinkEntity(saved, EntityType.SALE);
  }
  
  return saved;
}

export async function getAllSales(): Promise<Sale[]> {
  return await repoGetAllSales();
}

export async function getSaleById(id: string): Promise<Sale | null> {
  return await repoGetSaleById(id);
}

export async function removeSale(id: string): Promise<void> {
  const existing = await repoGetSaleById(id);
  await repoDeleteSale(id);
  if (existing) {
    // Call sale deletion workflow for cleanup
    const { removeSaleEffectsOnDelete } = await import('@/workflows/entities-workflows/sale.workflow');
    await removeSaleEffectsOnDelete(id);
  }
}

// CHARACTERS
export async function upsertCharacter(character: Character, options?: { skipWorkflowEffects?: boolean; skipLinkEffects?: boolean }): Promise<Character> {
  const previous = await repoGetCharacterById(character.id);
  const saved = await repoUpsertCharacter(character);
  
  if (!options?.skipWorkflowEffects) {
    const { onCharacterUpsert } = await import('@/workflows/entities-workflows/character.workflow');
    await onCharacterUpsert(saved, previous || undefined);
  }
  
  if (!options?.skipLinkEffects) {
    await processLinkEntity(saved, EntityType.CHARACTER);
  }
  
  return saved;
}

export async function getAllCharacters(): Promise<Character[]> {
  return await repoGetAllCharacters();
}

export async function getCharacterById(id: string): Promise<Character | null> {
  return await repoGetCharacterById(id);
}

export async function removeCharacter(id: string): Promise<void> {
  const existing = await repoGetCharacterById(id);
  await repoDeleteCharacter(id);
  if (existing) {
    // Call character deletion workflow for cleanup
    const { removeCharacterEffectsOnDelete } = await import('@/workflows/entities-workflows/character.workflow');
    await removeCharacterEffectsOnDelete(id);
  }
}

// PLAYERS
export async function upsertPlayer(player: Player, options?: { skipWorkflowEffects?: boolean; skipLinkEffects?: boolean }): Promise<Player> {
  const previous = await repoGetPlayerById(player.id);
  const saved = await repoUpsertPlayer(player);
  
  if (!options?.skipWorkflowEffects) {
    const { onPlayerUpsert } = await import('@/workflows/entities-workflows/player.workflow');
    await onPlayerUpsert(saved, previous || undefined);
  }
  
  if (!options?.skipLinkEffects) {
    await processLinkEntity(saved, EntityType.PLAYER);
  }
  
  return saved;
}

export async function getAllPlayers(): Promise<Player[]> {
  return await repoGetAllPlayers();
}

export async function getPlayerById(id: string): Promise<Player | null> {
  return await repoGetPlayerById(id);
}

export async function removePlayer(id: string): Promise<void> {
  const existing = await repoGetPlayerById(id);
  await repoDeletePlayer(id);
  if (existing) {
    // Call player deletion workflow for cleanup
    const { removePlayerEffectsOnDelete } = await import('@/workflows/entities-workflows/player.workflow');
    await removePlayerEffectsOnDelete(id);
  }
}

// ACCOUNTS
export async function upsertAccount(account: Account, options?: { skipWorkflowEffects?: boolean; skipLinkEffects?: boolean }): Promise<Account> {
  const previous = await repoGetAccountById(account.id);
  const saved = await repoUpsertAccount(account);
  
  if (!options?.skipWorkflowEffects) {
    const { onAccountUpsert } = await import('@/workflows/entities-workflows/account.workflow');
    await onAccountUpsert(saved, previous || undefined);
  }
  
  if (!options?.skipLinkEffects) {
    await processLinkEntity(saved, EntityType.ACCOUNT);
  }
  
  return saved;
}

export async function getAllAccounts(): Promise<Account[]> {
  return await repoGetAllAccounts();
}

export async function getAccountById(id: string): Promise<Account | null> {
  return await repoGetAccountById(id);
}

export async function removeAccount(id: string): Promise<void> {
  const existing = await repoGetAccountById(id);
  await repoDeleteAccount(id);
  if (existing) {
    // Call account deletion workflow for cleanup
    const { removeAccountEffectsOnDelete } = await import('@/workflows/entities-workflows/account.workflow');
    await removeAccountEffectsOnDelete(id);
  }
}

// SITES
export async function upsertSite(site: Site, options?: { skipWorkflowEffects?: boolean }): Promise<Site> {
  const previous = await repoGetSiteById(site.id);
  const saved = await repoUpsertSite(site);
  
  if (!options?.skipWorkflowEffects) {
    const { onSiteUpsert } = await import('@/workflows/entities-workflows/site.workflow');
    await onSiteUpsert(saved, previous || undefined);
  }
  
  // NOTE: Sites don't create links when saved - they're link targets only
  // SITE_SITE links are created explicitly by movement operations (workflows/site-movement-utils.ts)
  return saved;
}

export async function getAllSites(): Promise<Site[]> {
  return await repoGetAllSites();
}

export async function getSiteById(id: string): Promise<Site | null> {
  return await repoGetSiteById(id);
}

export async function removeSite(id: string): Promise<void> {
  const existing = await repoGetSiteById(id);
  await repoDeleteSite(id);
  if (existing) {
    // Call site deletion workflow for cleanup
    const { removeSiteEffectsOnDelete } = await import('@/workflows/entities-workflows/site.workflow');
    await removeSiteEffectsOnDelete(id);
  }
}

// ============================================================================
// SETTLEMENT METHODS (Reference data for Sites)
// ============================================================================

export async function getAllSettlements(): Promise<Settlement[]> {
  return await repoGetAllSettlements();
}

export async function getSettlementById(id: string): Promise<Settlement | null> {
  return await repoGetSettlementById(id);
}

export async function upsertSettlement(settlement: Settlement): Promise<Settlement> {
  return await repoUpsertSettlement(settlement);
}

export async function removeSettlement(id: string): Promise<void> {
  await repoRemoveSettlement(id);
}

// ============================================================================
// SITE QUERY METHODS
// ============================================================================

export async function getSitesBySettlement(settlementId: string): Promise<Site[]> {
  return await repoGetSitesBySettlement(settlementId);
}

export async function getSitesByRadius(
  centerLat: number,
  centerLng: number,
  radiusMeters: number
): Promise<Site[]> {
  return await repoGetSitesByRadius(centerLat, centerLng, radiusMeters);
}

// PLAYER CONVERSION RATES
export async function getPlayerConversionRates(): Promise<any> {
  const rates = await kvGet('data:player-conversion-rates');
  return rates || {
    // Points conversion rates (in enum order: XP, RP, FP, HP)
    xpToJ$: 3,
    rpToJ$: 12,
    fpToJ$: 15,
    hpToJ$: 10,
    j$ToUSD: 10
  };
}

export async function savePlayerConversionRates(rates: any): Promise<void> {
  await kvSet('data:player-conversion-rates', rates);
}

// COMPANY ASSETS
export async function getCompanyAssets(): Promise<any> {
  const assets = await kvGet('data:company-assets');
  return assets || {
    cash: 0,
    bank: 0,
    bitcoin: 0,
    toCharge: 0,
    toPay: 0,
    companyJ$: 0,
    cashColones: 0,
    bankColones: 0,
    toChargeColones: 0,
    toPayColones: 0,
    bitcoinSats: 0,
    materials: { value: 0, cost: 0 },
    equipment: { value: 0, cost: 0 },
    artworks: { value: 0, cost: 0 },
    prints: { value: 0, cost: 0 },
    stickers: { value: 0, cost: 0 },
    merch: { value: 0, cost: 0 }
  };
}

export async function saveCompanyAssets(assets: any): Promise<void> {
  await kvSet('data:company-assets', assets);
}

// PERSONAL ASSETS
export async function getPersonalAssets(): Promise<any> {
  const assets = await kvGet('data:personal-assets');
  return assets || {
    cash: 0,
    bank: 0,
    bitcoin: 0,
    crypto: 0,
    toCharge: 0,
    toPay: 0,
    personalJ$: 0,
    cashColones: 0,
    bankColones: 0,
    toChargeColones: 0,
    toPayColones: 0,
    bitcoinSats: 0,
    vehicle: 0,
    properties: 0,
    nfts: 0,
    other: 0
  };
}

export async function savePersonalAssets(assets: any): Promise<void> {
  await kvSet('data:personal-assets', assets);
}

// FINANCIAL CONVERSION RATES
export async function getFinancialConversionRates(): Promise<any> {
  const rates = await kvGet('data:financial-conversion-rates');
  return rates || {
    // Points conversion rates (in enum order: XP, RP, FP, HP)
    xpToJ$: 3,
    rpToJ$: 12,
    fpToJ$: 15,
    hpToJ$: 10,
    // Currency exchange rates
    j$ToUSD: 10,
    colonesToUsd: 500,
    bitcoinToUsd: 100000,
    jungleCoinsToUsd: 0.1
  };
}

export async function saveFinancialConversionRates(rates: any): Promise<void> {
  await kvSet('data:financial-conversion-rates', rates);
}