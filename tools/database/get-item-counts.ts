import { countItems } from '@/data-store/datastore';
function parse(v: any) {
  if (v === undefined) return undefined;
  if (typeof v === 'string') return v.trim() ? [v.trim()] : [];
  if (Array.isArray(v)) return v.map(i => String(i || '').trim()).filter(i => i.length > 0);
  return null;
}
export async function execute(parameters: any) {
  const types = parse(parameters.types);
  const subTypes = parse(parameters.subTypes);
  const count = await countItems(types as any, subTypes as any);
  return { count };
}