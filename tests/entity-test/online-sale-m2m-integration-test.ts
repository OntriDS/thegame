import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { POST as createOrder } from '@/app/api/m2m/orders/create/route';
import { POST as fulfillOrder } from '@/app/api/m2m/orders/fulfill/route';
import { POST as cancelOrder } from '@/app/api/m2m/orders/cancel/route';
import {
  getAllCharacters, getFinancialsBySourceSaleId, getItemById, getItemsBySourceRecordId, getSaleById,
  removeFinancial, removeItem, removeSale, upsertItem,
} from '@/data-store/datastore';
import { getLinksFor } from '@/links/link-registry';
import { getSaleById as getPersistedSaleById } from '@/data-store/repositories/sale.repo';
import { clearEffect, clearEffectsByPrefix } from '@/data-store/effects-registry';
import { EffectKeys } from '@/data-store/keys';
import { deleteEffectClaim } from '@/lib/domain/effects/effect-claim-store';
import { iamService } from '@/lib/iam-service';
import { Collection, EntityType, ItemStatus, ItemType } from '@/types/enums';
import { getUTCNow } from '@/lib/utils/utc-utils';

const saleId = 'entity-test-sale-online-m2m';
const ghostSaleId = 'entity-test-sale-online-m2m-ghost';
const itemId = 'entity-test-item-online-m2m';
const money = (minorUnits: string, currency = 'USD') => ({ minorUnits, currency });
const wait = (milliseconds: number) => new Promise(resolvePromise => setTimeout(resolvePromise, milliseconds));

async function waitFor(predicate: () => Promise<boolean>, timeoutMs = 30_000): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await predicate()) return;
    await wait(250);
  }
  throw new Error('Timed out waiting for Online M2M workflow effects.');
}

async function clearWorkflowClaims(id: string): Promise<void> {
  for (const kind of ['financialRecordsSynced', 'inventoryProcessed', 'saleDoneLogged', 'saleCollectedLogged', 'pointsStaged', 'pointsAwarded']) {
    await deleteEffectClaim(EffectKeys.sideEffect('sale', id, kind));
  }
}

