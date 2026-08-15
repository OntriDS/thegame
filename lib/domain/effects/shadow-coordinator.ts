// lib/domain/effects/shadow-coordinator.ts
// Increment 4: Shadow mode workflow coordinator
//
// The shadow coordinator observes workflow execution without performing business effects.
// It records inferred workflow state for validation and telemetry.
//
// Shadow mode rules:
// - Record what WOULD happen (steps, effects, outcomes)
// - Do NOT execute business effects (no createFinancialRecord, no stagePoints, etc.)
// - Do NOT create duplicate effects
// - Persist workflow state for observability
//
// This enables safe validation before cutover to the real coordinator.

import { kvGet, kvSet } from '@/lib/utils/kv';
import type { WorkflowExecutionV1, StepOutcomeV1 } from '@/types/entities';
import { WorkflowStatus } from '@/types/enums';
import { v4 as uuid } from 'uuid';

const WORKFLOW_PREFIX = 'thegame:workflow:';
const SHADOW_LOG_PREFIX = 'thegame:shadow-log:';

// ─── Shadow Execution Record ────────────────────────────────────────────────

export interface ShadowExecutionLog {
  workflowId: string;
  workflowType: string;
  rootCommandId: string;
  observedAt: string;
  inferredSteps: ShadowStepObservation[];
  inferredEffects: ShadowEffectObservation[];
  wouldCreateEntities: string[];
  wouldModifyEntities: string[];
  notes: string[];
}

export interface ShadowStepObservation {
  step: string;
  wouldExecute: boolean;
  reason: string;
  effectClaimKey?: string;
}

export interface ShadowEffectObservation {
  effectKey: string;
  wouldClaim: boolean;
  reason: string;
}

// ─── Shadow Coordinator ─────────────────────────────────────────────────────

/**
 * Execute a workflow in shadow mode.
 *
 * This records what the workflow WOULD do without actually doing it.
 * Used for validation before cutover to the real coordinator.
 */
export async function executeWorkflowShadow(execution: WorkflowExecutionV1): Promise<ShadowExecutionLog> {
  const log: ShadowExecutionLog = {
    workflowId: execution.workflowId,
    workflowType: execution.workflowType,
    rootCommandId: execution.rootCommandId,
    observedAt: new Date().toISOString(),
    inferredSteps: [],
    inferredEffects: [],
    wouldCreateEntities: [],
    wouldModifyEntities: [],
    notes: [],
  };

  log.notes.push('Shadow mode: no business effects executed');

  // Route to workflow-specific shadow handler
  switch (execution.workflowType) {
    case 'task-completion':
      await shadowTaskCompletion(execution, log);
      break;
    case 'sale-settlement':
      await shadowSaleSettlement(execution, log);
      break;
    case 'monthly-close':
      await shadowMonthlyClose(execution, log);
      break;
    default:
      log.notes.push(`Unknown workflow type: ${execution.workflowType}`);
  }

  // Persist shadow log for observability
  await kvSet(`${SHADOW_LOG_PREFIX}${execution.workflowId}`, log);

  // Persist workflow state (shadow mode still tracks state)
  execution.state = WorkflowStatus.COMPLETED;
  execution.updatedAt = new Date().toISOString();
  await kvSet(`${WORKFLOW_PREFIX}${execution.workflowId}`, execution);

  return log;
}

// ─── Workflow-Specific Shadow Handlers ──────────────────────────────────────

