import { randomUUID } from 'crypto';
import { kvGet, kvSet, kvEval, kvSAdd, kvSMembers } from '@/lib/utils/kv';
import type { AutomationAgentActionV1, EffectClaimV1, WorkflowExecutionV1, IdempotencyKey } from '@/types/entities';
import { EffectClaimStatus, WorkflowStatus } from '@/types/enums';
import { getUTCNow } from '@/lib/utils/utc-utils';
import { VersionConflictError } from '@/lib/exceptions/workflow-errors';

/**
 * Upstash Redis automatically deserializes JSON-looking Lua return strings.
 * Accept either that parsed object or the raw JSON string, depending on client
 * configuration/version.
 */
function parseLuaJsonResult<T>(result: unknown): T {
  if (typeof result === 'string') return JSON.parse(result) as T;
  if (result !== null && typeof result === 'object') return result as T;
  throw new Error('Redis Lua script returned neither a JSON string nor an object.');
}

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
 * Atomically create a workflow execution, or return the existing occurrence.
 * The deterministic workflow id is the idempotency boundary for dispatch.
 */
export async function createOrGetWorkflowExecution(
  execution: WorkflowExecutionV1,
): Promise<{ execution: WorkflowExecutionV1; created: boolean }> {
  const key = `workflow:${execution.workflowId}`;
  const result = await kvEval<string>(
    `
      local existing = redis.call('GET', KEYS[1])
      if existing then
        return '0|' .. existing
      end
      redis.call('SET', KEYS[1], ARGV[1])
      return '1|' .. ARGV[1]
    `,
    [key],
    [JSON.stringify({ ...execution, revision: execution.revision ?? 0 })],
  );

  const created = result.startsWith('1|');
  const stored = JSON.parse(result.slice(2)) as WorkflowExecutionV1;
  return { execution: stored, created };
}

/** Acquire the lease for one durable workflow slice. */
export async function acquireWorkflowLease(
  workflowId: string,
  ownerId: string,
  leaseSeconds = 60,
): Promise<WorkflowExecutionV1 | null> {
  const key = `workflow:${workflowId}`;
  const now = getUTCNow();
  const nowIso = now.toISOString();
  const leaseExpiresAt = new Date(now.getTime() + leaseSeconds * 1000).toISOString();
  const leaseToken = `${ownerId}:${Date.now()}`;
  const result = await kvEval<unknown | null>(
    `
      local raw = redis.call('GET', KEYS[1])
      if not raw then return nil end
      local item = cjson.decode(raw)
      local now = ARGV[1]
      if item.leaseToken and item.leaseExpiresAt and item.leaseExpiresAt > now and item.leaseToken ~= ARGV[2] then
        return nil
      end
      item.leaseToken = ARGV[2]
      item.leaseExpiresAt = ARGV[3]
      item.state = '${WorkflowStatus.RUNNING}'
      item.updatedAt = now
      item.revision = (item.revision or 0) + 1
      redis.call('SET', KEYS[1], cjson.encode(item))
      return cjson.encode(item)
    `,
    [key],
    [nowIso, leaseToken, leaseExpiresAt],
  );
  return result === null ? null : parseLuaJsonResult<WorkflowExecutionV1>(result);
}

/** Save only if the caller still owns the expected revision and lease. */
export async function saveWorkflowExecutionCAS(
  execution: WorkflowExecutionV1,
  expectedRevision: number,
): Promise<WorkflowExecutionV1> {
  const key = `workflow:${execution.workflowId}`;
  const next = { ...execution, revision: expectedRevision + 1, updatedAt: getUTCNow() };
  const saved = await kvEval<number>(
    `
      local raw = redis.call('GET', KEYS[1])
      if not raw then return 0 end
      local current = cjson.decode(raw)
      if tonumber(current.revision or 0) ~= tonumber(ARGV[1]) then return 0 end
      if current.leaseToken and ARGV[3] ~= current.leaseToken then return 0 end
      redis.call('SET', KEYS[1], ARGV[2])
      return 1
    `,
    [key],
    [expectedRevision, JSON.stringify(next), execution.leaseToken ?? ''],
  );
  if (saved !== 1) throw new VersionConflictError(execution.workflowId, expectedRevision);
  return next;
}

/** ID-only lookup index for automation executions; run data remains canonical. */
export async function indexAutomationWorkflowExecution(taskId: string, workflowId: string): Promise<void> {
  await kvSAdd(`thegame:index:workflow:automation:${taskId}`, workflowId);
}

export async function getAutomationWorkflowExecutionIds(taskId: string): Promise<string[]> {
  return kvSMembers(`thegame:index:workflow:automation:${taskId}`);
}

