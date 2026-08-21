import { afterEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('server-only', () => ({}));

import { getContractById, removeContract, upsertContract } from '@/data-store/datastore';
import { getLinksFor } from '@/links/link-registry';
import { ContractStatus, EntityType } from '@/types/enums';
import { getUTCNow } from '@/lib/utils/utc-utils';

describe('entity-test: clean minimal Contract', () => {
  const contractId = 'entity-test-contract-clean';

  afterEach(async () => {
    await removeContract(contractId);
    expect(await getContractById(contractId)).toBeNull();
    expect(await getLinksFor({ type: EntityType.CONTRACT, id: contractId })).toHaveLength(0);
  });

  it('persists required agreement fields without optional clauses or notes', async () => {
    const now = getUTCNow();
    await upsertContract({ id: contractId, schemaVersion: 1, version: 0, name: 'testing-contract-clean', status: ContractStatus.DRAFT, clauses: [], createdAt: now, updatedAt: now });
    const saved = await getContractById(contractId);
    if (!saved) throw new Error('Contract was not persisted.');
    const output = JSON.parse(JSON.stringify(saved));
    writeFileSync(resolve(__dirname, 'contract-entity-test-clean.output.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    expect(output).toEqual({ id: contractId, schemaVersion: 1, version: 0, name: 'testing-contract-clean', status: ContractStatus.DRAFT, clauses: [], createdAt: expect.any(String), updatedAt: expect.any(String) });
  });
});
