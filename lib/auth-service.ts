// lib/auth-service.ts
// Professional Multi-User Authentication Service
// Single source of truth for auth logic

import * as bcrypt from 'bcryptjs';
import { AuthUser, AuthSession, AuthPermissions, LoginRequest, LoginResponse, AuthCheckResponse, PermissionsResponse } from '@/types/auth-types';
import { CharacterRole, EntityType, LogEventType, PLAYER_ONE_ID } from '@/types/enums';
import type { Character, Account } from '@/types/entities';
import { kvGet, kvSet, kvDel } from '@/data-store/kv';
import { buildDataKey, buildAccountKey } from '@/data-store/keys';
import { generateJwt, verifyJwt, getRequiredEnv } from './auth';
import { getLinksFor } from '@/links/link-registry';

// ============================================================================
// PERMISSION MATRIX - Role-Based Access Control
// ============================================================================

interface Permission {
  resource: string;
  action: string;
  roles: CharacterRole[];
}

const PERMISSION_MATRIX: Permission[] = [
  // Tasks
  { resource: 'tasks', action: 'read', roles: [CharacterRole.PLAYER, CharacterRole.FOUNDER, CharacterRole.ADMIN, CharacterRole.TEAM, CharacterRole.DEVELOPER] },
  { resource: 'tasks', action: 'write', roles: [CharacterRole.PLAYER, CharacterRole.FOUNDER, CharacterRole.ADMIN, CharacterRole.DEVELOPER] },
  { resource: 'tasks', action: 'delete', roles: [CharacterRole.FOUNDER, CharacterRole.ADMIN] },

  // Finances
  { resource: 'finances', action: 'read', roles: [CharacterRole.FOUNDER, CharacterRole.ADMIN, CharacterRole.INVESTOR] },
  { resource: 'finances', action: 'write', roles: [CharacterRole.FOUNDER, CharacterRole.ADMIN] },

  // Inventory
  { resource: 'inventory', action: 'read', roles: [CharacterRole.FOUNDER, CharacterRole.ADMIN, CharacterRole.PLAYER, CharacterRole.TEAM, CharacterRole.SELLER] },
  { resource: 'inventory', action: 'write', roles: [CharacterRole.FOUNDER, CharacterRole.ADMIN, CharacterRole.PLAYER, CharacterRole.TEAM] },

  // Sales
  { resource: 'sales', action: 'read', roles: [CharacterRole.FOUNDER, CharacterRole.ADMIN, CharacterRole.PLAYER, CharacterRole.TEAM, CharacterRole.SELLER] },
  { resource: 'sales', action: 'write', roles: [CharacterRole.FOUNDER, CharacterRole.ADMIN, CharacterRole.PLAYER, CharacterRole.TEAM, CharacterRole.SELLER] },

  // Player Management
  { resource: 'players', action: 'read', roles: [CharacterRole.FOUNDER, CharacterRole.ADMIN] },
  { resource: 'players', action: 'write', roles: [CharacterRole.FOUNDER] },

  // User Management
  { resource: 'users', action: 'read', roles: [CharacterRole.FOUNDER] },
  { resource: 'users', action: 'write', roles: [CharacterRole.FOUNDER] },

  // Settings
  { resource: 'settings', action: 'read', roles: [CharacterRole.FOUNDER, CharacterRole.ADMIN] },
  { resource: 'settings', action: 'write', roles: [CharacterRole.FOUNDER, CharacterRole.ADMIN] },
];

// ============================================================================
// AUTH SERVICE CLASS
// ============================================================================

export class AuthService {
  // ✅ SINGLE SOURCE OF TRUTH for auth logic

  /**
   * Login user with username and password
   */
  static async login(username: string, password: string, rememberMe: boolean = false): Promise<AuthSession> {
    console.log(`[AuthService] Login attempt for user: ${username}`);

    // 1. Find user by username
    const user = await kvGet<Account>(buildAccountKey(username.toLowerCase()));
    if (!user) {
      console.log('[AuthService] User not found');
      throw new Error('Invalid username or password');
    }

    // 2. Verify password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      console.log('[AuthService] Password mismatch');
      throw new Error('Invalid username or password');
    }

    // 3. Check if account is active and verified
    if (!user.isActive || !user.isVerified) {
      console.log('[AuthService] Account not active or not verified');
      throw new Error('Account is not active or not verified');
    }

    // 4. Get user's character (for roles)
    const characterId = user.characterId;
    if (!characterId) {
      console.log('[AuthService] No character linked to account');
      throw new Error('No character linked to account');
    }

    const character = await kvGet<Character>(buildDataKey('character', characterId));
    if (!character) {
      console.log('[AuthService] Character not found');
      throw new Error('Character not found');
    }

    // 5. Check user's roles
    const userRoles = character.roles || [];
    console.log(`[AuthService] User roles:`, userRoles);

    // 6. Create session with JWT
    const secret = getRequiredEnv('ADMIN_SESSION_SECRET');
    const expiresIn = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7; // 30 days or 7 days

    const token = await generateJwt({
      sub: user.id,
      email: user.email,
      username: user.name,
      roles: userRoles,
      characterId: characterId,
      isAdmin: userRoles.includes(CharacterRole.FOUNDER) || userRoles.includes(CharacterRole.ADMIN)
    }, secret, expiresIn);

    // 7. Update last login time (optional - Account entity may not have this field yet)
    // Note: Account entity has lastLoginAt field, but we're not using it in current implementation
    // Future: Update user.lastLoginAt when Account entity is fully implemented

