// The legacy effects-registry.ts uses simple Boolean flags:
//   hasEffect(key) → true/false
//   markEffect(key) → sets true
//   clearEffect(key) → sets false
//
// The canonical model uses EffectClaimV1 with atomic lifecycle.
// This bridge reads legacy Boolean as a completed compatibility claim.
//
// Rules:
// - legacy true → read as completed compatibility claim
// - legacy false/absent → eligible for atomic claim
// - new effects → claims only (no Boolean writes)

import { kvGet, kvSet } from '@/lib/utils/kv';
import type { EffectClaimV1 } from '@/types/entities';
import { EffectClaimStatus } from '@/types/enums';

const LEGACY_EFFECT_PREFIX = 'thegame:effects:';
const CANONICAL_EFFECT_PREFIX = 'thegame:effect:';

/**
 * Check if an effect has been completed.
 *
 * Checks canonical claim first, then falls back to legacy Boolean.
 * This enables gradual migration: existing Boolean flags are treated as completed claims.
 */
export async function hasEffectCompleted(idempotencyKey: string): Promise<boolean> {
  // 1. Check canonical claim first
  const canonicalKey = `${CANONICAL_EFFECT_PREFIX}${idempotencyKey}`;
  const canonicalClaim = await kvGet<EffectClaimV1>(canonicalKey);
  if (canonicalClaim?.status === EffectClaimStatus.COMPLETED) {
    return true;
  }

  // 2. Fall back to legacy Boolean
  const legacyKey = `${LEGACY_EFFECT_PREFIX}${idempotencyKey}`;
  const legacyValue = await kvGet<boolean>(legacyKey);
  return legacyValue === true;
}

/**
 * Get the effect claim, synthesizing a compatibility claim from legacy Boolean if needed.
 *
 * If a canonical claim exists, return it.
 * If only a legacy Boolean exists (true), synthesize a completed compatibility claim.
 * If neither exists, return null.
 */
export async function getEffectClaimWithLegacy(idempotencyKey: string): Promise<EffectClaimV1 | null> {
  // 1. Check canonical claim
  const canonicalKey = `${CANONICAL_EFFECT_PREFIX}${idempotencyKey}`;
  const canonicalClaim = await kvGet<EffectClaimV1>(canonicalKey);
  if (canonicalClaim) {
    return canonicalClaim;
  }

  // 2. Check legacy Boolean
  const legacyKey = `${LEGACY_EFFECT_PREFIX}${idempotencyKey}`;
  const legacyValue = await kvGet<boolean>(legacyKey);
  if (legacyValue === true) {
    // Synthesize a completed compatibility claim
    return {
      idempotencyKey,
      status: EffectClaimStatus.COMPLETED,
      commandId: 'legacy-bridge',
      ownerId: 'legacy-system',
      leaseToken: 'legacy-bridge',
      leaseExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      attempts: 1,
      createdAt: new Date(0).toISOString(), // Unknown creation time
      updatedAt: new Date(0).toISOString(),
    };
  }

  return null;
}

/**
 * Mark an effect as completed in the legacy Boolean registry.
 *
 * This is for backward compatibility during migration.
 * New code should use acquireEffectClaim + resolveEffectClaim instead.
 */
export async function markEffectLegacy(idempotencyKey: string): Promise<void> {
  const legacyKey = `${LEGACY_EFFECT_PREFIX}${idempotencyKey}`;
  await kvSet(legacyKey, true);
}

/**
 * Clear an effect in the legacy Boolean registry.
 *
 * This is for backward compatibility during migration.
 * New code should use the canonical claim lifecycle instead.
 */
export async function clearEffectLegacy(idempotencyKey: string): Promise<void> {
  const legacyKey = `${LEGACY_EFFECT_PREFIX}${idempotencyKey}`;
  await kvSet(legacyKey, false);
}
