// This is the canonical command handler for Sale entities.
// It follows the same pattern as TaskCommandHandler:
// 1. Idempotency check (command outcome already exists?)
// 2. Load current aggregate
// 3. Validate command against current state
// 4. Atomically persist: aggregate + transition fact + command outcome
// 5. Return command outcome

import { kvEval, kvGet } from '@/lib/utils/kv';
import { buildDataKey } from '@/data-store/keys';
import { EntityType, SaleStatus } from '@/types/enums';
import type { Sale } from '@/types/entities';
import type {
  CommandId,
  ActorId,
  EntityCommandEnvelope,
  CommandOutcomeV1,
  SaleCommand,
  TransitionFactV1,
} from '@/lib/domain/commands/contracts';
import {
  storeCommandOutcome,
  getCommandOutcome,
} from '@/lib/domain/commands/command-outcome-store';
import { storeTransitionFact } from '@/lib/domain/commands/outbox-store';
import { utcNow } from '@/lib/domain/canonical/types';
import { v4 as uuid } from 'uuid';

const ENTITY = EntityType.SALE;

/**
 * Execute a Sale command with atomic version enforcement.
 */
export async function executeSaleCommand(
  envelope: EntityCommandEnvelope<SaleCommand>
): Promise<CommandOutcomeV1> {
  const { commandId, actorId, expectedVersion, occurredAt, payload } = envelope;

  // 1. Idempotency check
  const existingOutcome = await getCommandOutcome(commandId);
  if (existingOutcome) {
    return existingOutcome;
  }

  // 2. Load current aggregate
  const saleKey = buildDataKey(ENTITY, payload.saleId);
  const currentSale = await kvGet<Sale>(saleKey);

  // 3. Validate command against current state
  const validationResult = validateSaleCommand(payload, currentSale, expectedVersion);
  if (!validationResult.valid) {
    const failedOutcome: CommandOutcomeV1 = {
      commandId,
      aggregate: { type: 'sale', id: payload.saleId },
      aggregateVersion: currentSale?.version ?? 0,
      state: 'failed',
      createdAt: utcNow(),
      errorCode: validationResult.errorCode,
      message: validationResult.message,
    };
    await storeCommandOutcome(failedOutcome);
    return failedOutcome;
  }

  // 4. Apply command to produce new state
  const { updatedSale, transitionFact } = applySaleCommand(
    currentSale!,
    payload,
    commandId,
    actorId,
    occurredAt
  );

  // 5. Atomic persist: aggregate + transition fact + command outcome
  const success = await atomicPersistSaleUpdate(
    saleKey,
    updatedSale,
    transitionFact,
    expectedVersion
  );

  if (!success) {
    const conflictOutcome: CommandOutcomeV1 = {
      commandId,
      aggregate: { type: 'sale', id: payload.saleId },
      aggregateVersion: expectedVersion,
      state: 'failed',
      createdAt: utcNow(),
      errorCode: 'VERSION_CONFLICT',
      message: 'Another command modified this sale. Refresh and retry.',
    };
    await storeCommandOutcome(conflictOutcome);
    return conflictOutcome;
  }

  // 6. Store command outcome
  const successOutcome: CommandOutcomeV1 = {
    commandId,
    aggregate: { type: 'sale', id: payload.saleId },
    aggregateVersion: updatedSale.version,
    state: 'completed',
    createdAt: utcNow(),
  };
  await storeCommandOutcome(successOutcome);

  return successOutcome;
}

/**
 * Validate a Sale command against the current state and expected version.
 */
