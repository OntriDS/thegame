import { kvGet, kvSetWithTTL } from '@/lib/utils/kv';

export type CommandStatus = 'PENDING' | 'SUCCESS' | 'ERROR';

export interface CommandResult {
  commandId: string;
  status: CommandStatus;
  result?: any; // The entity or workflow ID resulting from the command
  error?: string; // Error message if status is ERROR
  timestamp: string;
}

const COMMAND_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Retrieves a previously executed command's result by its ID.
 * Used to handle ambiguous-commits (retries after network timeouts).
 */
export async function getCommandResult(commandId: string): Promise<CommandResult | null> {
  if (!commandId) return null;
  return await kvGet<CommandResult>(`command-result:${commandId}`);
}

/**
 * Saves the result of a command execution.
 * We store this with a TTL so it doesn't grow indefinitely.
 */
export async function saveCommandResult(commandId: string, result: Omit<CommandResult, 'commandId'>): Promise<void> {
  if (!commandId) return;
  const payload: CommandResult = {
    commandId,
    ...result,
  };
  await kvSetWithTTL(`command-result:${commandId}`, payload, COMMAND_TTL_SECONDS);
}