function request(body: unknown) {
  return new Request('http://localhost/api/m2m/orders', {
    method: 'POST',
    headers: { authorization: 'Bearer entity-test-token', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as any;
}

describe('entity-test: Online Sale M2M integration', () => {
  const verifyToken = vi.spyOn(iamService, 'verifyM2MToken').mockResolvedValue({
    valid: true,
    appId: 'akiles-ecosystem',
  } as any);

  beforeEach(async () => {
    const financials = await getFinancialsBySourceSaleId(saleId);
    for (const financial of financials) await removeFinancial(financial.id);
    await removeSale(saleId);
    await removeSale(ghostSaleId);
    await clearEffectsByPrefix(EntityType.SALE, saleId, '');
    await clearEffectsByPrefix(EntityType.SALE, ghostSaleId, '');
    await clearEffect(EffectKeys.created('sale', saleId));
    await clearEffect(EffectKeys.created('sale', ghostSaleId));
    await clearWorkflowClaims(saleId);
    await clearWorkflowClaims(ghostSaleId);
    await removeItem(itemId);
  });

  afterEach(async () => {
    const financials = await getFinancialsBySourceSaleId(saleId);
    for (const financial of financials) await removeFinancial(financial.id);
    await removeSale(saleId);
    await removeSale(ghostSaleId);
    await removeItem(itemId);
    await clearWorkflowClaims(saleId);
    await clearWorkflowClaims(ghostSaleId);
    await waitFor(async () => (await getItemsBySourceRecordId(saleId)).length === 0, 10_000);
    await waitFor(async () => (await getLinksFor({ type: EntityType.SALE, id: saleId })).length === 0, 10_000);
    await waitFor(async () => (await getLinksFor({ type: EntityType.SALE, id: ghostSaleId })).length === 0, 10_000);
    verifyToken.mockClear();
  });

  it('creates, fulfills, safely replays, and cancels Online M2M orders', async () => {
    const now = getUTCNow();
    const customer = (await getAllCharacters())[0];
    if (!customer) throw new Error('Cannot run Online M2M test: a customer Character is required.');

    await upsertItem({
      id: itemId,
      name: 'testing-online-m2m-product',
      type: ItemType.BUNDLE,
      subItemType: 'print' as any,
      status: ItemStatus.FOR_SALE,
      stock: [{ siteId: 'hq', quantity: 2 }],
      pricing: { unitCost: money('1000'), targetPrice: money('5000') },
      context: { collection: Collection.NO_COLLECTION, year: now.getUTCFullYear() },
      createdAt: now,
      updatedAt: now,
    } as any, { skipWorkflowEffects: true, skipLinkEffects: true, skipSummaryUpdate: true });

    const checkout = {
      orderId: saleId,
      siteId: 'hq',
      characterId: customer.id,
      total: 58.25,
      items: [{ productId: itemId, name: 'testing-online-m2m-product', price: 50, quantity: 1 }],
      checkoutCharges: { shipping: 8, transactionFee: 0.25, processingFee: 0 },
    };

    const createdResponse = await createOrder(request(checkout));
    expect(createdResponse.status).toBe(200);
    const created = await createdResponse.json();
    expect(created.success).toBe(true);
    expect(created.sale.status).toBe('pending');

    const persistedPending = await getPersistedSaleById(saleId);
    expect(persistedPending).not.toHaveProperty('siteId');
    expect(persistedPending).not.toHaveProperty('characterId');
    expect(persistedPending?.context?.onlineSaleContext?.checkoutCharges).toEqual({
      shipping: money('800'),
      transactionFee: money('25'),
    });

    const replayCreateResponse = await createOrder(request(checkout));
    expect(replayCreateResponse.status).toBe(200);
    expect((await replayCreateResponse.json()).note).toMatch(/already exists/i);

    const fulfilledResponse = await fulfillOrder(request({
      orderId: saleId,
      tokenTrans: 'entity-test-payment-token',
      reference: 'entity-test-payment-reference',
      paymentAmount: 58.25,
      paymentMethod: 'card',
      commission: 3,
      saleStatus: 'charged',
    }));
    expect(fulfilledResponse.status).toBe(200);
    expect((await fulfilledResponse.json()).status).toBe('charged');

    await waitFor(async () => (await getFinancialsBySourceSaleId(saleId)).length > 0);
    const charged = await getSaleById(saleId);
    expect(charged?.payments).toEqual([{ method: 'card', amount: money('5825'), notes: 'Recorded from Akiles Ecosystem payment fulfillment' }]);
    expect(charged?.lifecycle?.chargedAt).toBeTruthy();
    await waitFor(async () => (await getItemsBySourceRecordId(saleId)).length > 0);
    await waitFor(async () => {
      const current = await getPersistedSaleById(saleId);
      return Boolean(current?.lines?.some(line => line.kind === 'item' && line.itemId.includes('-sold-')));
    });

    const replayFulfillResponse = await fulfillOrder(request({
      orderId: saleId,
      paymentAmount: 58.25,
      paymentMethod: 'card',
      commission: 3,
    }));
    expect(replayFulfillResponse.status).toBe(200);
    expect((await replayFulfillResponse.json()).note).toBe('Already fulfilled');

    const terminalCreateResponse = await createOrder(request(checkout));
    expect(terminalCreateResponse.status).toBe(409);

    const cancelChargedResponse = await cancelOrder(request({ orderId: saleId, reason: 'should not cancel charged order' }));
    expect(cancelChargedResponse.status).toBe(400);

    const ghostCreateResponse = await createOrder(request({ ...checkout, orderId: ghostSaleId }));
    expect(ghostCreateResponse.status).toBe(200);
    const ghostCancelResponse = await cancelOrder(request({ orderId: ghostSaleId, deleteGhost: true }));
    expect(ghostCancelResponse.status).toBe(200);
    expect((await ghostCancelResponse.json()).action).toBe('DELETED');
    expect(await getSaleById(ghostSaleId)).toBeNull();
    expect(await getLinksFor({ type: EntityType.SALE, id: ghostSaleId })).toHaveLength(0);

    const links = await getLinksFor({ type: EntityType.SALE, id: saleId });
    expect(links).toEqual(expect.arrayContaining([
      expect.objectContaining({ linkType: 'SALE_SITE', relationship: 'sold-at', target: { type: EntityType.SITE, id: 'hq' } }),
      expect.objectContaining({ linkType: 'SALE_CHARACTER', relationship: 'customer', target: { type: EntityType.CHARACTER, id: customer.id } }),
    ]));
    expect(links).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ linkType: 'SALE_CHARACTER', relationship: 'owner' }),
      expect.objectContaining({ linkType: 'SALE_PLAYER' }),
    ]));
  }, 120_000);
});
