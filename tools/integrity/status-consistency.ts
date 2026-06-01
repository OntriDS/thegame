import { auditStatusConsistency } from '@/lib/integrity/integrity-audits';
export async function execute(parameters: any) {
  return await auditStatusConsistency(Number(parameters.month), Number(parameters.year));
}