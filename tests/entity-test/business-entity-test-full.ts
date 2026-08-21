import { afterEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('server-only', () => ({}));

import { getBusinessById, removeBusiness, upsertBusiness, removeCharacter, upsertCharacter, removeSite, upsertSite } from '@/data-store/datastore';
import { createLink, getLinksFor, removeLink } from '@/links/link-registry';
import { BusinessType, EntityType, LinkType, SiteStatus, SiteType, DigitalSiteType } from '@/types/enums';
import { getUTCNow } from '@/lib/utils/utc-utils';

describe('entity-test: full Business', () => {
  const businessId = 'entity-test-business-full';
  const characterId = 'entity-test-business-character-full';
  const siteId = 'entity-test-business-site-full';
  const links: string[] = [];

  afterEach(async () => {
    for (const linkId of links.splice(0)) await removeLink(linkId);
    await removeBusiness(businessId);
    await removeCharacter(characterId);
    await removeSite(siteId);
    expect(await getBusinessById(businessId)).toBeNull();
    expect(await getLinksFor({ type: EntityType.BUSINESS, id: businessId })).toHaveLength(0);
  });

  it('persists full fields and forms the Character→Business link', async () => {
    const now = getUTCNow();
    await upsertCharacter({ id: characterId, schemaVersion: 1, version: 0, name: 'Business representative', roles: [], qualifications: [], lastActiveAt: now, isActive: true, createdAt: now, updatedAt: now } as any, { skipWorkflowEffects: true, skipLinkEffects: true });
    await upsertSite({ id: siteId, schemaVersion: 1, version: 0, name: 'Business headquarters', type: SiteType.DIGITAL_SITE, subtype: DigitalSiteType.LOCAL, status: SiteStatus.ACTIVE, createdAt: now, updatedAt: now });
    await upsertBusiness({ id: businessId, schemaVersion: 1, version: 0, name: 'testing-business-full', description: 'Full Business test', type: BusinessType.COMPANY, isActive: true, createdAt: now, updatedAt: now });

    const link = { id: 'entity-test-business-character-link-full', linkType: LinkType.CHARACTER_BUSINESS, source: { type: EntityType.CHARACTER, id: characterId }, target: { type: EntityType.BUSINESS, id: businessId }, relationship: 'owns', createdAt: now } as any;
    await createLink(link);
    links.push(link.id);

    const saved = await getBusinessById(businessId);
    const characterLinks = await getLinksFor({ type: EntityType.CHARACTER, id: characterId });
    if (!saved) throw new Error('Business was not persisted.');
    const output = { business: saved, links: characterLinks };
    writeFileSync(resolve(__dirname, 'business-entity-test-full.output.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8');

    expect(saved).toMatchObject({ name: 'testing-business-full', type: BusinessType.COMPANY, isActive: true });
    expect(saved).not.toHaveProperty('taxId');
    expect(saved).not.toHaveProperty('linkedCharacterId');
    expect(saved).not.toHaveProperty('linkedSiteId');
    expect(characterLinks).toEqual([expect.objectContaining({ linkType: LinkType.CHARACTER_BUSINESS, source: { type: EntityType.CHARACTER, id: characterId }, target: { type: EntityType.BUSINESS, id: businessId }, relationship: 'owns' })]);
  });
});
