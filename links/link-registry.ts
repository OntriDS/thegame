// links/link-registry.ts
// The Rosetta Stone storage and query layer (KV only)

import { LinkType, EntityType } from '@/types/enums';
import type { Link } from '@/types/entities';
import { kvGet, kvSet, kvDel, kvSAdd, kvSRem, kvSMembers, kvScan } from '@/data-store/kv';
import { buildLinkKey, buildLinksIndexKey } from '@/data-store/keys';
import { validateLink } from './link-validation';

export async function createLink(link: Link, options?: { skipValidation?: boolean }): Promise<void> {
  console.log('🔥 [createLink] START', { id: link.id, linkType: link.linkType, source: link.source, target: link.target });
  
  if (!options?.skipValidation) {
    console.log('🔥 [createLink] Running validation...');
    const validation = await validateLink(link.linkType, link.source, link.target, link.metadata);
    if (!validation.isValid) {
      console.error('🔥 [createLink] ❌ Validation failed:', validation.reason);
      throw new Error(`Link validation failed: ${validation.reason}`);
    }
    console.log('🔥 [createLink] ✅ Validation passed');
  } else {
    console.log('🔥 [createLink] ⏭️ Skipping validation (skipValidation=true)');
  }
  
  console.log('🔥 [createLink] Checking for duplicates...');
  const existing = await getLinksFor(link.source);
  const dup = existing.find(l => l.linkType===link.linkType && l.target.type===link.target.type && l.target.id===link.target.id);
  if (dup) {
    console.warn('🔥 [createLink] ⚠️ Duplicate link found, skipping');
    throw new Error(`Duplicate link ${link.linkType} ${link.source.type}:${link.source.id}→${link.target.type}:${link.target.id}`);
  }
  console.log('🔥 [createLink] ✅ No duplicates found');
  
  console.log('🔥 [createLink] Saving to KV...', buildLinkKey(link.id));
  await kvSet(buildLinkKey(link.id), link);
  
  console.log('🔥 [createLink] Adding to indexes...');
  await kvSAdd(buildLinksIndexKey(link.source.type, link.source.id), link.id);
  await kvSAdd(buildLinksIndexKey(link.target.type, link.target.id), link.id);
  
  console.log('🔥 [createLink] ✅ Link created successfully');
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
  console.log('🔥 [getAllLinks] START');
  const keys = await kvScan('links:link:');
  console.log('🔥 [getAllLinks] Found keys:', keys.length);
  
  if (!keys.length) {
    console.log('🔥 [getAllLinks] No keys found, returning empty array');
    return [];
  }
  
  const links = await Promise.all(keys.map((k: string) => kvGet<Link>(k)));
  const filtered = links.filter(Boolean) as Link[];
  console.log('🔥 [getAllLinks] Returning links:', filtered.length);
  
  return filtered;
}


