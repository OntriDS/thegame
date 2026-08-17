import { describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('server-only', () => ({}));
import { getAllCharacters, getTaskById, upsertTask } from '@/data-store/datastore';
import { TaskPriority, TaskStatus, TaskType } from '@/types/enums';
import { getUTCNow } from '@/lib/utils/utc-utils';
import { v4 as uuid } from 'uuid';

/**
 * Real database contract test for the minimum Task modal submission.
 *
 * This intentionally writes one Task to the configured database. It uses the
 * same default values as the modal and leaves the created test entity visible
 * so its persisted JSON can be inspected after the test.
 */
describe('entity-test: clean minimal Task', () => {
  it('creates and reads back only the clean persisted Task entity', async () => {
    const owner = (await getAllCharacters()).find(character => Boolean(character.playerId));
    if (!owner) {
      throw new Error('Cannot run entity-test: no Character linked to a Player was found.');
    }

    const now = getUTCNow();
    const taskId = uuid();

    // This is the modal-equivalent payload after its defaults are applied:
    // name is the only user-provided value; owner is the authenticated owner.
    await upsertTask({
      id: taskId,
      name: 'testing-task',
      status: TaskStatus.CREATED,
      priority: TaskPriority.NORMAL,
      type: TaskType.MISSION,
      station: 'strategy',
      progress: { percentage: 0 },
      order: 1000,
      createdAt: now,
      updatedAt: now,
      ownerIds: [owner.id],
    } as any, { skipDuplicateCheck: true });

    const saved = await getTaskById(taskId);
    if (!saved) throw new Error(`Entity-test Task ${taskId} was not found after creation.`);

    const persisted = JSON.parse(JSON.stringify(saved));
    const outputFile = resolve(__dirname, 'task-entity-test-clean.output.json');
    writeFileSync(outputFile, `${JSON.stringify(persisted, null, 2)}\n`, 'utf8');
    // stderr is intentional: Vitest suppresses passing-test stdout in its
    // default reporter, while the JSON must remain visible to the operator.
    process.stderr.write(`[entity-test] persisted Task entity:\n${JSON.stringify(persisted, null, 2)}\n`);

    expect(persisted).toEqual({
      id: taskId,
      name: 'testing-task',
      status: 'created',
      priority: 'normal',
      type: 'mission',
      station: 'strategy',
      progress: { percentage: 0 },
      order: 1000,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      schemaVersion: 1,
      version: 0,
    });
  });
});
