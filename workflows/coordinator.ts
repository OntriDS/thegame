import type { WorkflowExecutionV1 } from '@/types/entities';
import { WorkflowStatus } from '@/types/enums';
import { saveWorkflowExecution } from '@/data-store/workflow-store';
import { getUTCNow } from '@/lib/utils/utc-utils';
import { TaskCompletionProcessManager } from './process-managers/task-completion-pm';
import { MonthlyCloseProcessManager } from './process-managers/monthly-close-pm';
import { SaleSettlementProcessManager } from './process-managers/sale-settlement-pm';

/**
 * Workflow Coordinator
 * 
 * This engine tracks state transitions for tasks, sales, etc.
 * It tracks the execution state and coordinates durable process managers.
 */
export async function executeWorkflow(execution: WorkflowExecutionV1): Promise<void> {
  console.log(`[COORDINATOR] Starting workflow execution for ${execution.workflowType} (ID: ${execution.workflowId})`);

  try {
    execution.attempts += 1;
    execution.updatedAt = getUTCNow();

    if (execution.workflowType === 'task-completion') {
      await TaskCompletionProcessManager.process(execution);
      return; 
    }
    
    if (execution.workflowType === 'monthly-close') {
      await MonthlyCloseProcessManager.process(execution);
      return;
    }
    
    if (execution.workflowType === 'sale-settlement') {
      await SaleSettlementProcessManager.process(execution);
      return;
    }
    
    // Fallback for unknown workflows
    execution.state = WorkflowStatus.COMPLETED;
    
    await saveWorkflowExecution(execution);
    
    console.log(`[COORDINATOR] Execution completed for ${execution.workflowId}.`);

  } catch (error: any) {
    console.error(`[COORDINATOR] Error in workflow ${execution.workflowId}:`, error);
    
    if (error.name === 'VersionConflictError') {
      console.warn(`[COORDINATOR] Retryable conflict detected, would schedule retry.`);
      execution.state = WorkflowStatus.FAILED_RETRYABLE;
      execution.lastErrorCode = 'VERSION_CONFLICT';
    } else {
      execution.state = WorkflowStatus.FAILED_TERMINAL;
      execution.lastErrorCode = error.message;
    }

    execution.updatedAt = getUTCNow();
    await saveWorkflowExecution(execution);
  }
}
