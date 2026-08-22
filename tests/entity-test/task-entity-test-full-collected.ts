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
    let linkedOwner: any = null;
    let playerLink: any = null;
    for (const character of await getAllCharacters()) {
      const ownerLinks = await getLinksFor({ type: EntityType.CHARACTER, id: character.id });
      const candidate = ownerLinks.find(link =>
        link.linkType === 'CHARACTER_PLAYER' &&
        link.relationship === 'primary' &&
        link.target.type === EntityType.PLAYER
      );
      if (candidate?.target.id) {
        linkedOwner = character;
        playerLink = candidate;
        break;
      }
    }
    if (!linkedOwner || !playerLink?.target.id) throw new Error('Cannot run collected entity-test: no canonical CHARACTER_PLAYER link exists.');
    const ownerPlayerId = playerLink.target.id;
    const site = (await getAllSites()).find(candidate => candidate.id === 'hq') || (await getAllSites())[0];
    if (!site) throw new Error('Cannot run collected entity-test: no Site exists.');
    const parent = (await getAllTasks()).find(task => task.status !== TaskStatus.COLLECTED);
    if (!parent) throw new Error('Cannot run collected entity-test: no existing parent Task exists.');

    const playerBefore = await getPlayerById(ownerPlayerId);
    if (!playerBefore) throw new Error(`Cannot run collected entity-test: Player ${ownerPlayerId} was not found.`);
    // Keep an immutable baseline. The datastore may return a live object that is
    // mutated by the reward workflow, which would make an expected delta move
    // together with the actual value and hide duplicate awards.
    const pointsBefore = {
      pending: { ...playerBefore.rewards.points.pending },
      vested: { ...playerBefore.rewards.points.vested },
      current: { ...playerBefore.rewards.points.current },
      exchanged: { ...playerBefore.rewards.points.exchanged },
      historic: { ...playerBefore.rewards.points.historic },
    };
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
      ownerIds: [linkedOwner.id],
      __counterparty: { id: linkedOwner.id, role: 'beneficiary' },
      context: {
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
      ownerIds: [linkedOwner.id],
      context: { ...created.context },
      __counterparty: { id: linkedOwner.id, role: 'beneficiary' },
      doneAt,
      updatedAt: doneAt,
    } as any, { skipDuplicateCheck: true });

    const taskAfterDone = await getTaskById(TEST_TASK_ID);
    if (!taskAfterDone || taskAfterDone.status !== TaskStatus.DONE) {
      throw new Error('Collected entity-test Task did not persist DONE before collection.');
    }
    const playerAfterDone = await getPlayerById(ownerPlayerId);
    if (!playerAfterDone) throw new Error('Collected entity-test Player disappeared after completion.');
    expect(playerAfterDone.rewards.points.pending).toEqual(
      addPoints(pointsBefore.pending, pointDelta)
    );
    expect(playerAfterDone.rewards.points.vested).toEqual(pointsBefore.vested);
    expect(playerAfterDone.rewards.points.current).toEqual(pointsBefore.current);
    expect(playerAfterDone.rewards.points.historic).toEqual(
      addPoints(pointsBefore.historic, pointDelta)
    );

    const collectedAt = getUTCNow();
    await upsertTask({
      ...taskAfterDone,
      status: TaskStatus.COLLECTED,
      progress: { percentage: 100 },
      ownerIds: [linkedOwner.id],
      context: { ...taskAfterDone.context },
      __counterparty: { id: linkedOwner.id, role: 'beneficiary' },
      collectedAt,
      updatedAt: collectedAt,
    } as any, { skipDuplicateCheck: true });

    const task = await getTaskById(TEST_TASK_ID);
    if (!task) throw new Error('Collected entity-test Task disappeared after collection.');
    expect(task.status).toBe(TaskStatus.COLLECTED);
    const links = await getLinksFor({ type: EntityType.TASK, id: TEST_TASK_ID });
    const characterLinks = await getLinksFor({ type: EntityType.CHARACTER, id: linkedOwner.id });
    const items = await getItemsBySourceTaskId(TEST_TASK_ID);
    const financials = await getFinancialsBySourceTaskId(TEST_TASK_ID);
    const taskCharacterLinks = links.filter(link => link.linkType === 'TASK_CHARACTER');
    const characterPlayerLink = characterLinks.find(link =>
      link.linkType === 'CHARACTER_PLAYER' &&
      link.relationship === 'primary' &&
      link.target.type === EntityType.PLAYER &&
      link.target.id === ownerPlayerId
    );
    const pointEvidence = links.filter(link => link.linkType === 'TASK_PLAYER' && link.relationship === 'points-earned');
    const playerAfterCollected = await getPlayerById(ownerPlayerId);
    if (!playerAfterCollected) throw new Error('Collected entity-test Player disappeared after collection.');
    expect(playerAfterCollected.rewards.points.pending).toEqual(pointsBefore.pending);
    expect(playerAfterCollected.rewards.points.vested).toEqual(
      addPoints(pointsBefore.vested, pointDelta)
    );
    expect(playerAfterCollected.rewards.points.current).toEqual(
      addPoints(pointsBefore.current, pointDelta)
    );
    expect(playerAfterCollected.rewards.points.historic).toEqual(
      addPoints(pointsBefore.historic, pointDelta)
    );

    await removeTask(TEST_TASK_ID);
    const deletedTask = await getTaskById(TEST_TASK_ID);
    const playerAfterDelete = await getPlayerById(ownerPlayerId);
    if (!playerAfterDelete) throw new Error('Collected entity-test Player disappeared after deletion.');
    expect(deletedTask).toBeNull();
    expect(await getItemsBySourceTaskId(TEST_TASK_ID)).toHaveLength(0);
    expect(await getFinancialsBySourceTaskId(TEST_TASK_ID)).toHaveLength(0);
    expect(await getLinksFor({ type: EntityType.TASK, id: TEST_TASK_ID })).toHaveLength(0);
    expect(playerAfterDelete.rewards.points.pending).toEqual(pointsBefore.pending);
    expect(playerAfterDelete.rewards.points.vested).toEqual(pointsBefore.vested);
    expect(playerAfterDelete.rewards.points.current).toEqual(pointsBefore.current);
    expect(playerAfterDelete.rewards.points.exchanged).toEqual(pointsBefore.exchanged);
    expect(playerAfterDelete.rewards.points.historic).toEqual(pointsBefore.historic);

    const output = {
      task,
      links,
      characterPlayerLink,
      taskCharacterLinks,
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
    expect(pointEvidence[0].target).toEqual({ type: EntityType.PLAYER, id: ownerPlayerId });
    expect(characterPlayerLink).toEqual(expect.objectContaining({
      linkType: 'CHARACTER_PLAYER',
      relationship: 'primary',
      target: { type: EntityType.PLAYER, id: ownerPlayerId },
    }));
    expect(taskCharacterLinks.filter(link => link.relationship === 'customer')).toHaveLength(0);
    expect(taskCharacterLinks.filter(link => link.relationship === 'beneficiary')).toHaveLength(1);
    expect(taskCharacterLinks.filter(link => link.relationship === 'owner')).toHaveLength(1);
    expect(links).toEqual(expect.arrayContaining([
      expect.objectContaining({
        linkType: 'TASK_TASK',
        relationship: 'parent',
        target: { type: EntityType.TASK, id: parent.id },
      }),
      expect.objectContaining({ linkType: 'TASK_CHARACTER', relationship: 'owner', target: { type: EntityType.CHARACTER, id: linkedOwner.id } }),
      expect.objectContaining({ linkType: 'TASK_CHARACTER', relationship: 'beneficiary', target: { type: EntityType.CHARACTER, id: linkedOwner.id } }),
      expect.objectContaining({ linkType: 'TASK_ITEM' }),
      expect.objectContaining({ linkType: 'TASK_FINREC' }),
      expect.objectContaining({ linkType: 'TASK_PLAYER', relationship: 'points-earned' }),
    ]));
  }, 300000);
});
