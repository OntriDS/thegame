// data-store/repositories/character.repo.ts
import { kvGet, kvMGet, kvSet, kvDel, kvSAdd, kvSRem, kvSMembers } from '../kv';
import { buildDataKey, buildIndexKey } from '../keys';
import { EntityType } from '@/types/enums';
import type { Character } from '@/types/entities';

const ENTITY = EntityType.CHARACTER;

export async function getAllCharacters(): Promise<Character[]> {
  const indexKey = buildIndexKey(ENTITY);
  const ids = await kvSMembers(indexKey);
  if (ids.length === 0) return [];
  
  const keys = ids.map(id => buildDataKey(ENTITY, id));
  const characters = await kvMGet<Character>(keys);
  return characters.filter((character): character is Character => character !== null && character !== undefined);
}

export async function getCharacterById(id: string): Promise<Character | null> {
  const key = buildDataKey(ENTITY, id);
  return await kvGet<Character>(key);
}

export async function upsertCharacter(character: Character): Promise<Character> {
  const key = buildDataKey(ENTITY, character.id);
  const indexKey = buildIndexKey(ENTITY);
  
  await kvSet(key, character);
  await kvSAdd(indexKey, character.id);
  
  return character;
}

export async function deleteCharacter(id: string): Promise<void> {
  const key = buildDataKey(ENTITY, id);
  const indexKey = buildIndexKey(ENTITY);
  
  await kvDel(key);
  await kvSRem(indexKey, id);
}
