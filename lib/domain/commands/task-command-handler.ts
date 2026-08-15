// This is the pilot for the canonical command pattern:
// 1. Check idempotency (command outcome already exists?)
// 2. Load current aggregate
// 3. Validate command against current state
// 4. Atomically persist: aggregate + transition fact + command outcome
// 5. Return command outcome

import { kvCAS, kvGet, kvEval } from '@/lib/utils/kv';
import { buildDataKey } from '@/data-store/keys';
import { EntityType, TaskStatus } from '@/types/enums';
import type { Task } from '@/types/entities';
import type {
  CommandId,
  ActorId,
  EntityCommandEnvelope,
  CommandOutcomeV1,
  TaskCommand,
  TransitionFactV1,
} from '@/lib/domain/commands/contracts';
import {
  storeCommandOutcome,
  getCommandOutcome,
} from '@/lib/domain/commands/command-outcome-store';
import { storeTransitionFact } from '@/lib/domain/commands/outbox-store';
import { utcNow, toUtcIsoString } from '@/lib/domain/canonical/types';
import { v4 as uuid } from 'uuid';

const ENTITY = EntityType.TASK;

/**
 * Execute a Task command with atomic version enforcement.
 *
 * This is the canonical command handler pattern:
 * - Idempotent: same commandId returns same outcome
 * - Atomic: aggregate + fact + outcome persist together
 * - Versioned: expectedVersion prevents concurrent modification
 *
 * @param envelope - Command envelope with commandId, actorId, expectedVersion, payload
 * @returns CommandOutcomeV1 - The result of the command
 */
export async function executeTaskCommand(
  envelope: EntityCommandEnvelope<TaskCommand>
): Promise<CommandOutcomeV1> {
  const { commandId, actorId, expectedVersion, occurredAt, payload } = envelope;

  // 1. Idempotency check: if this commandId already executed, return stored outcome
  const existingOutcome = await getCommandOutcome(commandId);
  if (existingOutcome) {
    return existingOutcome;
  }

  // 2. Load current aggregate
  const taskKey = buildDataKey(ENTITY, payload.taskId);
  const currentTask = await kvGet<Task>(taskKey);

  // 3. Validate command against current state
  const validationResult = validateTaskCommand(payload, currentTask, expectedVersion);
  if (!validationResult.valid) {
    const failedOutcome: CommandOutcomeV1 = {
      commandId,
      aggregate: { type: 'task', id: payload.taskId },
      aggregateVersion: currentTask?.version ?? 0,
      state: 'failed',
      createdAt: utcNow(),
      errorCode: validationResult.errorCode,
      message: validationResult.message,
    };
    await storeCommandOutcome(failedOutcome);
    return failedOutcome;
  }

  // 4. Apply command to produce new state
  const { updatedTask, transitionFact } = applyTaskCommand(
    currentTask!,
    payload,
    commandId,
    actorId,
    occurredAt
  );

  // 5. Atomic persist: aggregate + transition fact + command outcome
  // Use Lua script for atomicity
  const success = await atomicPersistTaskUpdate(
    taskKey,
    updatedTask,
    transitionFact,
    expectedVersion
  );

  if (!success) {
    // Version mismatch: another command modified the aggregate
    const conflictOutcome: CommandOutcomeV1 = {
      commandId,
      aggregate: { type: 'task', id: payload.taskId },
      aggregateVersion: expectedVersion,
      state: 'failed',
      createdAt: utcNow(),
      errorCode: 'VERSION_CONFLICT',
      message: 'Another command modified this task. Refresh and retry.',
    };
    await storeCommandOutcome(conflictOutcome);
    return conflictOutcome;
  }

  // 6. Store command outcome
  const successOutcome: CommandOutcomeV1 = {
    commandId,
    aggregate: { type: 'task', id: payload.taskId },
    aggregateVersion: updatedTask.version,
    state: 'completed',
    createdAt: utcNow(),
  };
  await storeCommandOutcome(successOutcome);

  return successOutcome;
}

/**
 * Validate a Task command against the current state and expected version.
 */
