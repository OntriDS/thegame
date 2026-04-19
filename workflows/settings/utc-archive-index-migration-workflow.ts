import { migrateUtcMonthlyRedisIndexes } from '@/data-store/datastore';
import type { SettingsResult } from './reset-data-workflow';

export class UtcArchiveIndexMigrationWorkflow {
  static async execute(parameters?: { dryRun?: boolean }): Promise<SettingsResult> {
    const dryRun = parameters?.dryRun !== false;
    try {
      const data = await migrateUtcMonthlyRedisIndexes({ dryRun });
      const verb = dryRun ? 'Dry-run' : 'Migration';
      return {
        success: true,
        message: `${verb} finished in ${data.durationMs}ms (${dryRun ? 'no Redis writes' : 'Redis indexes rebuilt'})`,
        data: data as unknown as SettingsResult['data'],
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[UtcArchiveIndexMigrationWorkflow]', e);
      return {
        success: false,
        message: `UTC archive index migration failed: ${msg}`,
      };
    }
  }
}
