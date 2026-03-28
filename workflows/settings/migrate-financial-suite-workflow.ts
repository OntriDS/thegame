// workflows/settings/migrate-financial-suite-workflow.ts
// One-off: normalize finrec entities (no points / no collected) + financial log migrations.

import { migrateFinancialRecordsNormalize } from '@/data-store/datastore';
import { migrateFinancialLogsCollectedToDone, migrateFinancialLogsCreatedToDone } from '../entities-logging';
import type { SettingsResult } from './migrate-financial-logs-workflow';

export class MigrateFinancialSuiteWorkflow {
  /**
   * Order: entity rows first (strip rewards, COLLECTED → DONE), then log CREATED cleanup, then log COLLECTED cleanup.
   */
  static async execute(parameters?: { dryRun?: boolean }): Promise<SettingsResult> {
    const dryRun = parameters?.dryRun === true;
    const results: string[] = [];
    const errors: string[] = [];

    try {
      const isKV = Boolean(process.env.UPSTASH_REDIS_REST_URL);
      const isServer = typeof window === 'undefined';

      if (!isKV && isServer) {
        return {
          success: true,
          message: 'Migration requires KV (run from deployed admin or with Redis env)',
          data: {
            results: ['Skipped on local server without KV'],
            errors: [],
            operation: 'migrate-financial-suite',
            environment: 'local',
            requiresClientExecution: true,
          },
        };
      }

      const entities = await migrateFinancialRecordsNormalize({ dryRun });
      results.push(
        `[entities] scanned=${entities.scanned} updated=${entities.updated} ` +
          `clearedRewards=${entities.clearedRewards} clearedCollectedFields=${entities.clearedCollectedFields} ` +
          `statusCollectedToDone=${entities.statusCollectedToDone}`
      );

      const logsCreated = await migrateFinancialLogsCreatedToDone({ dryRun });
      results.push(
        `[logs CREATED→DONE] monthsScanned=${logsCreated.monthsScanned} monthsModified=${logsCreated.monthsModified} ` +
          `createdRewrittenToDone=${logsCreated.createdRewrittenToDone} ` +
          `createdRemovedAsDuplicate=${logsCreated.createdRemovedAsDuplicate}`
      );

      const logsCollected = await migrateFinancialLogsCollectedToDone({ dryRun });
      results.push(
        `[logs COLLECTED→DONE/drop] monthsScanned=${logsCollected.monthsScanned} monthsModified=${logsCollected.monthsModified} ` +
          `collectedRewrittenToDone=${logsCollected.collectedRewrittenToDone} ` +
          `collectedRemovedAsDuplicate=${logsCollected.collectedRemovedAsDuplicate}`
      );

      return {
        success: true,
        message: dryRun
          ? 'Dry run complete — POST migrate-financial-suite with dryRun:false to apply'
          : 'Financial suite migration complete',
        data: {
          results,
          errors,
          operation: 'migrate-financial-suite',
          environment: isKV ? 'kv' : 'local',
          migration: {
            dryRun,
            entities,
            logsCreated,
            logsCollected,
          },
        },
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(msg);
      return {
        success: false,
        message: `Migration failed: ${msg}`,
        data: {
          results,
          errors,
          operation: 'migrate-financial-suite',
          environment: 'error',
        },
      };
    }
  }
}
