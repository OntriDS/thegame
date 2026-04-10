// workflows/settings/migrate-associate-to-partner-workflow.ts
import { SettingsResult } from './backfill-logs-workflow';
import { migrateAssociateToPartner } from '@/workflows/migrate-associate-to-partner';

export interface AssociateToPartnerMigrationOptions {
  dryRun: boolean;
  includePendingFinancials?: boolean;
}

export class MigrateAssociateToPartnerWorkflow {
  static async execute(options: AssociateToPartnerMigrationOptions): Promise<SettingsResult> {
    try {
      const dryRun = options?.dryRun !== false;
      const includePendingFinancials = options?.includePendingFinancials === true;
      const mode = dryRun ? 'dry-run' : 'live';
      console.log(`[MigrateAssociateToPartnerWorkflow] Starting ${mode} migration (includePendingFinancials=${includePendingFinancials})`);

      const result = await migrateAssociateToPartner(dryRun, includePendingFinancials);

      const summaryLines: string[] = [
        `Sales scanned: ${result.salesScanned}, migrated: ${result.salesMigrated}, lines migrated: ${result.saleLinesMigrated}`,
        `Characters scanned: ${result.charactersScanned}, migrated: ${result.charactersMigrated}`,
        `Financials scanned: ${result.financialScanned}, migrated: ${result.financialMigrated}`,
        `Financial scan mode: ${includePendingFinancials ? 'raw+month-index' : 'standard visible only'}`,
        `Contracts scanned: ${result.contractsScanned}, migrated: ${result.contractsMigrated}, clauses migrated: ${result.contractClausesMigrated}`,
        `Errors: ${result.errors.length}`
      ];

      if (result.errors.length > 0) {
        summaryLines.push(...result.errors.map((error) => `Error: ${error}`));
      }

      return {
        success: result.errors.length === 0,
        message: dryRun
          ? `Dry-run completed. No data was written.`
          : `Migration completed. ${result.salesMigrated + result.charactersMigrated + result.financialMigrated + result.contractsMigrated} entity groups updated.`,
        data: {
          results: summaryLines,
          errors: result.errors,
          operation: dryRun ? 'migrate-associate-to-partner-dry-run' : 'migrate-associate-to-partner',
          environment: 'server',
          summary: {
            salesScanned: result.salesScanned,
            salesMigrated: result.salesMigrated,
            saleLinesMigrated: result.saleLinesMigrated,
            charactersScanned: result.charactersScanned,
            charactersMigrated: result.charactersMigrated,
            financialScanned: result.financialScanned,
            financialMigrated: result.financialMigrated,
            contractsScanned: result.contractsScanned,
            contractsMigrated: result.contractsMigrated,
            contractClausesMigrated: result.contractClausesMigrated,
            dryRun
          }
        }
      };
    } catch (error) {
      const message = `Associate-to-partner migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('[MigrateAssociateToPartnerWorkflow] ❌', message);
      return {
        success: false,
        message,
        data: {
          results: [],
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          operation: 'migrate-associate-to-partner',
          environment: 'server'
        }
      };
    }
  }
}
