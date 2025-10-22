import { Site } from '@/types/entities';
import { SiteType } from '@/types/enums';

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
  return sites.map(site => {
    const siteType = site.metadata?.type || SiteType.PHYSICAL;
    
    let category = 'PHYSICAL';
    
    if (siteType === SiteType.DIGITAL) {
      category = 'DIGITAL';
    } else if (siteType === SiteType.SYSTEM) {
      category = 'SYSTEM';
    } else if (siteType === SiteType.PHYSICAL) {
      category = 'PHYSICAL';
    }
    
    return {
      value: site.id,
      label: site.name,
      category: category
    };
  });
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

/**
 * Gets all site names from Site entities
 * @param sites Array of Site entities from datastore
 * @returns Array of site names
 */
export const getAllSiteNames = (sites: Site[]): string[] => {
  return sites.map(site => site.name);
};

/**
 * Gets sites by type from Site entities
 * @param sites Array of Site entities from datastore
 * @param type Site type to filter by
 * @returns Filtered array of Site entities
 */
export const getSitesByType = (sites: Site[], type: string): Site[] => {
  return sites.filter(site => site.metadata.type === type);
};

/**
 * Gets site by name from Site entities
 * @param sites Array of Site entities from datastore
 * @param name Site name to find
 * @returns Site entity or null if not found
 */
export const getSiteByName = (sites: Site[], name: string): Site | null => {
  return sites.find(site => site.name === name) || null;
};

