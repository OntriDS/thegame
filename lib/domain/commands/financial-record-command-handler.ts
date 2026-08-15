// This is the canonical command handler for FinancialRecord entities.
// It follows the same pattern as TaskCommandHandler and SaleCommandHandler:
// 1. Idempotency check (command outcome already exists?)
// 2. Load current aggregate
// 3. Validate command against current state
// 4. Atomically persist: aggregate + transition fact + command outcome
// 5. Return command outcome

import { kvEval, kvGet } from '@/lib/utils/kv';
import { buildDataKey } from '@/data-store/keys';
import { EntityType, FinancialStatus } from '@/types/enums';
import type { FinancialRecord } from '@/types/entities';
import type {
  CommandId,
  ActorId,
  EntityCommandEnvelope,
  CommandOutcomeV1,
  FinancialRecordCommand,
  TransitionFactV1,
} from '@/lib/domain/commands/contracts';
import {
  storeCommandOutcome,
  getCommandOutcome,
} from '@/lib/domain/commands/command-outcome-store';
import { storeTransitionFact } from '@/lib/domain/commands/outbox-store';
import { utcNow } from '@/lib/domain/canonical/types';
import { v4 as uuid } from 'uuid';

const ENTITY = EntityType.FINANCIAL;

/**
 * Execute a FinancialRecord command with atomic version enforcement.
 */
export async function executeFinancialRecordCommand(
  envelope: EntityCommandEnvelope<FinancialRecordCommand>
): Promise<CommandOutcomeV1> {
  const { commandId, actorId, expectedVersion, occurredAt, payload } = envelope;

  // 1. Idempotency check
  const existingOutcome = await getCommandOutcome(commandId);
  if (existingOutcome) {
    return existingOutcome;
  }

  // 2. Load current aggregate
  const finrecKey = buildDataKey(ENTITY, payload.financialRecordId);
  const currentFinrec = await kvGet<FinancialRecord>(finrecKey);

  // 3. Validate command against current state
  const validationResult = validateFinancialRecordCommand(payload, currentFinrec, expectedVersion);
  if (!validationResult.valid) {
    const failedOutcome: CommandOutcomeV1 = {
      commandId,
      aggregate: { type: 'financial', id: payload.financialRecordId },
      aggregateVersion: currentFinrec?.version ?? 0,
      state: 'failed',
      createdAt: utcNow(),
      errorCode: validationResult.errorCode,
      message: validationResult.message,
    };
    await storeCommandOutcome(failedOutcome);
    return failedOutcome;
  }

  // 4. Apply command to produce new state
  const { updatedFinrec, transitionFact } = applyFinancialRecordCommand(
    currentFinrec!,
    payload,
    commandId,
    actorId,
    occurredAt
  );

  // 5. Atomic persist: aggregate + transition fact + command outcome
  const success = await atomicPersistFinancialRecordUpdate(
    finrecKey,
    updatedFinrec,
    transitionFact,
    expectedVersion
  );

  if (!success) {
    const conflictOutcome: CommandOutcomeV1 = {
      commandId,
      aggregate: { type: 'financial', id: payload.financialRecordId },
      aggregateVersion: expectedVersion,
      state: 'failed',
      createdAt: utcNow(),
      errorCode: 'VERSION_CONFLICT',
      message: 'Another command modified this financial record. Refresh and retry.',
    };
    await storeCommandOutcome(conflictOutcome);
    return conflictOutcome;
  }

  // 6. Store command outcome
  const successOutcome: CommandOutcomeV1 = {
    commandId,
    aggregate: { type: 'financial', id: payload.financialRecordId },
    aggregateVersion: updatedFinrec.version,
    state: 'completed',
    createdAt: utcNow(),
  };
  await storeCommandOutcome(successOutcome);

  return successOutcome;
}

/**
 * Validate a FinancialRecord command against the current state and expected version.
 */
