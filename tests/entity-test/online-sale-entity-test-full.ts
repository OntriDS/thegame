import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('server-only', () => ({}));

import {
  getAllCharacters, getFinancialsBySourceSaleId, getItemById, getItemsBySourceRecordId,
  getSaleById, removeFinancial, removeItem, removeSale, upsertItem, upsertSale,
} from '@/data-store/datastore';
import { getLinksFor } from '@/links/link-registry';
import { acquireEffectClaim, resolveEffectClaim, deleteEffectClaim, deleteEffectClaimsByPrefix } from '@/lib/domain/effects/effect-claim-store';
import { EffectKeys } from '@/data-store/keys';
import { getSaleById as getPersistedSaleById } from '@/data-store/repositories/sale.repo';
import { Collection, Currency, EntityType, ItemStatus, ItemType, PaymentMethod, SaleStatus, SaleType } from '@/types/enums';
import { getUTCNow, toUTCISOString } from '@/lib/utils/utc-utils';

const money = (minorUnits: string, currency = Currency.USD) => ({ minorUnits, currency });
const wait = (milliseconds: number) => new Promise(resolvePromise => setTimeout(resolvePromise, milliseconds));

async function waitFor(predicate: () => Promise<boolean>, timeoutMs = 30_000): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await predicate()) return;
    await wait(250);
  }
  throw new Error('Timed out waiting for Online Sale workflow effects.');
}

