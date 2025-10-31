// workflows/settings/reset-data-workflow.ts
// Reset Data Workflow for KV-only architecture

import { kv, kvDelMany } from '@/data-store/kv';
import { buildDataKey, buildIndexKey, buildLogKey, buildLinksIndexKey } from '@/data-store/keys';
import { EntityType, SiteType, SiteStatus, PhysicalBusinessType, DigitalSiteType, SystemSiteType } from '@/types/enums';
import { kvScan } from '@/data-store/kv';
import { TransactionManager } from './transaction-manager';

// Centralized list of entity types for reset operations
const RESETTABLE_ENTITY_TYPES = [
  EntityType.TASK,
  EntityType.ITEM,
  EntityType.SALE,
  EntityType.FINANCIAL,
  EntityType.CHARACTER,
  EntityType.PLAYER,
  EntityType.ACCOUNT,
  EntityType.SITE
];

// System State keys that should be cleared on reset
const SYSTEM_STATE_KEYS = [
  'data:company-assets',
  'data:personal-assets'
];

// Configuration keys that should be preserved
const CONFIGURATION_KEYS = [
  'data:financial-conversion-rates',
  'data:player-conversion-rates'
];

// Research Data keys that should be preserved (NEVER cleared)
const RESEARCH_DATA_KEYS = [
  'data:project-status',
  'data:notes-log',
  'data:dev-log'
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
    progress?: {
      current: number;
      total: number;
      percentage: number;
    };
  };
}

export interface ProgressCallback {
  (current: number, total: number, message: string): void;
}

export interface ResetOptions {
  mode: 'clear' | 'defaults' | 'backfill';
  seedSites: boolean;
  preserveLogs: boolean;
}

export class ResetDataWorkflow {
  
