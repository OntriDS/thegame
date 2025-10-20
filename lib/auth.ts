// lib/auth.ts
// JWT (HS256) utilities for Node runtime (route handlers)
import { SignJWT, jwtVerify } from 'jose';

export interface JwtClaims {
  sub: string;
  role: string;
  iat: number; // issued at (seconds since epoch)
  exp: number; // expiry (seconds since epoch)
  [key: string]: unknown;
}

function toUint8Array(input: string): Uint8Array {
  return new TextEncoder().encode(input);
}

export async function generateJwt(claims: Omit<JwtClaims, 'iat' | 'exp'>, secret: string, expiresInSeconds: number): Promise<string> {
  const key = toUint8Array(secret);
  const nowSeconds = Math.floor(Date.now() / 1000);
  return await new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(nowSeconds)
    .setExpirationTime(nowSeconds + expiresInSeconds)
    .sign(key);
}

export async function verifyJwt(token: string, secret: string): Promise<{ valid: boolean; payload?: JwtClaims; reason?: string }> {
  try {
    const key = toUint8Array(secret);
    const { payload } = await jwtVerify(token, key);
    return { valid: true, payload: payload as unknown as JwtClaims };
  } catch (_e) {
    return { valid: false, reason: 'error' };
  }
}

export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`${name} is not set. Add it to .env.local and Vercel project settings.`);
  }
  return value;
}
