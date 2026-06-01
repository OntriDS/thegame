import { getAllItems } from '@/data-store/datastore';
export async function execute(parameters: any) {
  const limit = parameters.limit;
  const offset = parameters.offset || 0;
  const items = await getAllItems();
  const slice = items.slice(offset, limit ? offset + limit : undefined);
  return { items: slice, count: slice.length, total: items.length, offset, limit, hasMore: limit ? offset + limit < items.length : false };
}