  /**
   * Execute reset data operation with timeout and progress tracking
   */
  static async execute(mode: 'clear' | 'defaults' | 'backfill' = 'defaults', progressCallback?: ProgressCallback): Promise<SettingsResult> {
    try {
      console.log(`[ResetDataWorkflow] 🔄 Starting reset data operation (mode: ${mode})...`);

      const isKV = Boolean(process.env.UPSTASH_REDIS_REST_URL);
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
        console.log(`[ResetDataWorkflow] 🖥️ Client-side reset not supported - use KV environment`);
        errors.push('Client-side reset not supported - use KV environment');
        return {
          success: false,
          message: 'Client-side reset not supported - use KV environment',
          data: { results, errors, mode, environment: 'local' }
        };
      }

      const startTime = Date.now();
      const TIMEOUT_MS = 4 * 60 * 1000; // 4 minutes (leaving 1 minute buffer for API timeout)
      const totalOperations = 6; // entity data + links + logs + system state + player init + sites
      let currentOperation = 0;

      // Helper function to check timeout and report progress
      const checkTimeoutAndProgress = (operation: string) => {
        currentOperation++;
        const elapsed = Date.now() - startTime;
        if (elapsed > TIMEOUT_MS) {
          throw new Error(`Operation timeout after ${elapsed}ms during: ${operation}`);
        }
        if (progressCallback) {
          const progress = Math.round((currentOperation / totalOperations) * 100);
          progressCallback(currentOperation, totalOperations, `Reset: ${operation}`);
        }
      };

      // Define reset options
      const options: ResetOptions = {
        mode,
        seedSites: mode === 'defaults',
        preserveLogs: false
      };

      // Use TransactionManager for rollback support
      const transactionManager = new TransactionManager();
      
      const result = await transactionManager.execute(async () => {
        // CORRECT ORDER (FIXED):
        // 1. Clear entities
        // 2. Clear links  
        // 3. Clear logs - BEFORE entity creation
        // 4. Create Player One (The Triforce) - AFTER log clearing
        // 5. Seed default sites

        // Step 1: Clear all entity data
        try {
          checkTimeoutAndProgress('Clearing entity data');
          await this.clearAllEntityData(results, errors);
        } catch (error) {
          if (error instanceof Error && error.message.includes('timeout')) {
            throw error; // Re-throw timeout errors
          }
          const errorMsg = `Failed to clear entity data: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`[ResetDataWorkflow] ❌ ${errorMsg}`);
          throw new Error(errorMsg); // Throw to trigger rollback
        }

        // Step 2: Clear all links
        try {
          checkTimeoutAndProgress('Clearing links');
          await this.clearAllLinks(results, errors);
        } catch (error) {
          if (error instanceof Error && error.message.includes('timeout')) {
            throw error; // Re-throw timeout errors
          }
          const errorMsg = `Failed to clear links: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`[ResetDataWorkflow] ❌ ${errorMsg}`);
          throw new Error(errorMsg); // Throw to trigger rollback
        }

        // Step 3: Clear logs BEFORE creating new entities (FIXED TIMING)
        if (!options.preserveLogs) {
          try {
            checkTimeoutAndProgress('Clearing logs');
            await this.clearAllLogs(results, errors);
          } catch (error) {
            if (error instanceof Error && error.message.includes('timeout')) {
              throw error; // Re-throw timeout errors
            }
            const errorMsg = `Failed to clear logs: ${error instanceof Error ? error.message : 'Unknown error'}`;
            errors.push(errorMsg);
            console.error(`[ResetDataWorkflow] ❌ ${errorMsg}`);
            throw new Error(errorMsg); // Throw to trigger rollback
          }
        } else {
          currentOperation++; // Count as completed even if skipped
        }

        // Step 3.5: Clear System State (assets, project status)
        try {
          checkTimeoutAndProgress('Clearing System State');
          await this.clearSystemState(results, errors);
        } catch (error) {
          if (error instanceof Error && error.message.includes('timeout')) {
            throw error;
          }
          const errorMsg = `Failed to clear System State: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`[ResetDataWorkflow] ❌ ${errorMsg}`);
          throw new Error(errorMsg);
        }

        // Step 4: Initialize Player One (The Triforce) AFTER log clearing
        if (mode === 'defaults') {
          try {
            checkTimeoutAndProgress('Initializing Player One');
            console.log('[ResetDataWorkflow] 🔺 Starting Triforce initialization...');
            await this.initializePlayerOne(results, errors);
            console.log('[ResetDataWorkflow] ✅ Triforce initialization completed');
          } catch (error) {
            if (error instanceof Error && error.message.includes('timeout')) {
              throw error; // Re-throw timeout errors
            }
            const errorMsg = `Failed to initialize Player One: ${error instanceof Error ? error.message : 'Unknown error'}`;
            errors.push(errorMsg);
            console.error(`[ResetDataWorkflow] ❌ ${errorMsg}`);
            throw new Error(errorMsg); // Throw to trigger rollback
          }
        } else {
          currentOperation++; // Count as completed even if skipped
        }

        // Step 5: Seed default sites if requested (AFTER player initialization)
        if (options.seedSites) {
          try {
            checkTimeoutAndProgress('Seeding default sites');
            await this.seedDefaultSites(results, errors);
          } catch (error) {
            if (error instanceof Error && error.message.includes('timeout')) {
              throw error; // Re-throw timeout errors
            }
            const errorMsg = `Failed to seed default sites: ${error instanceof Error ? error.message : 'Unknown error'}`;
            errors.push(errorMsg);
            console.error(`[ResetDataWorkflow] ❌ ${errorMsg}`);
            throw new Error(errorMsg); // Throw to trigger rollback
          }
        } else {
          currentOperation++; // Count as completed even if skipped
        }

        return {}; // Don't return arrays we already modified
      });

      // Don't push anything - arrays already populated by operations

      // Check for critical errors that should stop the operation
      const criticalErrors = errors.filter(error =>
        error.includes('Failed to clear') ||
        error.includes('KV') ||
        error.includes('Connection')
      );

      if (criticalErrors.length > 0 && results.length === 0) {
        console.error('[ResetDataWorkflow] 🚨 Critical errors detected, operation may be incomplete');
        throw new Error(`Critical errors encountered: ${criticalErrors.join(', ')}`);
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

      const totalTime = Date.now() - startTime;
      console.log(`[ResetDataWorkflow] ✅ Reset data operation completed in ${totalTime}ms: ${message}`);

      return {
        success,
        message,
        data: {
          results,
          errors,
          mode,
          environment: isKV ? 'kv' : 'local',
          progress: {
            current: totalOperations,
            total: totalOperations,
            percentage: 100
          }
        }
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        console.error('[ResetDataWorkflow] ⏰ Operation timeout - attempting graceful shutdown');
        return {
          success: false,
          message: `Reset operation timed out: ${error.message}`,
          data: {
            results: [],
            errors: [`TIMEOUT: ${error.message}`],
            mode,
            environment: 'unknown',
            progress: {
              current: 0,
              total: 5,
              percentage: 0
            }
          }
        };
      }

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
   * Clear all entity data from KV with batch processing
   */
  private static async clearAllEntityData(results: string[], errors: string[]): Promise<void> {
    try {
      console.log('[ResetDataWorkflow] 🗑️ Clearing all entity data...');

      for (const entityType of RESETTABLE_ENTITY_TYPES) {
        try {
          console.log(`[ResetDataWorkflow] 🔄 Processing ${entityType} entities...`);

          // Get all entity IDs from index
          const indexKey = buildIndexKey(entityType);
          console.log(`[ResetDataWorkflow] 🔍 Looking for ${entityType} entities at key: ${indexKey}`);
          const entityIds = await kv.smembers(indexKey);
          console.log(`[ResetDataWorkflow] 🔍 Found entity IDs:`, entityIds);

          if (entityIds.length > 0) {
            console.log(`[ResetDataWorkflow] 📊 Found ${entityIds.length} ${entityType} entities to clear`);

            // For large datasets, process deletions in batches to avoid overwhelming KV
            const BATCH_SIZE = 100;
            const totalBatches = Math.ceil(entityIds.length / BATCH_SIZE);

            for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
              const startIndex = batchIndex * BATCH_SIZE;
              const endIndex = Math.min(startIndex + BATCH_SIZE, entityIds.length);
              const batchIds = entityIds.slice(startIndex, endIndex);

              console.log(`[ResetDataWorkflow] 🔄 Clearing batch ${batchIndex + 1}/${totalBatches} for ${entityType} (${batchIds.length} entities)`);

              // Delete entity data for this batch
              const dataKeys = batchIds.map(id => buildDataKey(entityType, id));
              await kvDelMany(dataKeys);

              console.log(`[ResetDataWorkflow] ✅ Cleared batch ${batchIndex + 1}/${totalBatches} for ${entityType}`);
            }

            // Clear the index after all data is deleted
            await kv.del(indexKey);

            results.push(`Cleared ${entityIds.length} ${entityType} entities in ${totalBatches} batches`);
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
   * Clear all links from KV with batch processing
   */
  private static async clearAllLinks(results: string[], errors: string[]): Promise<void> {
    try {
      console.log('[ResetDataWorkflow] 🔗 Clearing all links...');

      // Get all link keys using kvScan (like getAllLinks does)
      const linkKeys = await kvScan('links:link:');

      if (linkKeys.length > 0) {
        console.log(`[ResetDataWorkflow] 📊 Found ${linkKeys.length} links to clear`);

        // For large datasets, process deletions in batches
        const BATCH_SIZE = 100;
        const totalBatches = Math.ceil(linkKeys.length / BATCH_SIZE);

        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
          const startIndex = batchIndex * BATCH_SIZE;
          const endIndex = Math.min(startIndex + BATCH_SIZE, linkKeys.length);
          const batchKeys = linkKeys.slice(startIndex, endIndex);

          console.log(`[ResetDataWorkflow] 🔄 Clearing links batch ${batchIndex + 1}/${totalBatches} (${batchKeys.length} links)`);

          // Delete link data for this batch
          await kvDelMany(batchKeys);

          console.log(`[ResetDataWorkflow] ✅ Cleared links batch ${batchIndex + 1}/${totalBatches}`);
        }

        // Clear all entity-specific link indexes in batches
        const entityLinkKeys = await kvScan('index:links:by-entity:');
        if (entityLinkKeys.length > 0) {
          console.log(`[ResetDataWorkflow] 📊 Found ${entityLinkKeys.length} entity link indexes to clear`);
          
          const indexBatches = Math.ceil(entityLinkKeys.length / BATCH_SIZE);
          for (let indexBatch = 0; indexBatch < indexBatches; indexBatch++) {
            const startIndex = indexBatch * BATCH_SIZE;
            const endIndex = Math.min(startIndex + BATCH_SIZE, entityLinkKeys.length);
            const indexBatchKeys = entityLinkKeys.slice(startIndex, endIndex);

            await kvDelMany(indexBatchKeys);
            console.log(`[ResetDataWorkflow] ✅ Cleared entity link index batch ${indexBatch + 1}/${indexBatches}`);
          }
        }

        results.push(`Cleared ${linkKeys.length} links`);
        console.log(`[ResetDataWorkflow] ✅ Cleared ${linkKeys.length} links successfully`);
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
      console.log('[ResetDataWorkflow] 📝 Clearing ENTITY logs only (preserving research logs)...');
      
      // ONLY clear entity logs, NOT research logs
      const entityLogTypes = [...RESETTABLE_ENTITY_TYPES, 'links'];
      
      console.log('[ResetDataWorkflow] Entity logs to clear:', entityLogTypes);
      console.log('[ResetDataWorkflow] ⚠️ Research logs (notes-log, dev-log) will NOT be cleared');
      
      for (const logType of entityLogTypes) {
        try {
          const logKey = buildLogKey(logType);
          console.log(`[ResetDataWorkflow] Clearing ${logKey}...`);
          await kv.del(logKey);
          results.push(`Cleared ${logType} logs`);
          console.log(`[ResetDataWorkflow] ✅ Cleared ${logType}`);
        } catch (error) {
          const errorMsg = `Failed to clear ${logType} logs: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`[ResetDataWorkflow] ❌ ${errorMsg}`);
        }
      }
      
