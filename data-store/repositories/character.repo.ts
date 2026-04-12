// data-store/repositories/character.repo.ts
import { kvGet, kvMGet, kvSet, kvDel, kvSAdd, kvSRem, kvSMembers } from '../kv';
import { buildDataKey, buildIndexKey, buildCharacterEmailIndexKey, buildCharacterPhoneIndexKey } from '../keys';
import { EntityType } from '@/types/enums';
import type { Character, Business } from '@/types/entities';
import { normalizeCharacterRoles } from '@/lib/character-roles';

const ENTITY = EntityType.CHARACTER;
const LEGAL_ENTITY = EntityType.BUSINESS; // Business Entity constant

function normalizeContactEmail(email?: string): string {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function normalizeContactPhone(phone?: string): string {
  return typeof phone === 'string' ? phone.replace(/[\s\-().]/g, '').trim() : '';
}

function normalizeContactPhoneWithCode(phone?: string, countryCode?: string): string {
  const digits = normalizeContactPhone(phone);
  if (!digits) return '';
  const normalizedCountryCode = typeof countryCode === 'string' ? countryCode.trim() : '';
  if (!normalizedCountryCode) {
    return digits;
  }
  return `${normalizedCountryCode}${digits}`;
}

// ============================================================================
// CHARACTER OPERATIONS
// ============================================================================

export async function getAllCharacters(): Promise<Character[]> {
  const indexKey = buildIndexKey(ENTITY);
  const ids = await kvSMembers(indexKey);
  if (ids.length === 0) return [];

  const keys = ids.map(id => buildDataKey(ENTITY, id));
  const characters = await kvMGet<Character>(keys);
  return characters
    .filter((character): character is Character => character !== null && character !== undefined)
    .map((character) => ({
      ...character,
      roles: normalizeCharacterRoles(character.roles),
    }));
}

export async function getCharacterById(id: string): Promise<Character | null> {
  const key = buildDataKey(ENTITY, id);
  const character = await kvGet<Character>(key);
  if (!character) return null;
  return {
    ...character,
    roles: normalizeCharacterRoles(character.roles),
  };
}

export async function upsertCharacter(character: Character): Promise<Character> {
  const current = await kvGet<Character>(buildDataKey(ENTITY, character.id));
  const previousEmail = normalizeContactEmail(current?.contactEmail);
  const previousPhone = normalizeContactPhoneWithCode(current?.contactPhone, current?.contactPhoneCountryCode);

  const normalizedCharacter = {
    ...character,
    roles: normalizeCharacterRoles(character.roles),
  };
  const key = buildDataKey(ENTITY, character.id);
  const indexKey = buildIndexKey(ENTITY);
  const nextEmail = normalizeContactEmail(character.contactEmail);
  const nextPhone = normalizeContactPhone(character.contactPhone);

  const nextPhoneCountryCode = typeof character.contactPhoneCountryCode === 'string'
    ? character.contactPhoneCountryCode.trim()
    : undefined;
  const normalizedNextPhone = nextPhoneCountryCode ? `${nextPhoneCountryCode}${nextPhone}` : nextPhone;

  if (previousEmail && previousEmail !== nextEmail) {
    await kvSRem(buildCharacterEmailIndexKey(previousEmail), character.id);
  }
  if (previousPhone && previousPhone !== normalizedNextPhone) {
    await kvSRem(buildCharacterPhoneIndexKey(previousPhone), character.id);
  }

  await kvSet(key, normalizedCharacter);
  await kvSAdd(indexKey, character.id);

  if (nextEmail) {
    await kvSAdd(buildCharacterEmailIndexKey(nextEmail), character.id);
  }
  if (normalizedNextPhone) {
    await kvSAdd(buildCharacterPhoneIndexKey(normalizedNextPhone), character.id);
  }

  return normalizedCharacter;
}

export async function deleteCharacter(id: string): Promise<void> {
  const key = buildDataKey(ENTITY, id);
  const indexKey = buildIndexKey(ENTITY);
  const existing = await kvGet<Character>(key);
  const existingEmail = normalizeContactEmail(existing?.contactEmail);
  const existingPhone = normalizeContactPhoneWithCode(existing?.contactPhone, existing?.contactPhoneCountryCode);

  await kvDel(key);
  await kvSRem(indexKey, id);
  if (existingEmail) {
    await kvSRem(buildCharacterEmailIndexKey(existingEmail), id);
  }
  if (existingPhone) {
    await kvSRem(buildCharacterPhoneIndexKey(existingPhone), id);
  }
}

// ============================================================================
// BUSINESS OPERATIONS (Business Persona Layer for Characters)
// ============================================================================

export async function getAllBusinesses(): Promise<Business[]> {
  const indexKey = buildIndexKey(LEGAL_ENTITY);
  const ids = await kvSMembers(indexKey);
  if (ids.length === 0) return [];
  const keys = ids.map(id => buildDataKey(LEGAL_ENTITY, id));
  const entities = await kvMGet<Business>(keys);
  return entities.filter((e): e is Business => e !== null && e !== undefined);
}

export async function getBusinessById(id: string): Promise<Business | null> {
  const key = buildDataKey(LEGAL_ENTITY, id);
  return await kvGet<Business>(key);
}

export async function upsertBusiness(entity: Business): Promise<Business> {
  const key = buildDataKey(LEGAL_ENTITY, entity.id);
  const indexKey = buildIndexKey(LEGAL_ENTITY);
  await kvSet(key, entity);
  await kvSAdd(indexKey, entity.id);
  return entity;
}

export async function deleteBusiness(id: string): Promise<void> {
  const key = buildDataKey(LEGAL_ENTITY, id);
  const indexKey = buildIndexKey(LEGAL_ENTITY);
  await kvDel(key);
  await kvSRem(indexKey, id);
}
