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
  deleteItem as repoDeleteItem
} from './repositories/item.repo';
import { 
  upsertFinancial as repoUpsertFinancial,
  getAllFinancials as repoGetAllFinancials,
  getFinancialById as repoGetFinancialById,
  deleteFinancial as repoDeleteFinancial
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
// Import workflow functions individually to avoid TypeScript issues
import { onTaskUpsert } from '@/workflows/entities-workflows/task.workflow';
import { onItemUpsert } from '@/workflows/entities-workflows/item.workflow';
import { onFinancialUpsert } from '@/workflows/entities-workflows/financial.workflow';
import { onSaleUpsert } from '@/workflows/entities-workflows/sale.workflow';
import { onCharacterUpsert } from '@/workflows/entities-workflows/character.workflow';
import { onPlayerUpsert } from '@/workflows/entities-workflows/player.workflow';
import { onAccountUpsert } from '@/workflows/entities-workflows/account.workflow';
import { onSiteUpsert } from '@/workflows/entities-workflows/site.workflow';
import { processLinkEntity } from '@/links/links-workflows';
import { appendEntityLog } from '@/workflows/entities-logging';

// TASKS
export async function upsertTask(task: Task): Promise<Task> {
  const previous = await repoGetTaskById(task.id);
  const saved = await repoUpsertTask(task);
  await onTaskUpsert(saved, previous || undefined);
  await processLinkEntity(saved, EntityType.TASK);
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
    // Call task deletion workflow for cleanup
    const { removeTaskLogEntriesOnDelete } = await import('@/workflows/entities-workflows/task.workflow');
    await removeTaskLogEntriesOnDelete(id);
  }
}

// ITEMS
// NOTE: Item is saved to KV BEFORE workflows run. This means:
// - If workflows fail, the item still exists in the database
// - This prevents data loss but may cause 500 errors if workflows throw
// - API routes MUST have try/catch to handle workflow failures gracefully
export async function upsertItem(item: Item): Promise<Item> {
  const previous = await repoGetItemById(item.id);
  const saved = await repoUpsertItem(item);  // ✅ Item persisted here
  await onItemUpsert(saved, previous || undefined);  // ⚠️ Can throw
  await processLinkEntity(saved, EntityType.ITEM);   // ⚠️ Can throw
  return saved;
}

export async function getAllItems(): Promise<Item[]> {
  return await repoGetAllItems();
}

export async function getItemById(id: string): Promise<Item | null> {
  return await repoGetItemById(id);
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
export async function upsertFinancial(financial: FinancialRecord): Promise<FinancialRecord> {
  const previous = await repoGetFinancialById(financial.id);
  const saved = await repoUpsertFinancial(financial);
  await onFinancialUpsert(saved, previous || undefined);
  await processLinkEntity(saved, EntityType.FINANCIAL);
  return saved;
}

export async function getAllFinancials(): Promise<FinancialRecord[]> {
  return await repoGetAllFinancials();
}

export async function getFinancialById(id: string): Promise<FinancialRecord | null> {
  return await repoGetFinancialById(id);
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
export async function upsertSale(sale: Sale): Promise<Sale> {
  const previous = await repoGetSaleById(sale.id);
  const saved = await repoUpsertSale(sale);
  await onSaleUpsert(saved, previous || undefined);
  await processLinkEntity(saved, EntityType.SALE);
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
export async function upsertCharacter(character: Character, options?: { skipWorkflowEffects?: boolean }): Promise<Character> {
  const previous = await repoGetCharacterById(character.id);
  const saved = await repoUpsertCharacter(character);
  
  if (!options?.skipWorkflowEffects) {
    await onCharacterUpsert(saved, previous || undefined);
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
export async function upsertPlayer(player: Player, options?: { skipWorkflowEffects?: boolean }): Promise<Player> {
  const previous = await repoGetPlayerById(player.id);
  const saved = await repoUpsertPlayer(player);
  
  if (!options?.skipWorkflowEffects) {
    await onPlayerUpsert(saved, previous || undefined);
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
export async function upsertAccount(account: Account, options?: { skipWorkflowEffects?: boolean }): Promise<Account> {
  const previous = await repoGetAccountById(account.id);
  const saved = await repoUpsertAccount(account);
  
  if (!options?.skipWorkflowEffects) {
    await onAccountUpsert(saved, previous || undefined);
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
export async function upsertSite(site: Site): Promise<Site> {
  const previous = await repoGetSiteById(site.id);
  const saved = await repoUpsertSite(site);
  await onSiteUpsert(saved, previous || undefined);
  await processLinkEntity(saved, EntityType.SITE);
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

// POINTS CONVERSION RATES
export async function getPointsConversionRates(): Promise<any> {
  const rates = await kvGet('data:points-conversion-rates');
  return rates || {
    hpToJ$: 10,
    fpToJ$: 15,
    rpToJ$: 12,
    xpToJ$: 3,
    j$ToUSD: 10
  };
}

export async function savePointsConversionRates(rates: any): Promise<void> {
  await kvSet('data:points-conversion-rates', rates);
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
    vehicle: 0,
    properties: 0,
    nfts: 0,
    other: 0
  };
}

export async function savePersonalAssets(assets: any): Promise<void> {
  await kvSet('data:personal-assets', assets);
}

// CONVERSION RATES
export async function getConversionRates(): Promise<any> {
  const rates = await kvGet('data:conversion-rates');
  return rates || {
    hpToJ$: 10,
    fpToJ$: 15,
    rpToJ$: 12,
    xpToJ$: 3,
    j$ToUSD: 10,
    colonesToUsd: 500,
    bitcoinToUsd: 50000,
    jungleCoinsToUsd: 0.1
  };
}

export async function saveConversionRates(rates: any): Promise<void> {
  await kvSet('data:conversion-rates', rates);
}