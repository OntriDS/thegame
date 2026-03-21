/**
 * Client-side cache for Pixelbrain agent catalog (SWR-style: staleTime ~5m, no extra dependency).
 */

export type PixelbrainAgentCatalogEntry = {
  id: string;
  name: string;
  codeName?: string;
  type: string;
  description: string;
  version: string;
};

const STALE_MS = 5 * 60 * 1000;

let memory: { fetchedAt: number; agents: PixelbrainAgentCatalogEntry[] } | null = null;

export function clearPixelbrainAgentsCatalogCache(): void {
  memory = null;
}

/**
 * Fetches `/api/ai/pixelbrain/agents` with in-memory dedupe for 5 minutes.
 */
export async function fetchPixelbrainAgentsCatalog(): Promise<PixelbrainAgentCatalogEntry[]> {
  const now = Date.now();
  if (memory && now - memory.fetchedAt < STALE_MS) {
    return memory.agents;
  }

  const res = await fetch('/api/ai/pixelbrain/agents', { cache: 'no-store' });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(err || `Failed to load agents (${res.status})`);
  }
  const data = await res.json();
  const agents = Array.isArray(data?.agents) ? data.agents : [];
  memory = { fetchedAt: now, agents };
  return agents;
}
