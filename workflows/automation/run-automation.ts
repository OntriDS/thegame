import { randomUUID } from 'crypto';
import type {
  WorkflowExecutionV1,
  MonthlyCloseProgressV1,
  PeriodAuditProgressV1,
  PeriodAuditProgressV2,
  TheGamePeriodAuditPacketV1,
  TheGamePeriodAuditPacketV2,
} from '@/types/entities';
import { SaleStatus, TaskStatus, TaskType, WorkflowStatus } from '@/types/enums';
import { getTaskById, getTasksForMonth, getSalesForMonth, upsertTask } from '@/data-store/datastore';
import { CollectionService } from '@/workflows/collection.service';
import {
  acquireWorkflowLease,
  createOrGetAutomationAgentAction,
  createOrGetWorkflowExecution,
  getAutomationAgentAction,
  indexAutomationWorkflowExecution,
  saveWorkflowExecution,
} from '@/data-store/workflow-store';
import { getUTCNow } from '@/lib/utils/utc-utils';
import { getRegisteredAutomationForTask } from './automation-registry';
import { collectTheGamePeriodAudit, validateTheGamePeriodAuditInput } from './thegame-period-audit';

export type AutomationRunMode = 'dry-run' | 'execute' | 'read-only';
type MonthlyCloseRunMode = Exclude<AutomationRunMode, 'read-only'>;
type PeriodAuditProgress = PeriodAuditProgressV1 | PeriodAuditProgressV2;
type PeriodAuditPacket = TheGamePeriodAuditPacketV1 | TheGamePeriodAuditPacketV2;

export interface RunAutomationInput {
  taskId: string;
  /** Closed, registration-specific input. */
  input?: unknown;
  /** Legacy monthly-close transport fields; converted at the boundary only. */
  year?: number;
  month?: number;
  mode?: AutomationRunMode;
  /** Optional request idempotency key; retries with the same key reuse the receipt. */
  requestId?: string;
  initiator: 'creator-admin' | 'pixelbrain-m2m' | 'hermes-cron';
}

export interface AutomationRunResult {
  automationTaskId: string;
  automationType: 'close' | 'audit' | 'schedule';
  automationName: string;
  runId: string;
  mode: AutomationRunMode;
  status: 'running' | 'finishing' | 'completed' | 'failed-retryable' | 'failed-terminal';
  core: {
    status: 'running' | 'completed' | 'failed-retryable' | 'failed-terminal';
    tasksEligible?: number;
    salesEligible?: number;
    tasksCollected?: number;
    salesCollected?: number;
    packet?: PeriodAuditPacket;
    errorCode?: string;
  };
  report: {
    actionId?: string;
    agentSlug?: 'admin' | 'analyst';
    capability?: 'create-monthly-close-report' | 'create-thegame-period-audit-report';
    status: 'not-configured' | 'pending' | 'running' | 'completed' | 'failed-retryable' | 'failed-terminal';
    resultRef?: string;
    errorCode?: string;
  };
}

function validatePeriod(year: number, month: number): void {
  if (!Number.isInteger(year) || year < 2000 || year > 9999) throw new Error('AUTOMATION_YEAR_INVALID');
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error('AUTOMATION_MONTH_INVALID');
}

function executionId(taskId: string, year: number, month: number, mode: MonthlyCloseRunMode, requestId?: string): string {
  const period = `${year}-${String(month).padStart(2, '0')}`;
  return mode === 'execute'
    ? `automation:${taskId}:monthly-close:${period}`
    : `automation:${taskId}:monthly-close:dry-run:${period}:${requestId || randomUUID()}`;
}

function baseExecution(taskId: string, year: number, month: number, mode: MonthlyCloseRunMode, requestId?: string): WorkflowExecutionV1 {
  const now = getUTCNow().toISOString();
  return {
    workflowId: executionId(taskId, year, month, mode, requestId),
    workflowType: 'monthly-close',
    rootCommandId: `automation-run:${taskId}:${year}-${String(month).padStart(2, '0')}:${mode}:${requestId || 'new'}`,
    state: WorkflowStatus.PENDING,
    revision: 0,
    currentStep: 'pending',
    input: { workflowType: 'monthly-close', year, month, mode },
    completedSteps: [],
    stepOutcomes: {},
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };
}

