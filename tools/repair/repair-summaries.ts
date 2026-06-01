import { SummaryService } from '@/data-store/services/summary.service';
export async function execute(parameters: any) {
  if (parameters.monthKey) {
    return await SummaryService.rebuildSummaryForMonth(parameters.monthKey);
  }
  return await SummaryService.rebuildAllSummaries();
}