/**
 * Character role helpers — derived from `CHARACTER_ROLE_TYPES` in `@/types/enums`.
 * Keeps `enums.ts` declarative (enums + constants only).
 */
import { CHARACTER_ROLE_TYPES, type CharacterRole } from '@/types/enums';

const SPECIAL_LOWER = (CHARACTER_ROLE_TYPES.SPECIAL as readonly string[]).map(r => r.toLowerCase());

export const SPECIAL_CHARACTER_ROLE_SET = new Set<string>(SPECIAL_LOWER);

export function characterHasSpecialRole(
  roles: (CharacterRole | string)[] | undefined | null
): boolean {
  if (!roles?.length) return false;
  return roles.some(r => SPECIAL_CHARACTER_ROLE_SET.has(String(r).toLowerCase()));
}

export function filterRolesToSpecialOnly(
  roles: (CharacterRole | string)[] | undefined | null
): string[] {
  if (!roles?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of roles) {
    const key = String(r).toLowerCase();
    if (!SPECIAL_CHARACTER_ROLE_SET.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}
