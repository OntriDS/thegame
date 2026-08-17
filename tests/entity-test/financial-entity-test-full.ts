import { afterEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('server-only', () => ({}));

import { getAllCharacters, getFinancialById, removeFinancial, upsertFinancial } from '@/data-store/datastore';
import { FinancialStatus } from '@/types/enums';
import { getUTCNow } from '@/lib/utils/utc-utils';

describe('entity-test: full FinancialRecord', () => {
  const financialId = 'entity-test-financial-full';

  afterEach(async () => {
    await removeFinancial(financialId);
  });

  it('persists every active FinancialRecord field in the canonical shape', async () => {
    const owner = (await getAllCharacters()).find(character => Boolean(character.playerId));
    if (!owner) throw new Error('Cannot run full FinancialRecord test: no Player-owned Character exists.');

    const now = getUTCNow();
    const doneAt = new Date(now.getTime() - 60_000);
    const collectedAt = now;

    await upsertFinancial({
      id: financialId,
      schemaVersion: 1,
      version: 0,
      name: 'testing-financial-full',
      description: 'Full FinancialRecord entity test',
      year: now.getUTCFullYear(),
      month: now.getUTCMonth() + 1,
      station: 'strategy' as any,
      type: 'personal',
      siteId: 'hq',
      targetSiteId: 'site-world',
      characterId: owner.id,
      playerCharacterId: owner.id,
      sourceTaskId: 'entity-test-source-task',
      sourceSaleId: 'entity-test-source-sale',
      salesChannel: 'direct-sales' as any,
      cost: { minorUnits: '2500', currency: 'USD' },
      revenue: { minorUnits: '10000', currency: 'USD' },
      netCashflow: { minorUnits: '7500', currency: 'USD' },
      status: FinancialStatus.PENDING,
      lifecycle: { doneAt, collectedAt },
      context: {
        counterparty: { counterpartyId: owner.id, role: 'beneficiary' },
        jungleCoins: 1,
        paymentObservation: { paid: false, charged: false },
        productionPlan: {
          outputItemType: 'bundle',
          outputItemSubType: 'print',
          outputQuantity: 2,
          outputUnitCost: { minorUnits: '1000', currency: 'USD' },
          outputItemName: 'testing-financial-output',
          outputItemPrice: { minorUnits: '5000', currency: 'USD' },
          outputItemStatus: 'for-sale',
          isNewItem: true,
          isSold: false,
        },
        exchangeType: 'POINTS_TO_J$',
        exchangeCounterAmount: 10,
        newCustomerName: 'Testing Customer',
        notes: 'Full context facet coverage',
      },
      createdAt: doneAt,
      updatedAt: now,
    } as any, { skipWorkflowEffects: true, skipLinkEffects: true, forceSave: true });

    const saved = await getFinancialById(financialId);
    if (!saved) throw new Error(`Entity-test FinancialRecord ${financialId} was not found after creation.`);

    const persisted = JSON.parse(JSON.stringify(saved));
    const outputFile = resolve(__dirname, 'financial-entity-test-full.output.json');
    writeFileSync(outputFile, `${JSON.stringify(persisted, null, 2)}\n`, 'utf8');
    process.stderr.write(`[entity-test] persisted full FinancialRecord entity:\n${JSON.stringify(persisted, null, 2)}\n`);

    expect(persisted).toMatchObject({
      id: financialId,
      schemaVersion: 1,
      version: 0,
      name: 'testing-financial-full',
      description: 'Full FinancialRecord entity test',
      siteId: 'hq',
      targetSiteId: 'site-world',
      characterId: owner.id,
      playerCharacterId: owner.id,
      sourceTaskId: 'entity-test-source-task',
      sourceSaleId: 'entity-test-source-sale',
      salesChannel: 'direct-sales',
      context: {
        counterparty: { counterpartyId: owner.id, role: 'beneficiary' },
        jungleCoins: 1,
        paymentObservation: { paid: false, charged: false },
        exchangeType: 'POINTS_TO_J$',
        exchangeCounterAmount: 10,
        newCustomerName: 'Testing Customer',
        notes: 'Full context facet coverage',
      },
    });
    expect(persisted.context).not.toHaveProperty('kind');
    expect(persisted.context).not.toHaveProperty('schemaVersion');
  });
});
