// lib/utils/site-seed-utils.ts
// Site ID conversion utilities for backwards compatibility

import { SITE_GROUPS } from '@/types/enums';

/**
 * Convert site name to stable ID
 * Returns stable ID based on name, or name itself if not found
 * 
 * @param siteName The site name (e.g., "Home", "Feria Box")
 * @returns The stable ID (e.g., "site-home", "site-feria-box")
 */
export function convertSiteNameToId(siteName: string): string {
  if (!siteName) return '';
  
  // If already a UUID (starts with 'site-'), return as is
  if (siteName.startsWith('site-')) {
    return siteName;
  }
  
  // Convert name to stable ID
  const stableId = `site-${siteName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
  return stableId;
}

/**
 * Convert site ID to name for display
 * Returns name, or ID itself if not found
 * 
 * @param siteId The site ID (e.g., "site-home", "site-feria-box")
 * @returns The site name (e.g., "Home", "Feria Box")
 */
export function convertSiteIdToName(siteId: string): string {
  if (!siteId) return '';
  
  // If not a UUID (doesn't start with 'site-'), assume it's already a name
  if (!siteId.startsWith('site-')) {
    return siteId;
  }
  
  // Convert ID to name by removing prefix and converting back
  const name = siteId
    .replace('site-', '')
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
    
  return name;
}

/**
 * Get site name-to-ID mapping for backwards compatibility
 * Allows converting "Home" → "site-home"
 */
export function getSiteNameToIdMap(): Record<string, string> {
  const map: Record<string, string> = {};
  
  // Build map from SITE_GROUPS
  Object.values(SITE_GROUPS).forEach(sites => {
    Object.values(sites).forEach(name => {
      map[name] = convertSiteNameToId(name);
    });
  });
  
  return map;
}

/**
 * Get site ID-to-name mapping for display
 * Allows converting "site-home" → "Home"
 */
export function getSiteIdToNameMap(): Record<string, string> {
  const map: Record<string, string> = {};
  
  // Build map from SITE_GROUPS
  Object.values(SITE_GROUPS).forEach(sites => {
    Object.values(sites).forEach(name => {
      const id = convertSiteNameToId(name);
      map[id] = name;
    });
  });
  
  return map;
}