async function dryRun(execution: WorkflowExecutionV1): Promise<WorkflowExecutionV1> {
  const input = execution.input;
  if (!input || input.workflowType !== 'monthly-close') throw new Error('MONTHLY_CLOSE_INPUT_REQUIRED');

  const [tasks, sales] = await Promise.all([
    getTasksForMonth(input.year, input.month),
    getSalesForMonth(input.year, input.month),
  ]);
  const progress: MonthlyCloseProgressV1 = {
    workflowType: 'monthly-close',
    year: input.year,
    month: input.month,
    mode: 'dry-run',
    tasksEligible: tasks.filter((task) => task.status === TaskStatus.DONE).length,
    salesEligible: sales.filter((sale) => sale.status === SaleStatus.CHARGED).length,
    taskCursor: 0,
    saleCursor: 0,
    tasksCollected: 0,
    salesCollected: 0,
    tasksFailed: 0,
    salesFailed: 0,
    grantsVested: 0,
    completedAt: getUTCNow().toISOString(),
  };
  return {
    ...execution,
    state: WorkflowStatus.COMPLETED,
    currentStep: 'dry-run-completed',
    progress,
    completedSteps: ['dry-run'],
    stepOutcomes: { 'dry-run': { step: 'dry-run', state: 'completed', completedAt: progress.completedAt } },
    updatedAt: getUTCNow().toISOString(),
  };
}

async function executeMonthlyClose(execution: WorkflowExecutionV1): Promise<WorkflowExecutionV1> {
  const input = execution.input;
  if (!input || input.workflowType !== 'monthly-close') throw new Error('MONTHLY_CLOSE_INPUT_REQUIRED');

  const [tasks, sales] = await Promise.all([
    getTasksForMonth(input.year, input.month),
    getSalesForMonth(input.year, input.month),
  ]);
  const progress: MonthlyCloseProgressV1 = {
    workflowType: 'monthly-close',
    year: input.year,
    month: input.month,
    mode: 'execute',
    tasksEligible: tasks.filter((task) => task.status === TaskStatus.DONE).length,
    salesEligible: sales.filter((sale) => sale.status === SaleStatus.CHARGED).length,
    taskCursor: 0,
    saleCursor: 0,
    tasksCollected: 0,
    salesCollected: 0,
    tasksFailed: 0,
    salesFailed: 0,
    grantsVested: 0,
  };
  execution.progress = progress;
  execution.currentStep = 'collecting';
  await saveWorkflowExecution(execution);

  // This is the pilot's single deterministic core. Keep the existing
  // collection workflows authoritative; this runner only supplies the
  // automation boundary, receipt, and bounded result.
  const taskResult = await CollectionService.collectTasks(input.month, input.year);
  progress.tasksCollected = taskResult.collectedCount;
  progress.taskCursor = progress.tasksEligible ?? 0;

  const saleResult = await CollectionService.collectSales(input.month, input.year);
  progress.salesCollected = saleResult.collectedCount;
  progress.saleCursor = progress.salesEligible ?? 0;
  progress.completedAt = getUTCNow().toISOString();
  execution.progress = progress;
  execution.state = WorkflowStatus.COMPLETED;
  execution.currentStep = 'core-completed';
  execution.completedSteps = ['monthly-close-core'];
  execution.stepOutcomes = {
    'monthly-close-core': {
      step: 'monthly-close-core',
      state: 'completed',
      completedAt: progress.completedAt,
    },
  };
  execution.updatedAt = getUTCNow().toISOString();
  await saveWorkflowExecution(execution);
  return execution;
}