async function shadowTaskCompletion(execution: WorkflowExecutionV1, log: ShadowExecutionLog): Promise<void> {
  const taskId = execution.rootCommandId.replace('cmd-done-', '');
  log.notes.push(`Task completion workflow for task ${taskId}`);

  // Step 1: Stage points
  log.inferredSteps.push({
    step: 'stagePoints',
    wouldExecute: true,
    reason: 'Task has rewardIntent.points',
    effectClaimKey: `task:${taskId}:pointsStaged`,
  });
  log.inferredEffects.push({
    effectKey: `task:${taskId}:pointsStaged`,
    wouldClaim: true,
    reason: 'Stage points for player on task completion',
  });
  log.wouldModifyEntities.push(`player (pending points)`);

  // Step 2: Create financial record
  log.inferredSteps.push({
    step: 'createFinancialRecord',
    wouldExecute: true,
    reason: 'Task has cost or revenue',
    effectClaimKey: `task:${taskId}:financialCreated`,
  });
  log.inferredEffects.push({
    effectKey: `task:${taskId}:financialCreated`,
    wouldClaim: true,
    reason: 'Create FinancialRecord from task DNA',
  });
  log.wouldCreateEntities.push(`financial:finrec-${taskId}`);

  // Step 3: Create item
  log.inferredSteps.push({
    step: 'createItem',
    wouldExecute: true,
    reason: 'Task has productionPlan with createsNewItem=true',
    effectClaimKey: `task:${taskId}:itemCreated`,
  });
  log.inferredEffects.push({
    effectKey: `task:${taskId}:itemCreated`,
    wouldClaim: true,
    reason: 'Create Item from task production plan',
  });
  log.wouldCreateEntities.push(`item (new)`);
}

async function shadowSaleSettlement(execution: WorkflowExecutionV1, log: ShadowExecutionLog): Promise<void> {
  const saleId = execution.rootCommandId.replace('cmd-charge-', '');
  log.notes.push(`Sale settlement workflow for sale ${saleId}`);

  // Step 1: Create/update financial record
  log.inferredSteps.push({
    step: 'createFinancialRecord',
    wouldExecute: true,
    reason: 'Sale has revenue',
    effectClaimKey: `sale:${saleId}:financialCreated`,
  });
  log.inferredEffects.push({
    effectKey: `sale:${saleId}:financialCreated`,
    wouldClaim: true,
    reason: 'Create FinancialRecord from sale',
  });
  log.wouldCreateEntities.push(`financial:finrec-${saleId}`);

  // Step 2: Create service task (if applicable)
  log.inferredSteps.push({
    step: 'createServiceTask',
    wouldExecute: true,
    reason: 'Sale has service lines with createTask=true',
    effectClaimKey: `sale:${saleId}:taskCreated`,
  });
  log.inferredEffects.push({
    effectKey: `sale:${saleId}:taskCreated`,
    wouldClaim: true,
    reason: 'Create Task from sale service line',
  });
  log.wouldCreateEntities.push(`task (new)`);

  // Step 3: Stage points
  log.inferredSteps.push({
    step: 'stagePoints',
    wouldExecute: true,
    reason: 'Sale has rewardIntent.points',
    effectClaimKey: `sale:${saleId}:pointsStaged`,
  });
  log.inferredEffects.push({
    effectKey: `sale:${saleId}:pointsStaged`,
    wouldClaim: true,
    reason: 'Stage points for player on sale charge',
  });
  log.wouldModifyEntities.push(`player (pending points)`);
}

async function shadowMonthlyClose(execution: WorkflowExecutionV1, log: ShadowExecutionLog): Promise<void> {
  log.notes.push('Monthly close workflow');
  log.notes.push('Would page through indexed eligible sources by cursor');
  log.notes.push('Would issue idempotent collect commands for DONE Tasks, CHARGED Sales, DONE FinancialRecords');
  log.notes.push('Would vest matching Task/Sale grants');
  log.wouldModifyEntities.push('multiple tasks (status → COLLECTED)');
  log.wouldModifyEntities.push('multiple sales (status → COLLECTED)');
  log.wouldModifyEntities.push('player (vest points)');
}

// ─── Shadow Log Query ───────────────────────────────────────────────────────

/**
 * Get the shadow execution log for a workflow.
 */
export async function getShadowLog(workflowId: string): Promise<ShadowExecutionLog | null> {
  return await kvGet<ShadowExecutionLog>(`${SHADOW_LOG_PREFIX}${workflowId}`);
}
