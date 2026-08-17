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
    ],
    testTimeout: 60000,
    hookTimeout: 120000,
  },
});
