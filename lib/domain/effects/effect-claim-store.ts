// EffectClaimV1 lifecycle:
//   absent → claimed → completed
//                  → failed-retryable
//                  → failed-terminal
//                  → awaiting-reconciliation
//                  → compensated
//
// Lease expiration permits reclamation ONLY from failed-retryable.
// It NEVER permits automatic replay of an external operation with unknown outcome.

import { kvDel, kvEval, kvGet, kvSet } from '@/lib/utils/kv';
import type { EffectClaimV1 } from '@/types/entities';
import { EffectClaimStatus } from '@/types/enums';
import { v4 as uuid } from 'uuid';

const EFFECT_PREFIX = 'thegame:effect:';
const DEFAULT_LEASE_SECONDS = 60;

export async function deleteEffectClaim(idempotencyKey: string): Promise<void> {
  await kvDel(`${EFFECT_PREFIX}${idempotencyKey}`);
}

// ─── Claim Acquisition ──────────────────────────────────────────────────────

/**
 * Atomically claim an effect.
 *
 * Returns the claim if acquired, or null if already claimed by another owner.
 * If the same owner re-claims, the lease is refreshed.
 *
 * Uses Lua script for atomicity: read + conditional write in one operation.
 */
export async function acquireEffectClaim(params: {
  idempotencyKey: string;
  ownerId: string;
  commandId: string;
  workflowId?: string;
  leaseSeconds?: number;
}): Promise<EffectClaimV1 | null> {
  const { idempotencyKey, ownerId, commandId, workflowId, leaseSeconds = DEFAULT_LEASE_SECONDS } = params;
  const key = `${EFFECT_PREFIX}${idempotencyKey}`;
  const leaseToken = uuid();
  const now = new Date().toISOString();
  const leaseExpiresAt = new Date(Date.now() + leaseSeconds * 1000).toISOString();

  // Lua script for atomic claim acquisition
  const luaScript = `
    local key = KEYS[1]
    local ownerId = ARGV[1]
    local leaseToken = ARGV[2]
    local leaseExpiresAt = ARGV[3]
    local commandId = ARGV[4]
    local workflowId = ARGV[5]
    local now = ARGV[6]
    local leaseSeconds = tonumber(ARGV[7])

    local current = redis.call('GET', key)
    if current == false then
      -- No existing claim: create new one
      local claim = cjson.encode({
        idempotencyKey = key:sub(14),  -- strip 'thegame:effect:' prefix
        status = 'claimed',
        commandId = commandId,
        workflowId = (workflowId ~= '') and workflowId or cjson.null,
        ownerId = ownerId,
        leaseToken = leaseToken,
        leaseExpiresAt = leaseExpiresAt,
        attempts = 1,
        createdAt = now,
        updatedAt = now
      })
      redis.call('SET', key, claim, 'EX', leaseSeconds)
      return claim
    end

    local parsed = cjson.decode(current)

    -- Same owner: refresh lease
    if parsed.ownerId == ownerId then
      parsed.leaseToken = leaseToken
      parsed.leaseExpiresAt = leaseExpiresAt
      parsed.updatedAt = now
      parsed.attempts = (parsed.attempts or 0) + 1
      local updated = cjson.encode(parsed)
      redis.call('SET', key, updated, 'EX', leaseSeconds)
      return updated
    end

    -- Different owner: check if lease expired AND status is failed-retryable
    if parsed.status == 'failed-retryable' then
      local expiresAt = parsed.leaseExpiresAt
      if expiresAt == nil or expiresAt == cjson.null then
        -- No lease expiry set, cannot reclaim
        return nil
      end
      -- Lease expired: allow reclamation
      parsed.ownerId = ownerId
      parsed.leaseToken = leaseToken
      parsed.leaseExpiresAt = leaseExpiresAt
      parsed.status = 'claimed'
      parsed.updatedAt = now
      parsed.attempts = (parsed.attempts or 0) + 1
      parsed.workflowId = (workflowId ~= '') and workflowId or parsed.workflowId
      local updated = cjson.encode(parsed)
      redis.call('SET', key, updated, 'EX', leaseSeconds)
      return updated
    end

    -- Different owner, lease not expired or status not retryable: deny
    return nil
  `;

  const result = await kvEval<string | null>(
    luaScript,
    [key],
    [ownerId, leaseToken, leaseExpiresAt, commandId, workflowId || '', now, leaseSeconds.toString()]
  );

  if (!result) return null;

  if (typeof result === 'object') return result as EffectClaimV1;
  try {
    return JSON.parse(result) as EffectClaimV1;
  } catch {
    return null;
  }
}

// ─── Claim Resolution ───────────────────────────────────────────────────────

