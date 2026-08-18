import { afterEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('server-only', () => ({}));

import { getFinancialById, removeFinancial, upsertFinancial } from '@/data-store/datastore';
import { FinancialStatus } from '@/types/enums';
import { getUTCNow } from '@/lib/utils/utc-utils';

/** Real database contract test for the minimum FinancialRecord submission. */
describe('entity-test: clean minimal FinancialRecord', () => {
  afterEach(async () => {
    await removeFinancial('entity-test-financial-clean');
  });

  it('persists only the envelope and submitted financial values', async () => {
    const now = getUTCNow();
    const financialId = 'entity-test-financial-clean';

    await upsertFinancial({
      id: financialId,
      name: 'testing-financial',
      year: now.getUTCFullYear(),
      month: now.getUTCMonth() + 1,
      station: 'strategy' as any,
      type: 'company',
      cost: { minorUnits: '1000', currency: 'USD' },
      revenue: { minorUnits: '0', currency: 'USD' },
      netCashflow: { minorUnits: '-1000', currency: 'USD' },
      status: FinancialStatus.DONE,
      createdAt: now,
      updatedAt: now,
    } as any);

    const saved = await getFinancialById(financialId);
    if (!saved) throw new Error(`Entity-test FinancialRecord ${financialId} was not found after creation.`);

    const persisted = JSON.parse(JSON.stringify(saved));
    const outputFile = resolve(__dirname, 'financial-entity-test-clean.output.json');
    writeFileSync(outputFile, `${JSON.stringify(persisted, null, 2)}\n`, 'utf8');
    process.stderr.write(`[entity-test] persisted FinancialRecord entity:\n${JSON.stringify(persisted, null, 2)}\n`);

    expect(persisted).toEqual({
      id: financialId,
      schemaVersion: 1,
      version: 0,
      name: 'testing-financial',
      year: now.getUTCFullYear(),
      month: now.getUTCMonth() + 1,
      station: 'strategy',
      type: 'company',
      cost: { minorUnits: '1000', currency: 'USD' },
      revenue: { minorUnits: '0', currency: 'USD' },
      status: 'done',
      netCashflow: { minorUnits: '-1000', currency: 'USD' },
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
    expect(persisted).not.toHaveProperty('context');
  });
});
