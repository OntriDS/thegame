import { repairTaskCompletedIndex } from '@/data-store/datastore';
import type { SettingsResult } from './reset-data-workflow';

export class RepairTaskMonthIndexWorkflow {
  static async execute(parameters?: { dryRun?: boolean }): Promise<SettingsResult> {
    const dryRun = parameters?.dryRun ?? false;
    try {
      const data = await repairTaskCompletedIndex({
        dryRun,
      });
      return {
        success: true,
        message: `${dryRun ? 'Dry-run' : 'Repair'} completed for task month index`,
        data: data as unknown as SettingsResult['data'],
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[RepairTaskMonthIndexWorkflow]', error);
      return {
        success: false,
        message: `Task month index repair failed: ${msg}`,
      };
    }
  }
}

