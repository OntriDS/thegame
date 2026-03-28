import { EntityType } from '@/types/enums';

export type EnsureLogResult = {
  success: boolean;
  noop?: boolean;
  error?: string;
};

/** Primary lifecycle log row per entity (sale→CHARGED, task→DONE, item→SOLD, financial→DONE). */
export async function ensureDoneLog(
  entityType: EntityType,
  entityId: string
): Promise<EnsureLogResult> {
  switch (entityType) {
    case EntityType.SALE: {
      const { ensureSaleChargedLog } = await import('./entities-workflows/sale.workflow');
      return ensureSaleChargedLog(entityId);
    }
    case EntityType.TASK: {
      const { ensureTaskDoneLog } = await import('./entities-workflows/task.workflow');
      return ensureTaskDoneLog(entityId);
    }
    case EntityType.ITEM: {
      const { ensureItemSoldLog } = await import('./entities-workflows/item.workflow');
      return ensureItemSoldLog(entityId);
    }
    case EntityType.FINANCIAL: {
      const { ensureFinancialDoneLog } = await import('./entities-workflows/financial.workflow');
      return ensureFinancialDoneLog(entityId);
    }
    default:
      return {
        success: false,
        error: `ensureDoneLog not supported for entityType: ${entityType}`,
      };
  }
}

/** COLLECTED row when state implies collection (sale and task only). */
export async function ensureCollectedLog(
  entityType: EntityType,
  entityId: string
): Promise<EnsureLogResult> {
  switch (entityType) {
    case EntityType.SALE: {
      const { ensureSaleCollectedLog } = await import('./entities-workflows/sale.workflow');
      return ensureSaleCollectedLog(entityId);
    }
    case EntityType.TASK: {
      const { ensureTaskCollectedLog } = await import('./entities-workflows/task.workflow');
      return ensureTaskCollectedLog(entityId);
    }
    default:
      return {
        success: false,
        error:
          'ensureCollectedLog supports sale and task only. Use ensureDoneLog for item (SOLD) or financial (DONE).',
      };
  }
}
