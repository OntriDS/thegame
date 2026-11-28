import { randomUUID } from 'crypto';
import type {
  WorkflowExecutionV1,
  MonthlyCloseProgressV1,
  PeriodAuditProgressV1,
  TheGamePeriodAuditPacketV1,
  AkilesWeeklySchedulePacketV1,
  AkilesWeeklyScheduleCollectionProgressV1,
  AkilesWeeklyScheduleApplyProgressV1,
  WeeklyScheduleApplyReceiptV1,
  WeeklyScheduleChangeV1,
  Task,
} from '@/types/entities';
import { SaleStatus, TaskStatus, TaskType, WorkflowStatus } from '@/types/enums';
import { getTaskById, getTasksForMonth, getSalesForMonth, upsertTask } from '@/data-store/datastore';
import { CollectionService } from '@/workflows/collection.service';
import {
  acquireWorkflowLease,
  createOrGetAutomationAgentAction,
  createOrGetWorkflowExecution,
  getAutomationAgentAction,
  getWorkflowExecution,
  indexAutomationWorkflowExecution,
  saveWorkflowExecution,
} from '@/data-store/workflow-store';
import { getUTCNow } from '@/lib/utils/utc-utils';
import { getRegisteredAutomationForTask } from './automation-registry';
import { collectTheGamePeriodAudit, validateTheGamePeriodAuditInput } from './thegame-period-audit';
import {
  applyAkilesWeeklySchedule,
  collectAkilesWeeklySchedule,
} from './akiles-weekly-schedule';

export type AutomationRunMode = 'dry-run' | 'execute' | 'read-only';
type MonthlyCloseRunMode = Exclude<AutomationRunMode, 'read-only'>;
type PeriodAuditProgress = PeriodAuditProgressV1;
type PeriodAuditPacket = TheGamePeriodAuditPacketV1;

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
    schedulePacket?: AkilesWeeklySchedulePacketV1;
    scheduleReceipt?: WeeklyScheduleApplyReceiptV1;
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

type WeeklyScheduleRunInput =
  | { operation: 'collect'; selectedDate: string }
  | { operation: 'apply'; sourceRunId: string; changes: WeeklyScheduleChangeV1[] };

