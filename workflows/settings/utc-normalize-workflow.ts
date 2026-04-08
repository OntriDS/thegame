import { 
  getAllTasks, upsertTask, 
  getAllItems, upsertItem, 
  getAllSales, upsertSale, 
  getAllFinancials, upsertFinancial,
  getAllCharacters, upsertCharacter,
  getAllPlayers, upsertPlayer,
  getAllSites, upsertSite
} from '@/data-store/datastore';
import { EntityType } from '@/types/enums';
import { parseFlexibleDate } from '@/lib/utils/date-utils';
import { isValid } from 'date-fns';
import { getUTCNow } from '@/lib/utils/utc-utils';
import { kvLPush, kvLRange, kvDel, kvSMembers, kvSAdd, kvSRem } from '@/data-store/kv';
import { buildLogMonthKey, buildLogMonthsIndexKey, buildArchiveCollectionIndexKey } from '@/data-store/keys';
import { getMonthKeyFromTimestamp } from '../entities-logging';

/**
 * UTC Normalization Workflow
 * 
 * Iterates through the entire database and ensures all date fields are
 * strictly formatted as UTC ISO strings. Re-builds monthly indexes if
 * any date shift causes a record to move between month buckets.
 */
export class UTCNormalizeWorkflow {
  
  static async execute(onProgress?: (msg: string) => void): Promise<{ 
    success: boolean; 
    processed: number; 
    fixed: number; 
    errors: string[] 
  }> {
    const results = {
      success: true,
      processed: 0,
      fixed: 0,
      errors: [] as string[]
    };

    const log = (msg: string) => {
      console.log(`[UTCNormalize] ${msg}`);
      if (onProgress) onProgress(msg);
    };

    try {
      // 1. Tasks
      log('Normalizing Tasks...');
      const tasks = await getAllTasks();
      for (const task of tasks) {
        results.processed++;
        const originalMonth = task.collectedAt || task.doneAt || task.createdAt;
        const originalMonthKey = originalMonth ? this.getMonthKey(originalMonth) : null;
        
        const normalized = this.normalizeEntityDates(task, [
          'createdAt', 'updatedAt', 'dueDate', 'scheduledStart', 'doneAt', 'collectedAt'
        ]);
        
        if (normalized.changed) {
          results.fixed++;
          await upsertTask(normalized.data, { skipWorkflowEffects: true, skipDuplicateCheck: true, skipLinkEffects: true });
          
          // Re-index monthly bucket if needed
          const newMonth = normalized.data.collectedAt || normalized.data.doneAt || normalized.data.createdAt;
          const newMonthKey = newMonth ? this.getMonthKey(newMonth) : null;
          
          if (newMonthKey && originalMonthKey && newMonthKey !== originalMonthKey) {
            log(`  Task ${task.id} moved: ${originalMonthKey} -> ${newMonthKey}`);
            await this.reindexMonthlyBucket(EntityType.TASK, task.id, originalMonthKey, newMonthKey);
          }
        }
      }

      // 2. Items
      log('Normalizing Items...');
      const items = await getAllItems();
      for (const item of items) {
        results.processed++;
        const normalized = this.normalizeEntityDates(item, [
          'createdAt', 'updatedAt', 'lastRestockDate', 'soldAt'
        ]);
        if (normalized.changed) {
          results.fixed++;
          await upsertItem(normalized.data, { skipWorkflowEffects: true, skipLinkEffects: true });
          
          // Re-index monthly bucket if needed (Items are indexed by createdAt or soldAt)
          const originalMonthKey = item.soldAt ? this.getMonthKey(item.soldAt) : this.getMonthKey(item.createdAt);
          const newMonthKey = normalized.data.soldAt ? this.getMonthKey(normalized.data.soldAt) : this.getMonthKey(normalized.data.createdAt);
          
          if (originalMonthKey !== newMonthKey) {
            log(`  Item ${item.id} moved: ${originalMonthKey} -> ${newMonthKey}`);
            await this.reindexMonthlyBucket(EntityType.ITEM, item.id, originalMonthKey, newMonthKey);
          }
        }
      }

      // 3. Sales
      log('Normalizing Sales...');
      const sales = await getAllSales();
      for (const sale of sales) {
        results.processed++;
        const originalMonthKey = sale.saleDate ? this.getMonthKey(sale.saleDate) : null;
        
        const normalized = this.normalizeEntityDates(sale, [
          'createdAt', 'updatedAt', 'saleDate', 'doneAt', 'collectedAt'
        ]);
        
        if (normalized.changed) {
          results.fixed++;
          await upsertSale(normalized.data, { skipWorkflowEffects: true, skipLinkEffects: true });
          
          const newMonthKey = normalized.data.saleDate ? this.getMonthKey(normalized.data.saleDate) : null;
          if (newMonthKey && originalMonthKey && newMonthKey !== originalMonthKey) {
            log(`  Sale ${sale.id} moved: ${originalMonthKey} -> ${newMonthKey}`);
            await this.reindexMonthlyBucket(EntityType.SALE, sale.id, originalMonthKey, newMonthKey);
          }
        }
      }

      // 4. Financials
      log('Normalizing Financial Records...');
      const financials = await getAllFinancials();
      for (const finrec of financials) {
        results.processed++;
        const normalized = this.normalizeEntityDates(finrec, [
          'createdAt', 'updatedAt'
        ]);
        if (normalized.changed) {
          results.fixed++;
          await upsertFinancial(normalized.data, { skipWorkflowEffects: true, skipLinkEffects: true });
          
          // Financials are usually indexed by their 'month' and 'year' fields, 
          // but we also have monthly sets.
          const originalMonthKey = this.getMonthKey(finrec.createdAt);
          const newMonthKey = this.getMonthKey(normalized.data.createdAt);
          
          if (originalMonthKey !== newMonthKey) {
            log(`  Financial ${finrec.id} moved: ${originalMonthKey} -> ${newMonthKey}`);
            await this.reindexMonthlyBucket(EntityType.FINANCIAL, finrec.id, originalMonthKey, newMonthKey);
          }
        }
      }

      // 5. Characters
      log('Normalizing Characters...');
      const characters = await getAllCharacters();
      for (const char of characters) {
        results.processed++;
        const normalized = this.normalizeEntityDates(char, ['createdAt', 'updatedAt', 'lastActiveAt']);
        if (normalized.changed) {
          results.fixed++;
          await upsertCharacter(normalized.data, { skipWorkflowEffects: true, skipLinkEffects: true });
        }
      }

      // 6. Players
      log('Normalizing Players...');
      const players = await getAllPlayers();
      for (const player of players) {
        results.processed++;
        const normalized = this.normalizeEntityDates(player, ['createdAt', 'updatedAt', 'lastActiveAt']);
        if (normalized.changed) {
          results.fixed++;
          await upsertPlayer(normalized.data, { skipWorkflowEffects: true, skipLinkEffects: true });
        }
      }

      // 7. Sites
      log('Normalizing Sites...');
      const sites = await getAllSites();
      for (const site of sites) {
        results.processed++;
        const normalized = this.normalizeEntityDates(site, ['createdAt', 'updatedAt']);
        if (normalized.changed) {
          results.fixed++;
          await upsertSite(normalized.data, { skipWorkflowEffects: true });
        }
      }

      // 8. Lifecycle Logs (Entities)
      log('Normalizing Entity Logs...');
      const types = [EntityType.TASK, EntityType.ITEM, EntityType.SALE, EntityType.FINANCIAL, EntityType.CHARACTER, EntityType.PLAYER, EntityType.SITE];
      for (const type of types) {
        const monthKeys = await this.getLogMonths(type);
        for (const monthKey of monthKeys) {
          const listKey = buildLogMonthKey(type, monthKey);
          const rawEntries = await kvLRange(listKey, 0, -1);
          if (!rawEntries || rawEntries.length === 0) continue;
          
          const entries = rawEntries.map(e => typeof e === 'string' ? JSON.parse(e) : e);
          
          let changedCount = 0;
          for (const entry of entries) {
            const n = this.normalizeEntityDates(entry, ['timestamp', 'lastUpdated', 'deletedAt', 'editedAt']);
            if (n.changed) {
              changedCount++;
              results.fixed++;
            }
          }
          
          if (changedCount > 0) {
            await kvDel(listKey);
            // Reverse because LPUSH adds to head
            const serialized = entries.reverse().map((e: any) => JSON.stringify(e));
            await kvLPush(listKey, ...serialized);
          }
        }
      }

      log(`Normalization complete. Processed: ${results.processed}, Fixed: ${results.fixed}`);
      return results;

    } catch (err) {
      results.success = false;
      const errorMsg = err instanceof Error ? err.message : String(err);
      results.errors.push(errorMsg);
      log(`❌ Critical error during normalization: ${errorMsg}`);
      return results;
    }
  }

