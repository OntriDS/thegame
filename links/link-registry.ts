// links/link-registry.ts
// The Rosetta Stone storage and query layer (KV only)

import { LinkType, EntityType } from '@/types/enums';
import type { Link } from '@/types/entities';
import { kvGet, kvSet, kvDel, kvSAdd, kvSRem, kvSMembers, kvScan } from '@/data-store/kv';
import { buildLinkKey, buildLinksIndexKey } from '@/data-store/keys';
import { validateLink } from './link-validation';

export async function createLink(link: Link, options?: { skipValidation?: boolean }): Promise<boolean> {
  if (!options?.skipValidation) {
    const validation = await validateLink(link.linkType, link.source, link.target, link.metadata);
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
  const rows = await Promise.all(keys.map(k => kvGet<Link>(k)));
  return rows.filter(Boolean) as Link[];
}

export async function removeLink(linkId: string): Promise<void> {
  const key = buildLinkKey(linkId);
  const existing = await kvGet<Link>(key);
  if (existing) {
    // Remove from both source and target indexes
    await kvSRem(buildLinksIndexKey(existing.source.type, existing.source.id), linkId);
    await kvSRem(buildLinksIndexKey(existing.target.type, existing.target.id), linkId);
  }
  await kvDel(key);
}

export async function getAllLinks(): Promise<Link[]> {
  const keys = await kvScan('links:link:');
  
  if (!keys.length) {
    return [];
  }
  
  const links = await Promise.all(keys.map((k: string) => kvGet<Link>(k)));
  const filtered = links.filter(Boolean) as Link[];
  
  return filtered;
}


