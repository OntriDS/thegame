// data-store/repositories/player.repo.ts
import { kvGet, kvSet, kvDel, kvSAdd, kvSRem, kvSMembers } from '../kv';
import { buildDataKey, buildIndexKey } from '../keys';
import { EntityType } from '@/types/enums';
import type { Player } from '@/types/entities';

const ENTITY = EntityType.PLAYER;

export async function getAllPlayers(): Promise<Player[]> {
  const indexKey = buildIndexKey(ENTITY);
  const ids = await kvSMembers(indexKey);
  if (ids.length === 0) return [];
  
  const players: Player[] = [];
  for (const id of ids) {
    const key = buildDataKey(ENTITY, id);
    const player = await kvGet<Player>(key);
    if (player) players.push(player);
  }
  
  return players;
}

export async function getPlayerById(id: string): Promise<Player | null> {
  const key = buildDataKey(ENTITY, id);
  return await kvGet<Player>(key);
}

export async function upsertPlayer(player: Player): Promise<Player> {
  const key = buildDataKey(ENTITY, player.id);
  const indexKey = buildIndexKey(ENTITY);
  
  await kvSet(key, player);
  await kvSAdd(indexKey, player.id);
  
  return player;
}

export async function deletePlayer(id: string): Promise<void> {
  const key = buildDataKey(ENTITY, id);
  const indexKey = buildIndexKey(ENTITY);
  
  await kvDel(key);
  await kvSRem(indexKey, id);
}
