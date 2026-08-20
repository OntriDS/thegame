import { afterEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('server-only', () => ({}));

import { getSiteById, removeSite, upsertSite } from '@/data-store/datastore';
import { getLinksFor } from '@/links/link-registry';
import { DigitalSiteType, EntityType, SiteStatus, SiteType } from '@/types/enums';
import { getUTCNow } from '@/lib/utils/utc-utils';

describe('entity-test: full Site', () => {
  const siteId = 'entity-test-site-full';

  afterEach(async () => {
    await removeSite(siteId);
    expect(await getSiteById(siteId)).toBeNull();
    expect(await getLinksFor({ type: EntityType.SITE, id: siteId })).toHaveLength(0);
  });

  it('persists the full canonical Site shape and strips legacy metadata', async () => {
    const now = getUTCNow();

    await upsertSite({
      id: siteId,
      schemaVersion: 1,
      version: 0,
      name: 'testing-site-full',
      description: 'Full Site entity test',
      type: SiteType.DIGITAL_SITE,
      subtype: DigitalSiteType.WEBSITEAPP,
      url: 'https://example.test/site-full',
      metadata: {
        type: SiteType.DIGITAL_SITE,
        digitalType: DigitalSiteType.WEBSITEAPP,
        url: 'https://legacy.example.test/should-not-win',
      },
      status: SiteStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });

    const saved = await getSiteById(siteId);
    if (!saved) throw new Error(`Entity-test Site ${siteId} was not found after creation.`);

    const persisted = JSON.parse(JSON.stringify(saved));
    const outputFile = resolve(__dirname, 'site-entity-test-full.output.json');
    writeFileSync(outputFile, `${JSON.stringify(persisted, null, 2)}\n`, 'utf8');
    process.stderr.write(`[entity-test] persisted full Site entity:\n${JSON.stringify(persisted, null, 2)}\n`);

    expect(persisted).toEqual({
      id: siteId,
      schemaVersion: 1,
      version: 0,
      name: 'testing-site-full',
      description: 'Full Site entity test',
      type: SiteType.DIGITAL_SITE,
      subtype: DigitalSiteType.WEBSITEAPP,
      url: 'https://example.test/site-full',
      status: SiteStatus.ACTIVE,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
    expect(persisted).not.toHaveProperty('metadata');
  });
});
