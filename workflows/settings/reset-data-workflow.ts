// workflows/settings/reset-data-workflow.ts
// Reset Data Workflow for KV-only architecture

import { kv } from '@vercel/kv';
import { buildDataKey, buildIndexKey, buildLogKey, buildLinksIndexKey } from '@/data-store/keys';
import { EntityType } from '@/types/enums';

// Centralized list of entity types for reset operations
const RESETTABLE_ENTITY_TYPES = [
  EntityType.TASK,
  EntityType.ITEM,
  EntityType.SALE,
  EntityType.FINANCIAL,
  EntityType.CHARACTER,
  EntityType.PLAYER,
  EntityType.SITE
];

export interface SettingsResult {
  success: boolean;
  message: string;
  data?: {
    results: string[];
    errors: string[];
    mode: string;
    environment: string;
    requiresClientExecution?: boolean;
  };
}

export interface ResetOptions {
  mode: 'clear' | 'defaults' | 'backfill';
  seedSites: boolean;
  preserveLogs: boolean;
}

export class ResetDataWorkflow {
  
  /**
   * Execute reset data operation
   */
  static async execute(mode: 'clear' | 'defaults' | 'backfill' = 'defaults'): Promise<SettingsResult> {
    try {
      console.log(`[ResetDataWorkflow] 🔄 Starting reset data operation (mode: ${mode})...`);

      const isKV = Boolean(process.env.KV_REST_API_URL);
      const isServer = typeof window === 'undefined';
      const results: string[] = [];
      const errors: string[] = [];

      console.log(`[ResetDataWorkflow] 🌍 Environment: ${isKV ? 'KV (Production)' : 'Local (Development)'}`);
      console.log(`[ResetDataWorkflow] 🖥️ Context: ${isServer ? 'Server' : 'Client'}`);

      // For local environment, we need to run on client side
      if (!isKV && isServer) {
        console.log(`[ResetDataWorkflow] ⚠️ Local environment detected on server - returning instruction for client-side execution`);
        return {
          success: true,
          message: 'Reset requires client-side execution for local environment',
          data: {
            results: ['Client-side reset required for local environment'],
            errors: [],
            mode,
            environment: 'local',
            requiresClientExecution: true
          }
        };
      }

      // Handle client-side execution for localhost
      if (!isKV && !isServer) {
        console.log(`[ResetDataWorkflow] 🖥️ Running client-side reset for localhost...`);
        return await this.executeClientSideReset(mode, results, errors);
      }
      
      // Define reset options
      const options: ResetOptions = {
        mode,
        seedSites: mode === 'defaults',
        preserveLogs: false
      };
      
      // Clear all entity data
      await this.clearAllEntityData(results, errors);

      // Clear all links
      await this.clearAllLinks(results, errors);

      // Clear logs if not preserving (do this BEFORE creating new entities)
      if (!options.preserveLogs) {
        await this.clearAllLogs(results, errors);
      }

      // Initialize Player One (The Triforce) FIRST if in defaults mode
      if (mode === 'defaults') {
        await this.initializePlayerOne(results, errors);
      }

      // Seed default data if requested (AFTER player initialization)
      if (options.seedSites) {
        await this.seedDefaultSites(results, errors);
      }
      
      const success = errors.length === 0;
      const message = success
        ? `Successfully reset data (${mode} mode) - ${results.length} operations completed: ${results.join(', ')}`
        : `Reset completed with ${errors.length} errors - ${results.length} operations completed: ${results.join(', ')}`;

      // Log detailed results for debugging
      console.log('[ResetDataWorkflow] 📋 Detailed operation results:');
      results.forEach((result, index) => {
        console.log(`[ResetDataWorkflow]   ${index + 1}. ${result}`);
      });

      if (errors.length > 0) {
        console.log('[ResetDataWorkflow] ❌ Errors encountered:');
        errors.forEach((error, index) => {
          console.log(`[ResetDataWorkflow]   ${index + 1}. ${error}`);
        });
      }
      
      console.log(`[ResetDataWorkflow] ✅ Reset data operation completed: ${message}`);
      
      return {
        success,
        message,
        data: {
          results,
          errors,
          mode,
          environment: isKV ? 'kv' : 'local'
        }
      };
      
    } catch (error) {
      console.error('[ResetDataWorkflow] ❌ Reset data operation failed:', error);
      return {
        success: false,
        message: `Reset data operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: {
          results: [],
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          mode,
          environment: 'unknown'
        }
      };
    }
  }
  
  /**
   * Clear all entity data from KV
   */
  private static async clearAllEntityData(results: string[], errors: string[]): Promise<void> {
    try {
      console.log('[ResetDataWorkflow] 🗑️ Clearing all entity data...');
      
      for (const entityType of RESETTABLE_ENTITY_TYPES) {
        try {
          // Get all entity IDs from index
          const indexKey = buildIndexKey(entityType);
          const entityIds = await kv.smembers(indexKey);
          
          if (entityIds.length > 0) {
            // Delete all entity data
            const dataKeys = entityIds.map(id => buildDataKey(entityType, id));
            await kv.del(...dataKeys);
            
            // Clear the index
            await kv.del(indexKey);
            
            results.push(`Cleared ${entityIds.length} ${entityType} entities`);
            console.log(`[ResetDataWorkflow] ✅ Cleared ${entityIds.length} ${entityType} entities`);
          } else {
            results.push(`No ${entityType} entities to clear`);
          }
        } catch (error) {
          const errorMsg = `Failed to clear ${entityType}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`[ResetDataWorkflow] ❌ ${errorMsg}`);
        }
      }
    } catch (error) {
      const errorMsg = `Failed to clear entity data: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[ResetDataWorkflow] ❌ ${errorMsg}`);
    }
  }
  
  /**
   * Clear all links from KV
   */
  private static async clearAllLinks(results: string[], errors: string[]): Promise<void> {
    try {
      console.log('[ResetDataWorkflow] 🔗 Clearing all links...');
      
      // Get all link IDs
      const linksIndexKey = buildIndexKey('links');
      const linkIds = await kv.smembers(linksIndexKey);
      
      if (linkIds.length > 0) {
        // Delete all link data
        const linkKeys = linkIds.map(id => `links:link:${id}`);
        await kv.del(...linkKeys);
        
        // Clear the links index
        await kv.del(linksIndexKey);
        
        // Clear all entity-specific link indexes
        for (const entityType of RESETTABLE_ENTITY_TYPES) {
          const entityLinkIndexPattern = `index:links:by-entity:${entityType}:*`;
          const entityLinkKeys = await kv.keys(entityLinkIndexPattern);
          if (entityLinkKeys.length > 0) {
            await kv.del(...entityLinkKeys);
          }
        }
        
        results.push(`Cleared ${linkIds.length} links`);
        console.log(`[ResetDataWorkflow] ✅ Cleared ${linkIds.length} links`);
      } else {
        results.push('No links to clear');
      }
    } catch (error) {
      const errorMsg = `Failed to clear links: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[ResetDataWorkflow] ❌ ${errorMsg}`);
    }
  }
  
  /**
   * Clear all logs from KV
   */
  private static async clearAllLogs(results: string[], errors: string[]): Promise<void> {
    try {
      console.log('[ResetDataWorkflow] 📝 Clearing all logs...');
      
      const logTypes = [...RESETTABLE_ENTITY_TYPES, 'links']; // links is special case
      
      for (const logType of logTypes) {
        try {
          const logKey = buildLogKey(logType);
          await kv.del(logKey);
          results.push(`Cleared ${logType} logs`);
        } catch (error) {
          const errorMsg = `Failed to clear ${logType} logs: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`[ResetDataWorkflow] ❌ ${errorMsg}`);
        }
      }
    } catch (error) {
      const errorMsg = `Failed to clear logs: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[ResetDataWorkflow] ❌ ${errorMsg}`);
    }
  }
  
  /**
   * Seed default sites
   */
  private static async seedDefaultSites(results: string[], errors: string[]): Promise<void> {
    try {
      console.log('[ResetDataWorkflow] 🌱 Seeding default sites...');
      
      const defaultSites = [
        {
          id: 'home',
          name: 'Home',
          type: 'physical',
          status: 'active',
          metadata: {
            settlement: 'Uvita',
            location: { lat: 9.1500, lng: -83.7500 }
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          links: []
        },
        {
          id: 'feria-box',
          name: 'Feria Box',
          type: 'physical',
          status: 'active',
          metadata: {
            settlement: 'Uvita',
            location: { lat: 9.1500, lng: -83.7500 }
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          links: []
        },
        {
          id: 'digital-space',
          name: 'Digital Space',
          type: 'cloud',
          status: 'active',
          metadata: {
            settlement: 'Cloud',
            location: null
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          links: []
        }
      ];
      
      for (const site of defaultSites) {
        try {
          const dataKey = buildDataKey('sites', site.id);
          await kv.set(dataKey, JSON.stringify(site));
          
          // Add to sites index
          const indexKey = buildIndexKey('sites');
          await kv.sadd(indexKey, site.id);
          
          results.push(`Seeded site: ${site.name}`);
        } catch (error) {
          const errorMsg = `Failed to seed site ${site.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`[ResetDataWorkflow] ❌ ${errorMsg}`);
        }
      }
      
      console.log('[ResetDataWorkflow] ✅ Seeded default sites');
    } catch (error) {
      const errorMsg = `Failed to seed default sites: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[ResetDataWorkflow] ❌ ${errorMsg}`);
    }
  }

  /**
   * Execute client-side reset for localhost (localStorage)
   */
  private static async executeClientSideReset(mode: string, results: string[], errors: string[]): Promise<SettingsResult> {
    try {
      console.log(`[ResetDataWorkflow] 🖥️ Starting client-side reset (mode: ${mode})...`);

      // Clear localStorage data
      const keysToRemove: string[] = [];

      // Find all data keys in localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('data:') ||
          key.startsWith('index:') ||
          key.startsWith('links:') ||
          key.startsWith('log:') ||
          key.startsWith('akiles:')
        )) {
          keysToRemove.push(key);
        }
      }

      // Remove all found keys
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        results.push(`Removed localStorage key: ${key}`);
      });

      // Seed default sites if in defaults mode
      if (mode === 'defaults') {
        await this.seedDefaultSitesLocal(results, errors);
      }

      // Clear any cached data
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          for (const cacheName of cacheNames) {
            await caches.delete(cacheName);
            results.push(`Cleared cache: ${cacheName}`);
          }
        } catch (cacheError) {
          console.warn('[ResetDataWorkflow] Cache clearing failed:', cacheError);
        }
      }

      console.log(`[ResetDataWorkflow] ✅ Client-side reset completed: ${results.length} operations`);

      return {
        success: errors.length === 0,
        message: `Client-side reset completed (${mode} mode) - ${results.length} operations completed`,
        data: {
          results,
          errors,
          mode,
          environment: 'local'
        }
      };

    } catch (error) {
      const errorMsg = `Client-side reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[ResetDataWorkflow] ❌ ${errorMsg}`);

      return {
        success: false,
        message: errorMsg,
        data: {
          results: [],
          errors,
          mode,
          environment: 'local'
        }
      };
    }
  }

  /**
   * Seed default sites for localhost (localStorage)
   */
  private static async seedDefaultSitesLocal(results: string[], errors: string[]): Promise<void> {
    try {
      console.log('[ResetDataWorkflow] 🌱 Seeding default sites for localhost...');

      const defaultSites = [
        {
          id: 'home',
          name: 'Home',
          type: 'physical',
          status: 'active',
          metadata: {
            settlement: 'Uvita',
            location: { lat: 9.1500, lng: -83.7500 }
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          links: []
        },
        {
          id: 'feria-box',
          name: 'Feria Box',
          type: 'physical',
          status: 'active',
          metadata: {
            settlement: 'Uvita',
            location: { lat: 9.1500, lng: -83.7500 }
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          links: []
        },
        {
          id: 'digital-space',
          name: 'Digital Space',
          type: 'cloud',
          status: 'active',
          metadata: {
            settlement: 'Cloud',
            location: null
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          links: []
        }
      ];

      for (const site of defaultSites) {
        try {
          // Store site data
          const dataKey = `data:sites:${site.id}`;
          localStorage.setItem(dataKey, JSON.stringify(site));

          // Add to sites index
          const indexKey = 'index:sites';
          const existingIndex = localStorage.getItem(indexKey);
          const indexSet = new Set(existingIndex ? JSON.parse(existingIndex) : []);
          indexSet.add(site.id);
          localStorage.setItem(indexKey, JSON.stringify([...indexSet]));

          results.push(`Seeded localStorage site: ${site.name}`);
        } catch (error) {
          const errorMsg = `Failed to seed localStorage site ${site.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`[ResetDataWorkflow] ❌ ${errorMsg}`);
        }
      }

      console.log('[ResetDataWorkflow] ✅ Seeded default sites for localhost');
    } catch (error) {
      const errorMsg = `Failed to seed default sites for localhost: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[ResetDataWorkflow] ❌ ${errorMsg}`);
    }
  }

  /**
   * Initialize Player One (The Triforce) - Account + Player + Character
   */
  private static async initializePlayerOne(results: string[], errors: string[]): Promise<void> {
    try {
      console.log('[ResetDataWorkflow] 🔺 Initializing Player One (The Triforce)...');

      // Import required functions
      const { ensurePlayerOne } = await import('@/lib/game-mechanics/player-one-init');
      const {
        getAllPlayers,
        getAllCharacters,
        upsertPlayer,
        upsertCharacter
      } = await import('@/data-store/datastore');

      // Initialize Player One
      await ensurePlayerOne(
        getAllPlayers,
        getAllCharacters,
        () => Promise.resolve([]), // getAccounts - not implemented yet
        upsertPlayer,
        upsertCharacter,
        () => Promise.resolve({} as any), // upsertAccount - not implemented yet
        true, // force
        { skipLogging: false }
      );

      results.push('Initialized Player One (Account + Player + Character)');
      console.log('[ResetDataWorkflow] ✅ Player One initialized successfully');
    } catch (error) {
      const errorMsg = `Failed to initialize Player One: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[ResetDataWorkflow] ❌ ${errorMsg}`);
    }
  }
}
