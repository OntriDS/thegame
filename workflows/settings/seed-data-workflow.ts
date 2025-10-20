// workflows/settings/seed-data-workflow.ts
// Seed Data Workflow for KV-only architecture

import { kv } from '@vercel/kv';
import { buildDataKey, buildIndexKey } from '@/data-store/keys';

export interface SettingsResult {
  success: boolean;
  message: string;
  data?: {
    results: string[];
    errors: string[];
    operation: string;
    environment: string;
    source: string;
    requiresClientExecution?: boolean;
  };
}

export class SeedDataWorkflow {
  
  /**
   * Execute seed data operation
   */
  static async execute(source: 'backup' = 'backup', entityTypes?: string[]): Promise<SettingsResult> {
    try {
      console.log(`[SeedDataWorkflow] 🌱 Starting seed data operation (source: ${source})...`);
      
      const isKV = Boolean(process.env.KV_REST_API_URL);
      const isServer = typeof window === 'undefined';
      const results: string[] = [];
      const errors: string[] = [];
      
      console.log(`[SeedDataWorkflow] 🌍 Environment: ${isKV ? 'KV (Production)' : 'Local (Development)'}`);
      console.log(`[SeedDataWorkflow] 🖥️ Context: ${isServer ? 'Server' : 'Client'}`);
      
      // For local environment, we need to run on client side
      if (!isKV && isServer) {
        console.log(`[SeedDataWorkflow] ⚠️ Local environment detected on server - returning instruction for client-side execution`);
        return {
          success: true,
          message: 'Seed data requires client-side execution for local environment',
          data: { 
            results: ['Client-side seed data required for local environment'],
            errors: [],
            operation: 'seed-data',
            environment: 'local',
            source,
            requiresClientExecution: true
          }
        };
      }
      
      // Seed data based on source
      if (source === 'backup') {
        await this.seedFromBackup(entityTypes || [], results, errors);
      }
      
      const success = errors.length === 0;
      const message = success 
        ? `Successfully seeded data from ${source} - ${results.length} operations completed`
        : `Seed data completed with ${errors.length} errors - ${results.length} operations completed`;
      
      console.log(`[SeedDataWorkflow] ✅ Seed data operation completed: ${message}`);
      
      return {
        success,
        message,
        data: {
          results,
          errors,
          operation: 'seed-data',
          environment: isKV ? 'kv' : 'local',
          source
        }
      };
      
    } catch (error) {
      console.error('[SeedDataWorkflow] ❌ Seed data operation failed:', error);
      return {
        success: false,
        message: `Seed data operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: {
          results: [],
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          operation: 'seed-data',
          environment: 'unknown',
          source
        }
      };
    }
  }
  
  /**
   * Seed data from constants
   */
  private static async seedFromConstants(results: string[], errors: string[]): Promise<void> {
    try {
      console.log('[SeedDataWorkflow] 🌱 Seeding data from constants...');
      
      // Seed default sites
      await this.seedDefaultSites(results, errors);
      
      // Seed default tasks
      await this.seedDefaultTasks(results, errors);
      
    } catch (error) {
      const errorMsg = `Failed to seed from constants: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[SeedDataWorkflow] ❌ ${errorMsg}`);
    }
  }
  
  /**
   * Seed from backup KV keys
   */
  private static async seedFromBackup(entityTypes: string[], results: string[], errors: string[]): Promise<void> {
    try {
      console.log(`[SeedDataWorkflow] 🌱 Seeding from backup KV keys for: ${entityTypes.join(', ')}...`);
      
      for (const entityType of entityTypes) {
        try {
          const backupKey = `backup:${entityType}`;
          const backupData = await kv.get(backupKey);
          
          if (!backupData) {
            errors.push(`No backup found for ${entityType}`);
            continue;
          }
          
          const parsed = JSON.parse(backupData as string);
          const entities = parsed.data[entityType] || parsed.data;
          
          if (!Array.isArray(entities)) {
            errors.push(`Invalid backup format for ${entityType}`);
            continue;
          }
          
          // Seed each entity
          for (const entity of entities) {
            try {
              const dataKey = buildDataKey(entityType, entity.id);
              await kv.set(dataKey, JSON.stringify(entity));
              
              // Add to index
              const indexKey = buildIndexKey(entityType);
              await kv.sadd(indexKey, entity.id);
            } catch (error) {
              console.warn(`[SeedDataWorkflow] ⚠️ Failed to seed ${entityType} ${entity.id}:`, error);
            }
          }
          
          results.push(`Seeded ${entities.length} ${entityType} entities from backup`);
          console.log(`[SeedDataWorkflow] ✅ Seeded ${entities.length} ${entityType} entities`);
          
        } catch (error) {
          const errorMsg = `Failed to seed ${entityType} from backup: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`[SeedDataWorkflow] ❌ ${errorMsg}`);
        }
      }
      
