/**
 * Character role helpers — derived from `CHARACTER_ROLE_TYPES` in `@/types/enums`.
 * Keeps `enums.ts` declarative (enums + constants only).
 */
import { CHARACTER_ROLE_TYPES, CharacterRole } from '@/types/enums';

const ROLE_LOOKUP = new Set<string>(Object.values(CharacterRole) as string[]);
const SPECIAL_ROLE_SET = new Set<CharacterRole>(
  CHARACTER_ROLE_TYPES.SPECIAL as readonly CharacterRole[],
);

const normalizeCharacterRoleValue = (role: string): CharacterRole | undefined => {
  const normalized = role.trim().toLowerCase();
  return ROLE_LOOKUP.has(normalized) ? (normalized as CharacterRole) : undefined;
};

export function characterHasSpecialRole(
  roles: readonly (CharacterRole | string)[] | undefined | null
): boolean {
  if (!roles?.length) return false;
  return roles.some((rawRole) => {
    const role = normalizeCharacterRole(rawRole);
    return !!role && SPECIAL_ROLE_SET.has(role);
  });
}

export function normalizeCharacterRole(role: CharacterRole | string | null | undefined): CharacterRole | undefined {
  if (!role || typeof role !== 'string') return undefined;
  return normalizeCharacterRoleValue(role);
}

export function normalizeCharacterRoles(
  roles: (CharacterRole | string)[] | undefined | null
): CharacterRole[] {
  if (!roles?.length) return [];
  const unique = new Set<CharacterRole>();
  for (const role of roles) {
    const normalized = normalizeCharacterRole(role);
    if (normalized) unique.add(normalized);
  }
  return [...unique];
}

export function filterRolesToSpecialOnly(
  roles: (CharacterRole | string)[] | undefined | null
): CharacterRole[] {
  if (!roles?.length) return [];
  const seen = new Set<CharacterRole>();
  const out: CharacterRole[] = [];
  for (const r of roles) {
    const role = normalizeCharacterRole(r);
    if (!role || !SPECIAL_ROLE_SET.has(role) || seen.has(role)) {
      continue;
    }
    seen.add(role);
    out.push(role);
  }
  return out;
}