  private static normalizeEntityDates(entity: any, fields: string[]): { data: any, changed: boolean } {
    let changed = false;
    const data = { ...entity };
    
    for (const field of fields) {
      const val = data[field];
      if (!val) continue;
      
      try {
        const date = parseFlexibleDate(val);
        if (isValid(date)) {
          const iso = date.toISOString();
          if (val !== iso) {
            data[field] = iso;
            changed = true;
          }
        }
      } catch (err) {
        // Skip invalid dates
      }
    }
    
    return { data, changed };
  }

  private static getMonthKey(date: string | Date): string {
    const d = typeof date === 'string' ? parseFlexibleDate(date) : date;
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const yy = String(d.getUTCFullYear()).slice(-2);
    return `${mm}-${yy}`;
  }

  private static async getLogMonths(type: EntityType): Promise<string[]> {
    const indexKey = buildLogMonthsIndexKey(type);
    return await kvSMembers(indexKey);
  }

  private static async reindexMonthlyBucket(type: EntityType, id: string, oldMonth: string, newMonth: string) {
    const archiveType = type === EntityType.TASK ? 'tasks' : type === EntityType.SALE ? 'sales' : type === EntityType.ITEM ? 'items' : 'financials';
    
    // 1. Archive/Collected Index
    const oldArchiveKey = buildArchiveCollectionIndexKey(archiveType as any, oldMonth);
    const newArchiveKey = buildArchiveCollectionIndexKey(archiveType as any, newMonth);
    await kvSRem(oldArchiveKey, id);
    await kvSAdd(newArchiveKey, id);

    // 2. Local Monthly Index (if applicable)
    // Items and Financials often use buildMonthIndexKey
    if (type === EntityType.ITEM || type === EntityType.FINANCIAL) {
      const { buildMonthIndexKey } = await import('@/data-store/keys');
      const oldLocalKey = buildMonthIndexKey(type, oldMonth);
      const newLocalKey = buildMonthIndexKey(type, newMonth);
      await kvSRem(oldLocalKey, id);
      await kvSAdd(newLocalKey, id);
    }
  }
}
