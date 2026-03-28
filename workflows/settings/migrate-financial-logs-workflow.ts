// workflows/settings/migrate-financial-logs-workflow.ts
// One-off: FINANCIAL lifecycle logs CREATED → DONE (see entities-logging migration).

import { migrateFinancialLogsCreatedToDone } from '../entities-logging';

export interface SettingsResult {
  success: boolean;
  message: string;
  data?: {
    results: string[];
    errors: string[];
    operation: string;
    environment: string;
    requiresClientExecution?: boolean;
    migration?: Record<string, unknown>;
  };
}

export class MigrateFinancialLogsWorkflow {
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
            operation: 'migrate-financial-logs-created-to-done',
            environment: 'local',
            requiresClientExecution: true
          }
        };
      }

      const stats = await migrateFinancialLogsCreatedToDone({ dryRun });
      results.push(
        dryRun ? '[dry run] no writes performed' : 'Migration applied',
        `monthsScanned=${stats.monthsScanned} monthsModified=${stats.monthsModified}`,
        `createdRewrittenToDone=${stats.createdRewrittenToDone} createdRemovedAsDuplicate=${stats.createdRemovedAsDuplicate}`
      );

      return {
        success: true,
        message: dryRun
          ? 'Dry run complete — pass dryRun:false to apply'
          : 'Financial log migration complete',
        data: {
          results,
          errors,
          operation: 'migrate-financial-logs-created-to-done',
          environment: isKV ? 'kv' : 'local',
          migration: stats
        }
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
          operation: 'migrate-financial-logs-created-to-done',
          environment: 'error'
        }
      };
    }
  }
}
