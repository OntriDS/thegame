// lib/auth-edge.ts
// JWT HS256 verify for Edge runtime using jose
import { jwtVerify } from 'jose';
import { AuthUser } from '@/types/auth-types';
import { CharacterRole, PLAYER_ONE_ID } from '@/types/enums';

export interface JwtClaims {
  sub: string;
  email?: string;
  username?: string;
  roles?: string[];
  characterId?: string;
  isAdmin?: boolean;
  iat?: number;
  exp?: number;
  userId?: string; // Support for multi-user userId
  [key: string]: unknown;
}

function toUint8Array(input: string): Uint8Array {
  return new TextEncoder().encode(input);
}

/**
 * Get environment variable, throw error if not found.
 * Safe for Edge runtime as it uses process.env directly.
 */
export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`${name} is not set. Add it to .env.local and Vercel project settings.`);
  }
  return value;
}

/**
 * Core JWT verification using jose
 */
export async function verifyJwt(token: string, secret: string): Promise<{ valid: boolean; payload?: JwtClaims; reason?: string }> {
  try {
    const key = toUint8Array(secret);
    const { payload } = await jwtVerify(token, key);
    return { valid: true, payload: payload as unknown as JwtClaims };
  } catch (_e) {
    return { valid: false, reason: 'error' };
  }
}

/**
 * Stateless session verification for Edge middleware.
 * Zero Redis calls - reconstructs user from JWT payload.
 */
export async function verifySessionStateless(token: string): Promise<AuthUser | null> {
  try {
    const secret = getRequiredEnv('ADMIN_SESSION_SECRET');
    const verified = await verifyJwt(token, secret);

    if (!verified.valid || !verified.payload) {
      return null;
    }

    const payload = verified.payload;

    // 1. Extract identity (userId or legacy sub)
    let userId = payload.userId || payload.sub;
    const isLegacyAdmin = payload.sub === 'admin';

    // Map legacy 'admin' to PLAYER_ONE_ID
    if (userId === 'admin') {
      userId = PLAYER_ONE_ID;
    }

    if (!userId) {
      return null;
    }

    // 2. Reconstruct AuthUser
    return {
      userId: userId,
      username: payload.username || (isLegacyAdmin ? 'Akiles' : 'Unknown'),
      email: payload.email || '',
      characterId: payload.characterId || (isLegacyAdmin ? PLAYER_ONE_ID : ''),
      roles: Array.from(new Set([
        ...(payload.roles as string[] || []),
        ...(isLegacyAdmin || userId === PLAYER_ONE_ID ? [CharacterRole.FOUNDER, CharacterRole.ADMIN] : [])
      ])),
      isActive: true, // Trusted in stateless mode
    };
  } catch (error) {
    console.error('[AuthEdge] verifySessionStateless error:', error);
    return null;
  }
}
