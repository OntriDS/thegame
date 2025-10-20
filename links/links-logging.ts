// links/links-logging.ts
// Links self-logging: append link events to KV

import type { Link } from '@/types/entities';
import { kvGet, kvSet } from '@/data-store/kv';
import { buildLogKey } from '@/data-store/keys';

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

export async function appendLinkLog(link: Link, kind: LinkLogEvent['kind'] = 'created'): Promise<void> {
  const key = buildLogKey(ENTITY);
  const list = (await kvGet<LinkLogEvent[]>(key)) || [];
  list.push({
    kind,
    linkId: link.id,
    linkType: String(link.linkType),
    source: { type: String(link.source.type), id: link.source.id },
    target: { type: String(link.target.type), id: link.target.id },
    metadata: link.metadata,
    at: new Date().toISOString(),
  });
  await kvSet(key, list);
}


