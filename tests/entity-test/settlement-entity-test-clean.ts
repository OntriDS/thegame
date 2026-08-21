import { afterEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('server-only', () => ({}));

import { getSettlementById, removeSettlement, upsertSettlement } from '@/data-store/datastore';
import { EntityType } from '@/types/enums';
import { getLinksFor } from '@/links/link-registry';

describe('entity-test: clean minimal Settlement', () => {
  const settlementId = 'entity-test-settlement-clean';

  afterEach(async () => {
    await removeSettlement(settlementId);
    expect(await getSettlementById(settlementId)).toBeNull();
    expect(await getLinksFor({ type: EntityType.SETTLEMENT, id: settlementId })).toHaveLength(0);
  });

  it('persists the required map reference fields without an optional Google Maps address', async () => {
    await upsertSettlement({ id: settlementId, name: 'testing-settlement-clean', regionId: 'testing-region-clean', isActive: true, createdAt: new Date(), updatedAt: new Date() });
    const saved = await getSettlementById(settlementId);
    if (!saved) throw new Error('Settlement was not persisted.');
    const output = JSON.parse(JSON.stringify(saved));
    writeFileSync(resolve(__dirname, 'settlement-entity-test-clean.output.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    expect(output).toEqual({ id: settlementId, name: 'testing-settlement-clean', regionId: 'testing-region-clean', isActive: true, createdAt: expect.any(String), updatedAt: expect.any(String) });
  });
});
