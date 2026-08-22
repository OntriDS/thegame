import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
dotenv.config({ path: path.resolve(rootDir, '.env.local') });

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(rootDir),
    },
  },
  test: {
    environment: 'node',
    include: [
      'tests/entity-test/task-entity-test-clean.ts',
      'tests/entity-test/task-entity-test-full.ts',
      'tests/entity-test/task-entity-test-full-done.ts',
      'tests/entity-test/financial-entity-test-clean.ts',
      'tests/entity-test/item-entity-test-clean.ts',
      'tests/entity-test/financial-entity-test-full.ts',
      'tests/entity-test/task-entity-test-full-collected.ts',
      'tests/entity-test/task-entity-test-failed-negative.ts',
      'tests/entity-test/item-entity-test-manual-sold.ts',
      'tests/entity-test/character-entity-test-clean.ts',
      'tests/entity-test/character-entity-test-full.ts',
      'tests/entity-test/player-entity-test-clean.ts',
      'tests/entity-test/player-entity-test-full.ts',
      'tests/entity-test/site-entity-test-clean.ts',
      'tests/entity-test/site-entity-test-full.ts',
      'tests/entity-test/direct-sale-entity-test-clean.ts',
      'tests/entity-test/direct-sale-entity-test-full.ts',
      'tests/entity-test/network-sale-entity-test-clean.ts',
      'tests/entity-test/network-sale-entity-test-full.ts',
      'tests/entity-test/online-sale-entity-test-clean.ts',
      'tests/entity-test/online-sale-entity-test-full.ts',
      'tests/entity-test/online-sale-m2m-integration-test.ts',
      'tests/entity-test/booth-sale-entity-test-clean.ts',
      'tests/entity-test/booth-sale-entity-test-full.ts',
      'tests/entity-test/account-entity-test-clean.ts',
      'tests/entity-test/account-entity-test-full.ts',
      'tests/entity-test/business-entity-test-clean.ts',
      'tests/entity-test/business-entity-test-full.ts',
      'tests/entity-test/contract-entity-test-clean.ts',
      'tests/entity-test/contract-entity-test-full.ts',
      'tests/entity-test/settlement-entity-test-clean.ts',
      'tests/entity-test/settlement-entity-test-full.ts',
      'tests/entity-test/region-entity-test-clean.ts',
      'tests/entity-test/region-entity-test-full.ts',
      'tests/entity-test/task-counterparty-hydration-test.ts',
      'tests/entity-test/recurrent-task-counterparty-spawn-test.ts',
    ],
    testTimeout: 60000,
    hookTimeout: 120000,
  },
});
