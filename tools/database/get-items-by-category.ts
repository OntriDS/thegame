import { getItemsByType, getItemsBySubType, getAllItems } from '@/data-store/datastore';
function parse(v: any) {
  if (v === undefined) return undefined;
  if (typeof v === 'string') return v.trim() ? [v.trim()] : [];
  if (Array.isArray(v)) return v.map(i => String(i || '').trim()).filter(i => i.length > 0);
  return null;
}
export async function execute(parameters: any) {
  const types = parse(parameters.types);
  const subTypes = parse(parameters.subTypes);
  let items: any[] = [];
  if (types !== undefined && subTypes !== undefined) {
    if (types!.length > 0 && subTypes!.length > 0) {
      const byTypes = await getItemsByType(types!);
      const bySubTypes = await getItemsBySubType(subTypes!);
      const subTypeIdSet = new Set(bySubTypes.map(i => i.id));
      items = byTypes.filter(i => subTypeIdSet.has(i.id));
    }
  } else if (types !== undefined) {
    items = await getItemsByType(types!);
  } else if (subTypes !== undefined) {
    items = await getItemsBySubType(subTypes!);
  } else {
    items = await getAllItems();
  }
  const limit = parameters.limit;
  const offset = parameters.offset || 0;
  const slice = items.slice(offset, limit ? offset + limit : undefined);
  return { items: slice, count: slice.length, total: items.length, offset, limit, hasMore: limit ? offset + limit < items.length : false };
}