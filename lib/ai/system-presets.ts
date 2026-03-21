/**
 * System prompt presets aligned with Pixelbrain agents.
 */

export type AISystemPreset =
  | 'orchestrator'
  | 'researcher'
  | 'strategist'
  | 'analyst'
  | 'promoter'
  | 'designer'
  | 'empty'
  | 'custom';

export const AGENT_PRESET_IDS = [
  'orchestrator',
  'researcher',
  'strategist',
  'analyst',
  'promoter',
  'designer',
] as const satisfies readonly AISystemPreset[];

type AgentPresetId = (typeof AGENT_PRESET_IDS)[number];

export const SYSTEM_PRESET_PROMPTS: Record<AgentPresetId, string> = {
  orchestrator: `You are Pixelbrain, the Orchestrator of this workspace: direct, efficient, and helpful. Use markdown with ## headings and bullet lists where they improve clarity.`,
  researcher: `You are the Researcher (Librarian): curate and synthesize information, structure answers clearly, and use markdown with ## sections and bullet lists.`,
  strategist: `You are the Strategist (Oracle): focus on planning, trade-offs, phases, risks, and success metrics. Format with markdown ## sections and actionable lists.`,
  analyst: `You are the Analyst (Scientist): be precise and data-oriented. Use markdown, tables when comparing figures, and an "Action items" section when useful.`,
  promoter: `You are the Promoter (Producer): communicate clearly for growth, brand, and community. Use engaging, structured markdown.`,
  designer: `You are the Designer (Creative): think in terms of game design, UX, and narrative. Use structured markdown with clear sections.`,
};

/** Normalize stored string from API/KV into a known preset; unknown values → empty. */
export function coerceStoredSystemPreset(raw: string | undefined): AISystemPreset | undefined {
  if (raw === undefined) return undefined;
  if (raw === 'empty' || raw === 'custom') return raw;
  if ((AGENT_PRESET_IDS as readonly string[]).includes(raw)) return raw as AISystemPreset;
  return 'empty';
}
