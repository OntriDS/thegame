import { afterEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('server-only', () => ({}));

import { getBusinessById, removeBusiness, upsertBusiness } from '@/data-store/datastore';
import { getLinksFor } from '@/links/link-registry';
import { EntityType, BusinessType } from '@/types/enums';
import { getUTCNow } from '@/lib/utils/utc-utils';

describe('entity-test: clean minimal Business', () => {
  const businessId = 'entity-test-business-clean';

  afterEach(async () => {
    await removeBusiness(businessId);
    expect(await getBusinessById(businessId)).toBeNull();
    expect(await getLinksFor({ type: EntityType.BUSINESS, id: businessId })).toHaveLength(0);
  });

  it('persists the canonical minimum Business shape', async () => {
    const now = getUTCNow();
    await upsertBusiness({
      id: businessId,
      schemaVersion: 1,
      version: 0,
      name: 'testing-business-clean',
      type: BusinessType.COMPANY,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const saved = await getBusinessById(businessId);
    if (!saved) throw new Error('Business was not persisted.');
    const output = JSON.parse(JSON.stringify(saved));
    writeFileSync(resolve(__dirname, 'business-entity-test-clean.output.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8');

    expect(output).toEqual({
      id: businessId,
      schemaVersion: 1,
      version: 0,
      name: 'testing-business-clean',
      type: BusinessType.COMPANY,
      isActive: true,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });
});