async function ensureReportAction(taskId: string, execution: WorkflowExecutionV1, mode: MonthlyCloseRunMode) {
  const progress = execution.progress as MonthlyCloseProgressV1 | undefined;
  if (!progress || execution.state !== WorkflowStatus.COMPLETED) return null;
  const actionId = `automation:${execution.workflowId}:admin:create-monthly-close-report`;
  const created = await createOrGetAutomationAgentAction({
    actionId,
    runId: execution.workflowId,
    automationTaskId: taskId,
    agentSlug: 'admin',
    capability: 'create-monthly-close-report',
    mode,
    reportInput: {
      year: progress.year,
      month: progress.month,
      coreStatus: 'completed',
      tasksEligible: progress.tasksEligible ?? 0,
      salesEligible: progress.salesEligible ?? 0,
      tasksCollected: progress.tasksCollected,
      salesCollected: progress.salesCollected,
    },
    status: 'pending',
    createdAt: getUTCNow().toISOString(),
    updatedAt: getUTCNow().toISOString(),
  });
  return created.action;
}

async function toResult(taskId: string, execution: WorkflowExecutionV1, mode: MonthlyCloseRunMode): Promise<AutomationRunResult> {
  const progress = execution.progress as MonthlyCloseProgressV1 | undefined;
  const reportAction = await getAutomationAgentAction(`automation:${execution.workflowId}:admin:create-monthly-close-report`);
  const coreStatus: AutomationRunResult['core']['status'] = execution.state === WorkflowStatus.COMPLETED
    ? 'completed'
    : execution.state === WorkflowStatus.FAILED_RETRYABLE
      ? 'failed-retryable'
      : execution.state === WorkflowStatus.FAILED_TERMINAL
        ? 'failed-terminal'
        : 'running';
  const status: AutomationRunResult['status'] = execution.state !== WorkflowStatus.COMPLETED
    ? execution.state === WorkflowStatus.FAILED_RETRYABLE
      ? 'failed-retryable'
      : execution.state === WorkflowStatus.FAILED_TERMINAL
        ? 'failed-terminal'
        : 'running'
    : !reportAction
      ? 'completed'
      : reportAction.status === 'completed'
        ? 'completed'
        : reportAction.status === 'failed-retryable'
          ? 'failed-retryable'
          : reportAction.status === 'failed-terminal'
            ? 'failed-terminal'
            : 'finishing';
  return {
    automationTaskId: taskId,
    automationType: 'close',
    automationName: 'monthly-close',
    runId: execution.workflowId,
    mode,
    status,
    core: {
      status: coreStatus,
      tasksEligible: progress?.tasksEligible,
      salesEligible: progress?.salesEligible,
      tasksCollected: progress?.tasksCollected,
      salesCollected: progress?.salesCollected,
      errorCode: execution.lastErrorCode,
    },
    report: reportAction
      ? {
          actionId: reportAction.actionId,
          agentSlug: reportAction.agentSlug,
          capability: reportAction.capability,
          status: reportAction.status,
          resultRef: reportAction.resultRef,
          errorCode: reportAction.errorCode,
        }
      : { status: 'not-configured' },
  };
}

function monthlyCloseInput(input: RunAutomationInput): { year: number; month: number; mode: 'dry-run' | 'execute' } {
  const raw = input.input && typeof input.input === 'object' && !Array.isArray(input.input)
    ? input.input as Record<string, unknown>
    : input as unknown as Record<string, unknown>;
  const year = Number(raw.year);
  const month = Number(raw.month);
  const mode = raw.mode;
  validatePeriod(year, month);
  if (mode !== 'dry-run' && mode !== 'execute') throw new Error('MONTHLY_CLOSE_MODE_INVALID');
  return { year, month, mode };
}

function auditExecutionId(taskId: string, year: number, months: number[], requestId?: string): string {
  return `automation:${taskId}:thegame-entities-period-audit:${year}:${months.join('-')}:${requestId || randomUUID()}`;
}

function baseAuditExecution(taskId: string, year: number, months: number[], requestId?: string): WorkflowExecutionV1 {
  const now = getUTCNow().toISOString();
  return {
    workflowId: auditExecutionId(taskId, year, months, requestId),
    workflowType: 'thegame-entities-period-audit',
    rootCommandId: `automation-run:${taskId}:thegame-entities-period-audit:${year}:${months.join('-')}:${requestId || 'new'}`,
    state: WorkflowStatus.PENDING,
    revision: 0,
    currentStep: 'pending',
    input: { workflowType: 'thegame-entities-period-audit', year, months },
    completedSteps: [],
    stepOutcomes: {},
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };
}

