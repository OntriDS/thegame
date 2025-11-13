// lib/utils/business-structure-utils.ts
// Business structure helper functions

import { BUSINESS_STRUCTURE, COMPANY_AREAS, PERSONAL_AREAS } from '@/types/enums';
import type { Area, Station } from '@/types/type-aliases';

// Get all company areas
export function getCompanyAreas(): readonly Area[] {
  return COMPANY_AREAS;
}

// Get all personal areas
export function getPersonalAreas(): readonly Area[] {
  return PERSONAL_AREAS;
}

// Get all areas
export function getAllAreas(): readonly Area[] {
  return [...getCompanyAreas(), ...getPersonalAreas()] as const;
}

// Get all stations (flattened from all areas)
export function getAllStations(): Station[] {
  return Object.values(BUSINESS_STRUCTURE).flat();
}

// Get stations for a specific area
export function getStationsForArea(area: Area): readonly Station[] {
  return BUSINESS_STRUCTURE[area];
}

// Get area for a specific station
export function getAreaForStation(station: Station): Area | null {
  for (const [area, stations] of Object.entries(BUSINESS_STRUCTURE)) {
    if ((stations as readonly Station[]).includes(station)) {
      return area as Area;
    }
  }
  return null;
}

// Check if a station belongs to company areas
export function isCompanyStation(station: Station): boolean {
  const companyStations = getCompanyAreas().flatMap(area => BUSINESS_STRUCTURE[area]);
  return companyStations.includes(station);
}

// Check if a station belongs to personal areas
export function isPersonalStation(station: Station): boolean {
  const personalStations = getPersonalAreas().flatMap(area => BUSINESS_STRUCTURE[area]);
  return personalStations.includes(station);
}

/**
 * Get financial type for a station
 * Uses COMPANY_AREAS and PERSONAL_AREAS from enums as source of truth
 */
export function getFinancialTypeForStation(station: Station): 'company' | 'personal' {
  return isCompanyStation(station) ? 'company' : 'personal';
}

/**
 * Map SaleType to sales channel station
 * Returns the appropriate SALES station based on sale type
 */
export function getSalesChannelFromSaleType(saleType: string): Station | null {
  const salesStations = BUSINESS_STRUCTURE.SALES;
  
  // Map SaleType enum values to station names
  const typeToChannel: Record<string, Station> = {
    'DIRECT': 'Direct Sales' as Station,
    'FERIA': 'Feria Sales' as Station,
    'BUNDLE': 'Network Sales' as Station, // Bundle sales typically go through network
    'CONSIGNMENT': 'Network Sales' as Station,
    'ONLINE': 'Online Sales' as Station,
    'NFT': 'Online Sales' as Station,
  };
  
  return typeToChannel[saleType] || null;
}