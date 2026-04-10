// Server-only: uses datastore. Do not import from client components (see character-role-sync.ts).

import { getCharacterById, upsertCharacter } from '@/data-store/datastore';
import { CharacterRole } from '@/types/enums';
import {
  BENEFICIARY_ROLE_EXEMPT_ROLES,
  type EnsureCharacterRoleOptions,
} from './character-role-sync';

const normalizeRole = (value: string): string => value.trim().toLowerCase();

const hasRole = (roles: (CharacterRole | string)[] | undefined, targetRole: CharacterRole): boolean =>
  (roles || []).some((role) => normalizeRole(String(role)) === normalizeRole(String(targetRole)));

const hasAnyRoleFromSet = (
  roles: (CharacterRole | string)[] | undefined,
  skipRoles: readonly CharacterRole[]
): boolean => {
  if (!roles?.length || !skipRoles.length) return false;
  const skipRoleSet = new Set(skipRoles.map((role) => normalizeRole(String(role))));
  return roles.some((role) => skipRoleSet.has(normalizeRole(String(role))));
};

export async function ensureCharacterHasRoleDatastore(
  characterId: string,
  role: CharacterRole,
  options: EnsureCharacterRoleOptions = {}
): Promise<void> {
  const character = await getCharacterById(characterId);
  if (!character) return;

  const currentRoles = character.roles || [];
  if (hasRole(currentRoles, role)) return;

  if (hasAnyRoleFromSet(currentRoles, options.skipIfCharacterHasAnyOfRoles || [])) {
    return;
  }

  const nextRoles = Array.from(new Set([...currentRoles, role])) as CharacterRole[];

  await upsertCharacter({
    ...character,
    roles: nextRoles,
  });
}

export async function ensureCounterpartyRoleDatastore(
  characterId: string | null | undefined,
  role: CharacterRole | null | undefined
): Promise<void> {
  if (!characterId || !role) return;
  const skipRoles = role === CharacterRole.BENEFICIARY ? BENEFICIARY_ROLE_EXEMPT_ROLES : [];
  try {
    await ensureCharacterHasRoleDatastore(characterId, role, {
      skipIfCharacterHasAnyOfRoles: skipRoles,
    });
  } catch (error) {
    console.error(`Failed to assign ${role} role to character ${characterId} (datastore):`, error);
  }
}
