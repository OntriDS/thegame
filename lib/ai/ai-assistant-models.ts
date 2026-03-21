/**
 * AI Assistant — LLM model allowlist (Groq / OpenAI-style ids).
 *
 * Single source of truth: `ai-assistant-tab` imports this list; `/api/ai/chat` validates the same ids.
 * Unknown ids → 400 on the wire; legacy session values not in the list fall back to default only.
 */

export const AI_ASSISTANT_MODELS = [
  { id: 'openai/gpt-oss-120b', displayName: 'gpt-oss-120b (Top reasoning)', category: 'Reasoners' },
  { id: 'llama-3.3-70b-versatile', displayName: 'llama-3.3-70b (Versatile)', category: 'Reasoners' },
  { id: 'moonshotai/kimi-k2-instruct-0905', displayName: 'moonshotai-kimi-1000B-32b (Analysis, Large)', category: 'Specialists' },
  { id: 'qwen/qwen3-32b', displayName: 'qwen3-32b (Balance)', category: 'Specialists' },
  { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', displayName: 'llama-4-128e-17b (Creative, Large)', category: 'Specialists' },
  { id: 'openai/gpt-oss-20b', displayName: 'gpt-oss-20b (Performance)', category: 'Speed' },
  { id: 'groq/compound', displayName: 'groq/compound (Fast)', category: 'Speed' },
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct', displayName: 'llama-4-scout-16e-17b (Info gathering)', category: 'Speed' },
] as const;

export type AiAssistantModelId = (typeof AI_ASSISTANT_MODELS)[number]['id'];

const ID_SET = new Set<string>(AI_ASSISTANT_MODELS.map((m) => m.id));

/** Default when the client omits `model` or sends an empty string. */
export const DEFAULT_AI_ASSISTANT_MODEL: AiAssistantModelId = 'openai/gpt-oss-120b';

export function isAiAssistantModelId(value: string): value is AiAssistantModelId {
  return ID_SET.has(value);
}

/**
 * Validate request body `model`. Returns an error message if invalid.
 * Use `undefined` / omit for “use default”.
 */
export function validateAiAssistantModelInput(
  raw: unknown
): { model: AiAssistantModelId } | { error: string } {
  if (raw === undefined || raw === null || raw === '') {
    return { model: DEFAULT_AI_ASSISTANT_MODEL };
  }
  if (typeof raw !== 'string') {
    return { error: 'model must be a string' };
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return { model: DEFAULT_AI_ASSISTANT_MODEL };
  }
  if (!isAiAssistantModelId(trimmed)) {
    return {
      error: `Invalid model. Allowed: ${AI_ASSISTANT_MODELS.map((m) => m.id).join(', ')}`,
    };
  }
  return { model: trimmed };
}

/**
 * Session persistence may contain an old id; only exact allowlist hits are kept, otherwise default.
 */
export function aiAssistantModelFromSession(stored: unknown): AiAssistantModelId {
  if (typeof stored !== 'string' || !stored.trim()) {
    return DEFAULT_AI_ASSISTANT_MODEL;
  }
  const s = stored.trim();
  return isAiAssistantModelId(s) ? s : DEFAULT_AI_ASSISTANT_MODEL;
}
