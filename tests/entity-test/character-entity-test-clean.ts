import { afterEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('server-only', () => ({}));

import { getCharacterById, removeCharacter, upsertCharacter } from '@/data-store/datastore';
import { getUTCNow } from '@/lib/utils/utc-utils';

describe('entity-test: clean minimal Character', () => {
  const characterId = 'entity-test-character-clean';

  afterEach(async () => {
    await removeCharacter(characterId);
  });

  it('persists only the canonical minimum Character fields', async () => {
    const now = getUTCNow();

    await upsertCharacter({
      id: characterId,
      schemaVersion: 1,
      version: 0,
      name: 'testing-character',
      roles: [],
      qualifications: [],
      lastActiveAt: now,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    } as any, { skipWorkflowEffects: true, skipLinkEffects: true });

    const saved = await getCharacterById(characterId);
    if (!saved) throw new Error(`Entity-test Character ${characterId} was not found after creation.`);

    const persisted = JSON.parse(JSON.stringify(saved));
    const outputFile = resolve(__dirname, 'character-entity-test-clean.output.json');
    writeFileSync(outputFile, `${JSON.stringify(persisted, null, 2)}\n`, 'utf8');
    process.stderr.write(`[entity-test] persisted Character entity:\n${JSON.stringify(persisted, null, 2)}\n`);

    expect(persisted).toEqual({
      id: characterId,
      schemaVersion: 1,
      version: 0,
      name: 'testing-character',
      roles: [],
      qualifications: [],
      lastActiveAt: expect.any(String),
      isActive: true,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });
});
