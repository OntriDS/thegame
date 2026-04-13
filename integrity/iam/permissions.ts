/**
 * IAM permissions — canonical policy (TheGame).
 *
 * Edit here first. Before deploy, copy this file to:
 *   - akiles-ecosystem/integrity/iam/permissions.ts
 *   - pixelbrain/integrity/iam/permissions.ts
 *
 * Each app imports `@/integrity/iam/permissions` from its own copy for Vercel builds.
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


/**
 * PERMISSION_MATRIX — authorization keys for APIs / admin gates (`canAccess`, `createPermissionEvaluator().can`).
 *
 * NOT WIRED TO THE SYSTEM REALLY (YET)
 *
 * CRUD columns do not need to be symmetric: if nothing checks `delete`, omit it until it exists.
 * Role strings must match normalized JWT / character roles (lowercase).
 *
 * Keep the akiles-ecosystem and pixelbrain copies identical when you change this matrix.
 */
export const PERMISSION_MATRIX: readonly PermissionRule[] = [
  { resource: 'dashboards', action: 'enter', roles: ['founder', 'team', 'apprentice'] },   // Enter Dashboard Section: founder, team, apprentice
  { resource: 'control-room', action: 'enter', roles: ['founder', 'team', 'apprentice'] }, // Enter Control Room Section: founder, team, apprentice
  { resource: 'tasks', action: 'create', roles: ['founder'] },                            // Create Task: when 'team', 'apprentice' after having theirr own tasks
  { resource: 'tasks', action: 'read', roles: ['founder', 'team', 'apprentice'] },        // Read Task: founder, team, apprentice
  { resource: 'tasks', action: 'update', roles: ['founder', 'team', 'apprentice'] },      // Update Task: founder, team, apprentice
  { resource: 'tasks', action: 'delete', roles: ['founder'] },                            // Delete Task: Reserved to Founder
  { resource: 'inventory', action: 'enter', roles: ['founder', 'team', 'apprentice'] },   // Enter Inventory Section
  { resource: 'items', action: 'create', roles: ['founder', 'team', 'apprentice'] },      // Create Item: founder, team, apprentice
  { resource: 'items', action: 'read', roles: ['founder', 'team', 'apprentice'] },        // Read Item: founder, team, apprentice
  { resource: 'items', action: 'update', roles: ['founder', 'team', 'apprentice'] },      // Update Item: founder, team, apprentice
  { resource: 'items', action: 'delete', roles: ['founder', 'team', 'apprentice'] },      // Delete Item: founder, team, apprentice
  { resource: 'finances', action: 'enter', roles: ['founder'] },                          // Enter Finances Section: Only for Founder at the moment
  { resource: 'financials', action: 'create', roles: ['founder'] },                       // Create Financial: when 'team', 'apprentice' after having theirr own pesonal financials
  { resource: 'financials', action: 'read', roles: ['founder'] },                         // Read Financial: when 'team', 'apprentice' after having theirr own pesonal financials
  { resource: 'financials', action: 'update', roles: ['founder'] },                       // Update Financial: when 'team', 'apprentice' after having theirr own pesonal financials
  { resource: 'financials', action: 'delete', roles: ['founder'] },                       // Delete Financial: Reserved to Founder
  { resource: 'sales', action: 'enter', roles: ['founder', 'team', 'apprentice'] },       // Enter Sales Section: founder, team, apprentice
  { resource: 'sale', action: 'create', roles: ['founder', 'team', 'apprentice'] },       // Create Sale: founder, team, apprentice
  { resource: 'sale', action: 'read', roles: ['founder', 'team', 'apprentice'] },         // Read Sale: founder, team, apprentice
  { resource: 'sale', action: 'update', roles: ['founder', 'team', 'apprentice'] },       // Update Sale: founder, team, apprentice
  { resource: 'sale', action: 'delete', roles: ['founder'] },                             // Delete Sale: Reserved to Founder
  { resource: 'maps', action: 'enter', roles: ['founder', 'team', 'apprentice'] },        // Enter Map Section
  { resource: 'sites', action: 'create', roles: ['founder', 'team', 'apprentice'] },      // Create Site: founder, team, apprentice
  { resource: 'sites', action: 'read', roles: ['founder', 'team', 'apprentice'] },        // Read Site: founder, team, apprentice
  { resource: 'sites', action: 'update', roles: ['founder'] },                            // Update Site: when 'team', 'apprentice' after having theirr own sites
  { resource: 'sites', action: 'delete', roles: ['founder'] },                            // Delete Site: Reserved to Founder
  { resource: 'characters', action: 'enter', roles: ['founder', 'team', 'apprentice'] },  // Enter Characters Section
  { resource: 'character', action: 'create', roles: ['founder', 'team', 'apprentice'] },  // Create Character: founder, team, apprentice
  { resource: 'character', action: 'read', roles: ['founder', 'team', 'apprentice'] },    // Read Character: founder, team, apprentice
  { resource: 'character', action: 'update', roles: ['founder', 'team', 'apprentice'] },  // Update Character: founder, team, apprentice
  { resource: 'character', action: 'update-roles', roles: ['founder'] },                  // Update Character Roles : Reserved to Founder
  { resource: 'character', action: 'delete', roles: ['founder'] },                        // Delete Character: Reserved to Founder
  { resource: 'players', action: 'enter', roles: ['founder', 'player'] },                 // Enter Player Section: founder, player
  { resource: 'player', action: 'create', roles: ['founder',] },                          // Create Player: Reserved to founder
  { resource: 'player', action: 'read', roles: ['founder', 'player', ] },                 // Read Player: founder, player
  { resource: 'player', action: 'update', roles: ['founder', 'player'] },                 // Update Player: founder, player
  { resource: 'player', action: 'delete', roles: ['founder'] },                           // Delete Player: Reserved to Founder
  { resource: 'accounts', action: 'enter', roles: ['founder'] },                          // Enter Accounts Section: Only for Founder at the moment
  { resource: 'accounts', action: 'create', roles: ['founder'] },                         // Create Account: Reserved to Founder
  { resource: 'accounts', action: 'read', roles: ['founder'] },                           // Read Account: Reserved to Founder
  { resource: 'accounts', action: 'update', roles: ['founder'] },                         // Update Account: Reserved to Founder
  { resource: 'accounts', action: 'delete', roles: ['founder'] },                         // Delete Account: Reserved to Founder
  { resource: 'settings', action: 'enter', roles: ['founder'] },                          // Enter Settings Section: Only for Founder at the moment
  { resource: 'settings', action: 'create', roles: ['founder'] },                         // Create Setting: Reserved to Founder
  { resource: 'settings', action: 'read', roles: ['founder'] },                           // Read Setting: Reserved to Founder
  { resource: 'settings', action: 'update', roles: ['founder'] },                         // Update Setting: Reserved to Founder
  { resource: 'settings', action: 'delete', roles: ['founder'] },                         // Delete Setting: Reserved to Founder
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
