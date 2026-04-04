/**
 * AI Assistant — LLM model allowlist (Groq vendor ids + Z.AI Coding PaaS ids).
 *
 * Single source of truth: `ai-assistant-tab` imports this list; `/api/ai/chat` validates the same ids.
 * Unknown ids → 400 on the wire; legacy session values not in the list fall back to default only.
 *
 * Z.AI: id must match what Pixelbrain sends to `POST /chat/completions` (default `ZAI_MODEL` on Pixelbrain is `glm-4.7`).
 */

export const AI_ASSISTANT_MODEL_CATEGORY_ORDER = [
  'OpenRouter',
  'Gemini',
  'Groq Reasoners',
  'Groq Specialists',
  'Groq Speed',
  'Z.ai',
] as const;

export const AI_ASSISTANT_MODELS = [
  { id: 'nousresearch/hermes-3-llama-3.1-405b:free', displayName: 'Hermes 3 Llama 405B (Orchestration)', category: 'OpenRouter' },
  { id: 'qwen/qwen3.6-plus:free', displayName: 'Qwen 3.6 Plus (Specialist)', category: 'OpenRouter' },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', displayName: 'NVIDIA Nemotron 120B', category: 'OpenRouter' },
  { id: 'minimax/minimax-m2.5:free', displayName: 'MiniMax M2.5', category: 'OpenRouter' },
  { id: 'qwen/qwen3-coder:free', displayName: 'Qwen 3 Coder (Coding)', category: 'OpenRouter' },
  { id: 'z-ai/glm-4.5-air:free', displayName: 'GLM 4.5 Air (Planning)', category: 'OpenRouter' },
  { id: 'stepfun/step-3.5-flash:free', displayName: 'Step 3.5 Flash (Fast)', category: 'OpenRouter' },
  { id: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free', displayName: 'Dolphin Mistral 24B (Uncensored)', category: 'OpenRouter' },
  { id: 'gemini-2.0-flash', displayName: 'Gemini 2.0 Flash', category: 'Gemini' },
  { id: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash', category: 'Gemini' },
  { id: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro', category: 'Gemini' },
  { id: 'openai/gpt-oss-120b', displayName: 'gpt-oss-120b (Top reasoning)', category: 'Groq Reasoners' },
  { id: 'llama-3.3-70b-versatile', displayName: 'llama-3.3-70b (Versatile)', category: 'Groq Reasoners' },
  { id: 'moonshotai/kimi-k2-instruct-0905', displayName: 'moonshotai-kimi-1000B-32b (Analysis, Large)', category: 'Groq Specialists' },
  { id: 'qwen/qwen3-32b', displayName: 'qwen3-32b (Balance)', category: 'Groq Specialists' },
  { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', displayName: 'llama-4-128e-17b (Creative, Large)', category: 'Groq Specialists' },
  { id: 'openai/gpt-oss-20b', displayName: 'gpt-oss-20b (Performance)', category: 'Groq Speed' },
  { id: 'groq/compound', displayName: 'groq/compound (Fast)', category: 'Groq Speed' },
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct', displayName: 'llama-4-scout-16e-17b (Info gathering)', category: 'Groq Speed' },
  { id: 'glm-4.7', displayName: 'Z.ai glm-4.7', category: 'Z.ai' },
] as const;

export type AiAssistantModelId = (typeof AI_ASSISTANT_MODELS)[number]['id'];

const ID_SET = new Set<string>(AI_ASSISTANT_MODELS.map((m) => m.id));

/** Default when the client omits `model` or sends an empty string. */
export const DEFAULT_AI_ASSISTANT_MODEL: AiAssistantModelId = 'nousresearch/hermes-3-llama-3.1-405b:free';

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
