// data-store/repositories/site.repo.ts
import { kvGet, kvMGet, kvSet, kvDel, kvSAdd, kvSRem, kvSMembers } from '../kv';
import { buildDataKey, buildIndexKey } from '../keys';
import type { Site, Settlement, PhysicalSiteMetadata } from '@/types/entities';

const ENTITY = 'sites';
const SETTLEMENTS_ENTITY = 'settlements';

export async function getAllSites(): Promise<Site[]> {
  const indexKey = buildIndexKey(ENTITY);
  const ids = await kvSMembers(indexKey);
  if (ids.length === 0) return [];
  
  const keys = ids.map(id => buildDataKey(ENTITY, id));
  const sites = await kvMGet<Site>(keys);
  return sites.filter((site): site is Site => site !== null);
}

export async function getSiteById(id: string): Promise<Site | null> {
  const key = buildDataKey(ENTITY, id);
  return await kvGet<Site>(key);
}

export async function upsertSite(site: Site): Promise<Site> {
  const key = buildDataKey(ENTITY, site.id);
  const indexKey = buildIndexKey(ENTITY);
  
  await kvSet(key, site);
  await kvSAdd(indexKey, site.id);
  
  return site;
}

export async function deleteSite(id: string): Promise<void> {
  const key = buildDataKey(ENTITY, id);
  const indexKey = buildIndexKey(ENTITY);
  
  await kvDel(key);
  await kvSRem(indexKey, id);
}

// ============================================================================
// SETTLEMENT METHODS (Reference data for Sites)
// ============================================================================

export async function getAllSettlements(): Promise<Settlement[]> {
  const indexKey = buildIndexKey(SETTLEMENTS_ENTITY);
  const ids = await kvSMembers(indexKey);
  if (ids.length === 0) return [];
  
  const keys = ids.map(id => buildDataKey(SETTLEMENTS_ENTITY, id));
  const settlements = await kvMGet<Settlement>(keys);
  return settlements.filter((settlement): settlement is Settlement => settlement !== null);
}

export async function getSettlementById(id: string): Promise<Settlement | null> {
  const key = buildDataKey(SETTLEMENTS_ENTITY, id);
  return await kvGet<Settlement>(key);
}

export async function upsertSettlement(settlement: Settlement): Promise<Settlement> {
  const key = buildDataKey(SETTLEMENTS_ENTITY, settlement.id);
  const indexKey = buildIndexKey(SETTLEMENTS_ENTITY);
  
  await kvSet(key, settlement);
  await kvSAdd(indexKey, settlement.id);
  
  return settlement;
}

export async function removeSettlement(id: string): Promise<void> {
  const key = buildDataKey(SETTLEMENTS_ENTITY, id);
  const indexKey = buildIndexKey(SETTLEMENTS_ENTITY);
  
  await kvDel(key);
  await kvSRem(indexKey, id);
}

// ============================================================================
// SITE QUERY METHODS
// ============================================================================

export async function getSitesBySettlement(settlementId: string): Promise<Site[]> {
  const allSites = await getAllSites();
  return allSites.filter(site => {
    if (site.metadata.type !== 'PHYSICAL') return false;
    const physicalMeta = site.metadata as PhysicalSiteMetadata;
    return physicalMeta.settlementId === settlementId;
  });
}

export async function getSitesByRadius(
  centerLat: number,
  centerLng: number,
  radiusMeters: number
): Promise<Site[]> {
  const allSites = await getAllSites();
  const settlementsMap = new Map<string, Settlement>();
  
  // Load all settlements with coordinates
  const settlements = await getAllSettlements();
  settlements.forEach(s => {
    if (s.coordinates) settlementsMap.set(s.id, s);
  });
  
  return allSites.filter(site => {
    if (site.metadata.type !== 'PHYSICAL') return false;
    const physicalMeta = site.metadata as PhysicalSiteMetadata;
    const settlement = settlementsMap.get(physicalMeta.settlementId);
    
    if (!settlement?.coordinates) return false;
    
    // Haversine formula for distance calculation
    const R = 6371000; // Earth radius in meters
    const φ1 = centerLat * Math.PI / 180;
    const φ2 = settlement.coordinates.lat * Math.PI / 180;
    const Δφ = (settlement.coordinates.lat - centerLat) * Math.PI / 180;
    const Δλ = (settlement.coordinates.lng - centerLng) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance <= radiusMeters;
  });
}
