import { afterEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('server-only', () => ({}));

import { getRegionById, removeRegion, upsertRegion } from '@/data-store/datastore';
import { EntityType } from '@/types/enums';
import { getLinksFor } from '@/links/link-registry';

describe('entity-test: clean minimal Region', () => {
  const regionId = 'entity-test-region-clean';

  afterEach(async () => {
    await removeRegion(regionId);
    expect(await getRegionById(regionId)).toBeNull();
    expect(await getLinksFor({ type: EntityType.REGION, id: regionId })).toHaveLength(0);
  });

  it('persists the required map region fields', async () => {
    await upsertRegion({ id: regionId, name: 'testing-region-clean', center: { lat: 9.93, lng: -84.08 }, defaultZoom: 10, isActive: true, createdAt: new Date(), updatedAt: new Date() });
    const saved = await getRegionById(regionId);
    if (!saved) throw new Error('Region was not persisted.');
    const output = JSON.parse(JSON.stringify(saved));
    writeFileSync(resolve(__dirname, 'region-entity-test-clean.output.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    expect(output).toMatchObject({ id: regionId, name: 'testing-region-clean', center: { lat: 9.93, lng: -84.08 }, defaultZoom: 10, isActive: true, isUnlocked: true });
    expect(output).not.toHaveProperty('shape');
    expect(output).not.toHaveProperty('maxBounds');
  });
});