async function ensurePeriodAuditReportAction(taskId: string, execution: WorkflowExecutionV1) {
  const progress = execution.progress as PeriodAuditProgress | undefined;
  if (!progress || execution.state !== WorkflowStatus.COMPLETED) return null;
  const actionId = `automation:${execution.workflowId}:analyst:create-thegame-period-audit-report`;
  const { workflowType: _workflowType, completedAt: _completedAt, ...packet } = progress;
  const created = await createOrGetAutomationAgentAction({
    actionId,
    runId: execution.workflowId,
    automationTaskId: taskId,
    agentSlug: 'analyst',
    capability: 'create-thegame-period-audit-report',
    mode: 'read-only',
    reportInput: packet,
    status: 'pending',
    createdAt: getUTCNow().toISOString(),
    updatedAt: getUTCNow().toISOString(),
  });
  return created.action;
}

async function toPeriodAuditResult(taskId: string, execution: WorkflowExecutionV1): Promise<AutomationRunResult> {
  const progress = execution.progress as PeriodAuditProgress | undefined;
  const reportAction = await getAutomationAgentAction(`automation:${execution.workflowId}:analyst:create-thegame-period-audit-report`);
  const coreStatus: AutomationRunResult['core']['status'] = execution.state === WorkflowStatus.COMPLETED
    ? 'completed'
    : execution.state === WorkflowStatus.FAILED_RETRYABLE
      ? 'failed-retryable'
      : execution.state === WorkflowStatus.FAILED_TERMINAL
        ? 'failed-terminal'
        : 'running';
  const status: AutomationRunResult['status'] = execution.state !== WorkflowStatus.COMPLETED
    ? coreStatus
    : !reportAction || reportAction.status === 'completed'
      ? 'completed'
      : reportAction.status === 'failed-retryable'
        ? 'failed-retryable'
        : reportAction.status === 'failed-terminal'
          ? 'failed-terminal'
          : 'finishing';
  const { workflowType: _workflowType, completedAt: _completedAt, ...packet } = progress || {} as PeriodAuditProgress;
  return {
    automationTaskId: taskId,
    automationType: 'audit',
    automationName: 'thegame-entities-period-audit',
    runId: execution.workflowId,
    mode: 'read-only',
    status,
    core: {
      status: coreStatus,
      ...(progress ? { packet: packet as PeriodAuditPacket } : {}),
      errorCode: execution.lastErrorCode,
    },
    report: reportAction
      ? {
          actionId: reportAction.actionId,
          agentSlug: reportAction.agentSlug,
          capability: reportAction.capability,
          status: reportAction.status,
          resultRef: reportAction.resultRef,
          errorCode: reportAction.errorCode,
        }
      : { status: 'not-configured' },
  };
}

async function runPeriodAuditAutomation(taskId: string, input: unknown, requestId?: string): Promise<AutomationRunResult> {
  const auditInput = validateTheGamePeriodAuditInput(input);
  const initial = baseAuditExecution(taskId, auditInput.year, auditInput.months, requestId);
  const created = await createOrGetWorkflowExecution(initial);
  await indexAutomationWorkflowExecution(taskId, created.execution.workflowId);
  if (!created.created) {
    if (created.execution.state === WorkflowStatus.COMPLETED) await ensurePeriodAuditReportAction(taskId, created.execution);
    return toPeriodAuditResult(taskId, created.execution);
  }
  try {
    const packet = await collectTheGamePeriodAudit(auditInput);
    const completed: WorkflowExecutionV1 = {
      ...created.execution,
      state: WorkflowStatus.COMPLETED,
      currentStep: 'core-completed',
      progress: {
        ...packet,
        workflowType: 'thegame-entities-period-audit',
        completedAt: getUTCNow().toISOString(),
      },
      completedSteps: ['thegame-period-audit-core'],
      stepOutcomes: {
        'thegame-period-audit-core': {
          step: 'thegame-period-audit-core',
          state: 'completed',
          completedAt: getUTCNow().toISOString(),
        },
      },
      updatedAt: getUTCNow().toISOString(),
    };
    await saveWorkflowExecution(completed);
    await ensurePeriodAuditReportAction(taskId, completed);
    return toPeriodAuditResult(taskId, completed);
  } catch (error) {
    const failed: WorkflowExecutionV1 = {
      ...created.execution,
      state: WorkflowStatus.FAILED_RETRYABLE,
      currentStep: 'core-failed',
      lastErrorCode: error instanceof Error ? error.message : 'PERIOD_AUDIT_FAILED',
      updatedAt: getUTCNow().toISOString(),
    };
    await saveWorkflowExecution(failed);
    return toPeriodAuditResult(taskId, failed);
  }
}

