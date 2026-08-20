import { afterEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('server-only', () => ({}));

import { getSiteById, removeSite, upsertSite } from '@/data-store/datastore';
import { getLinksFor } from '@/links/link-registry';
import { EntityType, SiteStatus, SiteType, DigitalSiteType } from '@/types/enums';
import { getUTCNow } from '@/lib/utils/utc-utils';

describe('entity-test: clean minimal Site', () => {
  const siteId = 'entity-test-site-clean';

  afterEach(async () => {
    await removeSite(siteId);
    expect(await getSiteById(siteId)).toBeNull();
    expect(await getLinksFor({ type: EntityType.SITE, id: siteId })).toHaveLength(0);
  });

  it('persists only the canonical minimum Site fields', async () => {
    const now = getUTCNow();

    await upsertSite({
      id: siteId,
      schemaVersion: 1,
      version: 0,
      name: 'testing-site',
      type: SiteType.DIGITAL_SITE,
      subtype: DigitalSiteType.LOCAL,
      status: SiteStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });

    const saved = await getSiteById(siteId);
    if (!saved) throw new Error(`Entity-test Site ${siteId} was not found after creation.`);

    const persisted = JSON.parse(JSON.stringify(saved));
    const outputFile = resolve(__dirname, 'site-entity-test-clean.output.json');
    writeFileSync(outputFile, `${JSON.stringify(persisted, null, 2)}\n`, 'utf8');
    process.stderr.write(`[entity-test] persisted Site entity:\n${JSON.stringify(persisted, null, 2)}\n`);

    expect(persisted).toEqual({
      id: siteId,
      schemaVersion: 1,
      version: 0,
      name: 'testing-site',
      type: SiteType.DIGITAL_SITE,
      subtype: DigitalSiteType.LOCAL,
      status: SiteStatus.ACTIVE,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });
});
