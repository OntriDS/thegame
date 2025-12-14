// data-store/repositories/character.repo.ts
import { kvGet, kvMGet, kvSet, kvDel, kvSAdd, kvSRem, kvSMembers } from '../kv';
import { buildDataKey, buildIndexKey } from '../keys';
import { EntityType } from '@/types/enums';
import type { Character, LegalEntity } from '@/types/entities';

const ENTITY = EntityType.CHARACTER;
const LEGAL_ENTITY = EntityType.LEGAL_ENTITY;

// ============================================================================
// CHARACTER OPERATIONS
// ============================================================================

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

// ============================================================================
// LEGAL ENTITY OPERATIONS (Business Persona Layer for Characters)
// ============================================================================

export async function getAllLegalEntities(): Promise<LegalEntity[]> {
  const indexKey = buildIndexKey(LEGAL_ENTITY);
  const ids = await kvSMembers(indexKey);
  if (ids.length === 0) return [];
  const keys = ids.map(id => buildDataKey(LEGAL_ENTITY, id));
  const entities = await kvMGet<LegalEntity>(keys);
  return entities.filter((e): e is LegalEntity => e !== null && e !== undefined);
}

export async function getLegalEntityById(id: string): Promise<LegalEntity | null> {
  const key = buildDataKey(LEGAL_ENTITY, id);
  return await kvGet<LegalEntity>(key);
}

export async function upsertLegalEntity(entity: LegalEntity): Promise<LegalEntity> {
  const key = buildDataKey(LEGAL_ENTITY, entity.id);
  const indexKey = buildIndexKey(LEGAL_ENTITY);
  await kvSet(key, entity);
  await kvSAdd(indexKey, entity.id);
  return entity;
}

export async function deleteLegalEntity(id: string): Promise<void> {
  const key = buildDataKey(LEGAL_ENTITY, id);
  const indexKey = buildIndexKey(LEGAL_ENTITY);
  await kvDel(key);
  await kvSRem(indexKey, id);
}
