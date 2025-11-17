// workflows/snapshot-workflows.ts
// Snapshot creation workflows for Archive-First approach

import { TaskSnapshot, FinancialSnapshot, SaleSnapshot, ItemSnapshot } from '@/types/archive';
import type { Task, FinancialRecord, Sale, Item } from '@/types/entities';
import { addEntityToArchive } from '@/data-store/repositories/archive.repo';
import { formatMonthKey } from '@/lib/utils/date-utils';

/**
 * Create TaskSnapshot when task is collected
 */
export async function createTaskSnapshot(
  task: Task,
  collectedAt: Date,
  collectedByCharacterId?: string
): Promise<TaskSnapshot> {
  const snapshot: TaskSnapshot = {
    id: `task-snapshot-${task.id}-${Date.now()}`,
    sourceId: task.id,
    sourceType: 'TASK',
    snapshotDate: new Date(),
    collectedAt,
    reason: 'collected',
    data: {
      ...task,
      isCollected: true,
      collectedAt,
      isCollectedByCharacterId: collectedByCharacterId,
      pointsCollected: true,
      // Convert null to undefined for optional fields
      siteId: task.siteId ?? undefined,
      targetSiteId: task.targetSiteId ?? undefined,
      // Extract rewards.points to flat structure
      rewards: task.rewards?.points || { xp: 0, rp: 0, fp: 0, hp: 0 }
    },
    createdAt: new Date()
  };

  // Store in archive
  const monthKey = formatMonthKey(collectedAt);
  await addEntityToArchive('task-snapshots', monthKey, snapshot);

  return snapshot;
}

/**
 * Create FinancialSnapshot when financial record is collected
 */
export async function createFinancialSnapshot(
  financial: FinancialRecord,
  collectedAt: Date,
  collectedByCharacterId?: string
): Promise<FinancialSnapshot> {
  const snapshot: FinancialSnapshot = {
    id: `financial-snapshot-${financial.id}-${Date.now()}`,
    sourceId: financial.id,
    sourceType: 'FINANCIAL',
    snapshotDate: new Date(),
    collectedAt,
    reason: 'collected',
    data: {
      ...financial,
      status: 'COLLECTED',
      collectedAt,
      collectedByCharacterId,
      // Map required fields - FinancialRecord uses 'name' but snapshot expects 'counterpartyName'
      counterpartyName: financial.name || '',
      amount: financial.revenue || financial.cost || 0,
      company: financial.type === 'company' ? 'company' : 'personal',
      // Map type: 'company'|'personal' to 'income'|'expense' based on revenue vs cost
      type: financial.revenue > 0 ? 'income' : 'expense'
    },
    createdAt: new Date()
  };

  // Store in archive
  const monthKey = formatMonthKey(collectedAt);
  await addEntityToArchive('financial-snapshots', monthKey, snapshot);

  return snapshot;
}

/**
 * Create SaleSnapshot when sale is collected
 */
export async function createSaleSnapshot(
  sale: Sale,
  collectedAt: Date,
  collectedByCharacterId?: string
): Promise<SaleSnapshot> {
  // Calculate totalCost from sale lines
  // Note: ItemSaleLine doesn't have unitCost, so we'll need to look up items
  // For now, we'll set to 0 and can enhance later if needed
  // The cost is typically tracked in the FinancialRecord created from the sale
  const totalCost = 0; // TODO: Calculate from item unitCost if needed

  const snapshot: SaleSnapshot = {
    id: `sale-snapshot-${sale.id}-${Date.now()}`,
    sourceId: sale.id,
    sourceType: 'SALE',
    snapshotDate: new Date(),
    collectedAt,
    reason: 'collected',
    data: {
      ...sale,
      isCollected: true,
      collectedAt,
      collectedByCharacterId,
      // Ensure required fields are present
      counterpartyName: sale.counterpartyName || '',
      // Convert null to undefined for optional fields
      customerId: sale.customerId ?? undefined,
      siteId: sale.siteId ?? undefined,
      // Map totals to snapshot format
      totals: {
        subtotal: sale.totals.subtotal,
        taxAmount: sale.totals.taxTotal,
        totalRevenue: sale.totals.totalRevenue,
        totalCost: totalCost,
        netProfit: sale.totals.totalRevenue - totalCost
      }
    },
    createdAt: new Date()
  };

  // Store in archive
  const monthKey = formatMonthKey(collectedAt);
  await addEntityToArchive('sale-snapshots', monthKey, snapshot);

  return snapshot;
}


/**
 * Batch create snapshots for multiple entities (e.g., bulk operations)
 */
/**
 * Create ItemSnapshot when item is sold via CHARGED sale or manually set to SOLD
 * Items create snapshots when SOLD, following the same pattern as other entities
 */
export async function createItemSnapshot(
  item: Item,
  soldQuantity: number,
  sale?: Sale | null,
  soldAt?: Date
): Promise<ItemSnapshot> {
  const snapshotSoldAt = soldAt || (sale?.saleDate) || new Date();
  
  // Calculate cost (unitCost * total quantity or use existing cost)
  const totalQuantity = item.stock?.reduce((sum, sp) => sum + sp.quantity, 0) || 0;
  const itemCost = item.unitCost ? item.unitCost * totalQuantity : (item as any).cost || 0;

  const snapshot: ItemSnapshot = {
    id: `item-snapshot-${item.id}-${Date.now()}`,
    sourceId: item.id,
    sourceType: 'ITEM',
    snapshotDate: new Date(),
    soldAt: snapshotSoldAt,
    reason: 'sold',
    data: {
      ...item,
      status: 'SOLD',
      soldAt: snapshotSoldAt,
      saleId: sale?.id,
      quantitySold: soldQuantity,
      cost: itemCost,
      // Capture stock state at time of sale
      stock: [...(item.stock || [])]
    },
    createdAt: new Date()
  };

  // Store in archive
  const monthKey = formatMonthKey(snapshotSoldAt);
  await addEntityToArchive('item-snapshots', monthKey, snapshot);

  return snapshot;
}

export async function createSnapshotsBatch(
  snapshots: Array<{
    type: 'task' | 'financial' | 'sale' | 'item';
    entity: Task | FinancialRecord | Sale | Item;
    context: {
      collectedAt?: Date;
      soldAt?: Date;
      collectedByCharacterId?: string;
      sale?: Sale;
      soldQuantity?: number;
    };
  }>
): Promise<void> {
  const promises = snapshots.map(({ type, entity, context }) => {
    switch (type) {
      case 'task':
        return createTaskSnapshot(
          entity as Task,
          context.collectedAt!,
          context.collectedByCharacterId
        );
      case 'financial':
        return createFinancialSnapshot(
          entity as FinancialRecord,
          context.collectedAt!,
          context.collectedByCharacterId
        );
      case 'sale':
        return createSaleSnapshot(
          entity as Sale,
          context.collectedAt!,
          context.collectedByCharacterId
        );
      case 'item':
        return createItemSnapshot(
          entity as Item,
          context.soldQuantity!,
          context.sale || null,
          context.soldAt
        );
      default:
        throw new Error(`Unknown snapshot type: ${type}`);
    }
  });

  await Promise.all(promises);
}