/**
 * INTEGRITY (thegame)
 *
 * This is the per-project local copy used by this application.
 * The single source of truth for policy edits is intentionally maintained via an
 * out-of-repo sync workflow until a package/submodule strategy is adopted.
 *
 * IMPORTANT:
 * - If a change is made here, apply the same change in:
 *   - akiles-ecosystem/integrity/iam/permissions.ts
 *   - pixelbrain/integrity/iam/permissions.ts
 */
export interface PermissionRule {
  resource: string;
  action: string;
  roles: readonly string[];
}

export interface AuthPermissions {
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: readonly string[]) => boolean;
  can: (resource: string, action: string) => boolean;
}

export const CHARACTERS_SPECIAL_ROLES = {
  FOUNDER: 'founder',
  PLAYER: 'player',
  APPRENTICE: 'apprentice',
  TEAM: 'team',
  FAMILY: 'family',
  INVESTOR: 'investor',
  PARTNER: 'partner',
  AI_AGENT: 'ai-agent',
  CUSTOMER: 'customer',
  BENEFICIARY: 'beneficiary',
} as const;

// FOUNDER acts as the 'System Admin, God Rights Role'.
export const FOUNDER_ROLE = CHARACTERS_SPECIAL_ROLES.FOUNDER;

export const SPECIAL_ROLES = [
  CHARACTERS_SPECIAL_ROLES.FOUNDER,
  CHARACTERS_SPECIAL_ROLES.PLAYER,
  CHARACTERS_SPECIAL_ROLES.APPRENTICE,
  CHARACTERS_SPECIAL_ROLES.TEAM,
  CHARACTERS_SPECIAL_ROLES.FAMILY,
  CHARACTERS_SPECIAL_ROLES.INVESTOR,
  CHARACTERS_SPECIAL_ROLES.PARTNER,
  CHARACTERS_SPECIAL_ROLES.AI_AGENT,
  CHARACTERS_SPECIAL_ROLES.CUSTOMER,
  CHARACTERS_SPECIAL_ROLES.BENEFICIARY,
] as const;

export const PERMISSION_MATRIX: readonly PermissionRule[] = [
  { resource: 'tasks', action: 'read', roles: ['founder', 'team'] },
  { resource: 'tasks', action: 'write', roles: ['founder', 'team'] },
  { resource: 'tasks', action: 'delete', roles: ['founder'] },
  { resource: 'finances', action: 'read', roles: ['founder'] },
  { resource: 'finances', action: 'write', roles: ['founder'] },
  { resource: 'inventory', action: 'read', roles: ['founder', 'team'] },
  { resource: 'inventory', action: 'write', roles: ['founder', 'team'] },
  { resource: 'sales', action: 'read', roles: ['founder', 'team'] },
  { resource: 'sales', action: 'write', roles: ['founder', 'team'] },
  { resource: 'players', action: 'read', roles: ['founder'] },
  { resource: 'players', action: 'write', roles: ['founder'] },
  { resource: 'users', action: 'read', roles: ['founder'] },
  { resource: 'users', action: 'write', roles: ['founder'] },
  { resource: 'settings', action: 'read', roles: ['founder'] },
  { resource: 'settings', action: 'write', roles: ['founder'] },
] as const;

function normalizeRole(role: unknown): string | null {
  if (typeof role !== 'string') return null;
  const normalized = role.trim().toLowerCase();
  return normalized.length ? normalized : null;
}

export function normalizeRoles(rawRoles: unknown): string[] {
  if (!rawRoles) return [];
  if (Array.isArray(rawRoles)) {
    return rawRoles.map(normalizeRole).filter((value): value is string => !!value);
  }
  const role = normalizeRole(rawRoles);
  return role ? [role] : [];
}

export function hasAnyRole(roles: unknown, requiredRoles: readonly string[]): boolean {
  const normalizedRoles = normalizeRoles(roles);
  const normalizedRequired = normalizeRoles(requiredRoles);
  return normalizedRequired.some((required) => normalizedRoles.includes(required));
}

function normalizeResourceAction(value: string): string {
  return value.trim().toLowerCase();
}

export function canAccess(
  roles: unknown,
  resource: string,
  action: string,
  permissionMatrix: readonly PermissionRule[] = PERMISSION_MATRIX,
): boolean {
  const normalizedRoles = normalizeRoles(roles);
  const normalizedResource = normalizeResourceAction(resource);
  const normalizedAction = normalizeResourceAction(action);

  const matching = permissionMatrix.filter(
    (permission) =>
      normalizeResourceAction(permission.resource) === normalizedResource &&
      normalizeResourceAction(permission.action) === normalizedAction,
  );

  return matching.some((permission) =>
    permission.roles.some((permissionRole) => normalizedRoles.includes(normalizeRole(permissionRole)!)),
  );
}

export function isGameAdmin(roles: unknown): boolean {
  return hasAnyRole(roles, [FOUNDER_ROLE]);
}

export function isFounder(roles: unknown): boolean {
  return hasAnyRole(roles, [CHARACTERS_SPECIAL_ROLES.FOUNDER]);
}

export function isTeam(roles: unknown): boolean {
  return hasAnyRole(roles, [CHARACTERS_SPECIAL_ROLES.TEAM]);
}

export function isApprentice(roles: unknown): boolean {
  return hasAnyRole(roles, [CHARACTERS_SPECIAL_ROLES.APPRENTICE]);
}

export function isCustomer(roles: unknown): boolean {
  return hasAnyRole(roles, [CHARACTERS_SPECIAL_ROLES.CUSTOMER]);
}

export function isPlayer(roles: unknown): boolean {
  return hasAnyRole(roles, [CHARACTERS_SPECIAL_ROLES.PLAYER]);
}

export function isPartner(roles: unknown): boolean {
  return hasAnyRole(roles, [CHARACTERS_SPECIAL_ROLES.PARTNER]);
}

export function isSpecialRole(roles: unknown): boolean {
  return hasAnyRole(roles, SPECIAL_ROLES);
}

export function createPermissionEvaluator(
  rawRoles: unknown,
  permissionMatrix: readonly PermissionRule[] = PERMISSION_MATRIX,
): AuthPermissions {
  const normalizedRoles = normalizeRoles(rawRoles);
  const hasAdminRight = isGameAdmin(normalizedRoles);

  return {
    hasRole: (role: string) => {
      if (hasAdminRight) return true;
      const normalizedRole = normalizeRole(role);
      if (!normalizedRole) return false;
      return normalizedRoles.includes(normalizedRole);
    },
    hasAnyRole: (roles: readonly string[]) => {
      if (hasAdminRight) return true;
      return normalizeRoles(roles).some((role) => normalizedRoles.includes(role));
    },
    can: (resource: string, action: string) => {
      if (hasAdminRight) return true;
      return canAccess(normalizedRoles, resource, action, permissionMatrix);
    },
  };
}
