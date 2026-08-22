import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('server-only', () => ({}));

import {
  getAllCharacters, getAllPlayers, getFinancialsBySourceSaleId, getItemById, getItemsBySourceRecordId,
  getPlayerById, getSaleById, removeFinancial, removeItem, removeSale, upsertItem, upsertSale,
} from '@/data-store/datastore';
import { getLinksFor } from '@/links/link-registry';
import { clearEffect, clearEffectsByPrefix } from '@/data-store/effects-registry';
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
  throw new Error(`Timed out waiting for Network Sale workflow effects.`);
}

function pointSnapshot(player: any) {
  const points = player.rewards?.points;
  if (!points) throw new Error(`Player ${player.id} has no canonical rewards.points projection.`);
  return { pending: { ...points.pending }, vested: { ...points.vested }, current: { ...points.current }, exchanged: { ...points.exchanged }, historic: { ...points.historic } };
}

async function expectNetworkRewards(playerId: string, before: ReturnType<typeof pointSnapshot>, expected: { xp: number; rp: number; fp: number; hp: number }) {
  await waitFor(async () => {
    const player = await getPlayerById(playerId);
    if (!player) return false;
    const after = pointSnapshot(player);
    return (['xp', 'rp', 'fp', 'hp'] as const).every(point =>
      after.pending[point] - before.pending[point] === expected[point] &&
      after.historic[point] - before.historic[point] === expected[point]
    );
  });
}

async function findCharacterPlayer(): Promise<{ character: any; playerId: string } | null> {
  const players = await getAllPlayers();
  for (const character of await getAllCharacters()) {
    const links = await getLinksFor({ type: EntityType.CHARACTER, id: character.id });
    const link = links.find(candidate =>
      candidate.linkType === 'CHARACTER_PLAYER' &&
      candidate.relationship === 'primary' &&
      candidate.target?.type === EntityType.PLAYER &&
      players.some(player => player.id === candidate.target.id)
    );
    if (link?.target?.id) return { character, playerId: link.target.id };
  }
  return null;
}

