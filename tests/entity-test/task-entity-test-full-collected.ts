import { afterEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

vi.mock('server-only', () => ({}));

import {
  getAllCharacters,
  getAllSites,
  getAllTasks,
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

const TEST_TASK_ID = 'entity-test-task-full-collected';
const outputPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'task-entity-test-full-collected.output.json');

describe('entity-test: full Task collected', () => {
  afterEach(async () => {
    await removeTask(TEST_TASK_ID);
  });

  it('completes and collects the full Task, preserving one points-earned record', async () => {
    await removeTask(TEST_TASK_ID);
    const owner = (await getAllCharacters()).find(character => Boolean(character.playerId));
    if (!owner?.playerId) throw new Error('Cannot run collected entity-test: no Player-owned Character exists.');
    const site = (await getAllSites()).find(candidate => candidate.id === 'hq') || (await getAllSites())[0];
    if (!site) throw new Error('Cannot run collected entity-test: no Site exists.');
    const parent = (await getAllTasks()).find(task => task.status !== TaskStatus.COLLECTED);
    if (!parent) throw new Error('Cannot run collected entity-test: no existing parent Task exists.');

    const playerBefore = await getPlayerById(owner.playerId);
    if (!playerBefore) throw new Error(`Cannot run collected entity-test: Player ${owner.playerId} was not found.`);
    const pointDelta = { xp: 5, rp: 2, fp: 1, hp: 0 };
    const addPoints = (base: any, delta: typeof pointDelta) => ({
      xp: base.xp + delta.xp,
      rp: base.rp + delta.rp,
      fp: base.fp + delta.fp,
      hp: base.hp + delta.hp,
    });

    const now = getUTCNow();
    const dueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await upsertTask({
      id: TEST_TASK_ID,
      name: 'testing-task-full-collected',
      status: TaskStatus.CREATED,
      priority: TaskPriority.NORMAL,
      type: TaskType.GOAL,
      station: 'strategy',
      progress: { percentage: 0 },
      schedule: { dueDate },
      order: 1000,
      siteId: site.id,
      parentId: parent.id,
      ownerIds: [owner.id],
      context: {
        counterparty: { counterpartyId: owner.id, role: 'beneficiary' },
        financialIntent: {
          costIntent: { minorUnits: '5000', currency: 'USD' },
          revenueIntent: { minorUnits: '10000', currency: 'USD' },
        },
        rewardIntent: { points: { xp: 5, rp: 2, fp: 1, hp: 0 } },
        productionPlan: {
          outputItemType: 'bundle',
          outputItemSubType: 'sticker',
          outputQuantity: 5,
          outputUnitCost: { minorUnits: '1000', currency: 'USD' },
          outputItemName: 'testing-full-collected-output',
          outputItemPrice: { minorUnits: '5000', currency: 'USD' },
          outputItemStatus: 'for-sale',
          isNewItem: true,
          isSold: false,
        },
      },
      createdAt: now,
      updatedAt: now,
    } as any, { skipDuplicateCheck: true });

    const created = await getTaskById(TEST_TASK_ID);
    if (!created) throw new Error('Collected entity-test Task was not created.');
    const doneAt = getUTCNow();
    await upsertTask({
      ...created,
      status: TaskStatus.DONE,
      progress: { percentage: 100 },
      ownerIds: [owner.id],
      context: { ...created.context, counterparty: { counterpartyId: owner.id, role: 'beneficiary' } },
      doneAt,
      updatedAt: doneAt,
    } as any, { skipDuplicateCheck: true });

    const taskAfterDone = await getTaskById(TEST_TASK_ID);
    if (!taskAfterDone || taskAfterDone.status !== TaskStatus.DONE) {
      throw new Error('Collected entity-test Task did not persist DONE before collection.');
    }
    const playerAfterDone = await getPlayerById(owner.playerId);
    if (!playerAfterDone) throw new Error('Collected entity-test Player disappeared after completion.');
    expect(playerAfterDone.rewards.points.pending).toEqual(
      addPoints(playerBefore.rewards.points.pending, pointDelta)
    );
    expect(playerAfterDone.rewards.points.vested).toEqual(playerBefore.rewards.points.vested);
    expect(playerAfterDone.rewards.points.current).toEqual(playerBefore.rewards.points.current);
    expect(playerAfterDone.rewards.points.historic).toEqual(
      addPoints(playerBefore.rewards.points.historic, pointDelta)
    );

    const collectedAt = getUTCNow();
    await upsertTask({
      ...taskAfterDone,
      status: TaskStatus.COLLECTED,
      progress: { percentage: 100 },
      ownerIds: [owner.id],
      context: { ...taskAfterDone.context, counterparty: { counterpartyId: owner.id, role: 'beneficiary' } },
      collectedAt,
      updatedAt: collectedAt,
    } as any, { skipDuplicateCheck: true });

    const task = await getTaskById(TEST_TASK_ID);
    if (!task) throw new Error('Collected entity-test Task disappeared after collection.');
    expect(task.status).toBe(TaskStatus.COLLECTED);
    const links = await getLinksFor({ type: EntityType.TASK, id: TEST_TASK_ID });
    const items = await getItemsBySourceTaskId(TEST_TASK_ID);
    const financials = await getFinancialsBySourceTaskId(TEST_TASK_ID);
    const pointEvidence = links.filter(link => link.linkType === 'TASK_PLAYER' && link.relationship === 'points-earned');
    const playerAfterCollected = await getPlayerById(owner.playerId);
    if (!playerAfterCollected) throw new Error('Collected entity-test Player disappeared after collection.');
    expect(playerAfterCollected.rewards.points.pending).toEqual(playerBefore.rewards.points.pending);
    expect(playerAfterCollected.rewards.points.vested).toEqual(
      addPoints(playerBefore.rewards.points.vested, pointDelta)
    );
    expect(playerAfterCollected.rewards.points.current).toEqual(
      addPoints(playerBefore.rewards.points.current, pointDelta)
    );
    expect(playerAfterCollected.rewards.points.historic).toEqual(
      addPoints(playerBefore.rewards.points.historic, pointDelta)
    );

    await removeTask(TEST_TASK_ID);
    const deletedTask = await getTaskById(TEST_TASK_ID);
    const playerAfterDelete = await getPlayerById(owner.playerId);
    if (!playerAfterDelete) throw new Error('Collected entity-test Player disappeared after deletion.');
    expect(deletedTask).toBeNull();
    expect(playerAfterDelete.rewards.points.pending).toEqual(playerBefore.rewards.points.pending);
    expect(playerAfterDelete.rewards.points.vested).toEqual(playerBefore.rewards.points.vested);
    expect(playerAfterDelete.rewards.points.current).toEqual(playerBefore.rewards.points.current);
    expect(playerAfterDelete.rewards.points.exchanged).toEqual(playerBefore.rewards.points.exchanged);
    expect(playerAfterDelete.rewards.points.historic).toEqual(playerBefore.rewards.points.historic);

    const output = {
      task,
      links,
      items,
      financials,
      pointEvidence,
      playerBefore,
      playerAfterDone,
      playerAfterCollected,
      playerAfterDelete,
      deletion: {
        taskExists: Boolean(deletedTask),
        pointsRestored: true,
      },
    };
    writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    process.stderr.write(`[entity-test] FULL_COLLECTED_ENTITY_OUTPUT_FILE: ${outputPath}\n${JSON.stringify(output, null, 2)}\n`);

    expect(task.status).toBe(TaskStatus.COLLECTED);
    expect((task as any).progress).toEqual({ percentage: 100 });
    expect((task as any).collectedAt).toEqual(expect.any(String));
    expect(items).toHaveLength(1);
    expect(financials.length).toBeGreaterThanOrEqual(1);
    expect(pointEvidence).toHaveLength(1);
    expect(links).toEqual(expect.arrayContaining([
      expect.objectContaining({ linkType: 'TASK_ITEM' }),
      expect.objectContaining({ linkType: 'TASK_FINREC' }),
      expect.objectContaining({ linkType: 'TASK_PLAYER', relationship: 'points-earned' }),
    ]));
  }, 300000);
});
