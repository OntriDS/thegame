// lib/auth-edge.ts
// JWT HS256 verify for Edge runtime using jose
import { jwtVerify } from 'jose';

export interface JwtClaims {
  sub: string;
  role: string;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}

function toUint8Array(input: string): Uint8Array {
  return new TextEncoder().encode(input);
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
