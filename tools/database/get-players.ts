import { getAllPlayers } from '@/data-store/datastore';
export async function execute(parameters: any) {
  const limit = parameters.limit;
  const offset = parameters.offset || 0;
  const players = await getAllPlayers();
  const slice = players.slice(offset, limit ? offset + limit : undefined);
  return { players: slice, count: slice.length, total: players.length, offset, limit, hasMore: limit ? offset + limit < players.length : false };
}