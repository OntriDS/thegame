import { randomUUID } from 'crypto';
import type { WorkflowExecutionV1, MonthlyCloseProgressV1 } from '@/types/entities';
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
import { getRegisteredAutomation } from './automation-registry';

export type AutomationRunMode = 'dry-run' | 'execute';

export interface RunAutomationInput {
  taskId: string;
  year: number;
  month: number;
  mode: AutomationRunMode;
  /** Optional request idempotency key; retries with the same key reuse the receipt. */
  requestId?: string;
  initiator: 'creator-admin' | 'pixelbrain-m2m' | 'hermes-cron';
}

export interface AutomationRunResult {
  automationTaskId: string;
  automationType: 'monthly-close';
  runId: string;
  mode: AutomationRunMode;
  status: 'running' | 'finishing' | 'completed' | 'failed-retryable' | 'failed-terminal';
  core: {
    status: 'running' | 'completed' | 'failed-retryable' | 'failed-terminal';
    tasksEligible?: number;
    salesEligible?: number;
    tasksCollected?: number;
    salesCollected?: number;
    errorCode?: string;
  };
  report: {
    actionId?: string;
    agentSlug?: 'admin';
    capability?: 'create-monthly-close-report';
    status: 'not-configured' | 'pending' | 'running' | 'completed' | 'failed-retryable' | 'failed-terminal';
    resultRef?: string;
    errorCode?: string;
  };
}

function validatePeriod(year: number, month: number): void {
  if (!Number.isInteger(year) || year < 2000 || year > 9999) throw new Error('AUTOMATION_YEAR_INVALID');
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error('AUTOMATION_MONTH_INVALID');
}

function executionId(taskId: string, year: number, month: number, mode: AutomationRunMode, requestId?: string): string {
  const period = `${year}-${String(month).padStart(2, '0')}`;
  return mode === 'execute'
    ? `automation:${taskId}:monthly-close:${period}`
    : `automation:${taskId}:monthly-close:dry-run:${period}:${requestId || randomUUID()}`;
}

function baseExecution(taskId: string, year: number, month: number, mode: AutomationRunMode, requestId?: string): WorkflowExecutionV1 {
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

async function ensureReportAction(taskId: string, execution: WorkflowExecutionV1, mode: AutomationRunMode) {
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

async function toResult(taskId: string, execution: WorkflowExecutionV1, mode: AutomationRunMode): Promise<AutomationRunResult> {
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
    automationType: 'monthly-close',
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

export async function runAutomation(input: RunAutomationInput): Promise<AutomationRunResult> {
  validatePeriod(input.year, input.month);
  const task = await getTaskById(input.taskId);
  if (!task) throw new Error('AUTOMATION_TASK_NOT_FOUND');
  if (task.type !== TaskType.AUTOMATION) throw new Error('TASK_IS_NOT_AUTOMATION');

  const automationType = task.context?.automation?.automationType;
  const registration = automationType ? getRegisteredAutomation(automationType) : null;
  if (!registration || !registration.validateTask(task)) throw new Error('AUTOMATION_TYPE_NOT_REGISTERED');

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

  const initial = baseExecution(input.taskId, input.year, input.month, input.mode, input.requestId);
  const created = await createOrGetWorkflowExecution(initial);
  await indexAutomationWorkflowExecution(input.taskId, created.execution.workflowId);

  if (!created.created) {
    if (created.execution.state === WorkflowStatus.COMPLETED) {
      await ensureReportAction(input.taskId, created.execution, input.mode);
    }
    return toResult(input.taskId, created.execution, input.mode);
  }

  if (input.mode === 'dry-run') {
    const completed = await dryRun(created.execution);
    await saveWorkflowExecution(completed);
    await ensureReportAction(input.taskId, completed, input.mode);
    return toResult(input.taskId, completed, input.mode);
  }

  const ownerId = `${input.initiator}:${input.taskId}`;
  const leased = await acquireWorkflowLease(created.execution.workflowId, ownerId);
  if (!leased) throw new Error('AUTOMATION_RUN_IN_PROGRESS');

  try {
    const completed = await executeMonthlyClose(leased);
    await ensureReportAction(input.taskId, completed, input.mode);
    return toResult(input.taskId, completed, input.mode);
  } catch (error: any) {
    leased.state = WorkflowStatus.FAILED_RETRYABLE;
    leased.currentStep = 'core-failed';
    leased.lastErrorCode = error instanceof Error ? error.message : 'MONTHLY_CLOSE_FAILED';
    leased.updatedAt = getUTCNow().toISOString();
    await saveWorkflowExecution(leased);
    return toResult(input.taskId, leased, input.mode);
  }
}
