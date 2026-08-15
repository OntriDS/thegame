// workflows/process-managers/sale-settlement-pm.ts
// Increment 7: Migrated to use canonical effect claim store
//
// This process manager now uses the atomic effect claim lifecycle:
// - acquireEffectClaim() returns a claim with lease token
// - resolveEffectClaim() requires the lease token
// - Step outcomes are recorded in the workflow execution

import type { WorkflowExecutionV1, Sale, StepOutcomeV1 } from '@/types/entities';
import { WorkflowStatus, EffectClaimStatus, EntityType, LogEventType, SaleStatus } from '@/types/enums';
import { saveWorkflowExecution } from '@/data-store/workflow-store';
import { getSaleById } from '@/data-store/datastore';
import { getUTCNow } from '@/lib/utils/utc-utils';
import { acquireEffectClaim, resolveEffectClaim } from '@/lib/domain/effects/effect-claim-store';
import { EffectKeys } from '@/data-store/keys';

// Business logic imports
import { createCharacterFromSale } from '../character-creation-utils';
import { updateFinancialRecordsFromSale } from '../update-propagation-utils';
import { ensureFinancialDoneLog } from '../entities-workflows/financial.workflow';
import { appendEntityLog } from '../entities-logging';
import { processSaleLines } from '../sale-line-utils';
import { stagePointsForPlayer, rewardPointsToPlayer } from '../points-rewards-utils';
import { FOUNDER_CHARACTER_ID } from '@/types/enums';

