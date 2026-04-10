/**
 * Character role helpers — derived from `CHARACTER_ROLE_TYPES` in `@/types/enums`.
 * Keeps `enums.ts` declarative (enums + constants only).
 */
import { CHARACTER_ROLE_TYPES, CharacterRole } from '@/types/enums';

const normalizeRoleKey = (value: string): string =>
  value.trim().toLowerCase().replace(/[^a-z]/g, '');

const SPECIAL_LOWER = (CHARACTER_ROLE_TYPES.SPECIAL as readonly CharacterRole[]).map(
  (r) => normalizeRoleKey(r)
);

export const SPECIAL_CHARACTER_ROLE_SET = new Set<string>(SPECIAL_LOWER);
const ROLE_CANONICAL_MAP = new Map<string, CharacterRole>(
  (Object.values(CharacterRole) as CharacterRole[]).map((role) => [
    normalizeRoleKey(role),
    role
  ] as const)
);

export function characterHasSpecialRole(
  roles: (CharacterRole | string)[] | undefined | null
): boolean {
  if (!roles?.length) return false;
  return roles.some(r => SPECIAL_CHARACTER_ROLE_SET.has(normalizeRoleKey(String(r))));
}

export function normalizeCharacterRole(role: CharacterRole | string | null | undefined): CharacterRole | undefined {
  if (!role) return undefined;
  const key = normalizeRoleKey(String(role));
  return ROLE_CANONICAL_MAP.get(key);
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
): string[] {
  if (!roles?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of roles) {
    const key = normalizeRoleKey(String(r));
    const canonicalRole = ROLE_CANONICAL_MAP.get(key);
    if (!canonicalRole || seen.has(canonicalRole)) continue;
    seen.add(canonicalRole);
    out.push(canonicalRole);
  }
  return out;
}
