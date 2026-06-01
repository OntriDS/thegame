import { auditMonthIndexAccuracy } from '@/lib/integrity/integrity-audits';
export async function execute(parameters: any) {
  return await auditMonthIndexAccuracy(Number(parameters.month), Number(parameters.year));
}