export async function runAutomation(input: RunAutomationInput): Promise<AutomationRunResult> {
  const task = await getTaskById(input.taskId);
  if (!task) throw new Error('AUTOMATION_TASK_NOT_FOUND');
  if (task.type !== TaskType.AUTOMATION) throw new Error('TASK_IS_NOT_AUTOMATION');

  const registration = getRegisteredAutomationForTask(task);
  if (!registration || !registration.validateTask(task)) throw new Error('AUTOMATION_TYPE_NOT_REGISTERED');
  const auditInput = registration.automationName === 'thegame-entities-period-audit'
    ? validateTheGamePeriodAuditInput(input.input)
    : null;
  const monthlyInput = registration.automationName === 'monthly-close'
    ? monthlyCloseInput(input)
    : null;
  if (!auditInput && !monthlyInput) throw new Error('AUTOMATION_RUNNER_NOT_REGISTERED');

  // The Run command is the activation boundary. Automation Tasks may be
  // created, paused, or left in a previous terminal state; the process that
  // actually runs one activates it through the canonical Task workflow before
  // starting the period execution. This keeps scheduling and agent execution
  // from requiring a separate manual status change.
  if (task.status !== TaskStatus.IN_PROGRESS) {
    await upsertTask({
      ...task,
      status: TaskStatus.IN_PROGRESS,
      updatedAt: getUTCNow(),
      lifecycle: {
        ...(task.lifecycle || {}),
        doneAt: null,
        collectedAt: null,
      },
    });
  }

  if (registration.automationName === 'thegame-entities-period-audit') {
    return runPeriodAuditAutomation(input.taskId, auditInput!, input.requestId);
  }

  const initial = baseExecution(input.taskId, monthlyInput!.year, monthlyInput!.month, monthlyInput!.mode, input.requestId);
  const created = await createOrGetWorkflowExecution(initial);
  await indexAutomationWorkflowExecution(input.taskId, created.execution.workflowId);

  if (!created.created) {
    if (created.execution.state === WorkflowStatus.COMPLETED) {
      await ensureReportAction(input.taskId, created.execution, monthlyInput!.mode);
    }
    return toResult(input.taskId, created.execution, monthlyInput!.mode);
  }

  if (monthlyInput!.mode === 'dry-run') {
    const completed = await dryRun(created.execution);
    await saveWorkflowExecution(completed);
    await ensureReportAction(input.taskId, completed, monthlyInput!.mode);
    return toResult(input.taskId, completed, monthlyInput!.mode);
  }

  const ownerId = `${input.initiator}:${input.taskId}`;
  const leased = await acquireWorkflowLease(created.execution.workflowId, ownerId);
  if (!leased) throw new Error('AUTOMATION_RUN_IN_PROGRESS');

  try {
    const completed = await executeMonthlyClose(leased);
    await ensureReportAction(input.taskId, completed, monthlyInput!.mode);
    return toResult(input.taskId, completed, monthlyInput!.mode);
  } catch (error: any) {
    leased.state = WorkflowStatus.FAILED_RETRYABLE;
    leased.currentStep = 'core-failed';
    leased.lastErrorCode = error instanceof Error ? error.message : 'MONTHLY_CLOSE_FAILED';
    leased.updatedAt = getUTCNow().toISOString();
    await saveWorkflowExecution(leased);
    return toResult(input.taskId, leased, monthlyInput!.mode);
  }
}
