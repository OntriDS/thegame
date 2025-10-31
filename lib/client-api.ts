'use client';

/**
 * CLIENT API - Client-Side Data Access Layer
 * 
 * This file provides the proper client-side interface for accessing server-side data.
 * It follows the established KV-Only Architecture pattern:
 * 
 * Client: ClientAPI → API routes → DataStore → Repository (KV)
 * 
 * All client-side components should use this API instead of directly importing
 * from @/data-store/datastore, which is server-side only.
 */

import type { Task, Item, Sale, FinancialRecord, Character, Player, Site, Account, Settlement, AISession } from '@/types/entities';

export const ClientAPI = {
  // ============================================================================
  // TASKS - Task management operations
  // ============================================================================
  getTasks: async (): Promise<Task[]> => {
    const res = await fetch('/api/tasks');
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return await res.json();
  },
  
  getTaskById: async (id: string): Promise<Task | null> => {
    const res = await fetch(`/api/tasks/${id}`);
    if (!res.ok) return null;
    return await res.json();
  },
  
  upsertTask: async (task: Task): Promise<Task> => {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });
    if (!res.ok) throw new Error('Failed to save task');
    return await res.json();
  },
  
  deleteTask: async (id: string): Promise<void> => {
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete task');
  },

  // QUEUED OPERATIONS - Safety belt for real money operations
  // These operations go through a queue system for additional safety
  upsertTaskQueued: async (task: Task, priority: number = 1): Promise<string> => {
    const res = await fetch('/api/tasks/queued', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task, priority })
    });
    if (!res.ok) throw new Error('Failed to queue task');
    const result = await res.json();
    return result.queueId;
  },
  
  // ============================================================================
  // ITEMS - Item management operations
  // ============================================================================
  getItems: async (): Promise<Item[]> => {
    const res = await fetch('/api/items');
    if (!res.ok) throw new Error('Failed to fetch items');
    return await res.json();
  },
  
  getItemById: async (id: string): Promise<Item | null> => {
    const res = await fetch(`/api/items/${id}`);
    if (!res.ok) return null;
    return await res.json();
  },
  
  upsertItem: async (item: Item): Promise<Item> => {
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    if (!res.ok) throw new Error('Failed to save item');
    return await res.json();
  },
  
  deleteItem: async (id: string): Promise<void> => {
    const res = await fetch(`/api/items/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete item');
  },

  upsertItemQueued: async (item: Item, priority: number = 1): Promise<string> => {
    const res = await fetch('/api/items/queued', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item, priority })
    });
    if (!res.ok) throw new Error('Failed to queue item');
    const result = await res.json();
    return result.queueId;
  },
  
  // ============================================================================
  // SALES - Sales management operations
  // ============================================================================
  getSales: async (): Promise<Sale[]> => {
    const res = await fetch('/api/sales');
    if (!res.ok) throw new Error('Failed to fetch sales');
    return await res.json();
  },
  
  getSaleById: async (id: string): Promise<Sale | null> => {
    const res = await fetch(`/api/sales/${id}`);
    if (!res.ok) return null;
    return await res.json();
  },
  
  upsertSale: async (sale: Sale): Promise<Sale> => {
    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sale)
    });
    if (!res.ok) throw new Error('Failed to save sale');
    return await res.json();
  },
  
  deleteSale: async (id: string): Promise<void> => {
    const res = await fetch(`/api/sales/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete sale');
  },

  upsertSaleQueued: async (sale: Sale, priority: number = 1): Promise<string> => {
    const res = await fetch('/api/sales/queued', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sale, priority })
    });
    if (!res.ok) throw new Error('Failed to queue sale');
    const result = await res.json();
    return result.queueId;
  },
  
  // ============================================================================
  // FINANCIALS - Financial records management operations
  // ============================================================================
  getFinancialRecords: async (): Promise<FinancialRecord[]> => {
    const res = await fetch('/api/financials');
    if (!res.ok) throw new Error('Failed to fetch financials');
    return await res.json();
  },
  
  getFinancialRecordById: async (id: string): Promise<FinancialRecord | null> => {
    const res = await fetch(`/api/financials/${id}`);
    if (!res.ok) return null;
    return await res.json();
  },
  
  upsertFinancialRecord: async (record: FinancialRecord): Promise<FinancialRecord> => {
    const res = await fetch('/api/financials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    if (!res.ok) throw new Error('Failed to save financial');
    return await res.json();
  },
  
  deleteFinancialRecord: async (id: string): Promise<void> => {
    const res = await fetch(`/api/financials/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete financial');
  },

  upsertFinancialRecordQueued: async (record: FinancialRecord, priority: number = 1): Promise<string> => {
    const res = await fetch('/api/financials/queued', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ record, priority })
    });
    if (!res.ok) throw new Error('Failed to queue financial record');
    const result = await res.json();
    return result.queueId;
  },
  
  // ============================================================================
  // CHARACTERS - Character management operations
  // ============================================================================
  getCharacters: async (): Promise<Character[]> => {
    const res = await fetch('/api/characters');
    if (!res.ok) throw new Error('Failed to fetch characters');
    return await res.json();
  },
  
  getCharacterById: async (id: string): Promise<Character | null> => {
    const res = await fetch(`/api/characters/${id}`);
    if (!res.ok) return null;
    return await res.json();
  },
  
  upsertCharacter: async (character: Character): Promise<Character> => {
    const res = await fetch('/api/characters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(character)
    });
    if (!res.ok) throw new Error('Failed to save character');
    return await res.json();
  },
  
  deleteCharacter: async (id: string): Promise<void> => {
    const res = await fetch(`/api/characters/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete character');
  },
  
  // ============================================================================
  // PLAYERS - Player management operations
  // ============================================================================
  getPlayers: async (): Promise<Player[]> => {
    const res = await fetch('/api/players');
    if (!res.ok) throw new Error('Failed to fetch players');
    return await res.json();
  },
  
  getPlayerById: async (id: string): Promise<Player | null> => {
    const res = await fetch(`/api/players/${id}`);
    if (!res.ok) return null;
    return await res.json();
  },
  
  upsertPlayer: async (player: Player): Promise<Player> => {
    const res = await fetch('/api/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(player)
    });
    if (!res.ok) throw new Error('Failed to save player');
    return await res.json();
  },
  
  deletePlayer: async (id: string): Promise<void> => {
    const res = await fetch(`/api/players/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete player');
  },
  
  // ============================================================================
  // ACCOUNTS - Account management operations
  // ============================================================================
  getAllAccounts: async (): Promise<Account[]> => {
    const res = await fetch('/api/accounts');
    if (!res.ok) {
      console.error('Failed to fetch accounts');
      return [];
    }
    return await res.json();
  },

  getAccountById: async (id: string): Promise<Account | null> => {
    const res = await fetch(`/api/accounts/${id}`);
    if (!res.ok) return null;
    return await res.json();
  },
  
  upsertAccount: async (account: Account): Promise<Account> => {
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(account)
    });
    if (!res.ok) throw new Error('Failed to save account');
    return await res.json();
  },
  
  deleteAccount: async (id: string): Promise<void> => {
    const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete account');
  },
  
  // ============================================================================
  // LINKS - Entity relationship management operations
  // ============================================================================
  getLinksFor: async (params: { type: string; id: string }): Promise<any[]> => {
    const res = await fetch(`/api/links?entityType=${params.type}&entityId=${params.id}`);
    if (!res.ok) {
      console.error('Failed to fetch links');
      return [];
    }
    return await res.json();
  },

  getAllLinks: async (): Promise<any[]> => {
    const res = await fetch('/api/links');
    if (!res.ok) {
      console.error('Failed to fetch all links');
      return [];
    }
    return await res.json();
  },

  removeLink: async (linkId: string): Promise<void> => {
    const res = await fetch(`/api/links/${linkId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to remove link');
  },

  removeLogEntry: async (logType: string, entityId: string): Promise<{ success: boolean; message?: string }> => {
    const res = await fetch(`/api/${logType}-log`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityId })
    });
    if (!res.ok) {
      return { success: false, message: `Failed to remove ${logType} log entry` };
    }
    return await res.json();
  },
  
  // ============================================================================
  // SITES - Site management operations
  // ============================================================================
  getSites: async (): Promise<Site[]> => {
    const res = await fetch('/api/sites');
    if (!res.ok) throw new Error('Failed to fetch sites');
    return await res.json();
  },
  
  getSiteById: async (id: string): Promise<Site | null> => {
    const res = await fetch(`/api/sites/${id}`);
    if (!res.ok) return null;
    return await res.json();
  },
  
  upsertSite: async (site: Site): Promise<Site> => {
    const res = await fetch('/api/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(site)
    });
    if (!res.ok) throw new Error('Failed to save site');
    return await res.json();
  },
  
  deleteSite: async (id: string): Promise<void> => {
    const res = await fetch(`/api/sites/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete site');
  },

  // ============================================================================
  // SETTLEMENTS - Settlement management operations
  // ============================================================================
  getSettlements: async (): Promise<Settlement[]> => {
    const res = await fetch('/api/settlements');
    if (!res.ok) throw new Error('Failed to fetch settlements');
    return await res.json();
  },

  getSettlementById: async (id: string): Promise<Settlement | null> => {
    const res = await fetch(`/api/settlements/${id}`);
    if (!res.ok) return null;
    return await res.json();
  },

  upsertSettlement: async (settlement: Settlement): Promise<Settlement> => {
    const res = await fetch('/api/settlements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settlement)
    });
    if (!res.ok) throw new Error('Failed to save settlement');
    return await res.json();
  },

  deleteSettlement: async (id: string): Promise<void> => {
    const res = await fetch(`/api/settlements/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete settlement');
  },
  
  // Compatibility aliases
	// Note: getAccounts is defined below in the bulk ops section for historical reasons

  getAccount: async (id: string): Promise<Account | null> => {
    const res = await fetch(`/api/accounts/${id}`);
    if (!res.ok) {
      return null;
    }
    const account = await res.json();
    return account;
  },
  
  // ============================================================================
  // ASSETS MANAGEMENT - Company and personal assets
  // ============================================================================
  getCompanyAssets: async (): Promise<any> => {
    const res = await fetch('/api/assets/company');
    if (!res.ok) throw new Error('Failed to fetch company assets');
    return await res.json();
  },
  
  saveCompanyAssets: async (assets: any): Promise<void> => {
    const res = await fetch('/api/assets/company', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assets)
    });
    if (!res.ok) throw new Error('Failed to save company assets');
  },
  
  getPersonalAssets: async (): Promise<any> => {
    const res = await fetch('/api/assets/personal');
    if (!res.ok) throw new Error('Failed to fetch personal assets');
    return await res.json();
  },
  
  savePersonalAssets: async (assets: any): Promise<void> => {
    const res = await fetch('/api/assets/personal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assets)
    });
    if (!res.ok) throw new Error('Failed to save personal assets');
  },
  
  // ============================================================================
  // CONVERSION RATES - Point to currency conversion management
  // ============================================================================
  // PLAYER CONVERSION RATES (for character/player pages)
  getPlayerConversionRates: async (): Promise<any> => {
    const res = await fetch('/api/conversion-rates/player-conversion-rates');
    if (!res.ok) throw new Error('Failed to fetch player conversion rates');
    return await res.json();
  },

  savePlayerConversionRates: async (rates: any): Promise<void> => {
    const res = await fetch('/api/conversion-rates/player-conversion-rates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rates)
    });
    if (!res.ok) throw new Error('Failed to save player conversion rates');
  },

  // FINANCIAL CONVERSION RATES (for finances/assets pages)
  getFinancialConversionRates: async (): Promise<any> => {
    const res = await fetch('/api/conversion-rates/financial-conversion-rates');
    if (!res.ok) throw new Error('Failed to fetch financial conversion rates');
    return await res.json();
  },

  saveFinancialConversionRates: async (rates: any): Promise<void> => {
    const res = await fetch('/api/conversion-rates/financial-conversion-rates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rates)
    });
    if (!res.ok) throw new Error('Failed to save financial conversion rates');
  },
  
  // ============================================================================
  // UTILITY HELPERS - Client-side calculations and helper functions
  // ============================================================================
  getItemTotalQuantity: (itemId: string, items: Item[]): number => {
    const item = items.find(i => i.id === itemId);
    if (!item) return 0;
    
    // Sum up all stock across all sites using StockPoint[] array
    return item.stock.reduce((sum, sp) => sum + sp.quantity, 0);
  },
  
  updateStockAtSite: async (itemId: string, siteId: string, quantity: number): Promise<Item> => {
    // Get current item
    const currentItem = await ClientAPI.getItemById(itemId);
    if (!currentItem) throw new Error('Item not found');
    
    // Update stock at site using StockPoint[] array
    const stockIndex = currentItem.stock.findIndex(sp => sp.siteId === siteId);
    const updatedStock = [...currentItem.stock];
    
    if (stockIndex >= 0) {
      if (quantity === 0) {
        updatedStock.splice(stockIndex, 1);
      } else {
        updatedStock[stockIndex] = { siteId, quantity };
      }
    } else if (quantity > 0) {
      updatedStock.push({ siteId, quantity });
    }
    
    // Save updated item
    return await ClientAPI.upsertItem({
      ...currentItem,
      stock: updatedStock
    });
  },
  
  convertPointsToJ$: (points: number, conversionRate: number = 100): number => {
    // Default conversion rate: 100 points = 1 J$
    return Math.floor(points / conversionRate);
  },
  
  // Additional utility methods for inventory
  getItemsByModel: (items: Item[]): Record<string, Item[]> => {
    const grouped: Record<string, Item[]> = {};
    items.forEach(item => {
      const key = `${item.type}|${item.subItemType || ''}|${item.name}|${item.collection || ''}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });
    return grouped;
  },
  
  getModelTotalQuantity: (items: Item[], selectedSiteIds: Set<string>): number => {
    return items.reduce((total, item) => {
      if (selectedSiteIds.size === 0) {
        return total + item.stock.reduce((sum, sp) => sum + sp.quantity, 0);
      }
      return total + item.stock
        .filter(sp => selectedSiteIds.has(sp.siteId))
        .reduce((sum, sp) => sum + sp.quantity, 0);
    }, 0);
  },
  
  getItemModelKey: (item: Item): string => {
    return `${item.type}|${item.subItemType || ''}|${item.name}|${item.collection || ''}`;
  },
  
  // Financial records filtering methods
  getFinancialRecordsByMonth: async (year: number, month: number, type: 'company' | 'personal'): Promise<FinancialRecord[]> => {
    const allRecords = await ClientAPI.getFinancialRecords();
    return allRecords.filter(record => 
      record.year === year && 
      record.month === month && 
      record.type === type
    );
  },

  // Additional methods needed by components
  getQuantityAtSite: (item: Item, siteId: string): number => {
    return item.stock.find(sp => sp.siteId === siteId)?.quantity || 0;
  },

  moveItemsBetweenSites: async (item: Item, fromSiteId: string, toSiteId: string, quantity: number): Promise<Item> => {
    const updatedItem = { ...item };
    
    // Find source stock
    const sourceStockIndex = updatedItem.stock.findIndex(sp => sp.siteId === fromSiteId);
    if (sourceStockIndex === -1) {
      throw new Error(`Item not found at source site: ${fromSiteId}`);
    }
    
    const sourceStock = updatedItem.stock[sourceStockIndex];
    if (sourceStock.quantity < quantity) {
      throw new Error(`Insufficient quantity at source. Available: ${sourceStock.quantity}, Requested: ${quantity}`);
    }
    
    // Reduce source quantity
    if (sourceStock.quantity === quantity) {
      // Remove stock point if moving all items
      updatedItem.stock = updatedItem.stock.filter((_, i) => i !== sourceStockIndex);
    } else {
      // Reduce quantity
      updatedItem.stock[sourceStockIndex] = {
        ...sourceStock,
        quantity: sourceStock.quantity - quantity
      };
    }
    
    // Add to destination (or increase existing stock)
    const destStockIndex = updatedItem.stock.findIndex(sp => sp.siteId === toSiteId);
    if (destStockIndex >= 0) {
      // Increase existing stock
      updatedItem.stock[destStockIndex] = {
        ...updatedItem.stock[destStockIndex],
        quantity: updatedItem.stock[destStockIndex].quantity + quantity
      };
    } else {
      // Add new stock point
      updatedItem.stock.push({
        siteId: toSiteId,
        quantity: quantity
      });
    }
    
    return updatedItem;
  },

  bulkImportItems: async (items: Item[]): Promise<boolean> => {
    try {
      for (const item of items) {
        await ClientAPI.upsertItem(item);
      }
      return true;
    } catch (error) {
      console.error('Failed to bulk import items:', error);
      return false;
    }
  },

  bulkMergeItems: async (items: Item[]): Promise<boolean> => {
    console.warn('[ClientAPI] bulkMergeItems not implemented yet');
    return false;
  },

  bulkAddItemsOnly: async (items: Item[]): Promise<{ success: boolean; addedCount: number }> => {
    console.warn('[ClientAPI] bulkAddItemsOnly not implemented yet');
    return { success: false, addedCount: 0 };
  },

  bulkOperation: async ({ entityType, mode, source, records }: {
    entityType: string;
    mode: 'add-only' | 'merge' | 'replace';
    source: string;
    records: any[];
  }): Promise<{ success: boolean; mode: string; counts: { added: number; updated?: number; skipped?: number }; errors?: string[] }> => {
    try {
      const res = await fetch('/api/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, mode, source, records })
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'Bulk operation failed');
      }

      return await res.json();
    } catch (error) {
      console.error('[ClientAPI] bulkOperation failed:', error);
      throw error;
    }
  },

  getAccounts: async (): Promise<Account[]> => {
    const res = await fetch('/api/accounts');
    if (!res.ok) {
      console.error('Failed to fetch accounts');
      return [];
    }
    return await res.json();
  },

  // ============================================================================
  // BULK OPERATIONS - Bulk import/export and logging
  // ============================================================================
  logBulkImport: async (entityType: string, details: { count: number; source?: string; importMode?: 'add' | 'merge' | 'replace'; extra?: any }): Promise<void> => {
    const res = await fetch('/api/logs/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType,
        operation: 'import',
        ...details
      })
    });
    if (!res.ok) throw new Error('Failed to log bulk import');
  },

  logBulkExport: async (entityType: string, details: { count: number; exportFormat?: string; extra?: any }): Promise<void> => {
    const res = await fetch('/api/logs/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType,
        operation: 'export',
        ...details
      })
    });
    if (!res.ok) throw new Error('Failed to log bulk export');
  },

  // ============================================================================
  // QUEUE MANAGEMENT - Background task queue operations
  // ============================================================================
  getQueueStatus: async (): Promise<any> => {
    const res = await fetch('/api/queue/status');
    if (!res.ok) throw new Error('Failed to get queue status');
    return await res.json();
  },

  configureQueue: async (options: { maxConcurrency?: number; batchSize?: number }): Promise<void> => {
    const res = await fetch('/api/queue/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });
    if (!res.ok) throw new Error('Failed to configure queue');
  },

  stopQueue: async (): Promise<void> => {
    const res = await fetch('/api/queue/stop', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to stop queue');
  },

  clearQueue: async (): Promise<void> => {
    const res = await fetch('/api/queue/clear', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to clear queue');
  },

  // ============================================================================
  // AI SESSIONS - Session management operations
  // ============================================================================
  getSessions: async (): Promise<any> => {
    const res = await fetch('/api/ai/sessions');
    if (!res.ok) throw new Error('Failed to fetch sessions');
    return await res.json();
  },

  getSessionById: async (id: string): Promise<AISession | null> => {
    const res = await fetch(`/api/ai/sessions/${id}`);
    if (!res.ok) return null;
    return await res.json();
  },

  createSession: async (model?: string): Promise<any> => {
    const res = await fetch('/api/ai/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', model })
    });
    if (!res.ok) throw new Error('Failed to create session');
    return await res.json();
  },

  setActiveSession: async (sessionId: string): Promise<void> => {
    const res = await fetch('/api/ai/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set-active', sessionId })
    });
    if (!res.ok) throw new Error('Failed to set active session');
  },

  updateSessionName: async (id: string, name: string): Promise<AISession> => {
    const res = await fetch(`/api/ai/sessions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    if (!res.ok) throw new Error('Failed to update session name');
    return await res.json();
  },

  updateSessionModel: async (id: string, model: string): Promise<AISession> => {
    const res = await fetch(`/api/ai/sessions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model })
    });
    if (!res.ok) throw new Error('Failed to update session model');
    return await res.json();
  },

  deleteSession: async (id: string): Promise<void> => {
    const res = await fetch(`/api/ai/sessions/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete session');
  },

  clearActiveSession: async (): Promise<void> => {
    const res = await fetch('/api/ai/sessions', { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to clear active session');
  },

  getSessionMessages: async (id: string): Promise<any[]> => {
    const session = await fetch(`/api/ai/sessions/${id}`);
    if (!session.ok) return [];
    const data = await session.json();
    return data.messages || [];
  },

  // ============================================================================
  // AI CHAT - AI chat and model operations
  // ============================================================================
  getGroqModels: async (): Promise<{ models: any[] }> => {
    const res = await fetch('/api/ai/groq/models');
    if (!res.ok) throw new Error('Failed to fetch Groq models');
    return await res.json();
  },

  sendChatMessage: async (message: string, model?: string, sessionId?: string, enableTools?: boolean): Promise<any> => {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        model: model || 'openai/gpt-oss-120b',
        provider: 'groq',
        sessionId,
        enableTools
      })
    });
    if (!res.ok) throw new Error('Failed to get AI response');
    return await res.json();
  },

  // ============================================================================
  // PLAYER LOG - Player log operations
  // ============================================================================
  getPlayerLog: async (): Promise<{ entries: any[] }> => {
    const res = await fetch('/api/player-log');
    if (!res.ok) throw new Error('Failed to fetch player log');
    return await res.json();
  },

  // ============================================================================
  // RESEARCH SYNC - Research logs sync operations
  // ============================================================================
  getResearchSyncStatus: async (): Promise<any> => {
    const res = await fetch('/api/sync-research-logs');
    if (!res.ok) throw new Error('Failed to fetch research sync status');
    return await res.json();
  },

  syncResearchLogs: async (logType: string, strategyOverride?: 'replace' | 'merge'): Promise<any> => {
    const res = await fetch('/api/sync-research-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logType, strategyOverride })
    });
    if (!res.ok) throw new Error('Failed to sync research logs');
    return await res.json();
  },

  // ============================================================================
  // PROJECT STATUS - Phase status operations
  // ============================================================================
  updatePhaseStatus: async (phaseKey: string, newStatus: string): Promise<any> => {
    const res = await fetch('/api/project-status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phaseKey, newStatus })
    });
    if (!res.ok) throw new Error('Failed to update phase status');
    return await res.json();
  },

  // ============================================================================
  // AUTH - Authentication operations
  // ============================================================================
  logout: async (): Promise<void> => {
    const res = await fetch('/admin/logout', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to logout');
  },
};

// Historical placement: keep alias methods at the end to avoid duplicate keys
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
ClientAPI.getAccounts = async (): Promise<Account[]> => {
  const res = await fetch('/api/accounts');
  if (!res.ok) {
    console.error('Failed to fetch accounts');
    return [];
  }
  const accounts = await res.json();
  return accounts;
};