describe('entity-test: full Online Sale', () => {
  const saleId = 'entity-test-sale-online-full';
  const itemId = 'entity-test-item-online-full';

  beforeEach(async () => {
    const financials = await getFinancialsBySourceSaleId(saleId);
    for (const financial of financials) await removeFinancial(financial.id);
    await removeSale(saleId);
    await deleteEffectClaimsByPrefix(EffectKeys.sideEffect('sale', saleId, ''));
    await deleteEffectClaim(EffectKeys.created('sale', saleId));
    for (const effect of ['financialRecordsSynced', 'financialCreated', 'inventoryProcessed', 'linesProcessed', 'soldItemEntity:online-line-full', 'soldItemEntity:bundle:online-line-full']) {
      await deleteEffectClaim(EffectKeys.sideEffect('sale', saleId, effect));
    }
    await removeItem(itemId);
  });

  afterEach(async () => {
    const financials = await getFinancialsBySourceSaleId(saleId);
    for (const financial of financials) await removeFinancial(financial.id);
    await removeSale(saleId);
    await removeItem(itemId);
    expect(await getSaleById(saleId)).toBeNull();
    expect(await getItemById(itemId)).toBeNull();
    expect(await getFinancialsBySourceSaleId(saleId)).toHaveLength(0);
    await waitFor(async () => (await getItemById(`${itemId}-sold-online-line-full`)) === null, 10_000);
    await waitFor(async () => (await getLinksFor({ type: EntityType.SALE, id: saleId })).length === 0, 10_000);
  });

  it('runs the full customer Online Sale workflow with checkout charges and no owner/rewards', async () => {
    const now = getUTCNow();
    const timestamp = toUTCISOString(now);
    const customer = (await getAllCharacters())[0];
    if (!customer) throw new Error('Cannot run full Online Sale test: a customer Character is required.');

    await upsertItem({
      id: itemId,
      name: 'testing-online-product',
      type: ItemType.BUNDLE,
      subItemType: 'print' as any,
      status: ItemStatus.FOR_SALE,
      stock: [{ siteId: 'hq', quantity: 2 }],
      pricing: { unitCost: money('1000'), targetPrice: money('5000') },
      context: { collection: Collection.NO_COLLECTION, year: now.getUTCFullYear(), restockToTarget: false },
      createdAt: now,
      updatedAt: now,
    } as any, { skipWorkflowEffects: true, skipLinkEffects: true, skipSummaryUpdate: true });

    await upsertSale({
      id: saleId,
      schemaVersion: 1,
      version: 0,
      name: 'testing-online-sale-full',
      description: 'Full customer Online Sale workflow test',
      type: SaleType.ONLINE,
      status: SaleStatus.CHARGED,
      siteId: 'hq',
      characterId: customer.id,
      lines: [{ lineId: 'online-line-full', kind: 'item', itemId, quantity: 1, unitPrice: money('5000') }],
      payments: [{ method: PaymentMethod.CARD, amount: money('6125') }],
      totals: { subtotal: money('5000'), totalRevenue: money('6125'), totalCost: money('300') },
      lifecycle: { chargedAt: timestamp, doneAt: timestamp },
      context: {
        source: 'akiles-ecosystem',
        onlineSaleContext: {
          checkoutCharges: {
            shipping: money('800'),
            transactionFee: money('25'),
            processingFee: money('300'),
          },
        },
      },
      createdAt: now,
      updatedAt: now,
    } as any);

    await waitFor(async () => {
      const links = await getLinksFor({ type: EntityType.SALE, id: saleId });
      return links.some(link => link.linkType === 'SALE_SITE') &&
        links.some(link => link.linkType === 'SALE_ITEM') &&
        links.some(link => link.linkType === 'SALE_CHARACTER' && link.relationship === 'customer');
    });
    await waitFor(async () => (await getFinancialsBySourceSaleId(saleId)).length > 0);
    await waitFor(async () => (await getItemsBySourceRecordId(saleId)).length > 0);
    await waitFor(async () => {
      const current = await getPersistedSaleById(saleId);
      return Boolean(current?.lines?.some(line => line.kind === 'item' && line.itemId.includes('-sold-')));
    });

    const saved = await getSaleById(saleId);
    const persisted = await getPersistedSaleById(saleId);
    const saleFinancials = await getFinancialsBySourceSaleId(saleId);
    const links = await getLinksFor({ type: EntityType.SALE, id: saleId });
    const soldItems = await getItemsBySourceRecordId(saleId);
    if (!saved || !persisted) throw new Error('Full Online Sale was not persisted.');

    const output = {
      sale: JSON.parse(JSON.stringify(persisted)),
      financials: JSON.parse(JSON.stringify(saleFinancials)),
      links,
      soldItems: JSON.parse(JSON.stringify(soldItems)),
    };
    writeFileSync(resolve(__dirname, 'online-sale-entity-test-full.output.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    process.stderr.write(`[entity-test] full Online Sale workflow output:\n${JSON.stringify(output, null, 2)}\n`);

    expect(persisted).not.toHaveProperty('siteId');
    expect(persisted).not.toHaveProperty('characterId');
    expect(persisted).not.toHaveProperty('ownerId');
    expect(persisted).not.toHaveProperty('counterpartyName');
    expect(persisted.lines?.[0]?.lineId).toBe('online-line-full');
    expect(persisted.payments?.[0]).toEqual({ method: PaymentMethod.CARD, amount: money('6125') });
    expect(persisted.lifecycle?.chargedAt).toBe(timestamp);
    expect(persisted.totals?.subtotal).toEqual(money('5000'));
    expect(persisted.totals?.totalRevenue).toEqual(money('6125'));
    expect(persisted.totals?.totalCost).toEqual(money('300'));
    expect(persisted.context?.onlineSaleContext?.checkoutCharges).toEqual({
      shipping: money('800'),
      transactionFee: money('25'),
      processingFee: money('300'),
    });
    expect(saleFinancials).toEqual(expect.arrayContaining([
      expect.objectContaining({ cost: money('300'), revenue: money('6125'), netCashflow: money('5825') }),
    ]));
    for (const financial of saleFinancials) {
      const financialLinks = await getLinksFor({ type: EntityType.FINANCIAL, id: financial.id });
      expect(financialLinks.some(link => link.linkType === 'FINREC_ITEM')).toBe(false);
    }
    expect(soldItems.length).toBeGreaterThan(0);
    expect(links.some(link => String(link.linkType) === 'SALE_PLAYER')).toBe(false);
    expect(links).toEqual(expect.arrayContaining([
      expect.objectContaining({ linkType: 'SALE_SITE', relationship: 'sold-at', target: { type: EntityType.SITE, id: 'hq' } }),
      expect.objectContaining({ linkType: 'SALE_ITEM', relationship: 'sold-item' }),
      expect.objectContaining({ linkType: 'SALE_CHARACTER', relationship: 'customer', target: { type: EntityType.CHARACTER, id: customer.id } }),
    ]));
    expect(links).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ linkType: 'SALE_CHARACTER', relationship: 'owner' }),
      expect.objectContaining({ linkType: 'SALE_TASK' }),
    ]));
  });
});
