import { getAllSites } from '@/data-store/datastore';
export async function execute(parameters: any) {
  const limit = parameters.limit;
  const offset = parameters.offset || 0;
  const sites = await getAllSites();
  const slice = sites.slice(offset, limit ? offset + limit : undefined);
  return { sites: slice, count: slice.length, total: sites.length, offset, limit, hasMore: limit ? offset + limit < sites.length : false };
}