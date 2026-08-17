import { afterEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('server-only', () => ({}));

import { getItemById, removeItem, upsertItem } from '@/data-store/datastore';
import { Collection, ItemStatus, ItemType } from '@/types/enums';
import { getUTCNow } from '@/lib/utils/utc-utils';

describe('entity-test: clean minimal Item', () => {
  const itemId = 'entity-test-item-clean';

  afterEach(async () => {
    await removeItem(itemId);
  });

  it('persists the minimum bundle/print Item with modal defaults', async () => {
    const now = getUTCNow();
    const year = now.getUTCFullYear();

    await upsertItem({
      id: itemId,
      schemaVersion: 1,
      version: 0,
      name: 'testing-item',
      type: ItemType.BUNDLE,
      subItemType: 'print' as any,
      status: ItemStatus.FOR_SALE,
      stock: [{ siteId: 'none', quantity: 0 }],
      pricing: {
        unitCost: { minorUnits: '0', currency: 'USD' },
        targetPrice: { minorUnits: '0', currency: 'USD' },
      },
      context: {
        collection: Collection.NO_COLLECTION,
        year,
      },
      createdAt: now,
      updatedAt: now,
    } as any, { skipWorkflowEffects: true, skipLinkEffects: true, skipSummaryUpdate: true });

    const saved = await getItemById(itemId);
    if (!saved) throw new Error(`Entity-test Item ${itemId} was not found after creation.`);

    const persisted = JSON.parse(JSON.stringify(saved));
    const outputFile = resolve(__dirname, 'item-entity-test-clean.output.json');
    writeFileSync(outputFile, `${JSON.stringify(persisted, null, 2)}\n`, 'utf8');
    process.stderr.write(`[entity-test] persisted Item entity:\n${JSON.stringify(persisted, null, 2)}\n`);

    expect(persisted).toEqual({
      id: itemId,
      schemaVersion: 1,
      version: 0,
      name: 'testing-item',
      type: 'bundle',
      subItemType: 'print',
      status: 'for-sale',
      stock: [{ siteId: 'none', quantity: 0 }],
      pricing: {
        unitCost: { minorUnits: '0', currency: 'USD' },
        targetPrice: { minorUnits: '0', currency: 'USD' },
      },
      context: { collection: 'no-collection', year },
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });
});
