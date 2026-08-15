// Every command gets a stored outcome. The same commandId returns the stored outcome (idempotency).
// This prevents duplicate work on retry and provides a consistent API response.

import { kvGet, kvSet } from '@/lib/utils/kv';
import type { CommandOutcomeV1, CommandId } from '@/lib/domain/commands/contracts';

const COMMAND_OUTCOME_PREFIX = 'thegame:command:';

/**
 * Store a command outcome durably.
 * Called after successful aggregate update.
 */
export async function storeCommandOutcome(outcome: CommandOutcomeV1): Promise<void> {
  const key = `${COMMAND_OUTCOME_PREFIX}${outcome.commandId}`;
  await kvSet(key, outcome);
}

/**
 * Retrieve a stored command outcome by commandId.
 * Returns null if the command has not been executed.
 *
 * This enables idempotency: if a command is retried with the same commandId,
 * the caller receives the original outcome instead of re-executing.
 */
export async function getCommandOutcome(commandId: CommandId): Promise<CommandOutcomeV1 | null> {
  const key = `${COMMAND_OUTCOME_PREFIX}${commandId}`;
  return await kvGet<CommandOutcomeV1>(key);
}

/**
 * Check if a command has already been executed.
 * Lightweight check without loading the full outcome.
 */
export async function hasCommandOutcome(commandId: CommandId): Promise<boolean> {
  const outcome = await getCommandOutcome(commandId);
  return outcome !== null;
}
