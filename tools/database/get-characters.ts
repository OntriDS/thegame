import { getAllCharacters } from '@/data-store/datastore';
export async function execute(parameters: any) {
  const limit = parameters.limit;
  const offset = parameters.offset || 0;
  const characters = await getAllCharacters();
  const slice = characters.slice(offset, limit ? offset + limit : undefined);
  return { characters: slice, count: slice.length, total: characters.length, offset, limit, hasMore: limit ? offset + limit < characters.length : false };
}