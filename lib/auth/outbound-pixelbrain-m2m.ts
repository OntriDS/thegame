/**
 * Outbound M2M JWT for TheGame → Pixelbrain calls.
 * Mints tokens via iamService.authenticateM2M (no local HTTP to /api/auth/m2m).
 */

import { iamService } from '@/lib/iam-service';
import { getUTCNow, toUTC } from '@/lib/utils/utc-utils';

/** Refresh if within this window of IAM token expiry (10m). Middle of 30–60s buffer. */
const REFRESH_BUFFER_MS = 45_000;
/** Matches iamService.authenticateM2M JWT exp (~10m). */
const TOKEN_TTL_MS = 10 * 60 * 1000;

let cache: { token: string; issuedAtMs: number } | null = null;

export function clearPixelbrainOutboundM2MTokenCache(): void {
  cache = null;
}

/**
 * Returns a cached JWT when still valid; otherwise exchanges apiKey via IAM.
 * @param apiKey — M2M secret from KV registration for PIXELBRAIN_M2M_APP_ID (default `thegame`)
 */
export async function getCachedPixelbrainOutboundToken(
  apiKey: string
): Promise<{ token: string; expiresAt: Date }> {
  const now = getUTCNow();
  const nowMs = now.getTime();
  if (cache && nowMs < cache.issuedAtMs + TOKEN_TTL_MS - REFRESH_BUFFER_MS) {
    return {
      token: cache.token,
      expiresAt: toUTC(cache.issuedAtMs + TOKEN_TTL_MS),
    };
  }

  const appId = process.env.PIXELBRAIN_M2M_APP_ID || 'thegame';
  const token = await iamService.authenticateM2M(appId, apiKey);
  if (!token) {
    throw new Error('M2M token exchange failed: invalid appId or apiKey');
  }

  cache = { token, issuedAtMs: nowMs };
  return { token, expiresAt: toUTC(nowMs + TOKEN_TTL_MS) };
}
