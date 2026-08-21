import { afterEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('server-only', () => ({}));

import { getAllItems, getAllSites, getItemById, getSaleById, removeSale, upsertSale } from '@/data-store/datastore';
import { getLinksFor } from '@/links/link-registry';
import { getSaleById as getPersistedSaleById } from '@/data-store/repositories/sale.repo';
import { Currency, EntityType, SaleStatus, SaleType } from '@/types/enums';
import { getUTCNow } from '@/lib/utils/utc-utils';

const money = (minorUnits: string, currency = Currency.USD) => ({ minorUnits, currency });

describe('entity-test: minimal Network Sale', () => {
  const saleId = 'entity-test-sale-network-clean';

  afterEach(async () => {
    await removeSale(saleId);
    expect(await getSaleById(saleId)).toBeNull();
    expect(await getLinksFor({ type: EntityType.SALE, id: saleId })).toHaveLength(0);
  });

  it('persists the minimum Network product Sale shape without workflow effects', async () => {
    const now = getUTCNow();
    const items = await getAllItems();
    const sites = await getAllSites();
    const item = items.find(candidate => candidate.status !== 'sold');
    const site = sites.find(candidate => candidate.id === 'hq') || sites[0];
    if (!item || !site) throw new Error('Cannot run Network Sale test: an Item and Site are required.');

    await upsertSale({
      id: saleId,
      schemaVersion: 1,
      version: 0,
      name: 'testing-network-sale',
      type: SaleType.NETWORK,
      status: SaleStatus.PENDING,
      siteId: site.id,
      lines: [{ lineId: 'network-line-1', kind: 'item', itemId: item.id, quantity: 1, unitPrice: money('5000') }],
      totals: { subtotal: money('5000'), totalRevenue: money('5000') },
      lifecycle: {},
      createdAt: now,
      updatedAt: now,
    } as any, { skipWorkflowEffects: true });

    const saved = await getSaleById(saleId);
    const rawSaved = await getPersistedSaleById(saleId);
    if (!saved || !rawSaved) throw new Error(`Entity-test Sale ${saleId} was not found after creation.`);
    const persisted = JSON.parse(JSON.stringify(rawSaved));
    writeFileSync(resolve(__dirname, 'network-sale-entity-test-clean.output.json'), `${JSON.stringify(persisted, null, 2)}\n`, 'utf8');
    process.stderr.write(`[entity-test] persisted minimal Network Sale:\n${JSON.stringify(persisted, null, 2)}\n`);

    expect(persisted).toMatchObject({
      id: saleId,
      schemaVersion: 1,
      version: 0,
      type: SaleType.NETWORK,
      status: SaleStatus.PENDING,
      lines: [{ lineId: 'network-line-1', kind: 'item', itemId: item.id, quantity: 1, unitPrice: money('5000') }],
      totals: { subtotal: money('5000'), totalRevenue: money('5000') },
      lifecycle: {},
    });
    expect(persisted).not.toHaveProperty('payments');
    expect(persisted.context ?? {}).not.toHaveProperty('paymentBreakdown');
    expect(saved.siteId).toBe(site.id);
    expect(await getLinksFor({ type: EntityType.SALE, id: saleId })).toEqual(
      expect.arrayContaining([expect.objectContaining({ linkType: 'SALE_SITE', relationship: 'sold-at', target: { type: EntityType.SITE, id: site.id } })])
    );
    expect(await getItemById(item.id)).toEqual(item);
  });
});
