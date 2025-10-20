// lib/utils/site-migration-utils.ts
// @deprecated This file is deprecated in KV-only architecture
// Sites are now entities queried from datastore, not enum-based
// Use site-options-utils.ts with Site entities instead

import { SITE_GROUPS } from '@/types/enums';

// Type definitions for the new site system
export type SiteType = 'PHYSICAL' | 'CLOUD' | 'SPECIAL';
export type SiteKey = string;
export type SiteName = string;

export interface SiteInfo {
  type: SiteType;
  key: SiteKey;
  name: SiteName;
}

// @deprecated Use Site entities from datastore instead
export function getAllSitesInNewFormat(): SiteInfo[] {
  const sites: SiteInfo[] = [];
  
  // Physical Sites (first priority)
  Object.entries(SITE_GROUPS.PHYSICAL).forEach(([key, name]) => {
    sites.push({ type: 'PHYSICAL', key, name });
  });
  
  // Cloud Sites (second priority)
  Object.entries(SITE_GROUPS.CLOUD).forEach(([key, name]) => {
    sites.push({ type: 'CLOUD', key, name });
  });
  
  // Special Sites (last priority)
  Object.entries(SITE_GROUPS.SPECIAL).forEach(([key, name]) => {
    sites.push({ type: 'SPECIAL', key, name });
  });
  
  return sites;
}

// Get sites by type
export function getSitesByType(type: SiteType): SiteInfo[] {
  return getAllSitesInNewFormat().filter(site => site.type === type);
}

// Get site info by name
export function getSiteInfoByName(name: string): SiteInfo | null {
  return getAllSitesInNewFormat().find(site => site.name === name) || null;
}

// Get site info by key
export function getSiteInfoByKey(key: string): SiteInfo | null {
  return getAllSitesInNewFormat().find(site => site.key === key) || null;
}

// Check if a site name is valid
export function isValidSiteName(name: string): boolean {
  return getAllSitesInNewFormat().some(site => site.name === name);
}

// Get all site names
export function getAllSiteNames(): string[] {
  return getAllSitesInNewFormat().map(site => site.name);
}

// Legacy function names for backward compatibility (now just return the new format)
export const convertOldSiteToNew = getSiteInfoByName;
export const getSiteNameFromOld = (name: string) => name; // Already in new format