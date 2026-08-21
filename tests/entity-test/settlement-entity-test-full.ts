import { afterEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('server-only', () => ({}));

import { getSettlementById, removeSettlement, upsertSettlement, getSiteById, removeSite, upsertSite } from '@/data-store/datastore';
import { createLink, getLinksFor, removeLink } from '@/links/link-registry';
import { EntityType, LinkType, SiteStatus, SiteType, PhysicalBusinessType } from '@/types/enums';

describe('entity-test: full Settlement', () => {
  const settlementId = 'entity-test-settlement-full';
  const siteId = 'entity-test-settlement-site-full';
  const linkId = 'entity-test-site-settlement-link-full';

  afterEach(async () => {
    await removeLink(linkId);
    await removeSettlement(settlementId);
    await removeSite(siteId);
    expect(await getSettlementById(settlementId)).toBeNull();
    expect(await getSiteById(siteId)).toBeNull();
    expect(await getLinksFor({ type: EntityType.SITE, id: siteId })).toHaveLength(0);
  });

  it('persists map fields and forms the canonical Site→Settlement relationship', async () => {
    const now = new Date();
    await upsertSettlement({ id: settlementId, name: 'testing-settlement-full', regionId: 'testing-region-full', googleMapsAddress: 'Full testing address', coordinates: { lat: 9.93, lng: -84.08 }, isActive: true, shape: { type: 'circle', center: { lat: 9.93, lng: -84.08 }, radius: 250 }, isUnlocked: true, createdAt: now, updatedAt: now });
    await upsertSite({ id: siteId, schemaVersion: 1, version: 0, name: 'Settlement test site', type: SiteType.PHYSICAL, subtype: PhysicalBusinessType.STORE, settlementId, googleMapsAddress: 'Full testing address', coordinates: { lat: 9.93, lng: -84.08 }, status: SiteStatus.ACTIVE, createdAt: now, updatedAt: now });

    const link = { id: linkId, linkType: LinkType.SITE_SETTLEMENT, source: { type: EntityType.SITE, id: siteId }, target: { type: EntityType.SETTLEMENT, id: settlementId }, relationship: 'located-in', createdAt: now } as any;
    await createLink(link);

    const saved = await getSettlementById(settlementId);
    const links = await getLinksFor({ type: EntityType.SITE, id: siteId });
    if (!saved) throw new Error('Settlement was not persisted.');
    const output = { settlement: saved, links };
    writeFileSync(resolve(__dirname, 'settlement-entity-test-full.output.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    expect(saved).toMatchObject({ name: 'testing-settlement-full', regionId: 'testing-region-full', coordinates: { lat: 9.93, lng: -84.08 }, isActive: true, isUnlocked: true, shape: { type: 'circle' } });
    expect(links).toEqual([expect.objectContaining({ linkType: LinkType.SITE_SETTLEMENT, source: { type: EntityType.SITE, id: siteId }, target: { type: EntityType.SETTLEMENT, id: settlementId }, relationship: 'located-in' })]);
  });
});
