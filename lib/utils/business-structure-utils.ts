// lib/utils/business-structure-utils.ts
// Business structure helper functions

import { BUSINESS_STRUCTURE, COMPANY_AREAS, PERSONAL_AREAS } from '@/types/enums';
import { SalesStation } from '@/lib/storage/taxonomy';
import type { Area, Station } from '@/types/type-aliases';
import { STATION_DISPLAY_LABEL } from '@/lib/constants/business-structure-labels';

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

/** Combined value for SearchableSelect station options (`createStationCategoryOptions`: `Area:Station`). */
export function getStationSelectValue(station: Station | null | undefined): string {
  if (station == null || String(station).trim() === '') return 'none:';
  const area = getAreaForStation(station);
  return `${area || 'admin'}:${station}`;
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
  const key = String(saleType ?? '')
    .trim()
    .toUpperCase();

  const typeToChannel: Record<string, Station> = {
    DIRECT: SalesStation.DIRECT_SALES as Station,
    BOOTH: SalesStation.BOOTH_SALES as Station,
    NETWORK: SalesStation.NETWORK as Station,
    ONLINE: SalesStation.ONLINE_SALES as Station,
    NFT: SalesStation.ONLINE_SALES as Station,
  };

  return typeToChannel[key] ?? null;
}

/**
 * Normalize station values coming from UI/API/raw data to a canonical station slug.
 * Handles:
 * - canonical slugs: "booth-sales"
 * - combined values: "sales:booth-sales"
 * - display labels: "Booth-Sales"
 */
export function normalizeStationValue(value: string | Station | null | undefined): Station | null {
  if (value == null) return null;

  const raw = String(value).trim();
  if (!raw) return null;

  const stations = getAllStations();
  const canonicalLookup = new Map<string, Station>(
    stations.map((station) => [String(station).toLowerCase(), station])
  );

  const labelLookup = new Map<string, Station>(
    Object.entries(STATION_DISPLAY_LABEL).map(([station, label]) => [String(label).toLowerCase(), station as Station])
  );

  const candidates = new Set<string>();
  const combinedParts = raw.split(':');
  const tail = combinedParts.length > 1 ? combinedParts[combinedParts.length - 1] : raw;

  candidates.add(raw);
  candidates.add(raw.toLowerCase());
  candidates.add(raw.replace(/\s+/g, '-'));
  candidates.add(raw.replace(/\s+/g, '-').toLowerCase());
  candidates.add(tail);
  candidates.add(tail.toLowerCase());
  candidates.add(tail.replace(/\s+/g, '-'));
  candidates.add(tail.replace(/\s+/g, '-').toLowerCase());

  for (const candidate of candidates) {
    if (canonicalLookup.has(candidate)) return canonicalLookup.get(candidate)!;
  }

  for (const candidate of candidates) {
    const labelMatch = labelLookup.get(candidate.toLowerCase());
    if (labelMatch) return labelMatch;
  }

  return null;
}