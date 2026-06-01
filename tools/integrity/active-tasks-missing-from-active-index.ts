import { auditActiveTasksMissingFromActiveIndex } from '@/lib/integrity/task-timeline-audit';
export async function execute(parameters: any) {
  return await auditActiveTasksMissingFromActiveIndex();
}