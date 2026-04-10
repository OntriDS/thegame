import { ClientAPI } from '@/lib/client-api';
import { CharacterRole } from '@/types/enums';

const normalizeRole = (value: string): string => value.trim().toLowerCase();

export const BENEFICIARY_ROLE_EXEMPT_ROLES: ReadonlyArray<CharacterRole> = [
  CharacterRole.FOUNDER,
  CharacterRole.PLAYER,
  CharacterRole.APPRENTICE,
  CharacterRole.TEAM,
] as const;

export interface EnsureCharacterRoleOptions {
  skipIfCharacterHasAnyOfRoles?: readonly CharacterRole[];
}

const hasRole = (roles: (CharacterRole | string)[] | undefined, targetRole: CharacterRole): boolean =>
  (roles || []).some((role) => normalizeRole(String(role)) === normalizeRole(String(targetRole)));

const hasAnyRoleFromSet = (roles: (CharacterRole | string)[] | undefined, skipRoles: readonly CharacterRole[]): boolean => {
  if (!roles?.length || !skipRoles.length) return false;
  const skipRoleSet = new Set(skipRoles.map((role) => normalizeRole(String(role))));
  return roles.some((role) => skipRoleSet.has(normalizeRole(String(role))));
};

export const ensureCharacterHasRole = async (
  characterId: string,
  role: CharacterRole,
  options: EnsureCharacterRoleOptions = {}
): Promise<void> => {
  const character = await ClientAPI.getCharacterById(characterId);
  if (!character) return;

  const currentRoles = character.roles || [];
  if (hasRole(currentRoles, role)) return;

  if (hasAnyRoleFromSet(currentRoles, options.skipIfCharacterHasAnyOfRoles || [])) {
    return;
  }

  const nextRoles = Array.from(new Set([...currentRoles, role])) as CharacterRole[];

  await ClientAPI.upsertCharacter({
    ...character,
    roles: nextRoles,
  });
};

export const ensureCounterpartyRole = async (
  characterId: string | null | undefined,
  role: CharacterRole | null | undefined
): Promise<void> => {
  if (!characterId || !role) return;
  const skipRoles = role === CharacterRole.BENEFICIARY ? BENEFICIARY_ROLE_EXEMPT_ROLES : [];
  try {
    await ensureCharacterHasRole(characterId, role, {
      skipIfCharacterHasAnyOfRoles: skipRoles,
    });
  } catch (error) {
    console.error(`Failed to assign ${role} role to character ${characterId}:`, error);
  }
};

