/**
 * Shared JWT verification for Pixelbrain-facing API routes in TheGame.
 * Allows human admin sessions (Bearer or cookie) and M2M tokens (Bearer only).
 */

import { NextRequest } from 'next/server';
import { iamService } from '@/lib/iam-service';
import { CharacterRole } from '@/types/enums';

export type PixelbrainRouteAuthResult =
  | { ok: true; user: NonNullable<Awaited<ReturnType<typeof iamService.verifyJWT>>> }
  | { ok: false; status: 401 | 403; message: string };

const ALLOWED_ROLES = new Set<string>([
  CharacterRole.FOUNDER,
  CharacterRole.TEAM,
  CharacterRole.AI_AGENT,
]);

function hasAllowedRole(roles: string[] | undefined): boolean {
  if (!roles?.length) return false;
  return roles.some((r) => ALLOWED_ROLES.has(String(r).toLowerCase()));
}

/**
 * Extract Bearer token from Authorization header (case-insensitive).
 */
function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.substring(7).trim() || null;
}

/**
 * Verify the caller is allowed to use Pixelbrain admin routes (connect / disconnect / agent request).
 */
export async function verifyPixelbrainRouteAccess(
  request: NextRequest
): Promise<PixelbrainRouteAuthResult> {
  const bearer = getBearerToken(request);
  const sessionCookie = request.cookies.get('auth_session')?.value;
  const token = bearer ?? sessionCookie;

  if (!token) {
    return { ok: false, status: 401, message: 'Missing authentication token' };
  }

  const user = await iamService.verifyJWT(token);
  if (!user || !user.isActive) {
    return { ok: false, status: 401, message: 'Invalid or expired session' };
  }

  if (!hasAllowedRole(user.roles as string[])) {
    return { ok: false, status: 403, message: 'Insufficient permissions' };
  }

  return { ok: true, user };
}
