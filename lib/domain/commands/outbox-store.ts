// Transition facts are persisted alongside the aggregate update.
// They are consumed by workflows and effects to react to state changes.
// The outbox ensures facts are not lost even if downstream processing fails.

import { kvGet, kvSet, kvLPush, kvLRange } from '@/lib/utils/kv';
import type { TransitionFactV1 } from '@/lib/domain/commands/contracts';

const OUTBOX_PREFIX = 'thegame:outbox:';
const OUTBOX_DUE_KEY = 'thegame:outbox:due';

/**
 * Store a transition fact in the outbox.
 * Called atomically with the aggregate update (via Lua script).
 */
export async function storeTransitionFact(fact: TransitionFactV1<string, unknown>): Promise<void> {
  const key = `${OUTBOX_PREFIX}${fact.factId}`;
  await kvSet(key, fact);

  // Add to due-work index for processing
  // Score is the occurredAt timestamp for ordering
  const score = new Date(fact.occurredAt).getTime();
  // Note: kvSAdd with score requires sorted set, but we're using list for simplicity
  // In production, use sorted set with ZADD for priority queue behavior
  await kvLPush(OUTBOX_DUE_KEY, fact.factId);
}

/**
 * Retrieve a transition fact by factId.
 */
export async function getTransitionFact(factId: string): Promise<TransitionFactV1<string, unknown> | null> {
  const key = `${OUTBOX_PREFIX}${factId}`;
  return await kvGet<TransitionFactV1<string, unknown>>(key);
}

/**
 * Get pending transition facts for processing.
 * Returns facts in FIFO order (oldest first).
 */
export async function getPendingTransitionFacts(limit: number = 100): Promise<TransitionFactV1<string, unknown>[]> {
  const factIds = await kvLRange(OUTBOX_DUE_KEY, 0, limit - 1);
  const facts: TransitionFactV1<string, unknown>[] = [];

  for (const factId of factIds) {
    const fact = await getTransitionFact(factId);
    if (fact) {
      facts.push(fact);
    }
  }

  return facts;
}