function validateFinancialRecordCommand(
  payload: FinancialRecordCommand,
  currentFinrec: FinancialRecord | null,
  expectedVersion: number
): { valid: boolean; errorCode?: string; message?: string } {
  // Creation commands
  if (payload.kind === 'CreateFinancialRecord') {
    if (currentFinrec !== null) {
      return {
        valid: false,
        errorCode: 'FINREC_ALREADY_EXISTS',
        message: `FinancialRecord ${payload.financialRecordId} already exists`,
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

  // All other commands require the financial record to exist
  if (!currentFinrec) {
    return {
      valid: false,
      errorCode: 'FINREC_NOT_FOUND',
      message: `FinancialRecord ${payload.financialRecordId} not found`,
    };
  }

  // Version check
  const currentVersion = currentFinrec.version ?? 0;
  if (currentVersion !== expectedVersion) {
    return {
      valid: false,
      errorCode: 'VERSION_CONFLICT',
      message: `Expected version ${expectedVersion}, but current is ${currentVersion}`,
    };
  }

  // Lifecycle transition validation
  if (payload.kind === 'DoneFinancialRecord') {
    if (currentFinrec.status !== FinancialStatus.PENDING) {
      return {
        valid: false,
        errorCode: 'INVALID_TRANSITION',
        message: `FinancialRecord must be PENDING to mark done, but is ${currentFinrec.status}`,
      };
    }
  }

  if (payload.kind === 'VoidFinancialRecord') {
    if (currentFinrec.status === FinancialStatus.VOIDED) {
      return {
        valid: false,
        errorCode: 'INVALID_TRANSITION',
        message: `FinancialRecord is already VOIDED`,
      };
    }
  }

  return { valid: true };
}

/**
 * Apply a FinancialRecord command to produce the new state and transition fact.
 */
function applyFinancialRecordCommand(
  currentFinrec: FinancialRecord,
  payload: FinancialRecordCommand,
  commandId: CommandId,
  actorId: ActorId,
  occurredAt: string
): { updatedFinrec: FinancialRecord; transitionFact: TransitionFactV1<string, unknown> } {
  const newVersion = (currentFinrec.version ?? 0) + 1;
  let updatedFinrec: FinancialRecord;
  let factType: string;
  let factPayload: unknown;

  switch (payload.kind) {
    case 'DoneFinancialRecord':
      updatedFinrec = {
        ...currentFinrec,
        status: FinancialStatus.DONE,
        version: newVersion,
        updatedAt: occurredAt,
      };
      factType = 'FinancialRecordDone';
      factPayload = { doneAt: payload.doneAt };
      break;

    case 'VoidFinancialRecord':
      updatedFinrec = {
        ...currentFinrec,
        status: FinancialStatus.VOIDED,
        version: newVersion,
        updatedAt: occurredAt,
      };
      factType = 'FinancialRecordVoided';
      factPayload = { voidedAt: payload.voidedAt, reason: payload.reason };
      break;

    case 'UpdateFinancialRecord':
      updatedFinrec = {
        ...currentFinrec,
        ...payload.updates,
        version: newVersion,
        updatedAt: occurredAt,
      };
      factType = 'FinancialRecordUpdated';
      factPayload = { updates: payload.updates };
      break;

    default:
      throw new Error(`Unsupported command kind: ${(payload as any).kind}`);
  }

  const transitionFact: TransitionFactV1<string, unknown> = {
    factId: `fact-${uuid()}`,
    eventType: factType,
    aggregate: { type: 'financial', id: currentFinrec.id },
    aggregateVersion: newVersion,
    sequence: newVersion,
    commandId,
    occurredAt,
    schemaVersion: 1,
    payload: factPayload,
  };

  return { updatedFinrec, transitionFact };
}

/**
 * Atomically persist FinancialRecord update + transition fact using Lua script.
 */
async function atomicPersistFinancialRecordUpdate(
  finrecKey: string,
  updatedFinrec: FinancialRecord,
  transitionFact: TransitionFactV1<string, unknown>,
  expectedVersion: number
): Promise<boolean> {
  const factKey = `thegame:outbox:${transitionFact.factId}`;

  const luaScript = `
    local finrecKey = KEYS[1]
    local factKey = KEYS[2]
    local expectedVersion = tonumber(ARGV[1])
    local finrecData = ARGV[2]
    local factData = ARGV[3]

    -- Load current financial record
    local currentStr = redis.call('GET', finrecKey)
    if currentStr == false then
      return 0 -- FinancialRecord doesn't exist
    end

    local currentObj = cjson.decode(currentStr)
    local currentVer = currentObj.version or 0

    -- Version check
    if tonumber(currentVer) ~= expectedVersion then
      return 0 -- Version conflict
    end

    -- Atomic write: financial record + fact
    redis.call('SET', finrecKey, finrecData)
    redis.call('SET', factKey, factData)

    return 1
  `;

  const result = await kvEval<number>(
    luaScript,
    [finrecKey, factKey],
    [expectedVersion, JSON.stringify(updatedFinrec), JSON.stringify(transitionFact)]
  );

  return result === 1;
}