/**
 * Atomically resolve an effect claim.
 *
 * Only the current lease holder can resolve the claim.
 * Stale lease tokens cannot complete effects.
 *
 * Returns true if resolved, false if lease token mismatch.
 */
export async function resolveEffectClaim(params: {
  idempotencyKey: string;
  leaseToken: string;
  status: EffectClaimStatus.COMPLETED | EffectClaimStatus.FAILED_RETRYABLE | EffectClaimStatus.FAILED_TERMINAL | EffectClaimStatus.AWAITING_RECONCILIATION;
  resultRef?: { type: string; id: string };
  errorCode?: string;
}): Promise<boolean> {
  const { idempotencyKey, leaseToken, status, resultRef, errorCode } = params;
  const key = `${EFFECT_PREFIX}${idempotencyKey}`;
  const now = new Date().toISOString();

  const luaScript = `
    local key = KEYS[1]
    local leaseToken = ARGV[1]
    local status = ARGV[2]
    local resultRef = ARGV[3]
    local errorCode = ARGV[4]
    local now = ARGV[5]

    local current = redis.call('GET', key)
    if current == false then
      return 0
    end

    local parsed = cjson.decode(current)

    -- Only the current lease holder can resolve
    if parsed.leaseToken ~= leaseToken then
      return 0
    end

    parsed.status = status
    parsed.updatedAt = now
    if resultRef ~= '' and resultRef ~= cjson.null then
      parsed.resultRef = cjson.decode(resultRef)
    end
    if errorCode ~= '' then
      parsed.errorCode = errorCode
    end

    redis.call('SET', key, cjson.encode(parsed))
    return 1
  `;

  const resultRefJson = resultRef ? JSON.stringify(resultRef) : '';
  const result = await kvEval<number>(
    luaScript,
    [key],
    [leaseToken, status, resultRefJson, errorCode || '', now]
  );

  return result === 1;
}

// ─── Claim Query ────────────────────────────────────────────────────────────

/**
 * Get the current effect claim.
 */
export async function getEffectClaim(idempotencyKey: string): Promise<EffectClaimV1 | null> {
  const key = `${EFFECT_PREFIX}${idempotencyKey}`;
  return await kvGet<EffectClaimV1>(key);
}

/**
 * Reopen the narrow class of claims that say "completed" but have no result
 * evidence. This is recovery for an interrupted/buggy old writer; completed
 * claims with a result remain permanently terminal.
 */
export async function reopenCompletedClaimWithoutResult(idempotencyKey: string): Promise<boolean> {
  const key = `${EFFECT_PREFIX}${idempotencyKey}`;
  const now = new Date().toISOString();
  const expiredAt = new Date(0).toISOString();

  const luaScript = `
    local key = KEYS[1]
    local now = ARGV[1]
    local expiredAt = ARGV[2]
    local current = redis.call('GET', key)
    if current == false then return 0 end

    local parsed = cjson.decode(current)
    if parsed.status ~= 'completed' then return 0 end
    if parsed.resultRef ~= nil and parsed.resultRef ~= cjson.null then return 0 end

    parsed.status = 'failed-retryable'
    parsed.leaseExpiresAt = expiredAt
    parsed.updatedAt = now
    parsed.errorCode = 'MISSING_RESULT_EVIDENCE'
    redis.call('SET', key, cjson.encode(parsed), 'EX', 60)
    return 1
  `;

  const result = await kvEval<number>(luaScript, [key], [now, expiredAt]);
  return result === 1;
}

/**
 * Check if an effect is completed.
 * Returns true if the claim exists and status is COMPLETED.
 */
export async function isEffectCompleted(idempotencyKey: string): Promise<boolean> {
  const claim = await getEffectClaim(idempotencyKey);
  return claim?.status === EffectClaimStatus.COMPLETED;
}

/**
 * Check if an effect is in a terminal state (completed, failed-terminal, compensated).
 */
export async function isEffectTerminal(idempotencyKey: string): Promise<boolean> {
  const claim = await getEffectClaim(idempotencyKey);
  if (!claim) return false;
  return (
    claim.status === EffectClaimStatus.COMPLETED ||
    claim.status === EffectClaimStatus.FAILED_TERMINAL ||
    claim.status === EffectClaimStatus.COMPENSATED
  );
}

/**
 * Check if an effect is retryable (failed-retryable with expired lease).
 */
export async function isEffectRetryable(idempotencyKey: string): Promise<boolean> {
  const claim = await getEffectClaim(idempotencyKey);
  if (!claim) return false;
  if (claim.status !== EffectClaimStatus.FAILED_RETRYABLE) return false;
  if (!claim.leaseExpiresAt) return true;
  return new Date(claim.leaseExpiresAt).getTime() < Date.now();
}
