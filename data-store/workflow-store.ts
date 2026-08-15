import { kvGet, kvSet, kvEval } from '@/lib/utils/kv';
import type { EffectClaimV1, WorkflowExecutionV1, IdempotencyKey } from '@/types/entities';
import { EffectClaimStatus } from '@/types/enums';
import { getUTCNow } from '@/lib/utils/utc-utils';

/**
 * Attempts to acquire an atomic lock for an effect claim.
 * Uses Redis SET NX to ensure only one coordinator can claim it.
 * @param idempotencyKey The unique key for the effect
 * @param ownerId The ID of the workflow/process trying to claim it
 * @param ttlSeconds How long the lock should be held (default 60s)
 * @returns true if acquired, false if already claimed by someone else
 */
export async function acquireClaim(idempotencyKey: IdempotencyKey, ownerId: string, ttlSeconds = 60): Promise<boolean> {
  const script = `
    local current = redis.call('GET', KEYS[1])
    if current == false then
      local claim = {
        idempotencyKey = KEYS[1],
        status = ARGV[4],
        ownerId = ARGV[1],
        createdAt = ARGV[2],
        updatedAt = ARGV[2],
        commandId = ARGV[5],
        attempts = 1
      }
      redis.call('SET', KEYS[1], cjson.encode(claim), 'EX', ARGV[3])
      return 1
    else
      local parsed = cjson.decode(current)
      if parsed.ownerId == ARGV[1] then
        parsed.updatedAt = ARGV[2]
        redis.call('SET', KEYS[1], cjson.encode(parsed), 'EX', ARGV[3])
        return 1
      end
      return 0
    end
  `;

  const now = getUTCNow();
  const result = await kvEval<number>(script, [`effect:${idempotencyKey}`], [ownerId, now, ttlSeconds.toString(), EffectClaimStatus.CLAIMED, 'none']);
  return result === 1;
}

/**
 * Resolves an effect claim (SUCCESS or ERROR) after the effect has been executed.
 */
export async function resolveClaim(idempotencyKey: IdempotencyKey, status: EffectClaimStatus, resultRef?: { type: any, id: string }): Promise<void> {
  const claim = await kvGet<EffectClaimV1>(`effect:${idempotencyKey}`);
  if (!claim) return;

  claim.status = status;
  claim.updatedAt = getUTCNow();
  
  if (status === EffectClaimStatus.COMPLETED) {
    if (resultRef) claim.resultRef = resultRef;
    await kvSet(`effect:${idempotencyKey}`, claim);
  } else {
    await kvSet(`effect:${idempotencyKey}`, claim);
  }
}

/**
 * Fetches an existing claim if any.
 */
export async function getClaim(idempotencyKey: IdempotencyKey): Promise<EffectClaimV1 | null> {
  return await kvGet<EffectClaimV1>(`effect:${idempotencyKey}`);
}

/**
 * Saves a Workflow Execution state (Phase 4/5 shadow mode & durable coordination).
 */
export async function saveWorkflowExecution(execution: WorkflowExecutionV1): Promise<void> {
  await kvSet(`workflow:${execution.workflowId}`, execution);
}

/**
 * Retrieves a Workflow Execution state.
 */
export async function getWorkflowExecution(workflowId: string): Promise<WorkflowExecutionV1 | null> {
  return await kvGet<WorkflowExecutionV1>(`workflow:${workflowId}`);
}
