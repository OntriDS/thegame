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

export const PRIVILEGED_ROLES = ['founder'] as const;

export const THEGAME_PERMISSION_MATRIX: readonly PermissionRule[] = [
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
  permissionMatrix: readonly PermissionRule[] = THEGAME_PERMISSION_MATRIX,
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

export function isPrivileged(roles: unknown): boolean {
  return hasAnyRole(roles, PRIVILEGED_ROLES);
}

export function createPermissionEvaluator(
  rawRoles: unknown,
  permissionMatrix: readonly PermissionRule[] = THEGAME_PERMISSION_MATRIX,
): AuthPermissions {
  const normalizedRoles = normalizeRoles(rawRoles);
  const hasFounder = isPrivileged(normalizedRoles);

  return {
    hasRole: (role: string) => {
      if (hasFounder) return true;
      const normalizedRole = normalizeRole(role);
      if (!normalizedRole) return false;
      return normalizedRoles.includes(normalizedRole);
    },
    hasAnyRole: (roles: readonly string[]) => {
      if (hasFounder) return true;
      return normalizeRoles(roles).some((role) => normalizedRoles.includes(role));
    },
    can: (resource: string, action: string) => {
      if (hasFounder) return true;
      return canAccess(normalizedRoles, resource, action, permissionMatrix);
    },
  };
}
