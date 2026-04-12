// links/link-registry.ts
// Links system (Rosetta Stone pattern) — persist and query links (KV). Each link connects exactly two entities.
import 'server-only';

import { LinkType, EntityType } from '@/types/enums';
import type { Link } from '@/types/entities';
import { kvGet, kvSet, kvDel, kvSAdd, kvSRem, kvSMembers, kvScan, kvMGet } from '@/lib/utils/kv';
import { buildLinkKey, buildLinksGlobalIndexKey, buildLinksIndexKey } from '@/data-store/keys';
import { validateLink } from './link-validation';

const LINK_MGET_CHUNK = 500;

function chunkKeys(keys: string[], size: number): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < keys.length; i += size) {
    out.push(keys.slice(i, i + size));
  }
  return out;
}

async function mgetLinksByKeys(linkKeys: string[]): Promise<Link[]> {
  if (linkKeys.length === 0) return [];
  const merged: Link[] = [];
  for (const chunk of chunkKeys(linkKeys, LINK_MGET_CHUNK)) {
    const rows = await kvMGet<Link | string>(chunk);
    for (const raw of rows) {
      if (raw == null) continue;
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw) as Link;
          if (parsed) merged.push(parsed);
        } catch {
          /* skip */
        }
      } else {
        merged.push(raw as Link);
      }
    }
  }
  return merged;
}

export async function createLink(link: Link, options?: { skipValidation?: boolean }): Promise<boolean> {
  if (!options?.skipValidation) {
    const validation = await validateLink(link.linkType, link.source, link.target);
    if (!validation.isValid) {
      console.error('🔥 [createLink] ❌ Validation failed:', validation.reason);
      throw new Error(`Link validation failed: ${validation.reason}`);
    }
  }
  
  const existing = await getLinksFor(link.source);
  const dup = existing.find(l => l.linkType===link.linkType && l.target.type===link.target.type && l.target.id===link.target.id);
  if (dup) {
    return false; // Idempotent: silently skip duplicates, return false
  }
  
  await kvSet(buildLinkKey(link.id), link);
  
  await kvSAdd(buildLinksIndexKey(link.source.type, link.source.id), link.id);
  await kvSAdd(buildLinksIndexKey(link.target.type, link.target.id), link.id);
  
  return true; // Link was created
}

export async function getLinksFor(entity: { type: EntityType; id: string }): Promise<Link[]> {
  const ids = await kvSMembers(buildLinksIndexKey(entity.type, entity.id));
  if (!ids.length) return [];
  const keys = ids.map(buildLinkKey);
  return mgetLinksByKeys(keys);
}

export async function removeLink(linkId: string): Promise<void> {
  const key = buildLinkKey(linkId);
  const existing = await kvGet<Link>(key);
  if (existing) {
    // Remove from both source and target indexes
    await kvSRem(buildLinksIndexKey(existing.source.type, existing.source.id), linkId);
    await kvSRem(buildLinksIndexKey(existing.target.type, existing.target.id), linkId);
    await kvSRem(buildLinksGlobalIndexKey(), linkId);
  }
  await kvDel(key);
}

export async function getAllLinks(): Promise<Link[]> {
  const globalKey = buildLinksGlobalIndexKey();
  let ids = await kvSMembers(globalKey);
  if (!ids.length) {
    const keys = await kvScan('thegame:links:link:', 2000);
    ids = keys.map((k: string) => String(k).replace('thegame:links:link:', ''));
    if (ids.length) {
      await Promise.all(ids.map((id) => kvSAdd(globalKey, id)));
    }
  }
  if (!ids.length) return [];

  const linkKeys = ids.map(buildLinkKey);
  return mgetLinksByKeys(linkKeys);
}



