import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('server-only', () => ({}));

import {
  getAllCharacters,
  getAllPlayers,
  getPlayerById,
  getFinancialsBySourceSaleId,
  getItemById,
  getItemsBySourceRecordId,
  getSaleById,
  getTaskById,
  removeItem,
  removeFinancial,
  removeSale,
  removeTask,
  upsertItem,
  upsertSale,
} from '@/data-store/datastore';
import { getLinksFor } from '@/links/link-registry';
import { clearEffectsByPrefix } from '@/data-store/effects-registry';
import { clearEffect } from '@/data-store/effects-registry';
import { EffectKeys } from '@/data-store/keys';
import { getSaleById as getPersistedSaleById } from '@/data-store/repositories/sale.repo';
import {
  Collection,
  Currency,
  EntityType,
  ItemStatus,
  ItemType,
  PaymentMethod,
  SaleStatus,
  SaleType,
  TaskType,
} from '@/types/enums';
import { getUTCNow, toUTCISOString } from '@/lib/utils/utc-utils';

const money = (minorUnits: string) => ({ minorUnits, currency: Currency.USD });
const wait = (milliseconds: number) => new Promise(resolvePromise => setTimeout(resolvePromise, milliseconds));

async function waitFor(predicate: () => Promise<boolean>, timeoutMs = 30_000): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await predicate()) return;
    await wait(250);
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for Direct Sale workflow effects.`);
}

function pointSnapshot(player: any) {
  const points = player.rewards?.points;
  if (!points) throw new Error(`Player ${player.id} has no canonical rewards.points projection.`);
  return {
    pending: { ...points.pending },
    vested: { ...points.vested },
    current: { ...points.current },
    exchanged: { ...points.exchanged },
    historic: { ...points.historic },
  };
}

async function expectSaleRewardEvidence(saleId: string, playerId: string, before: ReturnType<typeof pointSnapshot>, expected: { xp: number; rp: number; fp: number; hp: number }) {
  let after: ReturnType<typeof pointSnapshot> | undefined;
  await waitFor(async () => {
    const player = await getPlayerById(playerId);
    if (!player) return false;
    const candidate = pointSnapshot(player);
    const pendingMatches = (['xp', 'rp', 'fp', 'hp'] as const).every(point =>
      candidate.pending[point] - before.pending[point] === expected[point]
    );
    const historicMatches = (['xp', 'rp', 'fp', 'hp'] as const).every(point =>
      candidate.historic[point] - before.historic[point] === expected[point]
    );
    if (!pendingMatches || !historicMatches) return false;
    after = candidate;
    return true;
  }, 30_000);
  if (!after) throw new Error(`Player ${playerId} reward ledger did not settle for Sale ${saleId}.`);
  for (const bucket of ['pending', 'historic'] as const) {
    for (const point of ['xp', 'rp', 'fp', 'hp'] as const) {
      expect(after[bucket][point] - before[bucket][point]).toBe(expected[point]);
    }
  }
  for (const bucket of ['vested', 'current', 'exchanged'] as const) {
    expect(after[bucket]).toEqual(before[bucket]);
  }

}

describe('entity-test: full Direct Sale', () => {
  const productSaleId = 'entity-test-sale-direct-product-full';
  const serviceSaleId = 'entity-test-sale-direct-service-full';
  const productItemId = 'entity-test-item-direct-sale-full';
  const serviceTaskId = 'entity-test-task-direct-sale-full';

  beforeEach(async () => {
    for (const saleId of [productSaleId, serviceSaleId]) {
      const financials = await getFinancialsBySourceSaleId(saleId);
      for (const financial of financials) await removeFinancial(financial.id);
      await removeSale(saleId);
      await clearEffectsByPrefix(EntityType.SALE, saleId, '');
      await clearEffect(EffectKeys.created('sale', saleId));
      for (const effect of [
        'financialRecordsSynced',
        'financialCreated',
        'inventoryProcessed',
        'linesProcessed',
        'saleDoneLogged',
        'saleCollectedLogged',
        'pointsStaged',
        'pointsAwarded',
        'pointsRewarded',
        'characterCreated',
        'taskCreated:service-line-full',
      ]) {
        await clearEffect(EffectKeys.sideEffect('sale', saleId, effect));
      }
    }
    await removeTask(serviceTaskId);
    await removeItem(productItemId);
  });

  afterEach(async () => {
    for (const saleId of [productSaleId, serviceSaleId]) {
      const financials = await getFinancialsBySourceSaleId(saleId);
      for (const financial of financials) await removeFinancial(financial.id);
    }
    await removeSale(productSaleId);
    await removeSale(serviceSaleId);
    await removeTask(serviceTaskId);
    await removeItem(productItemId);

    expect(await getSaleById(productSaleId)).toBeNull();
    expect(await getSaleById(serviceSaleId)).toBeNull();
    expect(await getFinancialsBySourceSaleId(productSaleId)).toHaveLength(0);
    expect(await getFinancialsBySourceSaleId(serviceSaleId)).toHaveLength(0);
    await waitFor(async () => (await getTaskById(serviceTaskId)) === null, 10_000);
    expect(await getItemById(productItemId)).toBeNull();
    await waitFor(async () => (await getItemById(`${productItemId}-sold-product-line-full`)) === null, 10_000);
    await waitFor(async () => (await getLinksFor({ type: EntityType.SALE, id: productSaleId })).length === 0, 10_000);
    await waitFor(async () => (await getLinksFor({ type: EntityType.SALE, id: serviceSaleId })).length === 0, 10_000);
  });

  it('runs the full direct product Sale workflow', async () => {
    const now = getUTCNow();
    const timestamp = toUTCISOString(now);
    const players = await getAllPlayers();
    const character = (await getAllCharacters()).find(candidate => candidate.playerId && players.some(player => player.id === candidate.playerId));
    if (!character || !character.playerId) throw new Error('Cannot run full Direct product Sale test: a Player-linked Character is required.');
    const playerBefore = await getPlayerById(character.playerId);
    if (!playerBefore) throw new Error('Cannot run full Direct product Sale test: linked Player could not be loaded.');
    const pointsBefore = pointSnapshot(playerBefore);

    await upsertItem({
      id: productItemId,
      name: 'testing-direct-sale-product',
      type: ItemType.BUNDLE,
      subItemType: 'print' as any,
      status: ItemStatus.FOR_SALE,
      stock: [{ siteId: 'hq', quantity: 2 }],
      pricing: {
        unitCost: money('300'),
        targetPrice: money('1000'),
      },
      context: { collection: Collection.NO_COLLECTION, year: now.getUTCFullYear() },
      createdAt: now,
      updatedAt: now,
    } as any, { skipWorkflowEffects: true, skipLinkEffects: true, skipSummaryUpdate: true });

    await upsertSale({
      id: productSaleId,
      schemaVersion: 1,
      version: 0,
      name: 'testing-direct-product-sale-full',
      description: 'Full direct product Sale workflow test',
      type: SaleType.DIRECT,
      status: SaleStatus.CHARGED,
      siteId: 'hq',
      counterpartyName: 'Existing test Character',
      characterId: character.id,
      ownerId: character.id,
      lines: [{
        lineId: 'product-line-full',
        kind: 'item',
        itemId: productItemId,
        quantity: 1,
        unitPrice: money('1000'),
        taxAmount: money('130'),
      }],
      payments: [{ method: PaymentMethod.FIAT_USD, amount: money('1080') }],
      totals: {
        subtotal: money('1000'),
        discountTotal: money('50'),
        taxTotal: money('130'),
        totalRevenue: money('1080'),
        totalCost: money('100'),
      },
      lifecycle: { chargedAt: timestamp, doneAt: timestamp },
      context: {
        rewardIntent: { points: { xp: 5, rp: 2, fp: 1, hp: 0 } },
      },
      createdAt: now,
      updatedAt: now,
    } as any);

    await waitFor(async () => {
      const links = await getLinksFor({ type: EntityType.SALE, id: productSaleId });
      return links.some(link => link.linkType === 'SALE_SITE') &&
        links.some(link => link.linkType === 'SALE_ITEM') &&
        links.some(link => link.linkType === 'SALE_CHARACTER');
    });

    const saved = await getSaleById(productSaleId);
    const persisted = await getPersistedSaleById(productSaleId);
    const soldItems = await getItemsBySourceRecordId(productSaleId);
    const productFinancials = await getFinancialsBySourceSaleId(productSaleId);
    const links = await getLinksFor({ type: EntityType.SALE, id: productSaleId });
    if (!saved || !persisted) throw new Error('Full Direct product Sale was not persisted.');

    const output = { sale: JSON.parse(JSON.stringify(persisted)), financials: JSON.parse(JSON.stringify(productFinancials)), links, soldItems: JSON.parse(JSON.stringify(soldItems)) };
    writeFileSync(resolve(__dirname, 'direct-sale-product-entity-test-full.output.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    process.stderr.write(`[entity-test] full Direct product Sale workflow output:\n${JSON.stringify(output, null, 2)}\n`);

    expect(persisted).not.toHaveProperty('siteId');
    expect(persisted).not.toHaveProperty('characterId');
    expect(persisted).not.toHaveProperty('playerCharacterId');
    expect(persisted).not.toHaveProperty('counterpartyName');
    expect(saved.siteId).toBe('hq');
    expect(links).toEqual(expect.arrayContaining([
      expect.objectContaining({ linkType: 'SALE_SITE', relationship: 'sold-at', target: { type: EntityType.SITE, id: 'hq' } }),
      expect.objectContaining({ linkType: 'SALE_ITEM', relationship: 'sold-item' }),
      expect.objectContaining({ linkType: 'SALE_CHARACTER', relationship: 'customer', target: { type: EntityType.CHARACTER, id: character.id } }),
      expect.objectContaining({ linkType: 'SALE_CHARACTER', relationship: 'owner', target: { type: EntityType.CHARACTER, id: character.id } }),
    ]));
    const productFinrecLink = links.find(link => link.linkType === 'SALE_FINREC');
    expect(productFinrecLink).toEqual(expect.objectContaining({ relationship: 'sale-record' }));
    const productFinrecLinks = productFinrecLink ? await getLinksFor(productFinrecLink.target) : [];
    expect(productFinrecLinks.some(link => link.linkType === 'FINREC_ITEM')).toBe(false);
    expect(productFinrecLinks).toEqual(expect.arrayContaining([
      expect.objectContaining({ linkType: 'FINREC_SITE', relationship: 'source-site', target: { type: EntityType.SITE, id: 'hq' } }),
    ]));
    expect(soldItems.length).toBeGreaterThan(0);
    expect(soldItems.some(item => item.status === ItemStatus.SOLD)).toBe(true);
    expect(productFinancials).toEqual(expect.arrayContaining([
      expect.objectContaining({ cost: money('100'), revenue: money('1080'), netCashflow: money('980') }),
    ]));
    expect(persisted.payments?.[0]?.amount).toEqual(money('1080'));
    expect(persisted.payments?.[0]).not.toHaveProperty('currency');
    expect(persisted.payments?.[0]).not.toHaveProperty('receivedAt');
    expect(persisted.context).not.toHaveProperty('paymentBreakdown');
    expect(persisted.totals?.totalCost).toEqual(money('100'));
    expect(persisted.lifecycle?.chargedAt).toBe(timestamp);
    expect(persisted.lines?.[0]?.lineId).toBe('product-line-full');
    expect(links.some(link => String(link.linkType) === 'SALE_PLAYER')).toBe(false);
    await expectSaleRewardEvidence(productSaleId, character.playerId, pointsBefore, { xp: 5, rp: 2, fp: 1, hp: 0 });
  });

  it('runs the full direct service Sale workflow and creates its Task link', async () => {
    const now = getUTCNow();
    const timestamp = toUTCISOString(now);
    const players = await getAllPlayers();
    const character = (await getAllCharacters()).find(candidate => candidate.playerId && players.some(player => player.id === candidate.playerId));
    if (!character || !character.playerId) throw new Error('Cannot run full Direct service Sale test: a Player-linked Character is required.');
    const playerBefore = await getPlayerById(character.playerId);
    if (!playerBefore) throw new Error('Cannot run full Direct service Sale test: linked Player could not be loaded.');
    const pointsBefore = pointSnapshot(playerBefore);

    await upsertSale({
      id: serviceSaleId,
      schemaVersion: 1,
      version: 0,
      name: 'testing-direct-service-sale-full',
      description: 'Full direct service Sale workflow test',
      type: SaleType.DIRECT,
      status: SaleStatus.CHARGED,
      siteId: 'hq',
      counterpartyName: 'Existing test Character',
      characterId: character.id,
      ownerId: character.id,
      lines: [{
        lineId: 'service-line-full',
        kind: 'service',
        revenue: money('5000'),
        context: { createTask: true, taskDescription: 'Testing charged service task', taskStation: 'strategy' as any, taskId: serviceTaskId, taskType: TaskType.MISSION },
      }],
      payments: [{ method: PaymentMethod.FIAT_USD, amount: money('5000') }],
      totals: { subtotal: money('5000'), totalRevenue: money('5000') },
      lifecycle: { chargedAt: timestamp, doneAt: timestamp },
      context: {
        rewardIntent: { points: { xp: 3, rp: 1, fp: 0, hp: 0 } },
      },
      createdAt: now,
      updatedAt: now,
    } as any);

    await waitFor(async () => {
      const links = await getLinksFor({ type: EntityType.SALE, id: serviceSaleId });
      return links.some(link => link.linkType === 'SALE_SITE') &&
        links.some(link => link.linkType === 'SALE_TASK') &&
        links.some(link => link.linkType === 'SALE_CHARACTER');
    });

    const saved = await getSaleById(serviceSaleId);
    const persisted = await getPersistedSaleById(serviceSaleId);
    const task = await getTaskById(serviceTaskId);
    const links = await getLinksFor({ type: EntityType.SALE, id: serviceSaleId });
    if (!saved || !persisted || !task) throw new Error('Full Direct service Sale or generated Task was not persisted.');

    const output = { sale: JSON.parse(JSON.stringify(persisted)), task: JSON.parse(JSON.stringify(task)), links };
    writeFileSync(resolve(__dirname, 'direct-sale-service-entity-test-full.output.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    process.stderr.write(`[entity-test] full Direct service Sale workflow output:\n${JSON.stringify(output, null, 2)}\n`);

    expect(persisted).not.toHaveProperty('siteId');
    expect(persisted).not.toHaveProperty('characterId');
    expect(persisted).not.toHaveProperty('playerCharacterId');
    expect(persisted).not.toHaveProperty('counterpartyName');
    expect(saved.siteId).toBe('hq');
    expect(task.id).toBe(serviceTaskId);
    expect(task.type).toBe(TaskType.MISSION);
    expect(task.station).toBe('strategy');
    expect(task.description).toBe('Testing charged service task');
    expect(task.status).toBe('Created');
    expect(persisted.payments?.[0]?.amount).toEqual(money('5000'));
    expect(persisted.payments?.[0]).not.toHaveProperty('currency');
    expect(persisted.payments?.[0]).not.toHaveProperty('receivedAt');
    expect(persisted.context).not.toHaveProperty('paymentBreakdown');
    expect(persisted.lifecycle?.chargedAt).toBe(timestamp);
    expect(persisted.lines?.[0]?.lineId).toBe('service-line-full');
    expect(links.some(link => String(link.linkType) === 'SALE_PLAYER')).toBe(false);
    await expectSaleRewardEvidence(serviceSaleId, character.playerId, pointsBefore, { xp: 3, rp: 1, fp: 0, hp: 0 });
    expect(links).toEqual(expect.arrayContaining([
      expect.objectContaining({ linkType: 'SALE_SITE', relationship: 'sold-at', target: { type: EntityType.SITE, id: 'hq' } }),
      expect.objectContaining({ linkType: 'SALE_TASK', relationship: 'sold-service', target: { type: EntityType.TASK, id: serviceTaskId } }),
      expect.objectContaining({ linkType: 'SALE_CHARACTER', relationship: 'customer', target: { type: EntityType.CHARACTER, id: character.id } }),
      expect.objectContaining({ linkType: 'SALE_CHARACTER', relationship: 'owner', target: { type: EntityType.CHARACTER, id: character.id } }),
    ]));
    const serviceFinrecLink = links.find(link => link.linkType === 'SALE_FINREC');
    expect(serviceFinrecLink).toEqual(expect.objectContaining({ relationship: 'sale-record' }));
    const serviceFinrecLinks = serviceFinrecLink ? await getLinksFor(serviceFinrecLink.target) : [];
    expect(serviceFinrecLinks).toEqual(expect.arrayContaining([
      expect.objectContaining({ linkType: 'FINREC_SITE', relationship: 'source-site', target: { type: EntityType.SITE, id: 'hq' } }),
    ]));
  });
});