export class SaleSettlementProcessManager {
  static async process(execution: WorkflowExecutionV1): Promise<void> {
    console.log(`[SaleSettlementPM] Processing workflow ${execution.workflowId}`);
    
    try {
      const saleId = execution.rootCommandId.replace('cmd-settle-', '');
      const sale = await getSaleById(saleId);

      if (!sale) {
        throw new Error(`Sale ${saleId} not found`);
      }

      // Initialize step outcomes if not present
      if (!execution.stepOutcomes) {
        execution.stepOutcomes = {};
      }

      // 1. Character Creation (if newCustomerName is provided)
      if (sale.context?.newCustomerName && !sale.characterId) {
          await this.processCharacterCreation(execution, sale);
      }

      // 2. Financial Record Sync
      await this.processFinancials(execution, sale);

      // 3. Inventory Sync
      await this.processInventory(execution, sale);

      // 4. Milestone Logging & Points
      await this.processLoggingAndPoints(execution, sale);

      // Mark workflow as completed
      execution.state = WorkflowStatus.COMPLETED;
      execution.currentStep = 'completed';
      execution.updatedAt = getUTCNow();
      await saveWorkflowExecution(execution);

      console.log(`[SaleSettlementPM] Workflow ${execution.workflowId} completed successfully`);
    } catch (error: any) {
      console.error(`[SaleSettlementPM] Error in workflow ${execution.workflowId}:`, error);
      
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

  private static async processCharacterCreation(execution: WorkflowExecutionV1, sale: Sale) {
    const stepName = 'createCharacter';
    const effectKey = EffectKeys.sideEffect('sale', sale.id, 'characterCreated');
    
    // Acquire effect claim with lease token
    const claim = await acquireEffectClaim({
      idempotencyKey: effectKey,
      ownerId: execution.workflowId,
      commandId: execution.rootCommandId,
      workflowId: execution.workflowId,
    });

    if (!claim) {
      console.log(`[SaleSettlementPM] Effect ${effectKey} already claimed by another workflow`);
      return;
    }

    try {
      console.log(`[SaleSettlementPM] Creating character for sale ${sale.id}`);
      await createCharacterFromSale(sale);
      
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

  private static async processFinancials(execution: WorkflowExecutionV1, sale: Sale) {
    const stepName = 'syncFinancials';
    const effectKey = EffectKeys.sideEffect('sale', sale.id, 'financialRecordsSynced');
    
    const claim = await acquireEffectClaim({
      idempotencyKey: effectKey,
      ownerId: execution.workflowId,
      commandId: execution.rootCommandId,
      workflowId: execution.workflowId,
    });

    if (!claim) {
      console.log(`[SaleSettlementPM] Effect ${effectKey} already claimed by another workflow`);
      return;
    }

    try {
      console.log(`[SaleSettlementPM] Syncing financial records for sale ${sale.id}`);
      await updateFinancialRecordsFromSale(sale, undefined);
      
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

  private static async processInventory(execution: WorkflowExecutionV1, sale: Sale) {
    const stepName = 'processInventory';
    const isCharged = sale.status !== SaleStatus.CANCELLED && 
      (sale.status === SaleStatus.CHARGED || sale.status === SaleStatus.COLLECTED);
    
    if (!isCharged) {
      execution.stepOutcomes[stepName] = {
        step: stepName,
        state: 'skipped',
        completedAt: getUTCNow(),
      };
      return;
    }

    const effectKey = EffectKeys.sideEffect('sale', sale.id, 'inventoryProcessed');
    
    const claim = await acquireEffectClaim({
      idempotencyKey: effectKey,
      ownerId: execution.workflowId,
      commandId: execution.rootCommandId,
      workflowId: execution.workflowId,
    });

    if (!claim) {
      console.log(`[SaleSettlementPM] Effect ${effectKey} already claimed by another workflow`);
      return;
    }

    try {
      console.log(`[SaleSettlementPM] Processing inventory for sale ${sale.id}`);
      await processSaleLines(sale);
      
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

  private static async processLoggingAndPoints(execution: WorkflowExecutionV1, sale: Sale) {
    const isCharged = sale.status !== SaleStatus.CANCELLED && 
      (sale.status === SaleStatus.CHARGED || sale.status === SaleStatus.COLLECTED);
    const isCollected = sale.status === SaleStatus.COLLECTED;
    
    if (isCharged) {
      const stepName = 'stagePoints';
      const effectKey = EffectKeys.sideEffect('sale', sale.id, 'saleDoneLogged');
      
      const claim = await acquireEffectClaim({
        idempotencyKey: effectKey,
        ownerId: execution.workflowId,
        commandId: execution.rootCommandId,
        workflowId: execution.workflowId,
      });

      if (!claim) {
        console.log(`[SaleSettlementPM] Effect ${effectKey} already claimed by another workflow`);
        return;
      }

      try {
        console.log(`[SaleSettlementPM] Staging points for sale ${sale.id}`);
        const logTimestamp = sale.lifecycle?.doneAt || (sale as any).chargedAt || getUTCNow();
        
        const playerId = sale.playerCharacterId || FOUNDER_CHARACTER_ID;
        await stagePointsForPlayer(playerId, sale.context?.rewardIntent?.points, sale.id, EntityType.SALE, logTimestamp);

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

    if (isCollected) {
      const stepName = 'vestPoints';
      const effectKey = EffectKeys.sideEffect('sale', sale.id, 'saleCollectedLogged');
      
      const claim = await acquireEffectClaim({
        idempotencyKey: effectKey,
        ownerId: execution.workflowId,
        commandId: execution.rootCommandId,
        workflowId: execution.workflowId,
      });

      if (!claim) {
        console.log(`[SaleSettlementPM] Effect ${effectKey} already claimed by another workflow`);
        return;
      }

      try {
        console.log(`[SaleSettlementPM] Vesting points for sale ${sale.id}`);
        const logTimestamp = sale.lifecycle?.collectedAt || sale.lifecycle?.doneAt || (sale as any).chargedAt || getUTCNow();
        
        const playerId = sale.playerCharacterId || FOUNDER_CHARACTER_ID;
        await rewardPointsToPlayer(playerId, sale.context?.rewardIntent?.points, sale.id, EntityType.SALE, logTimestamp);

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
}
