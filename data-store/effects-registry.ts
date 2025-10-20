// data-store/effects-registry.ts
// Idempotency registry stored in KV. Avoids global flags and server HTTP loops.

import { kvGet, kvSet } from './kv';
import { buildEffectKey } from './keys';

export async function hasEffect(effectKey: string): Promise<boolean> {
  const key = buildEffectKey(effectKey);
  const val = await kvGet<boolean>(key);
  return val === true;
}

export async function markEffect(effectKey: string, ttl?: number): Promise<void> {
  const key = buildEffectKey(effectKey);
  await kvSet(key, true);
}

export async function clearEffect(effectKey: string): Promise<void> {
  const key = buildEffectKey(effectKey);
  await kvSet(key, false);
}

export async function clearEffectsByPrefix(entityType: string, entityId: string, prefix: string): Promise<void> {
  // For now, we'll implement a simple version that clears all effects for an entity
  // In a full implementation, this would scan and clear effects with the given prefix
  console.log(`[clearEffectsByPrefix] Clearing effects for ${entityType}:${entityId} with prefix: ${prefix}`);
  // TODO: Implement proper prefix-based clearing when needed
}

// ============================================================================
// LIGHTWEIGHT CIRCUIT BREAKER: Circular reference detection and depth limits
// ============================================================================

// Processing stack tracking for circular reference detection
const processingStack = new Set<string>();
const MAX_DEPTH = 5;

/**
 * Check if an entity is currently being processed
 */
export function isProcessing(entityType: string, entityId: string): boolean {
  return processingStack.has(`${entityType}:${entityId}`);
}

/**
 * Start processing an entity - throws error if circular reference detected
 */
export function startProcessing(entityType: string, entityId: string): void {
  const key = `${entityType}:${entityId}`;
  
  if (processingStack.has(key)) {
    throw new Error(`Circular reference detected: ${key}`);
  }
  
  if (processingStack.size >= MAX_DEPTH) {
    throw new Error(`Max processing depth exceeded: ${MAX_DEPTH}`);
  }
  
  processingStack.add(key);
  console.log(`[CircuitBreaker] Started processing: ${key} (depth: ${processingStack.size})`);
}

/**
 * End processing an entity
 */
export function endProcessing(entityType: string, entityId: string): void {
  const key = `${entityType}:${entityId}`;
  processingStack.delete(key);
  console.log(`[CircuitBreaker] Ended processing: ${key} (depth: ${processingStack.size})`);
}

/**
 * Get current processing status for debugging
 */
export function getProcessingStatus(): {
  stack: string[];
  depth: number;
  maxDepth: number;
} {
  return {
    stack: Array.from(processingStack),
    depth: processingStack.size,
    maxDepth: MAX_DEPTH
  };
}

/**
 * Clear all processing state (emergency reset)
 */
export function clearProcessingStack(): void {
  processingStack.clear();
  console.log(`[CircuitBreaker] Cleared processing stack`);
}


