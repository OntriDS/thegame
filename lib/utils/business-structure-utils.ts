// lib/utils/business-structure-utils.ts
// Business structure helper functions

import { BUSINESS_STRUCTURE } from '@/types/enums';
import type { Area, Station } from '@/types/type-aliases';

// Get all company areas
export function getCompanyAreas(): readonly Area[] {
  return ['ADMIN', 'RESEARCH', 'DESIGN', 'PRODUCTION', 'SALES'] as const;
}

// Get all personal areas
export function getPersonalAreas(): readonly Area[] {
  return ['PERSONAL'] as const;
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
