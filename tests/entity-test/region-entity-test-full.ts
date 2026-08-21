import { afterEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('server-only', () => ({}));

import { getRegionById, removeRegion, upsertRegion } from '@/data-store/datastore';
import { EntityType } from '@/types/enums';
import { getLinksFor } from '@/links/link-registry';

describe('entity-test: full Region', () => {
  const regionId = 'entity-test-region-full';

  afterEach(async () => {
    await removeRegion(regionId);
    expect(await getRegionById(regionId)).toBeNull();
    expect(await getLinksFor({ type: EntityType.REGION, id: regionId })).toHaveLength(0);
  });

  it('persists the complete map region shape and optional bounds', async () => {
    await upsertRegion({ id: regionId, name: 'testing-region-full', center: { lat: 9.93, lng: -84.08 }, defaultZoom: 12, isUnlocked: false, shape: { type: 'polygon', coordinates: [{ lat: 9.92, lng: -84.09 }, { lat: 9.94, lng: -84.09 }, { lat: 9.94, lng: -84.07 }] }, maxBounds: [[9.90, -84.12], [9.96, -84.04]], parentId: null, isActive: true, createdAt: new Date(), updatedAt: new Date() });
    const saved = await getRegionById(regionId);
    if (!saved) throw new Error('Region was not persisted.');
    const output = JSON.parse(JSON.stringify(saved));
    writeFileSync(resolve(__dirname, 'region-entity-test-full.output.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    expect(output).toMatchObject({ id: regionId, name: 'testing-region-full', defaultZoom: 12, isUnlocked: false, isActive: true, parentId: null, shape: { type: 'polygon', coordinates: expect.any(Array) }, maxBounds: expect.any(Array) });
  });
});
