import { afterEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('server-only', () => ({}));

import { getPlayerById, removePlayer, upsertPlayer } from '@/data-store/datastore';
import { getLinksFor } from '@/links/link-registry';
import { EntityType } from '@/types/enums';
import { getUTCNow } from '@/lib/utils/utc-utils';

describe('entity-test: clean minimal Player', () => {
  const playerId = 'entity-test-player-clean';

  afterEach(async () => {
    await removePlayer(playerId);
    expect(await getPlayerById(playerId)).toBeNull();
    expect(await getLinksFor({ type: EntityType.PLAYER, id: playerId })).toHaveLength(0);
  });

  it('persists only the canonical minimum Player fields', async () => {
    const now = getUTCNow();
    const zeroPoints = { hp: 0, fp: 0, rp: 0, xp: 0 };

    await upsertPlayer({
      id: playerId,
      schemaVersion: 1,
      version: 0,
      name: 'testing-player',
      level: 0,
      rewards: {
        points: {
          pending: zeroPoints,
          vested: zeroPoints,
          current: zeroPoints,
          exchanged: zeroPoints,
          historic: zeroPoints,
        },
        achievements: [],
        badges: [],
      },
      lastActiveAt: now,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const saved = await getPlayerById(playerId);
    if (!saved) throw new Error(`Entity-test Player ${playerId} was not found after creation.`);

    const persisted = JSON.parse(JSON.stringify(saved));
    const outputFile = resolve(__dirname, 'player-entity-test-clean.output.json');
    writeFileSync(outputFile, `${JSON.stringify(persisted, null, 2)}\n`, 'utf8');
    process.stderr.write(`[entity-test] persisted Player entity:\n${JSON.stringify(persisted, null, 2)}\n`);

    expect(persisted).toEqual({
      id: playerId,
      schemaVersion: 1,
      version: 0,
      name: 'testing-player',
      level: 0,
      rewards: {
        points: {
          pending: zeroPoints,
          vested: zeroPoints,
          current: zeroPoints,
          exchanged: zeroPoints,
          historic: zeroPoints,
        },
        achievements: [],
        badges: [],
      },
      lastActiveAt: expect.any(String),
      isActive: true,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });
});
