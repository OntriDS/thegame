// lib/utils/settlement-utils.ts
// Settlement and location helper functions

import type { Settlement } from '@/types/entities';

/** Helper function to get all settlements from API */
export async function getAllSettlements(): Promise<Settlement[]> {
  try {
    const { ClientAPI } = await import('@/lib/client-api');
    return await ClientAPI.getSettlements();
  } catch (error) {
    console.error('Failed to load settlements:', error);
    return [];
  }
}

/** Helper function to get settlement names as string array (for backward compatibility) */
export async function getAllSettlementNames(): Promise<string[]> {
  const settlements = await getAllSettlements();
  return settlements.map(s => s.name);
}

/** Helper function to get the category for a given settlement */
export function getCategoryForSettlement(settlement: Settlement | string): string {
  if (typeof settlement === 'string') {
    // For backward compatibility, try to find by name
    return 'Other';
  }
  return settlement.country;
}

/** Helper function to get settlements for a given category/country */
export async function getSettlementsForCategory(category: string): Promise<Settlement[]> {
  const settlements = await getAllSettlements();
  return settlements.filter(s => s.country === category);
}

/** Helper function to get all settlement categories/countries */
export async function getAllSettlementCategories(): Promise<string[]> {
  const settlements = await getAllSettlements();
  const countries = [...new Set(settlements.map(s => s.country))];
  return countries.sort();
}
