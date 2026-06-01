import { auditArchiveCompleteness } from '@/lib/integrity/integrity-audits';
export async function execute(parameters: any) {
  return await auditArchiveCompleteness(Number(parameters.month), Number(parameters.year));
}