function weeklyScheduleInput(input: RunAutomationInput): WeeklyScheduleRunInput {
  if (!input.input || typeof input.input !== 'object' || Array.isArray(input.input)) {
    throw new Error('WEEKLY_SCHEDULE_INPUT_REQUIRED');
  }
  const raw = input.input as Record<string, unknown>;
  if (raw.operation === 'apply') {
    if (typeof raw.sourceRunId !== 'string' || !raw.sourceRunId.trim() || !Array.isArray(raw.changes)) {
      throw new Error('WEEKLY_SCHEDULE_APPLY_INPUT_INVALID');
    }
    return { operation: 'apply', sourceRunId: raw.sourceRunId, changes: raw.changes as WeeklyScheduleChangeV1[] };
  }
  if (raw.operation !== undefined && raw.operation !== 'collect') {
    throw new Error('WEEKLY_SCHEDULE_OPERATION_INVALID');
  }
  const selectedDate = raw.selectedDate;
  if (typeof selectedDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
    throw new Error('WEEKLY_SCHEDULE_DATE_INVALID');
  }
  return { operation: 'collect', selectedDate };
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

function weeklyScheduleExecutionId(taskId: string, input: WeeklyScheduleRunInput, requestId?: string): string {
  const runKey = input.operation === 'collect'
    ? `collect:${input.selectedDate}`
    : `apply:${input.sourceRunId}`;
  return `automation:${taskId}:akiles-weekly-schedule:${runKey}:${requestId || randomUUID()}`;
}

function baseWeeklyScheduleExecution(
  taskId: string,
  input: WeeklyScheduleRunInput,
  ownerId: string,
  requestId?: string,
): WorkflowExecutionV1 {
  const now = getUTCNow().toISOString();
  return {
    workflowId: weeklyScheduleExecutionId(taskId, input, requestId),
    workflowType: 'akiles-weekly-schedule',
    rootCommandId: `automation-run:${taskId}:akiles-weekly-schedule:${input.operation}:${requestId || 'new'}`,
    state: WorkflowStatus.PENDING,
    revision: 0,
    currentStep: 'pending',
    input: input.operation === 'collect'
      ? { workflowType: 'akiles-weekly-schedule', operation: 'collect', selectedDate: input.selectedDate, ownerId }
      : { workflowType: 'akiles-weekly-schedule', operation: 'apply', sourceRunId: input.sourceRunId, changes: input.changes },
    completedSteps: [],
    stepOutcomes: {},
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };
}

async function toWeeklyScheduleResult(taskId: string, execution: WorkflowExecutionV1): Promise<AutomationRunResult> {
  const progress = execution.progress as AkilesWeeklyScheduleCollectionProgressV1 | AkilesWeeklyScheduleApplyProgressV1 | undefined;
  const coreStatus: AutomationRunResult['core']['status'] = execution.state === WorkflowStatus.COMPLETED
    ? 'completed'
    : execution.state === WorkflowStatus.FAILED_RETRYABLE
      ? 'failed-retryable'
      : execution.state === WorkflowStatus.FAILED_TERMINAL
        ? 'failed-terminal'
        : 'running';
  return {
    automationTaskId: taskId,
    automationType: 'schedule',
    automationName: 'akiles-weekly-schedule',
    runId: execution.workflowId,
    mode: 'read-only',
    status: coreStatus,
    core: {
      status: coreStatus,
      ...(progress && progress.operation === 'collect' ? {
        schedulePacket: {
          schemaVersion: progress.schemaVersion,
          selectedDate: progress.selectedDate,
          weekStartDate: progress.weekStartDate,
          weekEndDate: progress.weekEndDate,
          generatedAt: progress.generatedAt,
          owner: progress.owner,
          includedStatuses: progress.includedStatuses,
          excludedCountsByStatus: progress.excludedCountsByStatus,
          tasks: progress.tasks,
        },
      } : {}),
      ...(progress?.operation === 'apply' ? { scheduleReceipt: progress.receipt } : {}),
      errorCode: execution.lastErrorCode,
    },
    report: { status: 'not-configured' },
  };
}

async function runAkilesWeeklyScheduleAutomation(
  taskId: string,
  task: Task,
  input: WeeklyScheduleRunInput,
  requestId?: string,
): Promise<AutomationRunResult> {
  if (task.ownerIds?.length !== 1) throw new Error('WEEKLY_SCHEDULE_REQUIRES_ONE_OWNER');
  const ownerId = task.ownerIds[0];
  const initial = baseWeeklyScheduleExecution(taskId, input, ownerId, requestId);
  const created = await createOrGetWorkflowExecution(initial);
  await indexAutomationWorkflowExecution(taskId, created.execution.workflowId);
  if (!created.created) return toWeeklyScheduleResult(taskId, created.execution);

  try {
    let progress: AkilesWeeklyScheduleCollectionProgressV1 | AkilesWeeklyScheduleApplyProgressV1;
    let currentStep: string;
    let stepName: string;
    if (input.operation === 'collect') {
      const packet = await collectAkilesWeeklySchedule(task, { selectedDate: input.selectedDate });
      progress = {
        ...packet,
        workflowType: 'akiles-weekly-schedule',
        operation: 'collect',
      };
      currentStep = 'schedule-context-collected';
      stepName = 'akiles-weekly-schedule-context';
    } else {
      if (!input.sourceRunId.startsWith(`automation:${taskId}:akiles-weekly-schedule:collect:`)) {
        throw new Error('WEEKLY_SCHEDULE_SOURCE_RUN_OUT_OF_SCOPE');
      }
      const sourceRun = await getWorkflowExecution(input.sourceRunId);
      const sourceProgress = sourceRun?.progress as AkilesWeeklyScheduleCollectionProgressV1 | undefined;
      if (!sourceRun
        || sourceRun.workflowType !== 'akiles-weekly-schedule'
        || sourceRun.state !== WorkflowStatus.COMPLETED
        || sourceProgress?.workflowType !== 'akiles-weekly-schedule'
        || sourceProgress.operation !== 'collect'
        || sourceProgress.owner.id !== ownerId) {
        throw new Error('WEEKLY_SCHEDULE_SOURCE_RUN_INVALID');
      }
      const receipt = await applyAkilesWeeklySchedule(input.sourceRunId, sourceProgress, input.changes);
      progress = {
        workflowType: 'akiles-weekly-schedule',
        operation: 'apply',
        receipt,
        completedAt: getUTCNow().toISOString(),
      };
      currentStep = receipt.status === 'completed' ? 'schedule-applied' : 'schedule-partial';
      stepName = 'akiles-weekly-schedule-apply';
    }
    const completedAt = getUTCNow().toISOString();
    const completed: WorkflowExecutionV1 = {
      ...created.execution,
      state: WorkflowStatus.COMPLETED,
      currentStep,
      progress: { ...progress, completedAt },
      completedSteps: [stepName],
      stepOutcomes: {
        [stepName]: {
          step: stepName,
          state: 'completed',
          completedAt,
        },
      },
      updatedAt: completedAt,
    };
    await saveWorkflowExecution(completed);
    return toWeeklyScheduleResult(taskId, completed);
  } catch (error) {
    const failed: WorkflowExecutionV1 = {
      ...created.execution,
      state: WorkflowStatus.FAILED_TERMINAL,
      currentStep: input.operation === 'collect' ? 'schedule-context-failed' : 'schedule-apply-failed',
      lastErrorCode: error instanceof Error ? error.message : 'WEEKLY_SCHEDULE_RUN_FAILED',
      updatedAt: getUTCNow().toISOString(),
    };
    await saveWorkflowExecution(failed);
    return toWeeklyScheduleResult(taskId, failed);
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
  const scheduleInput = registration.automationName === 'akiles-weekly-schedule'
    ? weeklyScheduleInput(input)
    : null;
  if (!auditInput && !monthlyInput && !scheduleInput) throw new Error('AUTOMATION_RUNNER_NOT_REGISTERED');

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
  if (registration.automationName === 'akiles-weekly-schedule') {
    return runAkilesWeeklyScheduleAutomation(input.taskId, task, scheduleInput!, input.requestId);
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
