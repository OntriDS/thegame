import { afterEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('server-only', () => ({}));

import { getAllCharacters, getAllTasks, getPlayerById, removePlayer, upsertPlayer } from '@/data-store/datastore';
import { getLinksFor } from '@/links/link-registry';
import { exchangePointsForPlayer, rewardPointsToPlayer, stagePointsForPlayer } from '@/workflows/points-rewards-utils';
import { CharacterRole, EntityType, LinkType } from '@/types/enums';
import { getUTCNow } from '@/lib/utils/utc-utils';

describe('entity-test: full Player', () => {
  const playerId = 'entity-test-player-full';

  afterEach(async () => {
    await removePlayer(playerId);
    expect(await getPlayerById(playerId)).toBeNull();
    expect(await getLinksFor({ type: EntityType.PLAYER, id: playerId })).toHaveLength(0);
  });

  it('persists the full canonical Player shape and creates its Character Link', async () => {
    const characters = await getAllCharacters();
    const character = characters.find((candidate) => candidate.isActive !== false);
    if (!character) throw new Error('Cannot run full Player test: no Character exists for CHARACTER_PLAYER workflow verification.');
    const task = (await getAllTasks())[0];
    if (!task) throw new Error('Cannot run full Player test: no Task exists for TASK_PLAYER point workflow verification.');

    const now = getUTCNow();
    const reviewDate = new Date(now.getTime() - 86_400_000);
    const badge = {
      id: 'player-badge-full',
      name: 'Full Player Test Badge',
      description: 'Canonical Player badge coverage.',
      requiredRoles: [CharacterRole.GAMER],
      createdAt: reviewDate,
    };
    const achievement = {
      id: 'player-achievement-full',
      name: 'Completed Player Full Test',
      description: 'Canonical Player achievement coverage.',
      createdAt: reviewDate,
    };
    const zeroPoints = { hp: 0, fp: 0, rp: 0, xp: 0 };
    const rewardDelta = { hp: 4, fp: 3, rp: 2, xp: 5 };
    const exchangeDelta = { hp: 1, fp: 1, rp: 1, xp: 2 };

    await upsertPlayer({
      id: playerId,
      schemaVersion: 1,
      version: 0,
      name: 'testing-player-full',
      level: 7,
      rewards: {
        points: {
          pending: zeroPoints,
          vested: zeroPoints,
          current: zeroPoints,
          exchanged: zeroPoints,
          historic: zeroPoints,
        },
        achievements: [achievement],
        badges: [badge],
      },
      // Transient compatibility input. The workflow must create the
      // CHARACTER_PLAYER Link; it must not remain on Player.
      characterId: character.id,
      // Legacy fields deliberately simulate an old caller.
      accountId: 'legacy-account-pointer',
      badges: [badge],
      // Legacy counters deliberately simulate an old caller. They must not
      // survive in the canonical Player record; activity is derived from
      // Tasks, Sales, Items, and their relationships.
      totalTasksCompleted: 21,
      totalSalesCompleted: 22,
      totalItemsSold: 23,
      lastActiveAt: now,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    } as any);

    const saved = await getPlayerById(playerId);
    if (!saved) throw new Error(`Entity-test Player ${playerId} was not found after creation.`);

    const persisted = JSON.parse(JSON.stringify(saved));
    const playerLinks = await getLinksFor({ type: EntityType.PLAYER, id: playerId });
    const characterLinks = await getLinksFor({ type: EntityType.CHARACTER, id: character.id });
    const relevantPlayerLinks = playerLinks.filter((link) =>
      link.linkType === LinkType.CHARACTER_PLAYER && link.source.id === character.id
    );
    const relevantCharacterLinks = characterLinks.filter((link) =>
      link.linkType === LinkType.CHARACTER_PLAYER && link.target.id === playerId
    );
    const output = {
      player: persisted,
      playerLinks: relevantPlayerLinks,
      characterLinks: relevantCharacterLinks,
    };
    const outputFile = resolve(__dirname, 'player-entity-test-full.output.json');
    writeFileSync(outputFile, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    process.stderr.write(`[entity-test] persisted full Player workflow output:\n${JSON.stringify(output, null, 2)}\n`);

    expect(persisted).toMatchObject({
      id: playerId,
      schemaVersion: 1,
      version: 0,
      name: 'testing-player-full',
      level: 7,
      rewards: {
        points: {
          pending: zeroPoints,
          vested: zeroPoints,
          current: zeroPoints,
          exchanged: zeroPoints,
          historic: zeroPoints,
        },
        achievements: [{
          id: achievement.id,
          name: achievement.name,
          description: achievement.description,
          createdAt: expect.any(String),
        }],
        badges: [{ id: badge.id, name: badge.name, requiredRoles: [CharacterRole.GAMER] }],
      },
      lastActiveAt: expect.any(String),
      isActive: true,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
    expect(persisted).not.toHaveProperty('accountId');
    expect(persisted).not.toHaveProperty('characterId');
    expect(persisted).not.toHaveProperty('badges');
    expect(persisted).not.toHaveProperty('points');
    expect(persisted).not.toHaveProperty('pendingPoints');
    expect(persisted).not.toHaveProperty('totalPoints');
    expect(persisted).not.toHaveProperty('totalTasksCompleted');
    expect(persisted).not.toHaveProperty('totalSalesCompleted');
    expect(persisted).not.toHaveProperty('totalItemsSold');

    // Exercise the actual positive point lifecycle instead of injecting
    // arbitrary bucket values: pending → vested/current → exchanged.
    const sourceId = task.id;
    await stagePointsForPlayer(playerId, rewardDelta, sourceId, 'task');
    const afterStage = await getPlayerById(playerId);
    if (!afterStage) throw new Error('Player disappeared after staging points.');
    expect(afterStage.rewards.points).toEqual({
      pending: rewardDelta,
      vested: zeroPoints,
      current: zeroPoints,
      exchanged: zeroPoints,
      historic: rewardDelta,
    });

    await rewardPointsToPlayer(playerId, rewardDelta, sourceId, 'task');
    const afterReward = await getPlayerById(playerId);
    if (!afterReward) throw new Error('Player disappeared after vesting points.');
    expect(afterReward.rewards.points).toEqual({
      pending: zeroPoints,
      vested: rewardDelta,
      current: rewardDelta,
      exchanged: zeroPoints,
      historic: rewardDelta,
    });

    await exchangePointsForPlayer(playerId, exchangeDelta);
    const afterExchange = await getPlayerById(playerId);
    if (!afterExchange) throw new Error('Player disappeared after exchanging points.');
    const finalPoints = afterExchange.rewards.points;
    expect(finalPoints).toEqual({
      pending: zeroPoints,
      vested: rewardDelta,
      current: {
        hp: rewardDelta.hp - exchangeDelta.hp,
        fp: rewardDelta.fp - exchangeDelta.fp,
        rp: rewardDelta.rp - exchangeDelta.rp,
        xp: rewardDelta.xp - exchangeDelta.xp,
      },
      exchanged: exchangeDelta,
      historic: rewardDelta,
    });
    for (const key of ['hp', 'fp', 'rp', 'xp'] as const) {
      expect(finalPoints.current[key] + finalPoints.exchanged[key] + finalPoints.pending[key])
        .toBe(finalPoints.historic[key]);
      expect(finalPoints.current[key] + finalPoints.exchanged[key])
        .toBe(finalPoints.vested[key]);
    }

    // Forward workflows reject impossible transitions and leave the Player
    // unchanged instead of silently clamping into an inconsistent state.
    await expect(rewardPointsToPlayer(playerId, rewardDelta, sourceId, 'task'))
      .rejects.toThrow('insufficient pending points');
    await expect(exchangePointsForPlayer(playerId, {
      hp: finalPoints.current.hp + 1,
      fp: 0,
      rp: 0,
      xp: 0,
    })).rejects.toThrow('insufficient current points');
    const afterRejectedTransitions = await getPlayerById(playerId);
    expect(afterRejectedTransitions?.rewards.points).toEqual(finalPoints);

    const pointLinks = (await getLinksFor({ type: EntityType.PLAYER, id: playerId }))
      .filter((link) => link.linkType === LinkType.TASK_PLAYER && link.target.id === playerId);
    expect(pointLinks).toEqual(expect.arrayContaining([
      expect.objectContaining({
        linkType: LinkType.TASK_PLAYER,
        relationship: 'points-earned',
        source: { type: EntityType.TASK, id: sourceId },
        target: { type: EntityType.PLAYER, id: playerId },
      }),
    ]));

    const finalOutput = {
      initial: persisted,
      afterStage: afterStage.rewards.points,
      afterReward: afterReward.rewards.points,
      afterExchange: finalPoints,
      playerLinks: pointLinks,
    };
    writeFileSync(outputFile, `${JSON.stringify(finalOutput, null, 2)}\n`, 'utf8');
    process.stderr.write(`[entity-test] Player point workflow output:\n${JSON.stringify(finalOutput, null, 2)}\n`);
    expect(relevantPlayerLinks).toEqual(expect.arrayContaining([
      expect.objectContaining({
        linkType: LinkType.CHARACTER_PLAYER,
        relationship: 'primary',
        source: { type: EntityType.CHARACTER, id: character.id },
        target: { type: EntityType.PLAYER, id: playerId },
      }),
    ]));
    expect(relevantCharacterLinks).toEqual(expect.arrayContaining([
      expect.objectContaining({
        linkType: LinkType.CHARACTER_PLAYER,
        relationship: 'primary',
        source: { type: EntityType.CHARACTER, id: character.id },
        target: { type: EntityType.PLAYER, id: playerId },
      }),
    ]));
  });
});
