import type { Settlement, Region } from '@/types/entities';
import { SiteType } from '@/types/enums';
import { PhysicalBusinessType } from '@/types/enums';

export type MapMarker = {
  siteId: string;
  siteName: string;
  siteType: SiteType.PHYSICAL;
  businessType: PhysicalBusinessType;
  settlementId: string;
  regionId: string;
  lat: number;
  lng: number;
  owners: MapMarkerOwner[];
};

export type MapMarkerOwner = {
  id: string;
  name: string;
};

/** Admin map payload: `regions` lists every active region (locked + unlocked) for the editor; markers still respect Mist gating server-side. */
export type MapReadModel = {
  regions: Region[];
  settlements: Settlement[];
  markers: MapMarker[];
  missingCoordinatesSettlementIds: string[];
};

