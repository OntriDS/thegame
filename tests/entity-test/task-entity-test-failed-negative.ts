import { afterEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

vi.mock('server-only', () => ({}));

import {
  getAllCharacters,
  getAllSites,
  getFinancialsBySourceTaskId,
  getItemsBySourceTaskId,
  getPlayerById,
  getTaskById,
  removeTask,
  upsertTask,
} from '@/data-store/datastore';
import { getLinksFor } from '@/links/link-registry';
import { EntityType, TaskPriority, TaskStatus, TaskType } from '@/types/enums';
import { getUTCNow } from '@/lib/utils/utc-utils';

const TEST_TASK_ID = 'entity-test-task-failed-negative';
const outputPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'task-entity-test-failed-negative.output.json'
);

describe('entity-test: failed Task with negative points', () => {
  afterEach(async () => {
    await removeTask(TEST_TASK_ID);
  });

  it('persists the negative penalty intent without outputs and cleans up safely', async () => {
    await removeTask(TEST_TASK_ID);

    const ownerCandidates = (await getAllCharacters()).filter(character => Boolean(character.playerId));
    let owner = ownerCandidates[0];
    let playerBefore = owner?.playerId ? await getPlayerById(owner.playerId) : null;
    for (const candidate of ownerCandidates) {
      const candidatePlayer = candidate.playerId ? await getPlayerById(candidate.playerId) : null;
      if (candidatePlayer) {
        owner = candidate;
        playerBefore = candidatePlayer;
        break;
      }
    }
    if (!owner?.playerId || !playerBefore) throw new Error('Cannot run failed entity-test: no valid Player-owned Character exists.');
    const site = (await getAllSites()).find(candidate => candidate.id === 'hq') || (await getAllSites())[0];
    if (!site) throw new Error('Cannot run failed entity-test: no Site exists.');

    const now = getUTCNow();
    const penalty = { xp: -2, rp: -1, fp: 0, hp: 0 };
    const applyPenalty = (base: any) => ({
      xp: base.xp + penalty.xp,
      rp: base.rp + penalty.rp,
      fp: base.fp + penalty.fp,
      hp: base.hp + penalty.hp,
    });
    await upsertTask({
      id: TEST_TASK_ID,
      name: 'testing-task-failed-negative',
      status: TaskStatus.FAILED,
      priority: TaskPriority.NORMAL,
      type: TaskType.GOAL,
      station: 'strategy',
      progress: { percentage: 0 },
      siteId: site.id,
      order: 1000,
      ownerIds: [owner.id],
      context: {
        rewardIntent: { points: penalty },
      },
      createdAt: now,
      updatedAt: now,
    } as any, { skipDuplicateCheck: true });

    const task = await getTaskById(TEST_TASK_ID);
    if (!task) throw new Error('Failed negative entity-test Task was not persisted.');
    const links = await getLinksFor({ type: EntityType.TASK, id: TEST_TASK_ID });
    const items = await getItemsBySourceTaskId(TEST_TASK_ID);
    const financials = await getFinancialsBySourceTaskId(TEST_TASK_ID);
    const playerAfterFailed = await getPlayerById(owner.playerId);
    if (!playerAfterFailed) throw new Error('Failed negative entity-test Player disappeared.');

    expect(task.status).toBe(TaskStatus.FAILED);
    expect(task.context?.rewardIntent?.points).toEqual(penalty);
    expect(items).toEqual([]);
    expect(financials).toEqual([]);
    expect(links).toEqual(expect.arrayContaining([
      expect.objectContaining({ linkType: 'TASK_SITE' }),
      expect.objectContaining({ linkType: 'TASK_CHARACTER', relationship: 'owner' }),
    ]));
    expect(links).toEqual(expect.arrayContaining([
      expect.objectContaining({ linkType: 'TASK_PLAYER', relationship: 'points-earned' }),
    ]));
    expect(playerAfterFailed.rewards.points.current).toEqual(applyPenalty(playerBefore.rewards.points.current));
    expect(playerAfterFailed.rewards.points.historic).toEqual(applyPenalty(playerBefore.rewards.points.historic));
    expect(playerAfterFailed.rewards.points.pending).toEqual(playerBefore.rewards.points.pending);
    expect(playerAfterFailed.rewards.points.vested).toEqual(playerBefore.rewards.points.vested);

    await removeTask(TEST_TASK_ID);
    const deletedTask = await getTaskById(TEST_TASK_ID);
    const playerAfterDelete = await getPlayerById(owner.playerId);
    if (!playerAfterDelete) throw new Error('Failed negative entity-test Player disappeared after deletion.');

    expect(deletedTask).toBeNull();
    expect(playerAfterDelete.rewards).toEqual(playerBefore.rewards);

    const output = {
      task,
      links,
      items,
      financials,
      playerBefore,
      playerAfterFailed,
      playerAfterDelete,
      deletion: { taskExists: Boolean(deletedTask), playerRestored: true },
    };
    writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    process.stderr.write(`[entity-test] FAILED_NEGATIVE_ENTITY_OUTPUT_FILE: ${outputPath}\n${JSON.stringify(output, null, 2)}\n`);
  }, 120000);
});
