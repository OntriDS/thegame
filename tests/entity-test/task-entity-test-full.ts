import { describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('server-only', () => ({}));

import {
  getAllCharacters,
  getAllSites,
  getAllTasks,
  getFinancialsBySourceTaskId,
  getItemsBySourceTaskId,
  getTaskById,
  upsertTask,
} from '@/data-store/datastore';
import { getLinksFor } from '@/links/link-registry';
import { EntityType, TaskPriority, TaskStatus, TaskType } from '@/types/enums';
import { getUTCNow } from '@/lib/utils/utc-utils';
import { v4 as uuid } from 'uuid';

describe('entity-test: full Task at created status', () => {
  it('persists every active Task facet and only the expected created-state entities', async () => {
    const characters = await getAllCharacters();
    const owner = characters.find(character => Boolean(character.playerId));
    if (!owner) throw new Error('Cannot run full entity-test: no Player-owned Character exists.');

    const sites = await getAllSites();
    const site = sites.find(candidate => candidate.id === 'hq') || sites[0];
    if (!site) throw new Error('Cannot run full entity-test: no Site exists.');

    const parent = (await getAllTasks()).find(task => task.status !== TaskStatus.COLLECTED);
    if (!parent) throw new Error('Cannot run full entity-test: no existing parent Task exists.');

    const now = getUTCNow();
    const taskId = uuid();
    const dueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await upsertTask({
      id: taskId,
      name: 'testing-task-full',
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
        counterparty: {
          counterpartyId: owner.id,
          role: 'beneficiary',
        },
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
          outputItemName: 'testing-full-output',
          outputItemPrice: { minorUnits: '5000', currency: 'USD' },
          outputItemStatus: 'for-sale',
          isNewItem: true,
          isSold: false,
        },
      },
      createdAt: now,
      updatedAt: now,
    } as any, { skipDuplicateCheck: true });

    const task = await getTaskById(taskId);
    if (!task) throw new Error(`Full entity-test Task ${taskId} was not found after creation.`);

    const links = await getLinksFor({ type: EntityType.TASK, id: taskId });
    const items = await getItemsBySourceTaskId(taskId);
    const financials = await getFinancialsBySourceTaskId(taskId);
    const output = { task, links, items, financials };
    const outputFile = resolve(__dirname, 'task-entity-test-full.output.json');
    writeFileSync(outputFile, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    process.stderr.write(
      `[entity-test] FULL_ENTITY_OUTPUT_BEGIN\n${JSON.stringify(output, null, 2)}\n[entity-test] FULL_ENTITY_OUTPUT_END\n`
    );

    expect(task).toMatchObject({
      id: taskId,
      name: 'testing-task-full',
      status: 'created',
      priority: 'normal',
      type: 'goal',
      station: 'strategy',
      progress: { percentage: 0 },
      schedule: { dueDate },
      order: 1000,
      siteId: site.id,
      parentId: parent.id,
      context: {
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
          outputItemName: 'testing-full-output',
          isNewItem: true,
          isSold: false,
        },
      },
      schemaVersion: 1,
      version: 0,
    });
    expect(task).not.toHaveProperty('ownerIds');
    expect(task).not.toHaveProperty('playerCharacterId');
    expect(task.context).not.toHaveProperty('counterparty');
    expect(links).toEqual(expect.arrayContaining([
      expect.objectContaining({ linkType: 'TASK_SITE' }),
      expect.objectContaining({ linkType: 'TASK_CHARACTER', relationship: 'owner' }),
      expect.objectContaining({ linkType: 'TASK_CHARACTER', relationship: 'beneficiary' }),
    ]));
    expect(items).toEqual([]);
    expect(financials).toEqual([]);
  }, 60000);
});
