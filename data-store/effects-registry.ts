// data-store/effects-registry.ts
// Idempotency registry stored in KV. Avoids global flags and server HTTP loops.

import { kvGet, kvSet } from './kv';
import { buildEffectKey } from './keys';
import { PROCESSING_CONSTANTS } from '@/lib/constants/app-constants';

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

// Processing stack tracking for circular reference detection (KV-backed)
interface ProcessingItem {
  key: string;
  startedAt: number;
}

const PROCESSING_STACK_KEY = PROCESSING_CONSTANTS.PROCESSING_STACK_KEY;
const MAX_DEPTH = PROCESSING_CONSTANTS.MAX_DEPTH;
const PROCESSING_TIMEOUT_MS = PROCESSING_CONSTANTS.TIMEOUT_MS;

/**
 * Check if an entity is currently being processed
 */
export async function isProcessing(entityType: string, entityId: string): Promise<boolean> {
  const key = `${entityType}:${entityId}`;
  const stack = await kvGet<ProcessingItem[]>(PROCESSING_STACK_KEY) || [];
  return stack.some(item => item.key === key);
}

/**
 * Start processing an entity - throws error if circular reference detected
 */
export async function startProcessing(entityType: string, entityId: string): Promise<void> {
  const key = `${entityType}:${entityId}`;
  
  // Clean up stuck items first
  await cleanupStuckProcessing();
  
  // Get current stack
  const stack = await kvGet<ProcessingItem[]>(PROCESSING_STACK_KEY) || [];
  
  // Check for circular reference
  if (stack.some(item => item.key === key)) {
    throw new Error(`Circular reference detected: ${key}`);
  }
  
  // Check depth limit
  if (stack.length >= MAX_DEPTH) {
    throw new Error(`Max processing depth exceeded: ${MAX_DEPTH}`);
  }
  
  // Add to stack
  const newItem: ProcessingItem = {
    key,
    startedAt: Date.now()
  };
  
  stack.push(newItem);
  await kvSet(PROCESSING_STACK_KEY, stack);
  
  console.log(`[CircuitBreaker] Started processing: ${key} (depth: ${stack.length})`);
}

/**
 * End processing an entity
 */
export async function endProcessing(entityType: string, entityId: string): Promise<void> {
  const key = `${entityType}:${entityId}`;
  
  // Get current stack
  const stack = await kvGet<ProcessingItem[]>(PROCESSING_STACK_KEY) || [];
  
  // Remove the item
  const updatedStack = stack.filter(item => item.key !== key);
  await kvSet(PROCESSING_STACK_KEY, updatedStack);
  
  console.log(`[CircuitBreaker] Ended processing: ${key} (depth: ${updatedStack.length})`);
}

/**
 * Clean up stuck processing items (older than timeout)
 */
export async function cleanupStuckProcessing(): Promise<void> {
  const stack = await kvGet<ProcessingItem[]>(PROCESSING_STACK_KEY) || [];
  const now = Date.now();
  const activeItems = stack.filter(item => (now - item.startedAt) < PROCESSING_TIMEOUT_MS);
  
  if (activeItems.length !== stack.length) {
    const cleanedCount = stack.length - activeItems.length;
    await kvSet(PROCESSING_STACK_KEY, activeItems);
    console.log(`[CircuitBreaker] Cleaned up ${cleanedCount} stuck processing items`);
  }
}

/**
 * Get current processing status for debugging
 */
export async function getProcessingStatus(): Promise<{
  stack: string[];
  depth: number;
  maxDepth: number;
}> {
  const stack = await kvGet<ProcessingItem[]>(PROCESSING_STACK_KEY) || [];
  return {
    stack: stack.map(item => item.key),
    depth: stack.length,
    maxDepth: MAX_DEPTH
  };
}

/**
 * Clear all processing state (emergency reset)
 */
export async function clearProcessingStack(): Promise<void> {
  await kvSet(PROCESSING_STACK_KEY, []);
  console.log(`[CircuitBreaker] Cleared processing stack`);
}