      // Verify research logs still exist
      console.log('[ResetDataWorkflow] 🔍 Verifying research logs are preserved...');
      const notesLog = await kv.get('data:notes-log');
      const devLog = await kv.get('data:dev-log');
      console.log('[ResetDataWorkflow] ✅ Research logs preserved:', {
        notesLog: notesLog ? 'EXISTS' : 'MISSING',
        devLog: devLog ? 'EXISTS' : 'MISSING'
      });
      
      if (notesLog) {
        results.push('Preserved notes-log (research)');
      }
      if (devLog) {
        results.push('Preserved dev-log (research)');
      }
      
    } catch (error) {
      const errorMsg = `Failed to clear logs: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[ResetDataWorkflow] ❌ ${errorMsg}`);
    }
  }

  /**
   * Clear System State data (company and personal assets)
   * Configuration data (conversion rates) and Research Data are preserved
   */
  private static async clearSystemState(results: string[], errors: string[]): Promise<void> {
    try {
      console.log('[ResetDataWorkflow] 🗑️ Clearing System State...');
      
      for (const key of SYSTEM_STATE_KEYS) {
        try {
          await kv.del(key);
          console.log(`[ResetDataWorkflow] ✅ Cleared ${key}`);
        } catch (error) {
          const errorMsg = `Failed to clear ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`[ResetDataWorkflow] ❌ ${errorMsg}`);
        }
      }
      
      results.push(`Cleared ${SYSTEM_STATE_KEYS.length} System State keys`);
      console.log('[ResetDataWorkflow] ✅ System State cleared successfully');
    } catch (error) {
      const errorMsg = `Failed to clear System State: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[ResetDataWorkflow] ❌ ${errorMsg}`);
    }
  }
  
  /**
   * Seed default sites with batch processing
   */
  private static async seedDefaultSites(results: string[], errors: string[]): Promise<void> {
    try {
      console.log('[ResetDataWorkflow] 🌱 Seeding default sites...');

      const defaultSites = [
        {
          id: 'hq',
          name: 'HQ',
          status: SiteStatus.ACTIVE,
          metadata: { type: SiteType.PHYSICAL, businessType: PhysicalBusinessType.STORAGE, settlementId: '', googleMapsAddress: '' },
          createdAt: new Date(),
          updatedAt: new Date(),
          links: []
        },
        {
          id: 'drive',
          name: 'Drive',
          status: SiteStatus.ACTIVE,
          metadata: { type: SiteType.DIGITAL, digitalType: DigitalSiteType.REPOSITORY },
          createdAt: new Date(),
          updatedAt: new Date(),
          links: []
        },
        {
          id: 'none',
          name: 'None',
          status: SiteStatus.ACTIVE,
          metadata: { type: SiteType.SYSTEM, systemType: SystemSiteType.UNIVERSAL_TRACKING },
          createdAt: new Date(),
          updatedAt: new Date(),
          links: []
        }
      ];

      console.log(`[ResetDataWorkflow] 📊 Seeding ${defaultSites.length} default sites`);

      try {
        // Use batch operations for seeding sites
        const pipeline = kv.multi();
        const indexKey = buildIndexKey(EntityType.SITE);

        for (const site of defaultSites) {
          const dataKey = buildDataKey(EntityType.SITE, site.id);
          pipeline.set(dataKey, JSON.stringify(site));
        }

        // Add all site IDs to index in a single operation
        const siteIds = defaultSites.map(site => site.id);
        pipeline.sadd(indexKey, ...siteIds);

        // Execute batch
        await pipeline.exec();

        // Add results for each site
        for (const site of defaultSites) {
          results.push(`Seeded site: ${site.name}`);
        }

        console.log('[ResetDataWorkflow] ✅ Seeded default sites');
      } catch (error) {
        // Fallback to individual operations if batch fails
        console.warn('[ResetDataWorkflow] ⚠️ Batch seeding failed, falling back to individual operations');

        for (const site of defaultSites) {
          try {
            const dataKey = buildDataKey(EntityType.SITE, site.id);
            await kv.set(dataKey, JSON.stringify(site));

            // Add to sites index
            const indexKey = buildIndexKey(EntityType.SITE);
            await kv.sadd(indexKey, site.id);

            results.push(`Seeded site: ${site.name}`);
          } catch (individualError) {
            const errorMsg = `Failed to seed site ${site.name}: ${individualError instanceof Error ? individualError.message : 'Unknown error'}`;
            errors.push(errorMsg);
            console.error(`[ResetDataWorkflow] ❌ ${errorMsg}`);
          }
        }
      }
    } catch (error) {
      const errorMsg = `Failed to seed default sites: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[ResetDataWorkflow] ❌ ${errorMsg}`);
    }
  }


  /**


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
        getAllAccounts,
        upsertPlayer,
        upsertCharacter,
        upsertAccount
      } = await import('@/data-store/datastore');

      console.log('[ResetDataWorkflow] 🔍 About to call ensurePlayerOne...');

      // Initialize Player One
      await ensurePlayerOne(
        getAllPlayers,
        getAllCharacters,
        getAllAccounts,    // ← REAL IMPLEMENTATION
        upsertPlayer,
        upsertCharacter,
        upsertAccount,     // ← REAL IMPLEMENTATION
        true, // force
        { skipLogging: false }
      );

      console.log('[ResetDataWorkflow] 🔍 ensurePlayerOne completed, checking results...');

      // Verify the Triforce was created
      const players = await getAllPlayers();
      const characters = await getAllCharacters();
      const accounts = await getAllAccounts();

      console.log('[ResetDataWorkflow] 🔍 Post-creation verification:', {
        playersCount: players.length,
        charactersCount: characters.length,
        accountsCount: accounts.length,
        playerIds: players.map(p => p.id),
        characterIds: characters.map(c => c.id),
        accountIds: accounts.map(a => a.id)
      });

      results.push('Initialized Player One (Account + Player + Character)');
      console.log('[ResetDataWorkflow] ✅ Player One initialized successfully');

      // Initialize System State to baseline values
      const { saveCompanyAssets, savePersonalAssets } = await import('@/data-store/datastore');

      // Initialize company assets to zero
      await saveCompanyAssets({
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
      });

      // Initialize personal assets to zero
      await savePersonalAssets({
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
      });

      results.push('Initialized System State (assets zeroed)');
      console.log('[ResetDataWorkflow] ✅ System State initialized to baseline values');
    } catch (error) {
      const errorMsg = `Failed to initialize Player One: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[ResetDataWorkflow] ❌ ${errorMsg}`);
    }
  }
}