describe('entity-test: full Network Sale', () => {
  const saleId = 'entity-test-sale-network-full';
  const itemId = 'entity-test-item-network-full';

  beforeEach(async () => {
    const financials = await getFinancialsBySourceSaleId(saleId);
    for (const financial of financials) await removeFinancial(financial.id);
    await removeSale(saleId);
    await clearEffectsByPrefix(EntityType.SALE, saleId, '');
    await clearEffect(EffectKeys.created('sale', saleId));
    for (const effect of ['financialRecordsSynced', 'financialCreated', 'inventoryProcessed', 'linesProcessed', 'stockDecremented:network-line-full', 'soldItemEntity:network-line-full', 'soldItemEntity:bundle:network-line-full', 'saleDoneLogged', 'pointsStaged', 'pointsAwarded', 'pointsRewarded']) {
      await clearEffect(EffectKeys.sideEffect('sale', saleId, effect));
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
    await waitFor(async () => (await getItemById(`${itemId}-sold-network-line-full`)) === null, 10_000);
    await waitFor(async () => (await getLinksFor({ type: EntityType.SALE, id: saleId })).length === 0, 10_000);
  });

  it('runs the full Network product workflow, including restock-to-target', async () => {
    const now = getUTCNow();
    const timestamp = toUTCISOString(now);
    const owner = await findCharacterPlayer();
    if (!owner) throw new Error('Cannot run full Network Sale test: a Character with a canonical CHARACTER_PLAYER link is required.');
    const { character, playerId } = owner;
    const playerBefore = await getPlayerById(playerId);
    if (!playerBefore) throw new Error('Cannot run full Network Sale test: linked Player could not be loaded.');
    const pointsBefore = pointSnapshot(playerBefore);

    await upsertItem({
      id: itemId,
      name: 'testing-network-product',
      type: ItemType.BUNDLE,
      subItemType: 'print' as any,
      status: ItemStatus.FOR_SALE,
      stock: [{ siteId: 'hq', quantity: 1 }],
      pricing: { unitCost: money('1000'), targetPrice: money('5000') },
      context: { collection: Collection.NO_COLLECTION, year: now.getUTCFullYear(), restockToTarget: true, targetAmount: 3 },
      createdAt: now,
      updatedAt: now,
    } as any, { skipWorkflowEffects: true, skipLinkEffects: true, skipSummaryUpdate: true });

    await upsertSale({
      id: saleId,
      schemaVersion: 1,
      version: 0,
      name: 'testing-network-sale-full',
      description: 'Full Network Sale workflow test',
      type: SaleType.NETWORK,
      status: SaleStatus.CHARGED,
      siteId: 'hq',
      counterpartyName: 'Existing test Character',
      characterId: character.id,
      ownerId: character.id,
      lines: [{ lineId: 'network-line-full', kind: 'item', itemId, quantity: 1, unitPrice: money('5000') }],
      payments: [{ method: PaymentMethod.SINPE, amount: money('5000') }],
      totals: { subtotal: money('5000'), totalRevenue: money('5000'), totalCost: money('500') },
      lifecycle: { chargedAt: timestamp, doneAt: timestamp },
      context: { rewardIntent: { points: { xp: 4, rp: 2, fp: 0, hp: 0 } } },
      createdAt: now,
      updatedAt: now,
    } as any);

    await waitFor(async () => {
      const links = await getLinksFor({ type: EntityType.SALE, id: saleId });
      return links.some(link => link.linkType === 'SALE_SITE') && links.some(link => link.linkType === 'SALE_ITEM') && links.some(link => link.linkType === 'SALE_CHARACTER');
    });

    const saved = await getSaleById(saleId);
    const persisted = await getPersistedSaleById(saleId);
    const item = await getItemById(itemId);
    const soldItems = await getItemsBySourceRecordId(saleId);
    const saleFinancials = await getFinancialsBySourceSaleId(saleId);
    const links = await getLinksFor({ type: EntityType.SALE, id: saleId });
    if (!saved || !persisted || !item) throw new Error('Full Network Sale or inventory item was not persisted.');

    const output = { sale: JSON.parse(JSON.stringify(persisted)), item: JSON.parse(JSON.stringify(item)), financials: JSON.parse(JSON.stringify(saleFinancials)), links, soldItems: JSON.parse(JSON.stringify(soldItems)) };
    writeFileSync(resolve(__dirname, 'network-sale-entity-test-full.output.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    process.stderr.write(`[entity-test] full Network Sale workflow output:\n${JSON.stringify(output, null, 2)}\n`);

    expect(persisted).not.toHaveProperty('siteId');
    expect(persisted).not.toHaveProperty('characterId');
    expect(persisted).not.toHaveProperty('playerCharacterId');
    expect(persisted).not.toHaveProperty('counterpartyName');
    expect(persisted.context).not.toHaveProperty('paymentBreakdown');
    expect(persisted.lines?.[0]?.lineId).toBe('network-line-full');
    expect(persisted.payments?.[0]).toEqual({ method: PaymentMethod.SINPE, amount: money('5000') });
    expect(persisted.lifecycle?.chargedAt).toBe(timestamp);
    expect(persisted.totals?.totalCost).toEqual(money('500'));
    expect(item.status).toBe(ItemStatus.FOR_SALE);
    expect(item.stock).toEqual([{ siteId: 'hq', quantity: 3 }]);
    expect(saleFinancials).toEqual(expect.arrayContaining([
      expect.objectContaining({ cost: money('500'), revenue: money('5000'), netCashflow: money('4500') }),
    ]));
    for (const financial of saleFinancials) {
      const financialLinks = await getLinksFor({ type: EntityType.FINANCIAL, id: financial.id });
      expect(financialLinks.some(link => link.linkType === 'FINREC_ITEM')).toBe(false);
    }
    expect(soldItems.length).toBeGreaterThan(0);
    await waitFor(async () => (await getLinksFor({ type: EntityType.SALE, id: saleId })).some(link =>
      link.linkType === 'SALE_PLAYER' &&
      link.relationship === 'points-earned' &&
      link.target.type === EntityType.PLAYER &&
      link.target.id === playerId
    ));
    const linksAfterRewards = await getLinksFor({ type: EntityType.SALE, id: saleId });
    expect(linksAfterRewards).toEqual(expect.arrayContaining([
      expect.objectContaining({
        linkType: 'SALE_PLAYER',
        relationship: 'points-earned',
        target: { type: EntityType.PLAYER, id: playerId },
      }),
    ]));
    expect(links).toEqual(expect.arrayContaining([
      expect.objectContaining({ linkType: 'SALE_SITE', relationship: 'sold-at', target: { type: EntityType.SITE, id: 'hq' } }),
      expect.objectContaining({ linkType: 'SALE_ITEM', relationship: 'sold-item' }),
      expect.objectContaining({ linkType: 'SALE_CHARACTER', relationship: 'customer', target: { type: EntityType.CHARACTER, id: character.id } }),
      expect.objectContaining({ linkType: 'SALE_CHARACTER', relationship: 'owner', target: { type: EntityType.CHARACTER, id: character.id } }),
    ]));
    expect(linksAfterRewards).not.toEqual(expect.arrayContaining([expect.objectContaining({ linkType: 'SALE_TASK' })]));
    await expectNetworkRewards(playerId, pointsBefore, { xp: 4, rp: 2, fp: 0, hp: 0 });
  });
});
