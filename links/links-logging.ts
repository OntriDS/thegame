// links/links-logging.ts
// Links self-logging: append link events to KV

import type { Link } from '@/types/entities';
import { kvGet, kvLPush, kvLRange, kvSAdd, kvSMembers } from '@/data-store/kv';
import { buildLogMonthKey, buildLogMonthsIndexKey } from '@/data-store/keys';

const ENTITY = 'links';

export type LinkLogEvent = {
  kind: 'created' | 'removed' | 'updated';
  linkId: string;
  linkType: string;
  source: { type: string; id: string };
  target: { type: string; id: string };
  metadata?: Record<string, any>;
  at: string; // ISO timestamp
};

function getCurrentMonthKey(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  return `${mm}-${yy}`;
}

function getMonthKeyFromTimestamp(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  return `${mm}-${yy}`;
}

export async function appendLinkLog(link: Link, kind: LinkLogEvent['kind'] = 'created'): Promise<void> {
  const entry: LinkLogEvent = {
    kind,
    linkId: link.id,
    linkType: String(link.linkType),
    source: { type: String(link.source.type), id: link.source.id },
    target: { type: String(link.target.type), id: link.target.id },
    metadata: link.metadata,
    at: new Date().toISOString(),
  };

  const monthKey = getMonthKeyFromTimestamp(entry.at);
  const listKey = buildLogMonthKey(ENTITY, monthKey);
  await kvLPush(listKey, JSON.stringify(entry));
  await kvSAdd(buildLogMonthsIndexKey(ENTITY), monthKey);
}

function parseEntry(raw: unknown): LinkLogEvent | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as LinkLogEvent;
    } catch {
      return null;
    }
  }
  if (typeof raw === 'object') return raw as LinkLogEvent;
  return null;
}

export async function getLinkLogs(options?: { month?: string; start?: number; count?: number }): Promise<LinkLogEvent[]> {
  const monthKey = options?.month || getCurrentMonthKey();
  const listKey = buildLogMonthKey(ENTITY, monthKey);
  const start = options?.start ?? 0;
  const stop = options?.count ? start + options.count - 1 : -1;
  const raw = await kvLRange(listKey, start, stop);
  return raw.map(parseEntry).filter((entry): entry is LinkLogEvent => !!entry);
}

export async function getLinkLogMonths(): Promise<string[]> {
  const months = await kvSMembers(buildLogMonthsIndexKey(ENTITY));
  return [...months].sort().reverse();
}

/**
 * Backward-compatible helper for legacy key shape.
 * Use only in migration scripts.
 */
export async function getLegacyFlatLinkLogs(): Promise<LinkLogEvent[]> {
  const legacyKey = 'thegame:logs:links';
  const legacy = await kvGet<LinkLogEvent[] | string>(legacyKey);
  if (!legacy) return [];
  if (Array.isArray(legacy)) return legacy;
  if (typeof legacy === 'string') {
    try {
      const parsed = JSON.parse(legacy);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

