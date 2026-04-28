// lib/api-auth.ts
// API Authentication Utility for protecting API routes
// Ensures only authenticated admin users can access API endpoints

import { NextRequest } from 'next/server';
import { iamService } from './iam-service';
import { CharacterRole } from '@/types/enums';
import { isFounder, isGameAdmin } from '@/integrity/iam/permissions';

function extractAuthRoles(user: { roles?: unknown } | null): string[] {
  if (!user?.roles || !Array.isArray(user.roles)) {
    return [];
  }

  return user.roles
    .map((role) => String(role).toLowerCase())
    .filter((role) => role.length > 0);
}

function extractAuthToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  return (
    bearerToken ||
    req.cookies.get('iam_session')?.value ||
    null
  );
}

function getProvisioningM2MApps(): string[] {
  const raw = process.env.THEGAME_M2M_PROVISIONING_APPS?.trim() || process.env.AKILES_ECOSYSTEM_M2M_APP_ID?.trim() || 'akiles-ecosystem';
  return raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);
}

/**
 * Require admin authentication for API routes
 * Returns true if user is authenticated, false otherwise
 */
export async function requireAdminAuth(req: NextRequest): Promise<boolean> {
  try {
    const token = extractAuthToken(req);

    if (!token) {
      return false;
    }

    // Verify the JWT token using centralized IAM service
    const user = await iamService.verifyJWT(token);

    if (user?.isActive && isGameAdmin(user.roles)) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error('[API Auth] Error verifying authentication:', error);
    return false;
  }
}

/**
 * Allows both Admin users and authorized M2M applications
 */
export async function requireAdminOrM2MAuth(req: NextRequest): Promise<boolean> {
  try {
    const token = extractAuthToken(req);
    if (!token) return false;

    // 1. Try JWT (User)
    const user = await iamService.verifyJWT(token);
    if (user?.isActive && isGameAdmin(user.roles)) return true;

    // 2. Try M2M
    const m2m = await iamService.verifyM2MToken(token);
    if (m2m.valid && m2m.appId && getProvisioningM2MApps().includes(m2m.appId)) return true;

    return false;
  } catch (error) {
    console.error('[API Auth] Error verifying Admin/M2M authentication:', error);
    return false;
  }
}

export async function requireFounderAdminAuth(req: NextRequest): Promise<boolean> {
  try {
    const token = extractAuthToken(req);

    if (!token) {
      return false;
    }

    const user = await iamService.verifyJWT(token);
    if (!user || !user.isActive) {
      return false;
    }

    return isFounder(user.roles);
  } catch (error) {
    console.error('[API Auth] Error verifying founder authorization:', error);
    return false;
  }
}

export async function requireProvisioningM2MAuth(req: NextRequest): Promise<boolean> {
  try {
    const token = extractAuthToken(req);
    if (!token) {
      return false;
    }

    const user = await iamService.verifyJWT(token);
    if (!user || !user.isActive) {
      return false;
    }

    const roles = extractAuthRoles(user);

    if (!roles.includes(CharacterRole.AI_AGENT.toLowerCase())) {
      return false;
    }

    if (user.accountId !== 'system' || user.characterId !== 'system') {
      return false;
    }

    const username = String((user as { appId?: string }).appId || user.username || '').trim().toLowerCase();
    if (!username) {
      return false;
    }

    const allowedApps = getProvisioningM2MApps();
    return allowedApps.includes(username);
  } catch (error) {
    console.error('[API Auth] Error verifying M2M authorization:', error);
    return false;
  }
}


