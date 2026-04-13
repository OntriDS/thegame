// workflows/settings/normalize-item-taxonomy-workflow.ts

import {
  getAllItems,
  getAllTasks,
  getAllSales,
  upsertItem,
  upsertTask,
  upsertSale,
  upsertFinancial,
} from '@/data-store/datastore';
import { getAllFinancials as repoGetAllFinancials } from '@/data-store/repositories/financial.repo';
import {
  parseTaxonomyScopes,
  migrateItemByScopes,
  migrateTaskByScopes,
  migrateFinancialByScopes,
  migrateSaleByScopes,
} from '@/lib/item-taxonomy-migrate-scopes';
import { normalizeItemTypeString } from '@/lib/item-taxonomy-normalize';
import { ItemType } from '@/types/enums';
import type { Item, Task, Sale, FinancialRecord } from '@/types/entities';

const MAX_SAMPLES = 25;

function itemSig(i: Pick<Item, 'type' | 'subItemType'>) {
  return JSON.stringify({ type: i.type, subItemType: i.subItemType ?? null });
}

function taskSig(t: Pick<Task, 'outputItemType' | 'outputItemSubType'>) {
  return JSON.stringify({
    outputItemType: t.outputItemType ?? null,
    outputItemSubType: t.outputItemSubType ?? null,
  });
}

function finSig(f: Pick<FinancialRecord, 'outputItemType' | 'outputItemSubType'>) {
  return JSON.stringify({
    outputItemType: f.outputItemType ?? null,
    outputItemSubType: f.outputItemSubType ?? null,
  });
}

function saleServiceSig(sale: Sale): string {
  const parts =
    sale.lines
      ?.filter((l) => l.kind === 'service')
      .map((l) => {
        if (l.kind !== 'service') return '';
        return `${l.outputItemType ?? ''}:${l.outputItemSubType ?? ''}`;
      }) ?? [];
  return parts.join('|');
}

export interface NormalizeItemTaxonomyParams {
  dryRun?: boolean;
  scopes?: string[];
}

export interface NormalizeItemTaxonomyResult {
  success: boolean;
  message: string;
  data?: {
    dryRun: boolean;
    scopes: string[];
    items: { examined: number; updated: number; samples: Array<{ id: string; before: string; after: string }> };
    tasks: { examined: number; updated: number; samples: Array<{ id: string; before: string; after: string }> };
    financials: { examined: number; updated: number; samples: Array<{ id: string; before: string; after: string }> };
    sales: { examined: number; updated: number; samples: Array<{ id: string; before: string; after: string }> };
    report: Record<string, number>;
    errors: string[];
  };
}