      console.log(`[SeedDataWorkflow] ✅ Seeded from backup KV keys`);
    } catch (error) {
      const errorMsg = `Failed to seed from backup: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[SeedDataWorkflow] ❌ ${errorMsg}`);
    }
  }
  
  /**
   * Seed default sites and settlements
   */
  private static async seedDefaultSites(results: string[], errors: string[]): Promise<void> {
    try {
      console.log('[SeedDataWorkflow] 🌱 Seeding default sites and settlements...');
      
      // Load sites-db.json data
      const sitesDbData = await this.loadSitesDbData();
      
      if (sitesDbData) {
        // Seed settlements first
        if (sitesDbData.settlements && Array.isArray(sitesDbData.settlements)) {
          await this.seedSettlements(sitesDbData.settlements, results, errors);
        }
        
        // Seed sites
        if (sitesDbData.sites && Array.isArray(sitesDbData.sites)) {
          await this.seedSites(sitesDbData.sites, results, errors);
        }
      } else {
        // Fallback to hardcoded data if sites-db.json not available
        await this.seedFallbackSites(results, errors);
      }
      
      console.log('[SeedDataWorkflow] ✅ Seeded default sites');
    } catch (error) {
      const errorMsg = `Failed to seed default sites: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[SeedDataWorkflow] ❌ ${errorMsg}`);
    }
  }
  
  /**
   * Seed default tasks
   */
  private static async seedDefaultTasks(results: string[], errors: string[]): Promise<void> {
    try {
      console.log('[SeedDataWorkflow] 🌱 Seeding default tasks...');
      
      const defaultTasks = [
        {
          id: 'welcome-task',
          name: 'Welcome to TheGame',
          description: 'Your first task in TheGame system',
          type: 'strategy',
          status: 'created',
          priority: 'medium',
          station: 'Strategy',
          area: 'ADMIN',
          progress: 0,
          dueDate: null,
          order: 1,
          cost: 0,
          revenue: 0,
          siteId: 'home',
          createdAt: new Date(),
          updatedAt: new Date(),
          links: []
        }
      ];
      
      for (const task of defaultTasks) {
        try {
          const dataKey = buildDataKey('tasks', task.id);
          await kv.set(dataKey, JSON.stringify(task));
          
          // Add to tasks index
          const indexKey = buildIndexKey('tasks');
          await kv.sadd(indexKey, task.id);
          
          results.push(`Seeded task: ${task.name}`);
        } catch (error) {
          const errorMsg = `Failed to seed task ${task.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`[SeedDataWorkflow] ❌ ${errorMsg}`);
        }
      }
      
      console.log('[SeedDataWorkflow] ✅ Seeded default tasks');
    } catch (error) {
      const errorMsg = `Failed to seed default tasks: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[SeedDataWorkflow] ❌ ${errorMsg}`);
    }
  }

  /**
   * Load sites-db.json data
   */
  private static async loadSitesDbData(): Promise<any> {
    try {
      // Try to load from backup file
      const fs = await import('fs');
      const path = await import('path');
      
      const backupPath = path.join(process.cwd(), 'backups', 'sites', 'sites-db.json');
      
      if (fs.existsSync(backupPath)) {
        const data = fs.readFileSync(backupPath, 'utf8');
        return JSON.parse(data);
      }
      
      return null;
    } catch (error) {
      console.warn('[SeedDataWorkflow] ⚠️ Could not load sites-db.json:', error);
      return null;
    }
  }

  /**
   * Seed settlements from sites-db.json
   */
  private static async seedSettlements(settlements: any[], results: string[], errors: string[]): Promise<void> {
    try {
      console.log('[SeedDataWorkflow] 🌱 Seeding settlements...');
      
      for (const settlement of settlements) {
        try {
          const dataKey = buildDataKey('settlements', settlement.id);
          await kv.set(dataKey, JSON.stringify(settlement));
          
          // Add to settlements index
          const indexKey = buildIndexKey('settlements');
          await kv.sadd(indexKey, settlement.id);
          
          results.push(`Seeded settlement: ${settlement.name}`);
        } catch (error) {
          const errorMsg = `Failed to seed settlement ${settlement.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`[SeedDataWorkflow] ❌ ${errorMsg}`);
        }
      }
      
      console.log('[SeedDataWorkflow] ✅ Seeded settlements');
    } catch (error) {
      const errorMsg = `Failed to seed settlements: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[SeedDataWorkflow] ❌ ${errorMsg}`);
    }
  }

  /**
   * Seed sites from sites-db.json
   */
  private static async seedSites(sites: any[], results: string[], errors: string[]): Promise<void> {
    try {
      console.log('[SeedDataWorkflow] 🌱 Seeding sites...');
      
      for (const site of sites) {
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
          console.error(`[SeedDataWorkflow] ❌ ${errorMsg}`);
        }
      }
      
      console.log('[SeedDataWorkflow] ✅ Seeded sites');
    } catch (error) {
      const errorMsg = `Failed to seed sites: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[SeedDataWorkflow] ❌ ${errorMsg}`);
    }
  }

  /**
   * Fallback sites seeding (hardcoded data)
   */
  private static async seedFallbackSites(results: string[], errors: string[]): Promise<void> {
    try {
      console.log('[SeedDataWorkflow] 🌱 Seeding fallback sites...');
      
      const defaultSites = [
        {
          id: 'home',
          name: 'Home',
          description: 'Home base',
          metadata: {
            type: 'PHYSICAL',
            businessType: 'STORE',
            settlementId: 'settlement-uvita',
            googleMapsAddress: 'https://maps.app.goo.gl/...'
          },
          isActive: true,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
          links: []
        },
        {
          id: 'feria-box',
          name: 'Feria Box',
          description: 'Feria sales location',
          metadata: {
            type: 'PHYSICAL',
            businessType: 'STORE',
            settlementId: 'settlement-uvita',
            googleMapsAddress: 'https://maps.app.goo.gl/...'
          },
          isActive: true,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
          links: []
        },
        {
          id: 'digital-space',
          name: 'Digital Space',
          description: 'Digital workspace',
          metadata: {
            type: 'CLOUD',
            digitalType: 'WEBSITE'
          },
          isActive: true,
          status: 'active',
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
          
          results.push(`Seeded fallback site: ${site.name}`);
        } catch (error) {
          const errorMsg = `Failed to seed fallback site ${site.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`[SeedDataWorkflow] ❌ ${errorMsg}`);
        }
      }
      
      console.log('[SeedDataWorkflow] ✅ Seeded fallback sites');
    } catch (error) {
      const errorMsg = `Failed to seed fallback sites: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[SeedDataWorkflow] ❌ ${errorMsg}`);
    }
  }
}
