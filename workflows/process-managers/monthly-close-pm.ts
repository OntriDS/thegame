// workflows/process-managers/monthly-close-pm.ts
// Canonical monthly-close process manager.
// The dispatcher supplies typed period input; this process manager owns only
// the domain procedure and bounded progress.

import type { WorkflowExecutionV1, MonthlyCloseProgressV1, Task, Sale } from '@/types/entities';
import { WorkflowStatus, EffectClaimStatus, TaskStatus, SaleStatus } from '@/types/enums';
import { saveWorkflowExecution } from '@/data-store/workflow-store';
import { getTasksForMonth, getSalesForMonth, upsertTask, upsertSale } from '@/data-store/datastore';
import { getUTCNow, endOfMonthUTC } from '@/lib/utils/utc-utils';
import { acquireEffectClaim, resolveEffectClaim } from '@/lib/domain/effects/effect-claim-store';
import { EffectKeys } from '@/data-store/keys';

const initialProgress = (execution: WorkflowExecutionV1): MonthlyCloseProgressV1 => {
  if (!execution.input || execution.input.workflowType !== 'monthly-close') {
    throw new Error('MONTHLY_CLOSE_INPUT_REQUIRED');
  }
  if (execution.progress?.workflowType === 'monthly-close') return execution.progress;
  return {
    workflowType: 'monthly-close',
    year: execution.input.year,
    month: execution.input.month,
    mode: execution.input.mode,
    taskCursor: 0,
    saleCursor: 0,
    tasksCollected: 0,
    salesCollected: 0,
    tasksFailed: 0,
    salesFailed: 0,
    grantsVested: 0,
  };
};

const hasFailures = (progress: MonthlyCloseProgressV1): boolean =>
  progress.tasksFailed > 0 || progress.salesFailed > 0;

export class MonthlyCloseProcessManager {
  static async process(execution: WorkflowExecutionV1): Promise<void> {
    console.log(`[MonthlyClosePM] Processing workflow ${execution.workflowId}`);
    try {
      const progress = initialProgress(execution);
      execution.progress = progress;
      execution.stepOutcomes ??= {};

      // Continue all source groups so successful effects remain valid even if
      // one group fails. The run cannot complete until every group reconciles.
      await this.collectTasks(execution, progress);
      await this.collectSales(execution, progress);

      if (hasFailures(progress)) {
        execution.state = WorkflowStatus.FAILED_RETRYABLE;
        execution.currentStep = 'awaiting-retry';
        execution.lastErrorCode = 'MONTHLY_CLOSE_SOURCE_FAILURES';
      } else {
        progress.completedAt = getUTCNow();
        execution.state = WorkflowStatus.COMPLETED;
        execution.currentStep = 'completed';
        execution.lastErrorCode = undefined;
      }

      execution.progress = progress;
      execution.updatedAt = getUTCNow();
      await saveWorkflowExecution(execution);
      console.log(`[MonthlyClosePM] ${execution.state} ${execution.workflowId}`);
    } catch (error: any) {
      console.error(`[MonthlyClosePM] Error in workflow ${execution.workflowId}:`, error);
      execution.state = error.name === 'VersionConflictError'
        ? WorkflowStatus.FAILED_RETRYABLE
        : WorkflowStatus.FAILED_TERMINAL;
      execution.currentStep = 'failed';
      execution.lastErrorCode = error.message || 'MONTHLY_CLOSE_FAILED';
      execution.updatedAt = getUTCNow();
      await saveWorkflowExecution(execution);
    }
  }

  private static async collectTasks(execution: WorkflowExecutionV1, progress: MonthlyCloseProgressV1): Promise<void> {
    const step = 'collectTasks';
    const eligible = (await getTasksForMonth(progress.year, progress.month)).filter(task => task.status === TaskStatus.DONE);
    let failed = false;
    for (const task of eligible) {
      const key = EffectKeys.sideEffect('task', task.id, 'taskCollected');
      const claim = await acquireEffectClaim({ idempotencyKey: key, ownerId: execution.workflowId, commandId: execution.rootCommandId, workflowId: execution.workflowId });
      if (!claim) continue;
      try {
        const taskRuntime = task as any;
        const done = taskRuntime.lifecycle?.doneAt ?? taskRuntime.doneAt;
        await upsertTask({
          ...task,
          status: TaskStatus.COLLECTED,
          lifecycle: { ...(taskRuntime.lifecycle || {}), collectedAt: endOfMonthUTC(done ? new Date(done) : getUTCNow()) },
          updatedAt: getUTCNow(),
        } as Task);
        await resolveEffectClaim({ idempotencyKey: key, leaseToken: claim.leaseToken, status: EffectClaimStatus.COMPLETED });
        progress.tasksCollected++;
      } catch (error: any) {
        failed = true;
        progress.tasksFailed++;
        await resolveEffectClaim({ idempotencyKey: key, leaseToken: claim.leaseToken, status: EffectClaimStatus.FAILED_RETRYABLE, errorCode: error.message });
      }
    }
    progress.taskCursor = eligible.length;
    execution.stepOutcomes[step] = { step, state: failed ? 'failed-retryable' : 'completed', completedAt: getUTCNow() };
  }

  private static async collectSales(execution: WorkflowExecutionV1, progress: MonthlyCloseProgressV1): Promise<void> {
    const step = 'collectSales';
    const eligible = (await getSalesForMonth(progress.year, progress.month)).filter(sale => sale.status === SaleStatus.CHARGED);
    let failed = false;
    for (const sale of eligible) {
      const key = EffectKeys.sideEffect('sale', sale.id, 'saleCollected');
      const claim = await acquireEffectClaim({ idempotencyKey: key, ownerId: execution.workflowId, commandId: execution.rootCommandId, workflowId: execution.workflowId });
      if (!claim) continue;
      try {
        const chargedAt = sale.lifecycle?.chargedAt ? new Date(sale.lifecycle.chargedAt) : sale.saleDate ? new Date(sale.saleDate) : getUTCNow();
        await upsertSale({
          ...sale,
          status: SaleStatus.COLLECTED,
          lifecycle: { ...(sale.lifecycle || {}), collectedAt: endOfMonthUTC(chargedAt) },
          updatedAt: getUTCNow(),
        } as Sale);
        await resolveEffectClaim({ idempotencyKey: key, leaseToken: claim.leaseToken, status: EffectClaimStatus.COMPLETED });
        progress.salesCollected++;
      } catch (error: any) {
        failed = true;
        progress.salesFailed++;
        await resolveEffectClaim({ idempotencyKey: key, leaseToken: claim.leaseToken, status: EffectClaimStatus.FAILED_RETRYABLE, errorCode: error.message });
      }
    }
    progress.saleCursor = eligible.length;
    execution.stepOutcomes[step] = { step, state: failed ? 'failed-retryable' : 'completed', completedAt: getUTCNow() };
  }

}