const automationActionKey = (actionId: string) => `automation:agent-action:${actionId}`;
const automationActionIndex = (agentSlug: string) => `thegame:index:automation-agent-actions:${agentSlug}`;

export async function createOrGetAutomationAgentAction(
  action: AutomationAgentActionV1,
): Promise<{ action: AutomationAgentActionV1; created: boolean }> {
  const key = automationActionKey(action.actionId);
  const result = await kvEval<string>(
    `
      local existing = redis.call('GET', KEYS[1])
      if existing then return '0|' .. existing end
      redis.call('SET', KEYS[1], ARGV[1])
      redis.call('SADD', KEYS[2], ARGV[2])
      return '1|' .. ARGV[1]
    `,
    [key, automationActionIndex(action.agentSlug)],
    [JSON.stringify(action), action.actionId],
  );
  return { action: JSON.parse(result.slice(2)) as AutomationAgentActionV1, created: result.startsWith('1|') };
}

export async function getAutomationAgentAction(actionId: string): Promise<AutomationAgentActionV1 | null> {
  return kvGet<AutomationAgentActionV1>(automationActionKey(actionId));
}

export async function claimNextAutomationAgentAction(
  agentSlug: 'admin' | 'analyst',
  actionId?: string,
  leaseSeconds = 1200,
): Promise<AutomationAgentActionV1 | null> {
  const actionIds = actionId ? [actionId] : await kvSMembers(automationActionIndex(agentSlug));
  const now = getUTCNow();
  const nowIso = now.toISOString();
  const expiresIso = new Date(now.getTime() + leaseSeconds * 1000).toISOString();
  for (const actionId of actionIds) {
    const claimToken = randomUUID();
    const result = await kvEval<unknown | null>(
      `
        local raw = redis.call('GET', KEYS[1])
        if not raw then return nil end
        local item = cjson.decode(raw)
        local claimable = item.status == 'pending' or item.status == 'failed-retryable' or (item.status == 'running' and item.claimExpiresAt and item.claimExpiresAt <= ARGV[1])
        if not claimable then return nil end
        item.status = 'running'
        item.claimToken = ARGV[2]
        item.claimExpiresAt = ARGV[3]
        item.updatedAt = ARGV[1]
        redis.call('SET', KEYS[1], cjson.encode(item))
        return cjson.encode(item)
      `,
      [automationActionKey(actionId)],
      [nowIso, claimToken, expiresIso],
    );
    if (result !== null) return parseLuaJsonResult<AutomationAgentActionV1>(result);
  }
  return null;
}

export async function completeAutomationAgentAction(input: {
  actionId: string;
  claimToken: string;
  status: 'completed' | 'failed-retryable' | 'failed-terminal';
  resultRef?: string;
  errorCode?: string;
}): Promise<AutomationAgentActionV1> {
  const action = await getAutomationAgentAction(input.actionId);
  if (!action) throw new Error('AUTOMATION_AGENT_ACTION_NOT_FOUND');
  if (action.status !== 'running' || action.claimToken !== input.claimToken) {
    throw new Error('AUTOMATION_AGENT_ACTION_CLAIM_INVALID');
  }
  if (input.status === 'completed' && action.capability === 'create-monthly-close-report') {
    const period = `${action.reportInput.year}-${String(action.reportInput.month).padStart(2, '0')}`;
    const expected = action.mode === 'dry-run'
      ? `workspaces/administration-hq/monthly-close-reports/${period}-dry-run.md`
      : `workspaces/administration-hq/monthly-close-reports/${period}.md`;
    if (input.resultRef !== expected) throw new Error('AUTOMATION_AGENT_ACTION_RESULT_REF_INVALID');
  }
  if (input.status === 'completed' && action.capability === 'create-thegame-period-audit-report') {
    const expected = `workspaces/analysis-observatory/thegame-period-audit/${action.reportInput.year}.md`;
    if (input.resultRef !== expected) throw new Error('AUTOMATION_AGENT_ACTION_RESULT_REF_INVALID');
  }
  const updated = {
    ...action,
    status: input.status,
    resultRef: input.resultRef,
    errorCode: input.errorCode,
    claimToken: undefined,
    claimExpiresAt: undefined,
    updatedAt: getUTCNow().toISOString(),
  } as AutomationAgentActionV1;
  await kvSet(automationActionKey(input.actionId), updated);
  return updated;
}

/**
 * Retrieves a Workflow Execution state.
 */
export async function getWorkflowExecution(workflowId: string): Promise<WorkflowExecutionV1 | null> {
  return await kvGet<WorkflowExecutionV1>(`workflow:${workflowId}`);
}
