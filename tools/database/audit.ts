import { runDatabaseAudit } from '@/lib/integrity/database-auditor';
export async function execute(parameters: any) {
  return await runDatabaseAudit(parameters.entityType);
}