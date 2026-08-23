import { afterEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('server-only', () => ({}));

import { getAllCharacters, getAllItems, getFinancialById, removeCharacter, removeFinancial, removeItem, upsertFinancial } from '@/data-store/datastore';
import { getLinksFor } from '@/links/link-registry';
import { EntityType, FinancialStatus, LinkType } from '@/types/enums';
import { getUTCNow } from '@/lib/utils/utc-utils';

describe('entity-test: full FinancialRecord', () => {
  const financialId = 'entity-test-financial-full';
  let generatedCharacterId: string | null = null;

  afterEach(async () => {
    const generatedItems = (await getAllItems()).filter(item => item.sourceRecordId === financialId);
    for (const item of generatedItems) await removeItem(item.id);
    if (generatedCharacterId) await removeCharacter(generatedCharacterId);
    generatedCharacterId = null;
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
      salesChannel: 'direct-sales' as any,
      cost: { minorUnits: '2500', currency: 'USD' },
      revenue: { minorUnits: '10000', currency: 'USD' },
      netCashflow: { minorUnits: '7500', currency: 'USD' },
      status: FinancialStatus.COLLECTED,
      lifecycle: { doneAt, collectedAt },
      context: {
        jungleCoins: 1,
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
      __financialRelations: {
        siteId: 'hq',
        targetSiteId: 'world',
        characterId: owner.id,
        characterRelationship: 'beneficiary',
      },
    } as any, { forceSave: true });

    const saved = await getFinancialById(financialId);
    if (!saved) throw new Error(`Entity-test FinancialRecord ${financialId} was not found after creation.`);

    const persisted = JSON.parse(JSON.stringify(saved));
    const links = await getLinksFor({ type: EntityType.FINANCIAL, id: financialId });
    const generatedItems = (await getAllItems()).filter(item => item.sourceRecordId === financialId);
    const generatedCharacters = (await getAllCharacters()).filter(character => character.name === 'Testing Customer');
    generatedCharacterId = generatedCharacters.at(-1)?.id || null;
    const output = { financial: persisted, links, items: generatedItems, characters: generatedCharacters };
    const outputFile = resolve(__dirname, 'financial-entity-test-full.output.json');
    writeFileSync(outputFile, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    process.stderr.write(`[entity-test] persisted full FinancialRecord workflow output:\n${JSON.stringify(output, null, 2)}\n`);

    expect(persisted).toMatchObject({
      id: financialId,
      schemaVersion: 1,
      version: 0,
      name: 'testing-financial-full',
      description: 'Full FinancialRecord entity test',
      context: {
        jungleCoins: 1,
        exchangeType: 'POINTS_TO_J$',
        exchangeCounterAmount: 10,
        newCustomerName: 'Testing Customer',
        notes: 'Full context facet coverage',
      },
    });
    expect(persisted.context).not.toHaveProperty('kind');
    expect(persisted.context).not.toHaveProperty('schemaVersion');
    expect(persisted).not.toHaveProperty('characterId');
    expect(persisted).not.toHaveProperty('playerCharacterId');
    expect(persisted).not.toHaveProperty('sourceTaskId');
    expect(persisted).not.toHaveProperty('sourceSaleId');
    expect(persisted).not.toHaveProperty('siteId');
    expect(persisted).not.toHaveProperty('targetSiteId');
    expect(persisted.context).not.toHaveProperty('counterparty');
    expect(generatedItems).toHaveLength(1);
    expect(generatedItems[0]).toMatchObject({ sourceRecordId: financialId, status: 'for-sale' });
    expect(links).toEqual(expect.arrayContaining([
      expect.objectContaining({ linkType: LinkType.FINREC_CHARACTER, relationship: 'beneficiary' }),
    ]));
    expect(links).toEqual(expect.arrayContaining([
      expect.objectContaining({
        linkType: LinkType.FINREC_ITEM,
        relationship: 'item-bought',
        target: { type: EntityType.ITEM, id: generatedItems[0].id },
      }),
    ]));
    expect(links.some((link) =>
      link.linkType === LinkType.FINREC_PLAYER || link.linkType === LinkType.PLAYER_FINREC
    )).toBe(false);
  });
});
