// lib/api-auth.ts
// API Authentication Utility for protecting API routes
// Ensures only authenticated admin users can access API endpoints

import { NextRequest } from 'next/server';
import { iamService } from './iam-service';
import { CharacterRole } from '@/types/enums';

function extractAuthToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  return (
    bearerToken ||
    req.cookies.get('auth_session')?.value ||
    req.cookies.get('admin_session')?.value ||
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

    if (user && user.isActive) {
      // console.log('[API Auth] User authenticated successfully');
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error('[API Auth] Error verifying authentication:', error);
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

    const roles = Array.isArray(user.roles)
      ? user.roles.map((role) => String(role).toLowerCase())
      : [];

    return roles.includes(CharacterRole.FOUNDER);
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

    const roles = Array.isArray(user.roles)
      ? user.roles.map((role) => String(role).toLowerCase())
      : [];

    if (!roles.includes(CharacterRole.AI_AGENT)) {
      return false;
    }

    if (user.accountId !== 'system' || user.characterId !== 'system') {
      return false;
    }

    const username = String(user.username || '').trim().toLowerCase();
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