export class NormalizeItemTaxonomyWorkflow {
  static async execute(params: NormalizeItemTaxonomyParams = {}): Promise<NormalizeItemTaxonomyResult> {
    const dryRun = params.dryRun !== false;
    const scopes = parseTaxonomyScopes(params.scopes);
    const scopeList = [...scopes];

    const errors: string[] = [];
    const report: Record<string, number> = {
      itemTypeChanges: 0,
      digitalSubtypeChanges: 0,
      artworkSubtypeChanges: 0,
      printSubtypeChanges: 0,
      stickerSubtypeChanges: 0,
      merchSubtypeChanges: 0,
      craftSubtypeChanges: 0,
      bundleSubtypeChanges: 0,
      materialSubtypeChanges: 0,
      equipmentSubtypeChanges: 0,
    };

    const itemSamples: Array<{ id: string; before: string; after: string }> = [];
    let itemsExamined = 0;
    let itemsUpdated = 0;

    const taskSamples: Array<{ id: string; before: string; after: string }> = [];
    let tasksExamined = 0;
    let tasksUpdated = 0;

    const finSamples: Array<{ id: string; before: string; after: string }> = [];
    let finsExamined = 0;
    let finsUpdated = 0;

    const saleSamples: Array<{ id: string; before: string; after: string }> = [];
    let salesExamined = 0;
    let salesUpdated = 0;

    try {
      const items = await getAllItems();
      for (const item of items) {
        itemsExamined++;
        const before = itemSig(item);
        const next = migrateItemByScopes(item, scopes);
        const after = itemSig(next);
        if (before === after) continue;

        if (item.type !== next.type) report.itemTypeChanges++;
        const resType = (normalizeItemTypeString(String(item.type)) ?? item.type) as ItemType;
        const subChanged = (item.subItemType || '') !== (next.subItemType || '');
        if (subChanged && resType === ItemType.DIGITAL) report.digitalSubtypeChanges++;
        if (subChanged && resType === ItemType.ARTWORK) report.artworkSubtypeChanges++;
        if (subChanged && resType === ItemType.PRINT) report.printSubtypeChanges++;
        if (subChanged && resType === ItemType.STICKER) report.stickerSubtypeChanges++;
        if (subChanged && resType === ItemType.MERCH) report.merchSubtypeChanges++;
        if (subChanged && resType === ItemType.CRAFT) report.craftSubtypeChanges++;
        if (subChanged && resType === ItemType.BUNDLE) report.bundleSubtypeChanges++;
        if (subChanged && resType === ItemType.MATERIAL) report.materialSubtypeChanges++;
        if (subChanged && resType === ItemType.EQUIPMENT) report.equipmentSubtypeChanges++;

        itemsUpdated++;
        if (itemSamples.length < MAX_SAMPLES) {
          itemSamples.push({ id: item.id, before, after });
        }
        if (!dryRun) {
          try {
            await upsertItem(next);
          } catch (e) {
            errors.push(`item ${item.id}: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      }

      const tasks = await getAllTasks();
      for (const task of tasks) {
        tasksExamined++;
        const before = taskSig(task);
        const next = migrateTaskByScopes(task, scopes);
        const after = taskSig(next);
        if (before === after) continue;
        tasksUpdated++;
        if (taskSamples.length < MAX_SAMPLES) {
          taskSamples.push({ id: task.id, before, after });
        }
        if (!dryRun) {
          try {
            await upsertTask(next);
          } catch (e) {
            errors.push(`task ${task.id}: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      }

      const financials = await repoGetAllFinancials();
      for (const fin of financials) {
        finsExamined++;
        const before = finSig(fin);
        const next = migrateFinancialByScopes(fin, scopes);
        const after = finSig(next);
        if (before === after) continue;
        finsUpdated++;
        if (finSamples.length < MAX_SAMPLES) {
          finSamples.push({ id: fin.id, before, after });
        }
        if (!dryRun) {
          try {
            await upsertFinancial(next);
          } catch (e) {
            errors.push(`financial ${fin.id}: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      }

      const sales = await getAllSales();
      for (const sale of sales) {
        salesExamined++;
        const before = saleServiceSig(sale);
        const next = migrateSaleByScopes(sale, scopes);
        const after = saleServiceSig(next);
        if (before === after) continue;
        salesUpdated++;
        if (saleSamples.length < MAX_SAMPLES) {
          saleSamples.push({ id: sale.id, before, after });
        }
        if (!dryRun) {
          try {
            await upsertSale(next);
          } catch (e) {
            errors.push(`sale ${sale.id}: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      }

      const mode = dryRun ? 'Dry run' : 'Apply';
      const message = `${mode} complete: items ${itemsUpdated}/${itemsExamined}, tasks ${tasksUpdated}/${tasksExamined}, financials ${finsUpdated}/${finsExamined}, sales ${salesUpdated}/${salesExamined}${errors.length ? ` (${errors.length} errors)` : ''}`;

      return {
        success: errors.length === 0,
        message,
        data: {
          dryRun,
          scopes: scopeList,
          items: { examined: itemsExamined, updated: itemsUpdated, samples: itemSamples },
          tasks: { examined: tasksExamined, updated: tasksUpdated, samples: taskSamples },
          financials: { examined: finsExamined, updated: finsUpdated, samples: finSamples },
          sales: { examined: salesExamined, updated: salesUpdated, samples: saleSamples },
          report,
          errors,
        },
      };
    } catch (e) {
      return {
        success: false,
        message: `Normalize item taxonomy failed: ${e instanceof Error ? e.message : String(e)}`,
        data: {
          dryRun,
          scopes: scopeList,
          items: { examined: itemsExamined, updated: itemsUpdated, samples: itemSamples },
          tasks: { examined: tasksExamined, updated: tasksUpdated, samples: taskSamples },
          financials: { examined: finsExamined, updated: finsUpdated, samples: finSamples },
          sales: { examined: salesExamined, updated: salesUpdated, samples: saleSamples },
          report,
          errors: [...errors, e instanceof Error ? e.message : String(e)],
        },
      };
    }
  }
}
