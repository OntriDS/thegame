// This process manager now uses the atomic effect claim lifecycle:
// - acquireEffectClaim() returns a claim with lease token
// - resolveEffectClaim() requires the lease token
// - Step outcomes are recorded in the workflow execution

import type { WorkflowExecutionV1, Task, StepOutcomeV1 } from '@/types/entities';
import { WorkflowStatus, EffectClaimStatus, EntityType } from '@/types/enums';
import { saveWorkflowExecution } from '@/data-store/workflow-store';
import { getTaskById } from '@/data-store/datastore';
import { getUTCNow } from '@/lib/utils/utc-utils';
import { acquireEffectClaim, resolveEffectClaim } from '@/lib/domain/effects/effect-claim-store';

// Business logic imports
import { createFinancialRecordFromTask } from '../financial-record-utils';
import { createItemFromTask } from '../item-creation-utils';
import { stagePointsForPlayer } from '../points-rewards-utils';
import { EffectKeys } from '@/data-store/keys';
import { getTaskPlayerCharacterId } from '@/lib/compatibility/task-selectors';
import { resolveTaskOwnerPlayerId } from '../task-player-resolution';

export class TaskCompletionProcessManager {
  static async process(execution: WorkflowExecutionV1): Promise<void> {
    console.log(`[TaskCompletionPM] Processing workflow ${execution.workflowId}`);
    
    try {
      // The rootCommandId is typically `cmd-done-${taskId}`
      const taskId = execution.rootCommandId.replace('cmd-done-', '');
      const task = await getTaskById(taskId);

      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }

      // Initialize step outcomes if not present
      if (!execution.stepOutcomes) {
        execution.stepOutcomes = {};
      }

      // Step 1: Stage Points
      await this.processPoints(execution, task);
      
      // Step 2: Financial Record Creation
      await this.processFinancial(execution, task);

      // Step 3: Item Creation
      await this.processItems(execution, task);

      // Mark workflow as completed
      execution.state = WorkflowStatus.COMPLETED;
      execution.currentStep = 'completed';
      execution.updatedAt = getUTCNow();
      await saveWorkflowExecution(execution);

      console.log(`[TaskCompletionPM] Workflow ${execution.workflowId} completed successfully`);
    } catch (error: any) {
      console.error(`[TaskCompletionPM] Error in workflow ${execution.workflowId}:`, error);
      
      if (error.name === 'VersionConflictError') {
        execution.state = WorkflowStatus.FAILED_RETRYABLE;
      } else {
        execution.state = WorkflowStatus.FAILED_TERMINAL;
      }
      execution.lastErrorCode = error.message;
      execution.updatedAt = getUTCNow();
      await saveWorkflowExecution(execution);
    }
  }

  private static async processPoints(execution: WorkflowExecutionV1, task: Task) {
    const stepName = 'stagePoints';
    
    if (!task.context?.rewardIntent?.points) {
      // Skip step: no points to stage
      execution.stepOutcomes[stepName] = {
        step: stepName,
        state: 'skipped',
        completedAt: getUTCNow(),
      };
      return;
    }

    const effectKey = EffectKeys.sideEffect('task', task.id, 'pointsStaged');
    
    // Acquire effect claim with lease token
    const claim = await acquireEffectClaim({
      idempotencyKey: effectKey,
      ownerId: execution.workflowId,
      commandId: execution.rootCommandId,
      workflowId: execution.workflowId,
    });

    if (!claim) {
      // Claim already held by another workflow
      console.log(`[TaskCompletionPM] Effect ${effectKey} already claimed by another workflow`);
      return;
    }

    try {
      console.log(`[TaskCompletionPM] Staging points for task ${task.id}`);
      const playerId = await resolveTaskOwnerPlayerId(task);
      if (!playerId) throw new Error(`Cannot stage Task points: owner has no Player (${task.id})`);
      await stagePointsForPlayer(playerId, task.context.rewardIntent.points, task.id, EntityType.TASK);
      
      // Resolve claim with lease token
      const resolved = await resolveEffectClaim({
        idempotencyKey: effectKey,
        leaseToken: claim.leaseToken,
        status: EffectClaimStatus.COMPLETED,
      });

      if (resolved) {
        execution.stepOutcomes[stepName] = {
          step: stepName,
          state: 'completed',
          effectClaimKey: effectKey,
          completedAt: getUTCNow(),
        };
      } else {
        // Lease token mismatch: another workflow took over
        execution.stepOutcomes[stepName] = {
          step: stepName,
          state: 'failed-retryable',
          effectClaimKey: effectKey,
          errorCode: 'LEASE_TOKEN_MISMATCH',
          completedAt: getUTCNow(),
        };
      }
    } catch (error: any) {
      // Resolve as failed-retryable
      await resolveEffectClaim({
        idempotencyKey: effectKey,
        leaseToken: claim.leaseToken,
        status: EffectClaimStatus.FAILED_RETRYABLE,
        errorCode: error.message,
      });

      execution.stepOutcomes[stepName] = {
        step: stepName,
        state: 'failed-retryable',
        effectClaimKey: effectKey,
        errorCode: error.message,
        completedAt: getUTCNow(),
      };

      throw error;
    }
  }

  private static async processFinancial(execution: WorkflowExecutionV1, task: Task) {
    const stepName = 'createFinancialRecord';
    
    // Check if task has financial intent
    const fi = task.context?.financialIntent;
    const hasFinancialIntent = fi
      ? ((fi.costIntent && Number(fi.costIntent.minorUnits) > 0) || (fi.revenueIntent && Number(fi.revenueIntent.minorUnits) > 0))
      : (Number((task as any).cost || 0) > 0 || Number((task as any).revenue || 0) > 0);
    if (!hasFinancialIntent) {
      execution.stepOutcomes[stepName] = {
        step: stepName,
        state: 'skipped',
        completedAt: getUTCNow(),
      };
      return;
    }

    const effectKey = EffectKeys.sideEffect('task', task.id, 'financialCreated');
    
    const claim = await acquireEffectClaim({
      idempotencyKey: effectKey,
      ownerId: execution.workflowId,
      commandId: execution.rootCommandId,
      workflowId: execution.workflowId,
    });

    if (!claim) {
      console.log(`[TaskCompletionPM] Effect ${effectKey} already claimed by another workflow`);
      return;
    }

    try {
      console.log(`[TaskCompletionPM] Creating financial record for task ${task.id}`);
      await createFinancialRecordFromTask(task);
      
      const resolved = await resolveEffectClaim({
        idempotencyKey: effectKey,
        leaseToken: claim.leaseToken,
        status: EffectClaimStatus.COMPLETED,
      });

      if (resolved) {
        execution.stepOutcomes[stepName] = {
          step: stepName,
          state: 'completed',
          effectClaimKey: effectKey,
          completedAt: getUTCNow(),
        };
      } else {
        execution.stepOutcomes[stepName] = {
          step: stepName,
          state: 'failed-retryable',
          effectClaimKey: effectKey,
          errorCode: 'LEASE_TOKEN_MISMATCH',
          completedAt: getUTCNow(),
        };
      }
    } catch (error: any) {
      await resolveEffectClaim({
        idempotencyKey: effectKey,
        leaseToken: claim.leaseToken,
        status: EffectClaimStatus.FAILED_RETRYABLE,
        errorCode: error.message,
      });

      execution.stepOutcomes[stepName] = {
        step: stepName,
        state: 'failed-retryable',
        effectClaimKey: effectKey,
        errorCode: error.message,
        completedAt: getUTCNow(),
      };

      throw error;
    }
  }

  private static async processItems(execution: WorkflowExecutionV1, task: Task) {
    const stepName = 'createItem';
    
    // Check if task has production plan
    const isNewItem = task.context?.productionPlan?.isNewItem ?? (task as any).isNewItem;
    if (!isNewItem) {
      execution.stepOutcomes[stepName] = {
        step: stepName,
        state: 'skipped',
        completedAt: getUTCNow(),
      };
      return;
    }

    const effectKey = EffectKeys.sideEffect('task', task.id, 'itemCreated');
    
    const claim = await acquireEffectClaim({
      idempotencyKey: effectKey,
      ownerId: execution.workflowId,
      commandId: execution.rootCommandId,
      workflowId: execution.workflowId,
    });

    if (!claim) {
      console.log(`[TaskCompletionPM] Effect ${effectKey} already claimed by another workflow`);
      return;
    }

    try {
      console.log(`[TaskCompletionPM] Creating items for task ${task.id}`);
      await createItemFromTask(task);
      
      const resolved = await resolveEffectClaim({
        idempotencyKey: effectKey,
        leaseToken: claim.leaseToken,
        status: EffectClaimStatus.COMPLETED,
      });

      if (resolved) {
        execution.stepOutcomes[stepName] = {
          step: stepName,
          state: 'completed',
          effectClaimKey: effectKey,
          completedAt: getUTCNow(),
        };
      } else {
        execution.stepOutcomes[stepName] = {
          step: stepName,
          state: 'failed-retryable',
          effectClaimKey: effectKey,
          errorCode: 'LEASE_TOKEN_MISMATCH',
          completedAt: getUTCNow(),
        };
      }
    } catch (error: any) {
      await resolveEffectClaim({
        idempotencyKey: effectKey,
        leaseToken: claim.leaseToken,
        status: EffectClaimStatus.FAILED_RETRYABLE,
        errorCode: error.message,
      });

      execution.stepOutcomes[stepName] = {
        step: stepName,
        state: 'failed-retryable',
        effectClaimKey: effectKey,
        errorCode: error.message,
        completedAt: getUTCNow(),
      };

      throw error;
    }
  }
}
