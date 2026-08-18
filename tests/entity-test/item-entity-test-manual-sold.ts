import { afterEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

vi.mock('server-only', () => ({}));

import {
  getAllItems,
  getItemById,
  removeItem,
  upsertItem,
} from '@/data-store/datastore';
import { ItemStatus, ItemType } from '@/types/enums';
import type { SubItemType } from '@/types/type-aliases';
import { getUTCNow } from '@/lib/utils/utc-utils';

const BASE_ITEM_ID = 'entity-test-item-manual-sold';
const outputPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'item-entity-test-manual-sold.output.json'
);

describe('entity-test: manually sold Item', () => {
  afterEach(async () => {
    const allItems = await getAllItems();
    for (const item of allItems.filter(item => item.id === BASE_ITEM_ID || item.id.startsWith(`${BASE_ITEM_ID}-manualsold-`))) {
      await removeItem(item.id);
    }
  });

  it('creates a schema-compatible sold clone and restores inventory when the clone is deleted', async () => {
    await removeItem(BASE_ITEM_ID);
    const now = getUTCNow();
    const base = await upsertItem({
      id: BASE_ITEM_ID,
      name: 'testing-manual-sold-item',
      type: ItemType.BUNDLE,
      subItemType: 'sticker' as SubItemType,
      status: ItemStatus.FOR_SALE,
      stock: [{ siteId: 'hq', quantity: 2 }],
      pricing: {
        unitCost: { minorUnits: '100', currency: 'USD' },
        targetPrice: { minorUnits: '250', currency: 'USD' },
      },
      context: { collection: 'no-collection', year: 2026 },
      createdAt: now,
      updatedAt: now,
    } as any);

    await upsertItem({
      ...base,
      status: ItemStatus.SOLD,
      quantitySold: 1,
      updatedAt: getUTCNow(),
    } as any);

    const inventoryAfterSale = await getItemById(BASE_ITEM_ID);
    const soldClone = (await getAllItems()).find(item =>
      item.id.startsWith(`${BASE_ITEM_ID}-manualsold-`)
    );
    if (!soldClone) throw new Error('Manual sold clone was not created.');
    if (!inventoryAfterSale) throw new Error('Inventory item disappeared after partial manual sale.');

    expect(inventoryAfterSale.status).toBe(ItemStatus.FOR_SALE);
    expect(inventoryAfterSale.stock).toEqual([{ siteId: 'hq', quantity: 1 }]);
    expect(inventoryAfterSale).not.toHaveProperty('quantitySold');
    expect(soldClone).toMatchObject({
      schemaVersion: base.schemaVersion,
      version: base.version,
      name: base.name,
      type: base.type,
      subItemType: base.subItemType,
      status: ItemStatus.SOLD,
      quantitySold: 1,
      sourceRecordId: 'manual',
      stock: [{ siteId: 'hq', quantity: 0 }],
      pricing: base.pricing,
      context: { collection: 'no-collection', year: 2026 },
    });
    expect(soldClone).not.toHaveProperty('soldAt');
    expect(soldClone).not.toHaveProperty('sourceSaleId');

    await removeItem(soldClone.id);
    const restored = await getItemById(BASE_ITEM_ID);
    const deletedClone = await getItemById(soldClone.id);
    if (!restored) throw new Error('Manual sold deletion did not restore the inventory item.');

    expect(deletedClone).toBeNull();
    expect(restored.status).toBe(ItemStatus.FOR_SALE);
    expect(restored.stock).toEqual([{ siteId: 'hq', quantity: 2 }]);
    expect(restored).not.toHaveProperty('quantitySold');

    const output = {
      original: base,
      inventoryAfterManualSale: inventoryAfterSale,
      soldClone,
      restoredInventory: restored,
      deletion: { cloneExists: Boolean(deletedClone), inventoryRestored: true },
    };
    writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    process.stderr.write(`[entity-test] MANUAL_SOLD_ITEM_OUTPUT_FILE: ${outputPath}\n${JSON.stringify(output, null, 2)}\n`);
  }, 120000);
});