function validateTaskCommand(
  payload: TaskCommand,
  currentTask: Task | null,
  expectedVersion: number
): { valid: boolean; errorCode?: string; message?: string } {
  // Creation commands
  if (payload.kind === 'CreateTask' || payload.kind === 'CreateStructuralGroup') {
    if (currentTask !== null) {
      return {
        valid: false,
        errorCode: 'TASK_ALREADY_EXISTS',
        message: `Task ${payload.taskId} already exists`,
      };
    }
    if (expectedVersion !== 0) {
      return {
        valid: false,
        errorCode: 'INVALID_VERSION',
        message: 'Creation commands must use expectedVersion=0',
      };
    }
    return { valid: true };
  }

  // All other commands require the task to exist
  if (!currentTask) {
    return {
      valid: false,
      errorCode: 'TASK_NOT_FOUND',
      message: `Task ${payload.taskId} not found`,
    };
  }

  // Version check
  const currentVersion = currentTask.version ?? 0;
  if (currentVersion !== expectedVersion) {
    return {
      valid: false,
      errorCode: 'VERSION_CONFLICT',
      message: `Expected version ${expectedVersion}, but current is ${currentVersion}`,
    };
  }

  // Lifecycle transition validation
  if (payload.kind === 'CompleteTask') {
    if (currentTask.status === TaskStatus.DONE || currentTask.status === TaskStatus.COLLECTED) {
      return {
        valid: false,
        errorCode: 'INVALID_TRANSITION',
        message: `Task is already ${currentTask.status}`,
      };
    }
  }

  if (payload.kind === 'CollectTask') {
    if (currentTask.status !== TaskStatus.DONE) {
      return {
        valid: false,
        errorCode: 'INVALID_TRANSITION',
        message: `Task must be DONE to collect, but is ${currentTask.status}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Apply a Task command to produce the new state and transition fact.
 */
function applyTaskCommand(
  currentTask: Task,
  payload: TaskCommand,
  commandId: CommandId,
  actorId: ActorId,
  occurredAt: string
): { updatedTask: Task; transitionFact: TransitionFactV1<string, unknown> } {
  const newVersion = (currentTask.version ?? 0) + 1;
  let updatedTask: Task;
  let factType: string;
  let factPayload: unknown;

  switch (payload.kind) {
    case 'CompleteTask':
      updatedTask = {
        ...currentTask,
        status: TaskStatus.DONE,
        doneAt: payload.completedAt,
        version: newVersion,
        updatedAt: occurredAt,
      } as Task;
      factType = 'TaskCompleted';
      factPayload = { completedAt: payload.completedAt };
      break;

    case 'CollectTask':
      updatedTask = {
        ...currentTask,
        status: TaskStatus.COLLECTED,
        collectedAt: payload.collectedAt,
        version: newVersion,
        updatedAt: occurredAt,
      } as Task;
      factType = 'TaskCollected';
      factPayload = { collectedAt: payload.collectedAt };
      break;

    case 'UpdateTask':
      updatedTask = {
        ...currentTask,
        ...payload.updates,
        version: newVersion,
        updatedAt: occurredAt,
      } as Task;
      factType = 'TaskUpdated';
      factPayload = { updates: payload.updates };
      break;

    default:
      throw new Error(`Unsupported command kind: ${(payload as any).kind}`);
  }

  const transitionFact: TransitionFactV1<string, unknown> = {
    factId: `fact-${uuid()}`,
    aggregate: { type: 'task', id: currentTask.id },
    aggregateVersion: newVersion,
    sequence: newVersion,
    commandId,
    occurredAt,
    schemaVersion: 1,
    eventType: factType,
    payload: factPayload,
  };

  return { updatedTask, transitionFact };
}

/**
 * Atomically persist Task update + transition fact using Lua script.
 * This ensures both writes succeed or both fail.
 *
 * Returns true if successful, false if version conflict.
 */
async function atomicPersistTaskUpdate(
  taskKey: string,
  updatedTask: Task,
  transitionFact: TransitionFactV1<string, unknown>,
  expectedVersion: number
): Promise<boolean> {
  const factKey = `thegame:outbox:${transitionFact.factId}`;

  // Lua script for atomic multi-key update with version check
  const luaScript = `
    local taskKey = KEYS[1]
    local factKey = KEYS[2]
    local expectedVersion = tonumber(ARGV[1])
    local taskData = ARGV[2]
    local factData = ARGV[3]

    -- Load current task
    local currentStr = redis.call('GET', taskKey)
    if currentStr == false then
      return 0 -- Task doesn't exist
    end

    local currentObj = cjson.decode(currentStr)
    local currentVer = currentObj.version or 0

    -- Version check
    if tonumber(currentVer) ~= expectedVersion then
      return 0 -- Version conflict
    end

    -- Atomic write: task + fact
    redis.call('SET', taskKey, taskData)
    redis.call('SET', factKey, factData)

    return 1
  `;

  const result = await kvEval<number>(
    luaScript,
    [taskKey, factKey],
    [expectedVersion, JSON.stringify(updatedTask), JSON.stringify(transitionFact)]
  );

  return result === 1;
}
