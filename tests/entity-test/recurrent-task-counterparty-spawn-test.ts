import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
import {
  getAllCharacters,
  removeTask,
  upsertTask,
} from '@/data-store/datastore';
import { getLinksFor } from '@/links/link-registry';
import { spawnNextRecurrentInstance } from '@/lib/utils/recurrent-task-utils';
import { EntityType, TaskPriority, TaskStatus, TaskType } from '@/types/enums';

const TEMPLATE_ID = 'entity-test-recurrent-counterparty-template';
const INSTANCE_ID = 'entity-test-recurrent-counterparty-instance';

describe('entity-test: recurrent spawn preserves canonical counterparty link', () => {
  afterEach(async () => {
    await removeTask(INSTANCE_ID);
    await removeTask(TEMPLATE_ID);
  });

  it('creates the beneficiary link on the spawned instance', async () => {
    const beneficiary = (await getAllCharacters())[0];
    expect(beneficiary?.id).toBeTruthy();

    const template = await upsertTask({
      id: TEMPLATE_ID,
      name: 'Entity Test Recurrent Counterparty',
      type: TaskType.RECURRENT_TEMPLATE,
      status: TaskStatus.CREATED,
      priority: TaskPriority.NORMAL,
      station: 'family' as any,
      progress: { percentage: 0 },
      context: {
        recurrence: {
          isRecurrentGroup: false,
          isTemplate: true,
          frequencyConfig: {
            type: 'once',
            interval: 1,
            repeatMode: 'periodically',
          },
        },
      },
      __counterparty: { id: beneficiary.id, role: 'beneficiary' },
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 0,
      schemaVersion: 1,
    } as any);

    const spawned = await spawnNextRecurrentInstance(template, new Date(Date.now() + 86400000));
    expect(spawned.instance).toBeTruthy();

    const instance = await upsertTask({
      ...(spawned.instance as any),
      id: INSTANCE_ID,
    });
    const links = await getLinksFor({ type: EntityType.TASK, id: instance.id });

    expect(links).toEqual(expect.arrayContaining([
      expect.objectContaining({
        linkType: 'TASK_CHARACTER',
        relationship: 'beneficiary',
        target: { type: EntityType.CHARACTER, id: beneficiary.id },
      }),
      expect.objectContaining({
        linkType: 'TASK_TASK',
        relationship: 'parent',
        target: { type: EntityType.TASK, id: TEMPLATE_ID },
      }),
    ]));
  });
});
