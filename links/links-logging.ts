// links/links-logging.ts
// Legacy monthly lists under thegame:logs:links:MM-YY (read-only helpers). The graph is thegame:links:link:{id};
// appendLinkLog is a no-op — we do not append new rows. normalizeLinkLogEntry only parses existing stored JSON for backwards compatibility.

import type { Link } from '@/types/entities';
import { kvGet, kvLRange, kvSAdd, kvSMembers } from '@/data-store/kv';
import { buildLogMonthKey, buildLogMonthsIndexKey } from '@/data-store/keys';

const ENTITY = 'links';

export type LinkLogEvent = {
  event: 'created' | 'removed' | 'updated';
  linkId: string;
  linkType: string;
  source: { type: string; id: string };
  target: { type: string; id: string };
  metadata?: Record<string, any>;
  /** ISO time — same role as entity log `timestamp` */
  timestamp: string;
};

function toIso(d: Date | string | undefined | null): string | null {
  if (d == null) return null;
  const date = d instanceof Date ? d : new Date(d);
  const t = date.getTime();
  return Number.isFinite(t) ? date.toISOString() : null;
}

/** When the link was formed; for removed/updated, use wall-clock time of the operation. */
function resolveLinkLogTimestamp(link: Link, event: LinkLogEvent['event']): string {
  if (event === 'created') {
    return toIso(link.createdAt) ?? new Date().toISOString();
  }
  return new Date().toISOString();
}

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

/**
 * Parses rows already stored in legacy monthly lists. Older blobs used `kind` / `at` and sometimes `metadata`;
 * new code does not write these. Keeping aliases here avoids breaking Data Center / tools until those lists are cleared or migrated.
 */
export function normalizeLinkLogEntry(raw: Record<string, unknown>): LinkLogEvent | null {
  const linkId = raw.linkId;
  if (typeof linkId !== 'string' || !linkId) return null;

  const eventRaw = raw.event ?? raw.kind;
  if (typeof eventRaw !== 'string') return null;
  if (!['created', 'removed', 'updated'].includes(eventRaw)) return null;

  const tsRaw = raw.timestamp ?? raw.at;
  if (typeof tsRaw !== 'string' || !tsRaw) return null;

  const source = raw.source;
  const target = raw.target;
  if (!source || typeof source !== 'object' || !target || typeof target !== 'object') return null;
  const s = source as Record<string, unknown>;
  const t = target as Record<string, unknown>;
  if (typeof s.type !== 'string' || typeof s.id !== 'string') return null;
  if (typeof t.type !== 'string' || typeof t.id !== 'string') return null;

  return {
    event: eventRaw as LinkLogEvent['event'],
    linkId,
    linkType: typeof raw.linkType === 'string' ? raw.linkType : String(raw.linkType ?? ''),
    source: { type: s.type, id: s.id },
    target: { type: t.type, id: t.id },
    metadata: raw.metadata && typeof raw.metadata === 'object' ? (raw.metadata as Record<string, any>) : undefined,
    timestamp: tsRaw,
  };
}

/**
 * Links are graph edges only; lifecycle history lives on entity logs.
 * Historical monthly lists may still be read for migration/debug — we do not append new rows.
 */
export async function appendLinkLog(_link: Link, _event: LinkLogEvent['event'] = 'created'): Promise<void> {
  return;
}

function parseEntry(raw: unknown): LinkLogEvent | null {
  if (!raw) return null;
  let obj: Record<string, unknown> | null = null;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  } else if (typeof raw === 'object') {
    obj = raw as Record<string, unknown>;
  }
  return obj ? normalizeLinkLogEntry(obj) : null;
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
  const legacy = await kvGet<unknown[] | string>(legacyKey);
  if (!legacy) return [];
  const arr: unknown[] = Array.isArray(legacy)
    ? legacy
    : typeof legacy === 'string'
      ? (() => {
          try {
            const p = JSON.parse(legacy);
            return Array.isArray(p) ? p : [];
          } catch {
            return [];
          }
        })()
      : [];
  return arr
    .map((row) => (typeof row === 'object' && row ? normalizeLinkLogEntry(row as Record<string, unknown>) : null))
    .filter((e): e is LinkLogEvent => !!e);
}
