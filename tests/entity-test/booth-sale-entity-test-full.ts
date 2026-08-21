import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('server-only', () => ({}));

import {
  getAllCharacters,
  getAllPlayers,
  getFinancialsBySourceSaleId,
  getItemsBySourceRecordId,
  getSaleById,
  removeBusiness,
  removeContract,
  removeFinancial,
  removeItem,
  removeSale,
  upsertBusiness,
  upsertContract,
  upsertItem,
  upsertSale,
} from '@/data-store/datastore';
import { clearEffect, clearEffectsByPrefix } from '@/data-store/effects-registry';
import { EffectKeys } from '@/data-store/keys';
import { getLinksFor, removeLink } from '@/links/link-registry';
import { makeLink } from '@/links/links-workflows';
import { getSaleById as getPersistedSaleById } from '@/data-store/repositories/sale.repo';
import {
  BusinessType,
  Collection,
  ContractClauseType,
  ContractStatus,
  Currency,
  EntityType,
  ItemStatus,
  ItemType,
  LinkType,
  PaymentMethod,
  SaleStatus,
  SaleType,
} from '@/types/enums';
import { getUTCNow, toUTCISOString } from '@/lib/utils/utc-utils';
import { calculateBoothFinancials } from '@/workflows/financial-record-utils';

const saleId = 'entity-test-sale-booth-full';
const itemId = 'entity-test-item-booth-full';
const principalBusinessId = 'entity-test-business-booth-principal';
const partnerBusinessId = 'entity-test-business-booth-partner';
const contractId = 'entity-test-contract-booth-full';

const money = (minorUnits: string, currency = Currency.USD) => ({ minorUnits, currency });
const wait = (milliseconds: number) => new Promise(resolvePromise => setTimeout(resolvePromise, milliseconds));

