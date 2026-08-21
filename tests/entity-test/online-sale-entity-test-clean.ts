import { afterEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('server-only', () => ({}));

import { getAllCharacters, getAllItems, getAllSites, getItemById, getSaleById, removeSale, upsertSale } from '@/data-store/datastore';
import { getLinksFor } from '@/links/link-registry';
import { getSaleById as getPersistedSaleById } from '@/data-store/repositories/sale.repo';
import { Currency, EntityType, SaleStatus, SaleType } from '@/types/enums';
import { getUTCNow } from '@/lib/utils/utc-utils';

const money = (minorUnits: string, currency = Currency.USD) => ({ minorUnits, currency });

describe('entity-test: minimal Online Sale', () => {
  const saleId = 'entity-test-sale-online-clean';

  afterEach(async () => {
    await removeSale(saleId);
    expect(await getSaleById(saleId)).toBeNull();
    expect(await getLinksFor({ type: EntityType.SALE, id: saleId })).toHaveLength(0);
  });

  it('persists the minimum customer Online Sale shape without owner or rewards', async () => {
    const now = getUTCNow();
    const items = await getAllItems();
    const sites = await getAllSites();
    const characters = await getAllCharacters();
    const item = items.find(candidate => candidate.status !== 'sold');
    const site = sites.find(candidate => candidate.id === 'site-akiles-ecosystem') || sites.find(candidate => candidate.id === 'hq') || sites[0];
    const customer = characters[0];
    if (!item || !site || !customer) throw new Error('Cannot run Online Sale test: an Item, Site, and Character are required.');

    await upsertSale({
      id: saleId,
      schemaVersion: 1,
      version: 0,
      name: 'testing-online-sale',
      type: SaleType.ONLINE,
      status: SaleStatus.PENDING,
      siteId: site.id,
      characterId: customer.id,
      lines: [{ lineId: 'online-line-1', kind: 'item', itemId: item.id, quantity: 1, unitPrice: money('5000') }],
      totals: { subtotal: money('5000'), totalRevenue: money('5000') },
      lifecycle: {},
      createdAt: now,
      updatedAt: now,
    } as any, { skipWorkflowEffects: true });

    const rawSaved = await getPersistedSaleById(saleId);
    if (!rawSaved) throw new Error(`Entity-test Sale ${saleId} was not found after creation.`);
    const persisted = JSON.parse(JSON.stringify(rawSaved));
    writeFileSync(resolve(__dirname, 'online-sale-entity-test-clean.output.json'), `${JSON.stringify(persisted, null, 2)}\n`, 'utf8');
    process.stderr.write(`[entity-test] persisted minimal Online Sale:\n${JSON.stringify(persisted, null, 2)}\n`);

    expect(persisted).toMatchObject({
      id: saleId,
      schemaVersion: 1,
      version: 0,
      type: SaleType.ONLINE,
      status: SaleStatus.PENDING,
      lines: [{ lineId: 'online-line-1', kind: 'item', itemId: item.id, quantity: 1, unitPrice: money('5000') }],
      totals: { subtotal: money('5000'), totalRevenue: money('5000') },
      lifecycle: {},
    });
    expect(persisted).not.toHaveProperty('payments');
    expect(persisted).not.toHaveProperty('ownerId');
    expect(persisted.context ?? {}).not.toHaveProperty('rewardIntent');
    expect(await getLinksFor({ type: EntityType.SALE, id: saleId })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ linkType: 'SALE_SITE', relationship: 'sold-at', target: { type: EntityType.SITE, id: site.id } }),
        expect.objectContaining({ linkType: 'SALE_CHARACTER', relationship: 'customer', target: { type: EntityType.CHARACTER, id: customer.id } }),
      ])
    );
    expect(await getLinksFor({ type: EntityType.SALE, id: saleId })).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ linkType: 'SALE_CHARACTER', relationship: 'owner' }),
        expect.objectContaining({ linkType: 'SALE_PLAYER' }),
      ])
    );
    expect(await getItemById(item.id)).toEqual(item);
  });
});
