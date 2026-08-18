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
  getTaskById,
  removeTask,
  upsertTask,
} from '@/data-store/datastore';
import { getLinksFor } from '@/links/link-registry';
import { EntityType, TaskPriority, TaskStatus, TaskType } from '@/types/enums';
import { getUTCNow } from '@/lib/utils/utc-utils';

const outputPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'task-entity-test-full-done.output.json'
);
const TEST_TASK_ID = 'entity-test-task-full-done';
const PREVIOUS_TEST_TASK_IDS = [
  'b7c3dee5-75b3-4f4d-ad33-0348276f9978',
  'a7dce288-d1ba-4831-bea4-5b22541c9a56',
  'c1f74435-0039-45f8-b3e4-2b39de4a1ca3',
  'c37895ee-226f-480c-ab32-f2f42a83e314',
];

describe('entity-test: full Task completed', () => {
  afterEach(async () => {
    await removeTask(TEST_TASK_ID);
  });

  it('creates the Task, completes it, and writes every resulting entity schema to JSON', async () => {
    for (const id of [...PREVIOUS_TEST_TASK_IDS, TEST_TASK_ID]) await removeTask(id);
    const characters = await getAllCharacters();
    const owner = characters.find(character => Boolean(character.playerId));
    if (!owner?.playerId) throw new Error('Cannot run done entity-test: no Player-owned Character exists.');

    const sites = await getAllSites();
    const site = sites.find(candidate => candidate.id === 'hq') || sites[0];
    if (!site) throw new Error('Cannot run done entity-test: no Site exists.');

    const parent = (await getAllTasks()).find(task => task.status !== TaskStatus.COLLECTED);
    if (!parent) throw new Error('Cannot run done entity-test: no existing parent Task exists.');

    const now = getUTCNow();
    const taskId = TEST_TASK_ID;
    const dueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const taskInput: any = {
      id: taskId,
      name: 'testing-task-full-done',
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
        rewardIntent: {
          points: { xp: 5, rp: 2, fp: 1, hp: 0 },
        },
        productionPlan: {
          outputItemType: 'bundle',
          outputItemSubType: 'sticker',
          outputQuantity: 5,
          outputUnitCost: { minorUnits: '1000', currency: 'USD' },
          outputItemName: 'testing-full-done-output',
          outputItemPrice: { minorUnits: '5000', currency: 'USD' },
          outputItemStatus: 'for-sale',
          isNewItem: true,
          isSold: false,
        },
      },
      createdAt: now,
      updatedAt: now,
    };

    await upsertTask(taskInput, { skipDuplicateCheck: true });
    const created = await getTaskById(taskId);
    if (!created) throw new Error(`Done entity-test Task ${taskId} was not created.`);

    const doneAt = getUTCNow();
    await upsertTask({
      ...created,
      status: TaskStatus.DONE,
      progress: { percentage: 100 },
      ownerIds: [owner.id],
      context: {
        ...created.context,
        counterparty: { counterpartyId: owner.id, role: 'beneficiary' },
      },
      doneAt,
      updatedAt: doneAt,
    } as any, { skipDuplicateCheck: true });

    const task = await getTaskById(taskId);
    if (!task) throw new Error(`Done entity-test Task ${taskId} disappeared after completion.`);
    const links = await getLinksFor({ type: EntityType.TASK, id: taskId });
    const items = await getItemsBySourceTaskId(taskId);
    const financials = await getFinancialsBySourceTaskId(taskId);
    const pointEvidence = links.filter(link =>
      link.linkType === 'TASK_PLAYER' && link.relationship === 'points-earned'
    );
    const output = { task, links, items, financials, pointEvidence };

    writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    process.stderr.write(
      `[entity-test] FULL_DONE_ENTITY_OUTPUT_FILE: ${outputPath}\n${JSON.stringify(output, null, 2)}\n`
    );

    expect(task.status).toBe(TaskStatus.DONE);
    expect((task as any).progress).toEqual({ percentage: 100 });
    expect(items.length).toBe(1);
    expect(items[0]).toMatchObject({ sourceTaskId: taskId });
    expect(financials.length).toBeGreaterThanOrEqual(1);
    expect(financials.every(record => !record.sourceTaskId)).toBe(true);
    expect(pointEvidence).toHaveLength(1);
    expect(links).toEqual(expect.arrayContaining([
      expect.objectContaining({ linkType: 'TASK_SITE' }),
      expect.objectContaining({ linkType: 'TASK_CHARACTER', relationship: 'owner' }),
      expect.objectContaining({ linkType: 'TASK_CHARACTER', relationship: 'beneficiary' }),
      expect.objectContaining({ linkType: 'TASK_ITEM', relationship: 'produced' }),
      expect.objectContaining({ linkType: 'TASK_FINREC' }),
      expect.objectContaining({ linkType: 'TASK_PLAYER', relationship: 'points-earned' }),
    ]));
  }, 120000);
});