function validateSaleCommand(
  payload: SaleCommand,
  currentSale: Sale | null,
  expectedVersion: number
): { valid: boolean; errorCode?: string; message?: string } {
  // Creation commands
  if (payload.kind === 'CreateSale') {
    if (currentSale !== null) {
      return {
        valid: false,
        errorCode: 'SALE_ALREADY_EXISTS',
        message: `Sale ${payload.saleId} already exists`,
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

  // All other commands require the sale to exist
  if (!currentSale) {
    return {
      valid: false,
      errorCode: 'SALE_NOT_FOUND',
      message: `Sale ${payload.saleId} not found`,
    };
  }

  // Version check
  const currentVersion = currentSale.version ?? 0;
  if (currentVersion !== expectedVersion) {
    return {
      valid: false,
      errorCode: 'VERSION_CONFLICT',
      message: `Expected version ${expectedVersion}, but current is ${currentVersion}`,
    };
  }

  // Lifecycle transition validation
  if (payload.kind === 'ChargeSale') {
    if (currentSale.status !== SaleStatus.PENDING) {
      return {
        valid: false,
        errorCode: 'INVALID_TRANSITION',
        message: `Sale must be PENDING to charge, but is ${currentSale.status}`,
      };
    }
  }

  if (payload.kind === 'CollectSale') {
    if (currentSale.status !== SaleStatus.CHARGED) {
      return {
        valid: false,
        errorCode: 'INVALID_TRANSITION',
        message: `Sale must be CHARGED to collect, but is ${currentSale.status}`,
      };
    }
  }

  if (payload.kind === 'CancelSale') {
    if (currentSale.status === SaleStatus.COLLECTED || currentSale.status === SaleStatus.CANCELLED) {
      return {
        valid: false,
        errorCode: 'INVALID_TRANSITION',
        message: `Sale is already ${currentSale.status}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Apply a Sale command to produce the new state and transition fact.
 */
function applySaleCommand(
  currentSale: Sale,
  payload: SaleCommand,
  commandId: CommandId,
  actorId: ActorId,
  occurredAt: string
): { updatedSale: Sale; transitionFact: TransitionFactV1<string, unknown> } {
  const newVersion = (currentSale.version ?? 0) + 1;
  let updatedSale: Sale;
  let factType: string;
  let factPayload: unknown;

  switch (payload.kind) {
    case 'ChargeSale':
      updatedSale = {
        ...currentSale,
        status: SaleStatus.CHARGED,
        lifecycle: {
          ...currentSale.lifecycle,
          chargedAt: payload.chargedAt,
        },
        version: newVersion,
        updatedAt: occurredAt,
      };
      factType = 'SaleCharged';
      factPayload = { chargedAt: payload.chargedAt };
      break;

    case 'CollectSale':
      updatedSale = {
        ...currentSale,
        status: SaleStatus.COLLECTED,
        lifecycle: {
          ...currentSale.lifecycle,
          collectedAt: payload.collectedAt,
        },
        version: newVersion,
        updatedAt: occurredAt,
      };
      factType = 'SaleCollected';
      factPayload = { collectedAt: payload.collectedAt };
      break;

    case 'CancelSale':
      updatedSale = {
        ...currentSale,
        status: SaleStatus.CANCELLED,
        lifecycle: {
          ...currentSale.lifecycle,
          cancelledAt: payload.cancelledAt,
        },
        version: newVersion,
        updatedAt: occurredAt,
      };
      factType = 'SaleCancelled';
      factPayload = { cancelledAt: payload.cancelledAt, reason: payload.reason };
      break;

    case 'UpdateSale':
      updatedSale = {
        ...currentSale,
        ...payload.updates,
        version: newVersion,
        updatedAt: occurredAt,
      };
      factType = 'SaleUpdated';
      factPayload = { updates: payload.updates };
      break;

    default:
      throw new Error(`Unsupported command kind: ${(payload as any).kind}`);
  }

  const transitionFact: TransitionFactV1<string, unknown> = {
    factId: `fact-${uuid()}`,
    eventType: factType,
    aggregate: { type: 'sale', id: currentSale.id },
    aggregateVersion: newVersion,
    sequence: newVersion,
    commandId,
    occurredAt,
    schemaVersion: 1,
    payload: factPayload,
  };

  return { updatedSale, transitionFact };
}

/**
 * Atomically persist Sale update + transition fact using Lua script.
 */
async function atomicPersistSaleUpdate(
  saleKey: string,
  updatedSale: Sale,
  transitionFact: TransitionFactV1<string, unknown>,
  expectedVersion: number
): Promise<boolean> {
  const factKey = `thegame:outbox:${transitionFact.factId}`;

  const luaScript = `
    local saleKey = KEYS[1]
    local factKey = KEYS[2]
    local expectedVersion = tonumber(ARGV[1])
    local saleData = ARGV[2]
    local factData = ARGV[3]

    -- Load current sale
    local currentStr = redis.call('GET', saleKey)
    if currentStr == false then
      return 0 -- Sale doesn't exist
    end

    local currentObj = cjson.decode(currentStr)
    local currentVer = currentObj.version or 0

    -- Version check
    if tonumber(currentVer) ~= expectedVersion then
      return 0 -- Version conflict
    end

    -- Atomic write: sale + fact
    redis.call('SET', saleKey, saleData)
    redis.call('SET', factKey, factData)

    return 1
  `;

  const result = await kvEval<number>(
    luaScript,
    [saleKey, factKey],
    [expectedVersion, JSON.stringify(updatedSale), JSON.stringify(transitionFact)]
  );

  return result === 1;
}