    const authSession: AuthSession = {
      user: {
        userId: user.id,
        username: user.name,
        email: user.email,
        characterId: characterId,
        roles: userRoles,
        isActive: user.isActive,
      },
      token,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    };

    console.log('[AuthService] ✅ Login successful');
    return authSession;
  }

  /**
   * Logout user (revoke session)
   */
  static async logout(userId: string): Promise<void> {
    console.log(`[AuthService] Logout request for user: ${userId}`);

    // 1. Mark session as revoked (we'd need session tracking for this)
    // Note: Currently Account.entity has sessionToken field, but we're not tracking sessions separately
    // Future: Implement session tracking and revocation

    console.log('[AuthService] ✅ Logout successful (session tracking to be implemented)');
  }

  /**
   * Verify session token and return user info
   */
  static async verifySession(token: string): Promise<AuthUser | null> {
    console.log('[AuthService] Verifying session token');

    const secret = getRequiredEnv('ADMIN_SESSION_SECRET');
    const verified = await verifyJwt(token, secret);

    if (!verified.valid) {
      console.log('[AuthService] Invalid token:', verified.reason);
      return null;
    }

    // Support both multi-user payload (userId) and legacy passphrase payload (sub)
    let userId = (verified.payload as any).userId || (verified.payload as any).sub;
    const isLegacyAdmin = (verified.payload as any).sub === 'admin';

    // Map legacy 'admin' subject to PLAYER_ONE_ID
    if (userId === 'admin') {
      userId = PLAYER_ONE_ID;
    }

    if (!userId) {
      console.log('[AuthService] No userId or sub in token');
      return null;
    }

    const user = await kvGet<Account>(buildAccountKey(userId));
    if (!user) {
      console.log('[AuthService] User not found');
      return null;
    }

    // 3. Get user's character (for roles)
    const characterId = user.characterId;
    if (!characterId) {
      console.log('[AuthService] No character linked to account');
      return null;
    }

    const character = await kvGet<Character>(buildDataKey('character', characterId));
    if (!character) {
      console.log('[AuthService] Character not found');
      return null;
    }

    // 4. Check if account is active
    if (!user.isActive || !user.isVerified) {
      // Legacy admin is always active/verified for now
      if (!isLegacyAdmin) {
        console.log('[AuthService] Account not active or not verified');
        return null;
      }
    }

    const authUser: AuthUser = {
      userId: user.id,
      username: user.name,
      email: user.email,
      characterId: characterId,
      roles: Array.from(new Set([...(character.roles || []), ...(isLegacyAdmin ? [CharacterRole.FOUNDER, CharacterRole.ADMIN] : [])])),
      isActive: user.isActive,
    };

    console.log('[AuthService] ✅ Session verified');
    return authUser;
  }

  /**
   * Get permissions for a user
   */
  static getPermissions(user: AuthUser): AuthPermissions {
    if (!user) {
      console.log('[AuthService] Cannot get permissions for null user');
      return {
        can: () => false,
        hasRole: () => false,
        hasAnyRole: () => false,
      };
    }

    const userRoles = user.roles || [];

    return {
      // Check if user has specific role
      hasRole: (role: string) => {
        // Special case for admin role
        if (role === 'admin' && userRoles.includes(CharacterRole.ADMIN)) return true;
        return userRoles.includes(role);
      },

      // Check if user has any of multiple roles
      hasAnyRole: (roles: string[]) => {
        return roles.some(role => userRoles.includes(role));
      },

      // Check resource/action permissions
      can: (resource: string, action: string) => {
        const matchingPermissions = PERMISSION_MATRIX.filter(
          perm => perm.resource === resource && perm.action === action
        );

        // Check if user has any of the required roles for these permissions
        const hasRequiredRole = matchingPermissions.some(perm =>
          perm.roles.some(role => userRoles.includes(role))
        );

        return hasRequiredRole;
      },
    };
  }

  /**
   * Create user account (for future user management)
   */
  static async createUser(
    username: string,
    email: string,
    password: string,
    characterId: string,
    createdBy: string
  ): Promise<Account> {
    console.log(`[AuthService] Creating user: ${username}`);

    // 1. Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 2. Create user account
    const userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const newUser: Account = {
      id: userId,
      name: username,
      email: email,
      passwordHash,
      loginAttempts: 0,
      isActive: true,
      isVerified: false,
      privacySettings: {
        showEmail: false,
        showPhone: false,
        showRealName: true,
      },
      characterId: characterId,
      lastActiveAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      links: [],
    };

    // 3. Save to KV
    await kvSet(buildAccountKey(userId), newUser);

    console.log('[AuthService] ✅ User created');
    return newUser;
  }

  /**
   * Update user roles (for role management)
   */
  static async updateUserRoles(
    userId: string,
    newRoles: string[],
    updatedBy: string
  ): Promise<void> {
    console.log(`[AuthService] Updating roles for user: ${userId} to:`, newRoles);

    // 1. Verify updater has FOUNDER role
    // Note: This would need to be checked when implementing user management UI

    // 2. Get user's character
    const user = await kvGet<Account>(buildAccountKey(userId));
    if (!user || !user.characterId) {
      console.log('[AuthService] User or character not found');
      throw new Error('User or character not found');
    }

    const character = await kvGet<Character>(buildDataKey('character', user.characterId));
    if (!character) {
      console.log('[AuthService] Character not found');
      throw new Error('Character not found');
    }

    // 3. Update character roles
    const updatedCharacter = {
      ...character,
      roles: newRoles,
      updatedAt: new Date(),
    };

    await kvSet(buildDataKey('character', character.id), updatedCharacter);

    console.log('[AuthService] ✅ Character roles updated');
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const authService = new AuthService();
