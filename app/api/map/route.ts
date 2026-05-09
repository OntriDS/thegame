import { NextResponse, NextRequest } from 'next/server';
import { EntityType, LinkType, SiteType, SiteStatus } from '@/types/enums';
import type { Settlement, PhysicalSiteMetadata } from '@/types/entities';
import { getAllRegions, getAllSettlements, getAllSites, getCharacterById } from '@/data-store/datastore';
import { requireAdminAuth } from '@/lib/api-auth';
import { getLinksFor } from '@/links/link-registry';
import type { MapMarker, MapMarkerOwner, MapReadModel } from '@/types/map-types';
import { kvGet, kvSet } from '@/data-store/kv';
import { buildMapReadModelKey } from '@/data-store/keys';

export const dynamic = 'force-dynamic';

function isUsableCoordinates(coordinates?: Settlement['coordinates']): coordinates is { lat: number; lng: number } {
  if (!coordinates) return false;
  return Number.isFinite(coordinates.lat) && Number.isFinite(coordinates.lng);
}

export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cacheKey = buildMapReadModelKey();
    const cached = await kvGet<MapReadModel>(cacheKey);
    if (cached && Array.isArray(cached.regions) && Array.isArray(cached.settlements) && Array.isArray(cached.markers)) {
      return NextResponse.json(cached);
    }

    const [regions, settlements, sites] = await Promise.all([
      getAllRegions(),
      getAllSettlements(),
      getAllSites()
    ]);

    const physicalSites = sites.filter((site) => (
      site.status === SiteStatus.ACTIVE && site.metadata.type === SiteType.PHYSICAL
    ));

    const adminRegions = regions.filter((region) => region.isActive);
    const activeRegionsForMarkers = regions.filter((region) => region.isActive && region.isUnlocked === true);
    const activeSettlements = settlements.filter((settlement) => settlement.isActive);
    const activeRegionsById = new Map<string, (typeof activeRegionsForMarkers)[number]>();
    for (const region of activeRegionsForMarkers) {
      if (region.id) {
        activeRegionsById.set(region.id, region);
      }
    }
    const activeSettlementsById = new Map<string, Settlement>();
    for (const settlement of activeSettlements) {
      if (settlement.id) {
        activeSettlementsById.set(settlement.id, settlement);
      }
    }

    const missingCoordinatesSettlementIds: string[] = [];
    const missingCoordinateSet = new Set<string>();
    const markers: MapMarker[] = [];
    const markerOwners = new Map<string, string[]>();
    const characterIds = new Set<string>();

    await Promise.all(
      physicalSites.map(async (site) => {
        let links = [];
        try {
          links = await getLinksFor({
            type: EntityType.SITE,
            id: site.id
          });
        } catch (error) {
          console.warn(`[Map API] Failed to load links for site ${site.id}:`, error);
          markerOwners.set(site.id, []);
          return;
        }
        const ownerIds = new Set<string>();
        for (const link of links) {
          if (link.linkType !== LinkType.SITE_CHARACTER) continue;
          if (link.source.type === EntityType.SITE && link.source.id === site.id) {
            ownerIds.add(link.target.id);
          } else if (link.target.type === EntityType.SITE && link.target.id === site.id) {
            ownerIds.add(link.source.id);
          }
        }
        const ids = Array.from(ownerIds);
        markerOwners.set(site.id, ids);
        for (const id of ids) {
          characterIds.add(id);
        }
      })
    );

    const characterNamesById = new Map<string, string>();
    await Promise.all(
      Array.from(characterIds).map(async (characterId) => {
        try {
          const character = await getCharacterById(characterId);
          if (character?.name) {
            characterNamesById.set(characterId, character.name);
          }
        } catch (error) {
          console.warn(`[Map API] Failed to resolve character owner ${characterId}:`, error);
        }
      })
    );

    for (const site of physicalSites) {
      const ownerIds = markerOwners.get(site.id) || [];
      const owners = ownerIds
        .map((ownerId): MapMarkerOwner | null => {
          const ownerName = characterNamesById.get(ownerId);
          if (!ownerName) return null;
          return { id: ownerId, name: ownerName };
        })
        .filter((owner): owner is MapMarkerOwner => Boolean(owner));
    const metadata = site.metadata as PhysicalSiteMetadata;
      const settlement = metadata.settlementId ? activeSettlementsById.get(metadata.settlementId) : undefined;
      if (!settlement || settlement.isUnlocked !== true) {
        continue;
      }

      const region = settlement.regionId ? activeRegionsById.get(settlement.regionId) : undefined;
      if (!region) {
        continue;
      }

      if (!isUsableCoordinates(settlement.coordinates)) {
        if (!missingCoordinateSet.has(settlement.id)) {
          missingCoordinateSet.add(settlement.id);
          missingCoordinatesSettlementIds.push(settlement.id);
        }
        continue;
      }

      markers.push({
        siteId: site.id,
        siteName: site.name,
        siteType: SiteType.PHYSICAL,
        businessType: metadata.businessType,
        settlementId: settlement.id,
        regionId: settlement.regionId,
        lat: settlement.coordinates.lat,
        lng: settlement.coordinates.lng,
        owners
      });
    }

    const payload: MapReadModel = {
      regions: adminRegions,
      settlements: activeSettlements,
      markers,
      missingCoordinatesSettlementIds
    };
    await kvSet(cacheKey, payload);

    return NextResponse.json(payload);
  } catch (error) {
    console.error('[Map API] Failed to build map read model:', error);
    return NextResponse.json({ error: 'Failed to build map model' }, { status: 500 });
  }
}

