// links/link-registry.ts
// The Rosetta Stone storage and query layer (KV only)

import { LinkType, EntityType } from '@/types/enums';
import type { Link } from '@/types/entities';
import { kvGet, kvSet, kvDel, kvSAdd, kvSRem, kvSMembers, kvScan } from '@/data-store/kv';
import { buildLinkKey, buildLinksIndexKey } from '@/data-store/keys';
import { validateLink } from './link-validation';

export async function createLink(link: Link): Promise<void> {
  // NEW: Validate before creating
  const validation = await validateLink(link.linkType, link.source, link.target, link.metadata);
  if (!validation.isValid) {
    console.warn(`[createLink] Validation failed: ${validation.reason}`);
    if (validation.warnings) {
      console.warn(`[createLink] Validation warnings:`, validation.warnings);
    }
    return; // Skip creating invalid links
  }
  
  // Log warnings if any
  if (validation.warnings && validation.warnings.length > 0) {
    console.warn(`[createLink] Validation warnings for ${link.linkType}:`, validation.warnings);
  }
  
  // NEW: Check for duplicate before creating
  const existingLinks = await getLinksFor(link.source);
  const duplicate = existingLinks.find(l => 
    l.linkType === link.linkType &&
    l.target.type === link.target.type &&
    l.target.id === link.target.id
  );
  
  if (duplicate) {
    console.log(`[createLink] Link already exists: ${link.linkType} from ${link.source.type}:${link.source.id} to ${link.target.type}:${link.target.id}, skipping`);
    return; // Don't create duplicate
  }
  
  await kvSet(buildLinkKey(link.id), link);
  // index by source and target for bidirectional queries
  await kvSAdd(buildLinksIndexKey(link.source.type, link.source.id), link.id);
  await kvSAdd(buildLinksIndexKey(link.target.type, link.target.id), link.id);
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
  if (!keys.length) return [];
  const links = await Promise.all(keys.map((k: string) => kvGet<Link>(k)));
  return links.filter(Boolean) as Link[];
}


