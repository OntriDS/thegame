import { getAllFinancials } from '@/data-store/datastore';
export async function execute(parameters: any) {
  const limit = parameters.limit;
  const offset = parameters.offset || 0;
  const financials = await getAllFinancials();
  const slice = financials.slice(offset, limit ? offset + limit : undefined);
  return { financials: slice, count: slice.length, total: financials.length, offset, limit, hasMore: limit ? offset + limit < financials.length : false };
}