import { afterEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('server-only', () => ({}));

import { getContractById, removeContract, upsertContract, removeBusiness, upsertBusiness, removeCharacter, upsertCharacter } from '@/data-store/datastore';
import { createLink, getLinksFor, removeLink } from '@/links/link-registry';
import { BusinessType, ContractClauseType, ContractStatus, EntityType, LinkType } from '@/types/enums';
import { getUTCNow } from '@/lib/utils/utc-utils';

describe('entity-test: full Contract', () => {
  const contractId = 'entity-test-contract-full';
  const principalCharacterId = 'entity-test-contract-principal-character-full';
  const counterpartyCharacterId = 'entity-test-contract-counterparty-character-full';
  const principalBusinessId = 'entity-test-contract-principal-business-full';
  const counterpartyBusinessId = 'entity-test-contract-counterparty-business-full';
  const links: string[] = [];

  afterEach(async () => {
    for (const linkId of links.splice(0)) await removeLink(linkId);
    await removeContract(contractId);
    await removeBusiness(principalBusinessId);
    await removeBusiness(counterpartyBusinessId);
    await removeCharacter(principalCharacterId);
    await removeCharacter(counterpartyCharacterId);
    expect(await getContractById(contractId)).toBeNull();
    expect(await getLinksFor({ type: EntityType.CONTRACT, id: contractId })).toHaveLength(0);
  });

  it('persists clauses and creates the canonical Character→Contract owner link', async () => {
    const now = getUTCNow();
    for (const [id, name] of [[principalCharacterId, 'Contract issuer'], [counterpartyCharacterId, 'Contract counterparty']] as const) await upsertCharacter({ id, schemaVersion: 1, version: 0, name, roles: [], qualifications: [], lastActiveAt: now, isActive: true, createdAt: now, updatedAt: now } as any, { skipWorkflowEffects: true, skipLinkEffects: true });
    for (const [id, name, characterId] of [[principalBusinessId, 'Principal business', principalCharacterId], [counterpartyBusinessId, 'Counterparty business', counterpartyCharacterId]] as const) {
      await upsertBusiness({ id, schemaVersion: 1, version: 0, name, type: BusinessType.COMPANY, isActive: true, createdAt: now, updatedAt: now });
      const businessLink = { id: `${id}-character-link`, linkType: LinkType.CHARACTER_BUSINESS, source: { type: EntityType.CHARACTER, id: characterId }, target: { type: EntityType.BUSINESS, id }, relationship: 'owns', createdAt: now } as any;
      await createLink(businessLink);
      links.push(businessLink.id);
    }
    await upsertContract({ id: contractId, schemaVersion: 1, version: 0, name: 'testing-contract-full', description: 'Full contract summary', status: ContractStatus.ACTIVE, clauses: [{ id: 'contract-clause-full', type: ContractClauseType.SALES_SERVICE, itemCategory: 'products', description: 'Partner product selling service', companyShare: 0.25, partnerShare: 0.75 }], isExclusive: true, createdAt: now, updatedAt: now });

    for (const [id, characterId, relationship] of [['entity-test-contract-owner-link-full', principalCharacterId, 'owner'], ['entity-test-contract-counterparty-link-full', counterpartyCharacterId, 'counterparty'] as const]) {
      const link = { id, linkType: LinkType.CHARACTER_CONTRACT, source: { type: EntityType.CHARACTER, id: characterId }, target: { type: EntityType.CONTRACT, id: contractId }, relationship, createdAt: now } as any;
      await createLink(link);
      links.push(link.id);
    }

    const saved = await getContractById(contractId);
    const contractLinks = await getLinksFor({ type: EntityType.CONTRACT, id: contractId });
    if (!saved) throw new Error('Contract was not persisted.');
    const output = { contract: saved, links: contractLinks };
    writeFileSync(resolve(__dirname, 'contract-entity-test-full.output.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8');

    expect(saved).toMatchObject({ name: 'testing-contract-full', description: 'Full contract summary', status: ContractStatus.ACTIVE, isExclusive: true, clauses: [expect.objectContaining({ type: ContractClauseType.SALES_SERVICE, companyShare: 0.25, partnerShare: 0.75 })] });
    expect(saved).not.toHaveProperty('principalBusinessId');
    expect(saved).not.toHaveProperty('counterpartyBusinessId');
    expect(contractLinks).toEqual(expect.arrayContaining([
      expect.objectContaining({ linkType: LinkType.CHARACTER_CONTRACT, source: { type: EntityType.CHARACTER, id: principalCharacterId }, target: { type: EntityType.CONTRACT, id: contractId }, relationship: 'owner' }),
      expect.objectContaining({ linkType: LinkType.CHARACTER_CONTRACT, source: { type: EntityType.CHARACTER, id: counterpartyCharacterId }, target: { type: EntityType.CONTRACT, id: contractId }, relationship: 'counterparty' }),
    ]));
  });
});