async function waitFor(predicate: () => Promise<boolean>, timeoutMs = 45_000): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await predicate()) return;
    await wait(250);
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for Booth Sale workflow effects.`);
}

function pointSnapshot(player: any) {
  const points = player.rewards?.points;
  if (!points) throw new Error(`Player ${player.id} has no canonical rewards.points projection.`);
  return JSON.parse(JSON.stringify(points));
}

describe('entity-test: full Booth Sale', () => {
  let ownerCharacter: any;
  let partnerCharacter: any;
  let partnerPlayerBefore: any;
  let principalBusinessLinkId: string | undefined;
  let partnerBusinessLinkId: string | undefined;
  let characterContractLinkId: string | undefined;

  beforeEach(async () => {
    const previousFinancials = await getFinancialsBySourceSaleId(saleId);
    for (const financial of previousFinancials) await removeFinancial(financial.id);
    // Also remove exact generated records from a previously interrupted run;
    // source-sale lookup depends on SALE_FINREC links, which may already be gone.
    for (const financialId of [`finrec-${saleId}`, `finrec-payout-${saleId}`]) {
      await removeFinancial(financialId);
    }
    for (const soldItem of await getItemsBySourceRecordId(saleId)) await removeItem(soldItem.id);
    await removeSale(saleId);
    await removeItem(itemId);
    await removeContract(contractId);
    await removeBusiness(principalBusinessId);
    await removeBusiness(partnerBusinessId);
    await clearEffectsByPrefix(EntityType.SALE, saleId, '');
    await clearEffect(EffectKeys.created('sale', saleId));
    for (const effect of [
      'financialRecordsSynced',
      'financialCreated',
      'inventoryProcessed',
      'linesProcessed',
      'stockDecremented:booth-line-full',
      'soldItemEntity:booth-line-full',
      'saleDoneLogged',
      'saleCollectedLogged',
      'pointsStaged',
      'pointsAwarded',
      'pointsRewarded',
    ]) {
      await clearEffect(EffectKeys.sideEffect('sale', saleId, effect));
    }
  });

  afterEach(async () => {
    const generatedFinancials = [
      ...(await getFinancialsBySourceSaleId(saleId)),
    ];
    const saleLinks = await getLinksFor({ type: EntityType.SALE, id: saleId });
    for (const link of saleLinks) await removeLink(link.id);
    const generatedFinancialIds = new Set([
      ...generatedFinancials.map(financial => financial.id),
      `finrec-${saleId}`,
      `finrec-payout-${saleId}`,
    ]);
    for (const financialId of generatedFinancialIds) {
      const financialLinks = await getLinksFor({ type: EntityType.FINANCIAL, id: financialId });
      for (const link of financialLinks) await removeLink(link.id);
      await removeFinancial(financialId);
    }
    for (const soldItem of await getItemsBySourceRecordId(saleId)) await removeItem(soldItem.id);
    await removeSale(saleId);

    for (const linkId of [principalBusinessLinkId, partnerBusinessLinkId, characterContractLinkId].filter(Boolean)) {
      await removeLink(linkId!);
    }
    principalBusinessLinkId = undefined;
    partnerBusinessLinkId = undefined;
    characterContractLinkId = undefined;

    await removeItem(itemId);
    await removeContract(contractId);
    await removeBusiness(principalBusinessId);
    await removeBusiness(partnerBusinessId);
    await clearEffectsByPrefix(EntityType.SALE, saleId, '');

    expect(await getSaleById(saleId)).toBeNull();
    expect(await getFinancialsBySourceSaleId(saleId)).toHaveLength(0);
    expect(await getItemsBySourceRecordId(saleId)).toHaveLength(0);
    expect(await getLinksFor({ type: EntityType.SALE, id: saleId })).toHaveLength(0);
  });

  it('runs the full Booth settlement with partner service, contract split, USD records, and no rewards', async () => {
    const now = getUTCNow();
    const timestamp = toUTCISOString(now);
    const characters = await getAllCharacters();
    const players = await getAllPlayers();
    ownerCharacter = characters.find(character => character.playerId && players.some(player => player.id === character.playerId));
    partnerCharacter = characters.find(character => character.id !== ownerCharacter?.id);
    if (!ownerCharacter || !partnerCharacter) {
      throw new Error('Cannot run full Booth Sale test: owner and partner Characters are required.');
    }
    partnerPlayerBefore = partnerCharacter.playerId ? await (async () => {
      const player = players.find(candidate => candidate.id === partnerCharacter.playerId);
      return player ? pointSnapshot(player) : null;
    })() : null;

    await upsertBusiness({
      id: principalBusinessId,
      name: 'Entity Test Booth Principal Business',
      type: BusinessType.COMPANY,
      linkedCharacterId: ownerCharacter.id,
      isActive: true,
      schemaVersion: 1,
      version: 0,
      createdAt: now,
      updatedAt: now,
    } as any);
    await upsertBusiness({
      id: partnerBusinessId,
      name: 'Entity Test Booth Partner Business',
      type: BusinessType.COMPANY,
      linkedCharacterId: partnerCharacter.id,
      isActive: true,
      schemaVersion: 1,
      version: 0,
      createdAt: now,
      updatedAt: now,
    } as any);

    const principalBusinessLink = makeLink(
      LinkType.CHARACTER_BUSINESS,
      { type: EntityType.CHARACTER, id: ownerCharacter.id },
      { type: EntityType.BUSINESS, id: principalBusinessId },
      'owns',
    );
    const partnerBusinessLink = makeLink(
      LinkType.CHARACTER_BUSINESS,
      { type: EntityType.CHARACTER, id: partnerCharacter.id },
      { type: EntityType.BUSINESS, id: partnerBusinessId },
      'represents',
    );
    const { createLink } = await import('@/links/link-registry');
    await createLink(principalBusinessLink);
    await createLink(partnerBusinessLink);
    principalBusinessLinkId = principalBusinessLink.id;
    partnerBusinessLinkId = partnerBusinessLink.id;

    await upsertContract({
      id: contractId,
      name: 'Entity Test Booth Contract',
      principalBusinessId,
      counterpartyBusinessId: partnerBusinessId,
      status: ContractStatus.ACTIVE,
      validFrom: now,
      clauses: [
        { id: 'commission', type: ContractClauseType.SALES_COMMISSION, companyShare: 0.75, partnerShare: 0.25 },
        { id: 'service', type: ContractClauseType.SALES_SERVICE, companyShare: 0.75, partnerShare: 0.25 },
        { id: 'expenses', type: ContractClauseType.EXPENSE_SHARING, companyShare: 0.5, partnerShare: 0.5 },
      ],
      schemaVersion: 1,
      version: 0,
      createdAt: now,
      updatedAt: now,
    } as any);

    const characterContractLink = makeLink(
      LinkType.CHARACTER_CONTRACT,
      { type: EntityType.CHARACTER, id: partnerCharacter.id },
      { type: EntityType.CONTRACT, id: contractId },
      'owner',
    );
    await createLink(characterContractLink);
    characterContractLinkId = characterContractLink.id;

    await upsertItem({
      id: itemId,
      name: 'Entity Test Booth Product',
      type: ItemType.BUNDLE,
      subItemType: 'booth-test-product' as any,
      status: ItemStatus.FOR_SALE,
      stock: [{ siteId: 'hq', quantity: 2 }],
      pricing: { unitCost: money('3000'), targetPrice: money('10000') },
      context: { collection: Collection.NO_COLLECTION, year: now.getUTCFullYear(), restockToTarget: false },
      schemaVersion: 1,
      version: 0,
      createdAt: now,
      updatedAt: now,
    } as any, { skipWorkflowEffects: true, skipLinkEffects: true, skipSummaryUpdate: true });

    await upsertSale({
      id: saleId,
      schemaVersion: 1,
      version: 0,
      name: 'testing-booth-sale-full',
      description: 'Full Booth Sale workflow test',
      type: SaleType.BOOTH,
      status: SaleStatus.CHARGED,
      siteId: 'hq',
      characterId: partnerCharacter.id,
      ownerId: ownerCharacter.id,
      partnerId: partnerCharacter.id,
      lines: [
        {
          lineId: 'booth-line-full',
          kind: 'item',
          itemId,
          quantity: 1,
          unitPrice: money('10000'),
        },
        {
          lineId: 'booth-partner-service-full',
          kind: 'service',
          station: 'booth-sales',
          revenue: money('5000'),
          settlement: {
            category: 'Partner Product',
            partnerId: partnerCharacter.id,
          },
        },
      ],
      payments: [
        { method: PaymentMethod.FIAT_CRC, amount: money('10000') },
        { method: PaymentMethod.FIAT_USD, amount: money('5000') },
      ],
      totals: {
        subtotal: money('15000'),
        totalRevenue: money('15000'),
      },
      context: {
        boothCost: money('1000'),
        contractId,
      },
      lifecycle: { chargedAt: timestamp, doneAt: timestamp },
      createdAt: now,
      updatedAt: now,
    } as any);

    await waitFor(async () => {
      const financials = await getFinancialsBySourceSaleId(saleId);
      const links = await getLinksFor({ type: EntityType.SALE, id: saleId });
      return financials.some(record => record.id === `finrec-${saleId}`) &&
        financials.some(record => record.id === `finrec-payout-${saleId}`) &&
        links.some(link => link.linkType === LinkType.SALE_FINREC);
    });

    const saved = await getSaleById(saleId);
    const persisted = await getPersistedSaleById(saleId);
    const financials = await getFinancialsBySourceSaleId(saleId);
    const soldItems = await getItemsBySourceRecordId(saleId);
    const links = await getLinksFor({ type: EntityType.SALE, id: saleId });
    if (!saved || !persisted) throw new Error('Full Booth Sale was not persisted.');

    const output = {
      sale: JSON.parse(JSON.stringify(persisted)),
      financials: JSON.parse(JSON.stringify(financials)),
      links,
      soldItems: JSON.parse(JSON.stringify(soldItems)),
    };
    writeFileSync(resolve(__dirname, 'booth-sale-entity-test-full.output.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    process.stderr.write(`[entity-test] full Booth Sale workflow output:\n${JSON.stringify(output, null, 2)}\n`);

    expect(persisted).not.toHaveProperty('siteId');
    expect(persisted).not.toHaveProperty('characterId');
    expect(persisted).not.toHaveProperty('ownerId');
    expect(persisted).not.toHaveProperty('partnerId');
    expect(persisted).not.toHaveProperty('playerCharacterId');
    expect(persisted).not.toHaveProperty('counterpartyName');
    expect(persisted.context).not.toHaveProperty('paymentBreakdown');
    expect(persisted.context?.boothSaleContext ?? {}).not.toHaveProperty('paymentDistribution');
    expect(persisted.context?.boothSaleContext ?? {}).not.toHaveProperty('boothCost');
    expect(persisted.context?.boothSaleContext).toBeUndefined();
    expect(persisted.context?.contractId).toBe(contractId);
    expect(persisted.context?.rewardIntent).toBeUndefined();
    const partnerLine = persisted.lines.find((line: any) => line.lineId === 'booth-partner-service-full') as any;
    expect(partnerLine?.settlement).toEqual({
      category: 'Partner Product',
      partnerId: partnerCharacter.id,
    });
    expect(partnerLine?.settlement).not.toHaveProperty('originalAmountUSD');
    expect(partnerLine?.settlement).not.toHaveProperty('originalAmountCRC');
    expect(partnerLine?.settlement).not.toHaveProperty('partnerShare');
    expect(partnerLine?.settlement).not.toHaveProperty('myCommission');
    expect(partnerLine).not.toHaveProperty('description');
    expect(persisted.payments).toEqual([
      { method: PaymentMethod.FIAT_CRC, amount: money('10000') },
      { method: PaymentMethod.FIAT_USD, amount: money('5000') },
    ]);
    expect(persisted.totals.totalCost).toEqual(money('4250'));
    expect(persisted.lifecycle.chargedAt).toBe(timestamp);

    // Verify the production calculation path reads the linked active contract,
    // rather than any line-level commission snapshot.
    await expect(calculateBoothFinancials(persisted)).resolves.toMatchObject({
      myGross: 100,
      myBoothCost: 5,
      myCommFromPartner: 37.5,
      partnerCommFromMe: 25,
    });

    expect(links).toEqual(expect.arrayContaining([
      expect.objectContaining({ linkType: LinkType.SALE_SITE, relationship: 'sold-at', target: { type: EntityType.SITE, id: 'hq' } }),
      expect.objectContaining({ linkType: LinkType.SALE_ITEM, relationship: 'sold-item' }),
      expect.objectContaining({ linkType: LinkType.SALE_CHARACTER, relationship: 'customer', target: { type: EntityType.CHARACTER, id: partnerCharacter.id } }),
      expect.objectContaining({ linkType: LinkType.SALE_CHARACTER, relationship: 'owner', target: { type: EntityType.CHARACTER, id: ownerCharacter.id } }),
      expect.objectContaining({ linkType: LinkType.SALE_CHARACTER, relationship: 'partner', target: { type: EntityType.CHARACTER, id: partnerCharacter.id } }),
    ]));

    expect(await getLinksFor({ type: EntityType.CHARACTER, id: partnerCharacter.id })).toEqual(expect.arrayContaining([
      expect.objectContaining({ linkType: LinkType.CHARACTER_CONTRACT, relationship: 'owner', target: { type: EntityType.CONTRACT, id: contractId } }),
    ]));
    expect(financials).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: `finrec-${saleId}`, revenue: money('10000'), cost: money('500'), netCashflow: money('9500') }),
      expect.objectContaining({ id: `finrec-payout-${saleId}`, revenue: money('3750'), cost: money('2500'), netCashflow: money('1250') }),
    ]));
    expect(financials.every(record => record.revenue.currency === Currency.USD && record.cost.currency === Currency.USD && record.netCashflow.currency === Currency.USD)).toBe(true);
    expect(soldItems.some(item => item.status === ItemStatus.SOLD)).toBe(true);
    expect(links.some(link => String(link.linkType) === 'SALE_PLAYER')).toBe(false);
    if (partnerCharacter.playerId && partnerPlayerBefore) {
      const partnerPlayerAfter = (await getAllPlayers()).find(player => player.id === partnerCharacter.playerId);
      expect(partnerPlayerAfter ? pointSnapshot(partnerPlayerAfter) : null).toEqual(partnerPlayerBefore);
    }
  }, 180_000);
});
