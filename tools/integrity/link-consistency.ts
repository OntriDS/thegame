import { auditLinkConsistency } from '@/lib/integrity/integrity-audits';
export async function execute(parameters: any) {
  return await auditLinkConsistency(Number(parameters.month), Number(parameters.year));
}