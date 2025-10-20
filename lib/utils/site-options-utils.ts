import { Site } from '@/types/entities';

/**
 * Creates site options for SearchableSelect components from Site entities
 * Used across TaskModal, RecordModal, and Finances page
 * 
 * @param sites Array of Site entities from datastore
 * @returns Array of options with:
 * - value: Site ID
 * - label: Site Name for display
 * - group: Site Type (PHYSICAL, CLOUD, SPECIAL)
 */
export const createSiteOptions = (sites: Site[]): Array<{ value: string; label: string; group: string }> => {
  return sites.map(site => ({
    value: site.id,
    label: site.name,
    group: site.metadata.type || 'PHYSICAL' // Default to PHYSICAL if type not set
  }));
};

/**
 * Creates site options with category grouping from Site entities
 * This provides proper category grouping following the standardized pattern
 * 
 * @param sites Array of Site entities from datastore
 * @returns Array of options with:
 * - value: Site ID
 * - label: Site Name for display
 * - category: Site Category (PHYSICAL, CLOUD, SPECIAL) for automatic grouping
 */
export const createSiteOptionsWithCategories = (sites: Site[]): Array<{ value: string; label: string; category?: string }> => {
  return sites.map(site => ({
    value: site.id,
    label: site.name,
    category: site.metadata.type || 'PHYSICAL' // Default to PHYSICAL if type not set
  }));
};

/**
 * Gets the site name from a site ID using Site entities
 * @param siteId The site ID
 * @param sites Array of Site entities from datastore
 * @returns The site name, or siteId if not found
 */
export const getSiteNameFromId = (siteId: string, sites: Site[]): string => {
  const site = sites.find(s => s.id === siteId);
  return site ? site.name : siteId;
};

/**
 * Gets the site by ID from Site entities
 * @param siteId The site ID
 * @param sites Array of Site entities from datastore
 * @returns The Site entity, or null if not found
 */
export const getSiteById = (siteId: string, sites: Site[]): Site | null => {
  return sites.find(s => s.id === siteId) || null;
};

// ============================================================================
// DEPRECATED FUNCTIONS - For backward compatibility during migration
// ============================================================================

/**
 * @deprecated Use createSiteOptions(sites) instead. This function uses enum-based approach.
 * Legacy function for generating site options from SITE_GROUPS enum
 */
export const getSiteOptions = () => {
  console.warn('getSiteOptions() is deprecated. Use createSiteOptions(sites) with Site entities instead.');
  // Return empty array - components should use createSiteOptions with Site entities
  return [];
};

/**
 * @deprecated Use createSiteOptionsWithCategories(sites) instead. This function uses enum-based approach.
 * Legacy function for generating site options with categories from SITE_CATEGORIES enum
 */
export const getSiteOptionsWithCategories = () => {
  console.warn('getSiteOptionsWithCategories() is deprecated. Use createSiteOptionsWithCategories(sites) with Site entities instead.');
  // Return empty array - components should use createSiteOptionsWithCategories with Site entities
  return [];
};