import { afterEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('server-only', () => ({}));

import {
  getAllItems,
  getAllSites,
  getItemById,
  getSaleById,
  removeSale,
  upsertSale,
} from '@/data-store/datastore';
import { getLinksFor } from '@/links/link-registry';
import { getSaleById as getPersistedSaleById } from '@/data-store/repositories/sale.repo';
import { Currency, EntityType, SaleStatus, SaleType, TaskType } from '@/types/enums';
import { getUTCNow, toUTCISOString } from '@/lib/utils/utc-utils';

const money = (minorUnits: string) => ({ minorUnits, currency: Currency.USD });

describe('entity-test: minimal Direct Sale', () => {
  const productSaleId = 'entity-test-sale-direct-product-clean';
  const serviceSaleId = 'entity-test-sale-direct-service-clean';

  afterEach(async () => {
    for (const saleId of [productSaleId, serviceSaleId]) {
      await removeSale(saleId);
      expect(await getSaleById(saleId)).toBeNull();
      expect(await getLinksFor({ type: EntityType.SALE, id: saleId })).toHaveLength(0);
    }
  });

  it('persists the minimum direct product Sale shape without workflow effects', async () => {
    const now = getUTCNow();
    const items = await getAllItems();
    const sites = await getAllSites();
    const item = items.find(candidate => candidate.status !== 'sold');
    const site = sites.find(candidate => candidate.id === 'hq') || sites[0];
    if (!item || !site) throw new Error('Cannot run Direct product Sale test: an Item and Site are required.');

    await upsertSale({
      id: productSaleId,
      schemaVersion: 1,
      version: 0,
      name: 'testing-direct-product-sale',
      type: SaleType.DIRECT,
      status: SaleStatus.PENDING,
      siteId: site.id,
      lines: [{
        lineId: 'product-line-1',
        kind: 'item',
        itemId: item.id,
        quantity: 1,
        unitPrice: money('1000'),
      }],
      totals: {
        subtotal: money('1000'),
        totalRevenue: money('1000'),
      },
      lifecycle: {},
      createdAt: now,
      updatedAt: now,
    } as any, { skipWorkflowEffects: true });

    const saved = await getSaleById(productSaleId);
    const rawSaved = await getPersistedSaleById(productSaleId);
    if (!saved || !rawSaved) throw new Error(`Entity-test Sale ${productSaleId} was not found after creation.`);
    const persisted = JSON.parse(JSON.stringify(rawSaved));
    writeFileSync(resolve(__dirname, 'direct-sale-product-entity-test-clean.output.json'), `${JSON.stringify(persisted, null, 2)}\n`, 'utf8');
    process.stderr.write(`[entity-test] persisted minimal Direct product Sale:\n${JSON.stringify(persisted, null, 2)}\n`);

    expect(persisted).toMatchObject({
      id: productSaleId,
      schemaVersion: 1,
      version: 0,
      name: 'testing-direct-product-sale',
      type: SaleType.DIRECT,
      status: SaleStatus.PENDING,
      lines: [{ kind: 'item', itemId: item.id, quantity: 1, unitPrice: money('1000') }],
      totals: { subtotal: money('1000'), totalRevenue: money('1000') },
      lifecycle: {},
    });
    expect(saved.siteId).toBe(site.id);
    expect(await getLinksFor({ type: EntityType.SALE, id: productSaleId })).toEqual(
      expect.arrayContaining([expect.objectContaining({ linkType: 'SALE_SITE', relationship: 'sold-at', target: { type: EntityType.SITE, id: site.id } })])
    );
    expect(await getItemById(item.id)).toEqual(item);
  });

  it('persists the minimum direct service Sale shape with task intent', async () => {
    const now = getUTCNow();
    const sites = await getAllSites();
    const site = sites.find(candidate => candidate.id === 'hq') || sites[0];
    if (!site) throw new Error('Cannot run Direct service Sale test: a Site is required.');

    await upsertSale({
      id: serviceSaleId,
      schemaVersion: 1,
      version: 0,
      name: 'testing-direct-service-sale',
      type: SaleType.DIRECT,
      status: SaleStatus.PENDING,
      siteId: site.id,
      lines: [{
        lineId: 'service-line-1',
        kind: 'service',
        revenue: money('5000'),
        context: {
          createTask: true,
          taskDescription: 'Testing direct service',
          taskStation: 'strategy' as any,
          taskType: TaskType.MISSION,
        },
      }],
      totals: {
        subtotal: money('5000'),
        totalRevenue: money('5000'),
      },
      lifecycle: {},
      createdAt: now,
      updatedAt: now,
    } as any, { skipWorkflowEffects: true });

    const saved = await getSaleById(serviceSaleId);
    const rawSaved = await getPersistedSaleById(serviceSaleId);
    if (!saved || !rawSaved) throw new Error(`Entity-test Sale ${serviceSaleId} was not found after creation.`);
    const persisted = JSON.parse(JSON.stringify(rawSaved));
    writeFileSync(resolve(__dirname, 'direct-sale-service-entity-test-clean.output.json'), `${JSON.stringify(persisted, null, 2)}\n`, 'utf8');
    process.stderr.write(`[entity-test] persisted minimal Direct service Sale:\n${JSON.stringify(persisted, null, 2)}\n`);

    expect(persisted).toMatchObject({
      id: serviceSaleId,
      schemaVersion: 1,
      version: 0,
      name: 'testing-direct-service-sale',
      type: SaleType.DIRECT,
      status: SaleStatus.PENDING,
      lines: [{
        kind: 'service',
        revenue: money('5000'),
        context: { createTask: true, taskDescription: 'Testing direct service', taskStation: 'strategy', taskType: TaskType.MISSION },
      }],
      totals: { subtotal: money('5000'), totalRevenue: money('5000') },
      lifecycle: {},
    });
    expect(saved.siteId).toBe(site.id);
    expect(await getLinksFor({ type: EntityType.SALE, id: serviceSaleId })).toEqual(
      expect.arrayContaining([expect.objectContaining({ linkType: 'SALE_SITE', relationship: 'sold-at', target: { type: EntityType.SITE, id: site.id } })])
    );
  });
});
