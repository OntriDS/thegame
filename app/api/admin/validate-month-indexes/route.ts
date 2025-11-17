import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { EntityType } from '@/types/enums';
import { formatMonthKey } from '@/lib/utils/date-utils';
import {
  getAllTasks,
  getAllItems,
  getAllSales,
  getAllFinancials
} from '@/data-store/datastore';
import { kvSMembers } from '@/data-store/kv';
import { buildMonthIndexKey } from '@/data-store/keys';

export const dynamic = 'force-dynamic';

interface ValidationResult {
  entityType: string;
  totalEntities: number;
  entitiesWithDate: number;
  indexedEntities: number;
  missingIndexes: number;
  inconsistencies: string[];
  datePriority: string;
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results: ValidationResult[] = [];

    // Tasks: collectedAt → doneAt → createdAt
    const tasks = await getAllTasks();
    const taskValidation: ValidationResult = {
      entityType: 'Task',
      totalEntities: tasks.length,
      entitiesWithDate: 0,
      indexedEntities: 0,
      missingIndexes: 0,
      inconsistencies: [],
      datePriority: 'collectedAt → doneAt → createdAt'
    };

    for (const task of tasks) {
      const date = (task as any).collectedAt || (task as any).doneAt || task.createdAt;
      if (!date) continue;

      taskValidation.entitiesWithDate++;
      const monthKey = formatMonthKey(date);
      const indexKey = buildMonthIndexKey(EntityType.TASK, monthKey);
      const indexedIds = await kvSMembers(indexKey);

      if (!indexedIds.includes(task.id)) {
        taskValidation.missingIndexes++;
        taskValidation.inconsistencies.push(`Task ${task.id} missing from month index ${monthKey}`);
      } else {
        taskValidation.indexedEntities++;
      }
    }
    results.push(taskValidation);

    // Items: soldAt → createdAt
    const items = await getAllItems();
    const itemValidation: ValidationResult = {
      entityType: 'Item',
      totalEntities: items.length,
      entitiesWithDate: 0,
      indexedEntities: 0,
      missingIndexes: 0,
      inconsistencies: [],
      datePriority: 'soldAt → createdAt'
    };

    for (const item of items) {
      const date = (item as any).soldAt || item.createdAt;
      if (!date) continue;

      itemValidation.entitiesWithDate++;
      const monthKey = formatMonthKey(date);
      const indexKey = buildMonthIndexKey(EntityType.ITEM, monthKey);
      const indexedIds = await kvSMembers(indexKey);

      if (!indexedIds.includes(item.id)) {
        itemValidation.missingIndexes++;
        itemValidation.inconsistencies.push(`Item ${item.id} missing from month index ${monthKey}`);
      } else {
        itemValidation.indexedEntities++;
      }
    }
    results.push(itemValidation);

    // Sales: collectedAt → saleDate → createdAt
    const sales = await getAllSales();
    const saleValidation: ValidationResult = {
      entityType: 'Sale',
      totalEntities: sales.length,
      entitiesWithDate: 0,
      indexedEntities: 0,
      missingIndexes: 0,
      inconsistencies: [],
      datePriority: 'collectedAt → saleDate → createdAt'
    };

    for (const sale of sales) {
      const date = (sale as any).collectedAt || (sale as any).saleDate || (sale as any).createdAt;
      if (!date) continue;

      saleValidation.entitiesWithDate++;
      const monthKey = formatMonthKey(date);
      const indexKey = buildMonthIndexKey(EntityType.SALE, monthKey);
      const indexedIds = await kvSMembers(indexKey);

      if (!indexedIds.includes(sale.id)) {
        saleValidation.missingIndexes++;
        saleValidation.inconsistencies.push(`Sale ${sale.id} missing from month index ${monthKey}`);
      } else {
        saleValidation.indexedEntities++;
      }
    }
    results.push(saleValidation);

    // Financials: year/month fields
    const financials = await getAllFinancials();
    const financialValidation: ValidationResult = {
      entityType: 'Financial',
      totalEntities: financials.length,
      entitiesWithDate: 0,
      indexedEntities: 0,
      missingIndexes: 0,
      inconsistencies: [],
      datePriority: 'year/month fields'
    };

    for (const financial of financials) {
      const date = (financial.year && financial.month)
        ? new Date(financial.year, financial.month - 1, 1)
        : (financial as any).createdAt ? new Date((financial as any).createdAt) : null;

      if (!date) continue;

      financialValidation.entitiesWithDate++;
      const monthKey = formatMonthKey(date);
      const indexKey = buildMonthIndexKey(EntityType.FINANCIAL, monthKey);
      const indexedIds = await kvSMembers(indexKey);

      if (!indexedIds.includes(financial.id)) {
        financialValidation.missingIndexes++;
        financialValidation.inconsistencies.push(`Financial ${financial.id} missing from month index ${monthKey}`);
      } else {
        financialValidation.indexedEntities++;
      }
    }
    results.push(financialValidation);

    // Summary
    const totalInconsistencies = results.reduce((sum, r) => sum + r.inconsistencies.length, 0);
    const isHealthy = totalInconsistencies === 0;

    return NextResponse.json({
      success: true,
      healthy: isHealthy,
      summary: {
        totalEntities: results.reduce((sum, r) => sum + r.totalEntities, 0),
        entitiesWithDates: results.reduce((sum, r) => sum + r.entitiesWithDate, 0),
        indexedEntities: results.reduce((sum, r) => sum + r.indexedEntities, 0),
        totalInconsistencies
      },
      results
    });

  } catch (error) {
    console.error('[validate-month-indexes] Failed', error);
    return NextResponse.json({ error: 'Validation failed' }, { status: 500 });
  }
}