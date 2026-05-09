'use client';

import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { MapContainer, Marker, Popup, TileLayer, Tooltip, useMap, useMapEvents, Circle, Rectangle, Polygon, Polyline } from 'react-leaflet';
import L, { type LatLngBoundsExpression, type LatLngExpression, type LeafletMouseEvent } from 'leaflet';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { OPEN_ENTITY_QUERY, OPEN_ID_QUERY } from '@/lib/utils/entity-admin-deep-links';
import MapHUD from '@/components/map/map-hud';
import type { MapMarker, MapReadModel } from '@/types/map-types';
import { PhysicalBusinessType } from '@/types/enums';
import type { Region, Settlement, MapGeometryShape, MapGeometryShapeType } from '@/types/entities';
import { ClientAPI } from '@/lib/client-api';
import {
  adminMapWindowEvents,
  adminMapLocalStorageKeys,
  readAdminMapBoolPref,
  writeAdminMapBoolPref,
  type CoordPickResultDetail,
} from '@/lib/admin-map-events';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const maxPolygonVertices = 8;

type MapUnlockPromptState =
  | { kind: 'region'; entity: Region }
  | { kind: 'settlement'; entity: Settlement };

function centroidFromCoords(coords: Array<{ lat: number; lng: number }>): { lat: number; lng: number } {
  const n = coords.length;
  if (!n) return { lat: 0, lng: 0 };
  let lat = 0;
  let lng = 0;
  for (const c of coords) {
    lat += c.lat;
    lng += c.lng;
  }
  return { lat: lat / n, lng: lng / n };
}

function boundsFromCoordPoints(coords: Array<{ lat: number; lng: number }>): [[number, number], [number, number]] {
  const lats = coords.map((c) => c.lat);
  const lngs = coords.map((c) => c.lng);
  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ];
}

function rectangleCornersFromBounds(bounds: [[number, number], [number, number]]): [number, number][] {
  const [[s, w], [n, e]] = bounds;
  return [
    [s, w],
    [s, e],
    [n, e],
    [n, w],
  ];
}

function boundsFromRectangleCorners(corners: [number, number][]): [[number, number], [number, number]] {
  const lats = corners.map((c) => c[0]);
  const lngs = corners.map((c) => c[1]);
  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ];
}

function cloneMapGeometryShape(shape: MapGeometryShape): MapGeometryShape {
  return JSON.parse(JSON.stringify(shape)) as MapGeometryShape;
}

/** East from center by geodesic-ish meters (Leaflet circle radius is in meters). */
function latLngEastOfCenterByMeters(center: { lat: number; lng: number }, radiusM: number): [number, number] {
  const metersPerDegLng = 111320 * Math.cos((center.lat * Math.PI) / 180);
  if (!Number.isFinite(metersPerDegLng) || Math.abs(metersPerDegLng) < 1e-6) {
    return [center.lat, center.lng + 0.001];
  }
  return [center.lat, center.lng + radiusM / metersPerDegLng];
}

const shapeVertexHandleIcon = L.divIcon({
  className: 'map-shape-handle-root',
  html: '<div style="width:11px;height:11px;background:#f59e0b;border:2px solid #fafafa;border-radius:2px;box-shadow:0 1px 4px rgba(0,0,0,.5)"></div>',
  iconSize: [11, 11],
  iconAnchor: [5, 5],
});

const shapeMoveHandleIcon = L.divIcon({
  className: 'map-shape-handle-root',
  html: '<div style="width:18px;height:18px;background:rgba(245,158,11,.22);border:2px dashed #f59e0b;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const shapeRadiusHandleIcon = L.divIcon({
  className: 'map-shape-handle-root',
  html: '<div style="width:10px;height:10px;background:#38bdf8;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,.45)"></div>',
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

type DisplayRegion = {
  id: string;
  name: string;
  center: {
    lat: number;
    lng: number;
  };
  defaultZoom: number;
  maxBounds?: Region['maxBounds'];
  isUnlocked?: boolean;
};

type MarkerTheme = {
  type: PhysicalBusinessType;
  label: string;
  glowColor: string;
  baseColor: string;
  ringColor: string;
  iconPath: string;
};

type MarkerLegendEntry = {
  type: PhysicalBusinessType;
  label: string;
  iconPath: string;
  glowColor: string;
  count: number;
};

const WORLD_BOUNDS: LatLngBoundsExpression = [
  [-90, -180],
  [90, 180],
];

const DEFAULT_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';
const DEFAULT_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> &copy; <a href="https://carto.com/">CARTO</a>';

const FALLBACK_REGION: DisplayRegion = {
  id: '__fallback__',
  name: 'Global View',
  center: {
    lat: 0,
    lng: 0,
  },
  defaultZoom: 2,
};

const STACK_MARKER_SIZE = 34;

const BUSINESS_TYPE_THEME: Record<PhysicalBusinessType, MarkerTheme> = {
  [PhysicalBusinessType.STORE]: {
    type: PhysicalBusinessType.STORE,
    label: 'Store',
    glowColor: 'rgba(245, 158, 11, 0.6)',
    baseColor: '#f59e0b',
    ringColor: '#fbbf24',
    iconPath: '/map-icons/physical/store.svg',
  },
  [PhysicalBusinessType.SELLING_POINT]: {
    type: PhysicalBusinessType.SELLING_POINT,
    label: 'Selling Point',
    glowColor: 'rgba(6, 182, 212, 0.6)',
    baseColor: '#06b6d4',
    ringColor: '#67e8f9',
    iconPath: '/map-icons/physical/selling-point.svg',
  },
  [PhysicalBusinessType.TEACHING_SPACE]: {
    type: PhysicalBusinessType.TEACHING_SPACE,
    label: 'Teaching Space',
    glowColor: 'rgba(139, 92, 246, 0.6)',
    baseColor: '#8b5cf6',
    ringColor: '#c4b5fd',
    iconPath: '/map-icons/physical/teaching-space.svg',
  },
  [PhysicalBusinessType.HQ]: {
    type: PhysicalBusinessType.HQ,
    label: 'HQ',
    glowColor: 'rgba(34, 197, 94, 0.6)',
    baseColor: '#22c55e',
    ringColor: '#86efac',
    iconPath: '/map-icons/physical/hq.svg',
  },
  [PhysicalBusinessType.ART_GALLERY]: {
    type: PhysicalBusinessType.ART_GALLERY,
    label: 'Art Gallery',
    glowColor: 'rgba(236, 72, 153, 0.6)',
    baseColor: '#ec4899',
    ringColor: '#f9a8d4',
    iconPath: '/map-icons/physical/art-gallery.svg',
  },
  [PhysicalBusinessType.DESIGN_SPACE]: {
    type: PhysicalBusinessType.DESIGN_SPACE,
    label: 'Design Space',
    glowColor: 'rgba(14, 165, 233, 0.6)',
    baseColor: '#0ea5e9',
    ringColor: '#7dd3fc',
    iconPath: '/map-icons/physical/design-space.svg',
  },
  [PhysicalBusinessType.WORKSHOP]: {
    type: PhysicalBusinessType.WORKSHOP,
    label: 'Workshop',
    glowColor: 'rgba(249, 115, 22, 0.6)',
    baseColor: '#f97316',
    ringColor: '#fdba74',
    iconPath: '/map-icons/physical/workshop.svg',
  },
  [PhysicalBusinessType.STORAGE]: {
    type: PhysicalBusinessType.STORAGE,
    label: 'Storage',
    glowColor: 'rgba(168, 85, 247, 0.6)',
    baseColor: '#a855f7',
    ringColor: '#d8b4fe',
    iconPath: '/map-icons/physical/storage.svg',
  },
  [PhysicalBusinessType.PROVIDER]: {
    type: PhysicalBusinessType.PROVIDER,
    label: 'Provider',
    glowColor: 'rgba(16, 185, 129, 0.6)',
    baseColor: '#10b981',
    ringColor: '#6ee7b7',
    iconPath: '/map-icons/physical/provider.svg',
  },
  [PhysicalBusinessType.LIVING_SPACE]: {
    type: PhysicalBusinessType.LIVING_SPACE,
    label: 'Living Space',
    glowColor: 'rgba(239, 68, 68, 0.6)',
    baseColor: '#ef4444',
    ringColor: '#fca5a5',
    iconPath: '/map-icons/physical/living-space.svg',
  },
  [PhysicalBusinessType.BANK]: {
    type: PhysicalBusinessType.BANK,
    label: 'Bank',
    glowColor: 'rgba(20, 184, 166, 0.6)',
    baseColor: '#14b8a6',
    ringColor: '#5eead4',
    iconPath: '/map-icons/physical/bank.svg',
  },
};

const BUSINESS_TYPES_ORDER: PhysicalBusinessType[] = [
  PhysicalBusinessType.STORE,
  PhysicalBusinessType.SELLING_POINT,
  PhysicalBusinessType.TEACHING_SPACE,
  PhysicalBusinessType.HQ,
  PhysicalBusinessType.ART_GALLERY,
  PhysicalBusinessType.DESIGN_SPACE,
  PhysicalBusinessType.WORKSHOP,
  PhysicalBusinessType.STORAGE,
  PhysicalBusinessType.PROVIDER,
  PhysicalBusinessType.LIVING_SPACE,
  PhysicalBusinessType.BANK,
];

type MapMarkerStack = {
  settlementId: string;
  settlementName: string;
  lat: number;
  lng: number;
  markers: MapMarker[];
};

function createStackMarkerIcon(count: number): L.DivIcon {
  const safeCount = Math.max(0, Math.min(9999, count));
  const countLabel = safeCount > 999 ? '999+' : String(safeCount);

  const html = `
    <div style="position: relative; width: ${STACK_MARKER_SIZE}px; height: ${STACK_MARKER_SIZE}px; transform: translate(-50%, -50%);">
      <div style="
        position: absolute;
        inset: 0;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.92);
        border: 3px solid #facc15;
        box-shadow: 0 0 0 5px rgba(250, 204, 21, 0.22);
      "></div>
      <div style="
        position: absolute;
        inset: 5px;
        border-radius: 999px;
        background: #0f172a;
        border: 1px solid rgba(250, 204, 21, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="color: #facc15; font-size: 11px; font-weight: 700; letter-spacing: -0.05em;">${countLabel}</span>
      </div>
    </div>
  `;

  return new L.DivIcon({
    className: 'leaflet-map-marker-stack',
    html,
    iconSize: [STACK_MARKER_SIZE, STACK_MARKER_SIZE],
    iconAnchor: [Math.floor(STACK_MARKER_SIZE / 2), Math.floor(STACK_MARKER_SIZE / 2)],
    popupAnchor: [0, -Math.floor(STACK_MARKER_SIZE / 2) + 2],
  });
}

function MapBoardCameraController({ region }: { region: DisplayRegion }) {
  const map = useMap();

  useEffect(() => {
    const center: LatLngExpression = [region.center.lat, region.center.lng];
    map.setView(center, region.defaultZoom, {
      animate: false,
    });
  }, [map, region]);

  return null;
}

function MapControls({
  visible,
  isScrollWheelZoomEnabled,
  onToggleScrollWheelZoom,
}: {
  visible: boolean;
  isScrollWheelZoomEnabled: boolean;
  onToggleScrollWheelZoom: () => void;
}) {
  const map = useMap();

  if (!visible) {
    return null;
  }

  return (
    <div className="leaflet-top leaflet-right" style={{ paddingTop: 10, paddingRight: 10 }}>
      <div className="leaflet-control flex flex-col gap-1 shadow-none">
        <button
          type="button"
          className="h-8 w-8 rounded-md border border-zinc-700/80 bg-zinc-950/95 text-zinc-100 text-sm font-bold shadow-sm"
          onClick={() => map.zoomIn()}
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          className="h-8 w-8 rounded-md border border-zinc-700/80 bg-zinc-950/95 text-zinc-100 text-sm font-bold shadow-sm"
          onClick={() => map.zoomOut()}
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          className="h-8 min-w-[4.5rem] rounded-md border border-zinc-700/80 bg-zinc-950/95 px-2 text-[10px] font-semibold text-zinc-100 shadow-sm"
          onClick={onToggleScrollWheelZoom}
        >
          Scroll {isScrollWheelZoomEnabled ? 'On' : 'Off'}
        </button>
      </div>
    </div>
  );
}

function ShapeAdjustHandles({
  shapeDraft,
  setShapeDraft,
  shapeDraftPoints,
  setShapeDraftPoints,
  isPolygonPlacing,
}: {
  shapeDraft: MapGeometryShape | null;
  setShapeDraft: Dispatch<SetStateAction<MapGeometryShape | null>>;
  shapeDraftPoints: [number, number][];
  setShapeDraftPoints: Dispatch<SetStateAction<[number, number][]>>;
  isPolygonPlacing: boolean;
}) {
  const markers: React.ReactNode[] = [];

  if (isPolygonPlacing && shapeDraftPoints.length > 0) {
    shapeDraftPoints.forEach((pt, idx) => {
      markers.push(
        <Marker
          key={`poly-place-${idx}`}
          position={pt}
          draggable
          zIndexOffset={800}
          icon={shapeVertexHandleIcon}
          eventHandlers={{
            dragend: (e) => {
              const pos = (e.target as L.Marker).getLatLng();
              setShapeDraftPoints((prev) => {
                const next = [...prev];
                next[idx] = [pos.lat, pos.lng];
                return next;
              });
            },
          }}
        />
      );
    });
  }

  if (shapeDraft?.type === 'polygon' && shapeDraft.coordinates && shapeDraft.coordinates.length >= 3) {
    const coords = shapeDraft.coordinates;
    coords.forEach((c, idx) => {
      markers.push(
        <Marker
          key={`poly-v-${idx}`}
          position={[c.lat, c.lng]}
          draggable
          zIndexOffset={800}
          icon={shapeVertexHandleIcon}
          eventHandlers={{
            dragend: (e) => {
              const pos = (e.target as L.Marker).getLatLng();
              setShapeDraft((prev) => {
                if (!prev || prev.type !== 'polygon' || !prev.coordinates) return prev;
                const nextCoords = [...prev.coordinates];
                nextCoords[idx] = { lat: pos.lat, lng: pos.lng };
                return {
                  ...prev,
                  coordinates: nextCoords,
                  center: centroidFromCoords(nextCoords),
                };
              });
            },
          }}
        />
      );
    });
    const cen = centroidFromCoords(coords);
    markers.push(
      <Marker
        key="poly-move"
        position={[cen.lat, cen.lng]}
        draggable
        zIndexOffset={750}
        icon={shapeMoveHandleIcon}
        eventHandlers={{
          dragend: (e) => {
            const pos = (e.target as L.Marker).getLatLng();
            setShapeDraft((prev) => {
              if (!prev || prev.type !== 'polygon' || !prev.coordinates?.length) return prev;
              const oldC = centroidFromCoords(prev.coordinates);
              const dLat = pos.lat - oldC.lat;
              const dLng = pos.lng - oldC.lng;
              const coordinates = prev.coordinates.map((p) => ({
                lat: p.lat + dLat,
                lng: p.lng + dLng,
              }));
              return {
                ...prev,
                coordinates,
                center: centroidFromCoords(coordinates),
              };
            });
          },
        }}
      />
    );
  }

  if (shapeDraft?.type === 'rectangle' && shapeDraft.bounds) {
    const corners = rectangleCornersFromBounds(shapeDraft.bounds);
    corners.forEach((pt, idx) => {
      markers.push(
        <Marker
          key={`rect-c-${idx}`}
          position={pt}
          draggable
          zIndexOffset={800}
          icon={shapeVertexHandleIcon}
          eventHandlers={{
            dragend: (e) => {
              const pos = (e.target as L.Marker).getLatLng();
              setShapeDraft((prev) => {
                if (!prev || prev.type !== 'rectangle' || !prev.bounds) return prev;
                const prevCorners = rectangleCornersFromBounds(prev.bounds);
                const nextCorners = [...prevCorners];
                nextCorners[idx] = [pos.lat, pos.lng];
                const bounds = boundsFromRectangleCorners(nextCorners);
                const [[swLat, swLng], [neLat, neLng]] = bounds;
                return {
                  ...prev,
                  bounds,
                  center: { lat: (swLat + neLat) / 2, lng: (swLng + neLng) / 2 },
                };
              });
            },
          }}
        />
      );
    });
    if (shapeDraft.center) {
      markers.push(
        <Marker
          key="rect-move"
          position={[shapeDraft.center.lat, shapeDraft.center.lng]}
          draggable
          zIndexOffset={750}
          icon={shapeMoveHandleIcon}
          eventHandlers={{
            dragend: (e) => {
              const pos = (e.target as L.Marker).getLatLng();
              setShapeDraft((prev) => {
                if (!prev || prev.type !== 'rectangle' || !prev.bounds || !prev.center) return prev;
                const dLat = pos.lat - prev.center!.lat;
                const dLng = pos.lng - prev.center!.lng;
                const [[s, w], [n, e]] = prev.bounds;
                const bounds: [[number, number], [number, number]] = [
                  [s + dLat, w + dLng],
                  [n + dLat, e + dLng],
                ];
                return {
                  ...prev,
                  bounds,
                  center: { lat: pos.lat, lng: pos.lng },
                };
              });
            },
          }}
        />
      );
    }
  }

  if (shapeDraft?.type === 'circle' && shapeDraft.center && shapeDraft.radius != null) {
    const edge = latLngEastOfCenterByMeters(shapeDraft.center, shapeDraft.radius);
    markers.push(
      <Marker
        key="circ-center"
        position={[shapeDraft.center.lat, shapeDraft.center.lng]}
        draggable
        zIndexOffset={800}
        icon={shapeMoveHandleIcon}
        eventHandlers={{
          dragend: (e) => {
            const pos = (e.target as L.Marker).getLatLng();
            setShapeDraft((prev) => {
              if (!prev || prev.type !== 'circle' || prev.radius == null) return prev;
              return {
                ...prev,
                center: { lat: pos.lat, lng: pos.lng },
              };
            });
          },
        }}
      />
    );
    markers.push(
      <Marker
        key="circ-r"
        position={edge}
        draggable
        zIndexOffset={800}
        icon={shapeRadiusHandleIcon}
        eventHandlers={{
          dragend: (e) => {
            const pos = (e.target as L.Marker).getLatLng();
            setShapeDraft((prev) => {
              if (!prev || prev.type !== 'circle' || !prev.center || prev.radius == null) return prev;
              const c = L.latLng(prev.center.lat, prev.center.lng);
              const radius = c.distanceTo(L.latLng(pos.lat, pos.lng));
              return {
                ...prev,
                radius: Math.max(8, radius),
              };
            });
          },
        }}
      />
    );
  }

  return <>{markers}</>;
}

function MapDrawingEventHandler({
  onMapDrawingClick,
}: {
  onMapDrawingClick: (event: LeafletMouseEvent) => void;
}) {
  useMapEvents({
    click: (event) => {
      onMapDrawingClick(event);
    },
  });

  return null;
}

function CoordinatePickHandler({
  session,
  onComplete,
}: {
  session: { pickId: string };
  onComplete: () => void;
}) {
  useMapEvents({
    click: (event) => {
      window.dispatchEvent(
        new CustomEvent<CoordPickResultDetail>(adminMapWindowEvents.coordPicked, {
          detail: {
            pickId: session.pickId,
            lat: event.latlng.lat,
            lng: event.latlng.lng,
          },
        })
      );
      onComplete();
    },
  });

  return null;
}

/** While drawing or picking coordinates, disable drag so clicks register as points (not pan). */
function MapInteractionMode({ mapInteractionLocked }: { mapInteractionLocked: boolean }) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    if (mapInteractionLocked) {
      map.dragging.disable();
      container.style.cursor = 'crosshair';
    } else {
      map.dragging.enable();
      container.style.cursor = '';
    }
    return () => {
      map.dragging.enable();
      container.style.cursor = '';
    };
  }, [map, mapInteractionLocked]);

  return null;
}

type MapBoardProps = {
  mapData: MapReadModel;
  coordinatePickSession?: { pickId: string } | null;
  onCoordinatePickComplete?: () => void;
  onRegionShapeSave?: (region: Region) => void;
  onSettlementShapeSave?: (settlement: Settlement) => void;
};

export default function MapBoard({
  mapData,
  coordinatePickSession,
  onCoordinatePickComplete,
  onRegionShapeSave,
  onSettlementShapeSave,
}: MapBoardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isScrollWheelZoomEnabled, setIsScrollWheelZoomEnabled] = useState(true);
  const [showBoardHud, setShowBoardHud] = useState(() =>
    readAdminMapBoolPref(adminMapLocalStorageKeys.showBoardHud, true)
  );
  const [showHudLegend, setShowHudLegend] = useState(() =>
    readAdminMapBoolPref(adminMapLocalStorageKeys.showHudLegend, true)
  );
  const [showZoomControls, setShowZoomControls] = useState(() =>
    readAdminMapBoolPref(adminMapLocalStorageKeys.showZoomControls, true)
  );

  const tileUrl = process.env.NEXT_PUBLIC_MAP_TILE_URL || DEFAULT_TILE_URL;
  const tileAttribution = process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION || DEFAULT_TILE_ATTRIBUTION;

  const availableRegions: DisplayRegion[] = useMemo(
    () =>
      mapData.regions
        .filter((region) => region.isActive)
        .map((region) => ({
          id: region.id,
          name: region.name,
          center: region.center,
          defaultZoom: region.defaultZoom,
          maxBounds: region.maxBounds,
          isUnlocked: region.isUnlocked,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    [mapData.regions]
  );

  const settlementNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const settlement of mapData.settlements) {
      map.set(settlement.id, settlement.name);
    }
    return map;
  }, [mapData.settlements]);

  const regionList = useMemo(() => mapData.regions, [mapData.regions]);
  const settlementList = useMemo(() => mapData.settlements, [mapData.settlements]);

  const [activeRegionId, setActiveRegionId] = useState<string>(FALLBACK_REGION.id);
  const [isShapeMode, setIsShapeMode] = useState(false);
  const [shapeTargetType, setShapeTargetType] = useState<'region' | 'settlement'>('region');
  const [shapeTargetId, setShapeTargetId] = useState('');
  const [shapeMode, setShapeMode] = useState<MapGeometryShapeType>('rectangle');
  const [shapeDraft, setShapeDraft] = useState<MapGeometryShape | null>(null);
  const [shapeDraftPoints, setShapeDraftPoints] = useState<[number, number][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [shapeSaving, setShapeSaving] = useState(false);
  const [shapeError, setShapeError] = useState('');
  const [mapUnlockPrompt, setMapUnlockPrompt] = useState<MapUnlockPromptState | null>(null);
  const [mapUnlockBusy, setMapUnlockBusy] = useState(false);

  useEffect(() => {
    if (!availableRegions.length) {
      if (activeRegionId !== FALLBACK_REGION.id) {
        setActiveRegionId(FALLBACK_REGION.id);
      }
      return;
    }

    const exists = availableRegions.some((region) => region.id === activeRegionId);
    if (exists) {
      return;
    }

    let nextId = availableRegions[0].id;
    try {
      const stored =
        typeof window !== 'undefined' ? localStorage.getItem(adminMapLocalStorageKeys.activeRegionId) : null;
      if (stored && availableRegions.some((region) => region.id === stored)) {
        nextId = stored;
      }
    } catch {
      /* ignore */
    }
    setActiveRegionId(nextId);
  }, [activeRegionId, availableRegions]);

  const handleRegionSelectChange = useCallback((id: string) => {
    setActiveRegionId(id);
    try {
      localStorage.setItem(adminMapLocalStorageKeys.activeRegionId, id);
    } catch {
      /* ignore */
    }
  }, []);

  const activeRegion = availableRegions.find((region) => region.id === activeRegionId) ?? FALLBACK_REGION;

  const settlementsInMapScope = useMemo(() => {
    const list =
      activeRegion.id === FALLBACK_REGION.id
        ? settlementList
        : settlementList.filter((s) => s.regionId === activeRegion.id);
    return [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [activeRegion.id, settlementList]);

  const regionShapeTargetId = useMemo(() => {
    if (activeRegion.id === FALLBACK_REGION.id) {
      return '';
    }
    return regionList.some((r) => r.id === activeRegion.id) ? activeRegion.id : '';
  }, [activeRegion.id, regionList]);

  const shapeEditTargetId = shapeTargetType === 'region' ? regionShapeTargetId : shapeTargetId;

  useEffect(() => {
    if (shapeTargetType !== 'settlement') {
      return;
    }
    if (settlementsInMapScope.length === 0) {
      setShapeTargetId('');
      return;
    }
    if (!settlementsInMapScope.some((s) => s.id === shapeTargetId)) {
      setShapeTargetId(settlementsInMapScope[0].id);
    }
  }, [shapeTargetType, settlementsInMapScope, shapeTargetId]);

  const visibleMarkers = activeRegion.id === FALLBACK_REGION.id
    ? mapData.markers
    : mapData.markers.filter((marker) => marker.regionId === activeRegion.id);

  const visibleMarkerStacks = useMemo<MapMarkerStack[]>(() => {
    const grouped = new Map<string, MapMarkerStack>();
    for (const marker of visibleMarkers) {
      const current = grouped.get(marker.settlementId);
      const displaySettlementName = settlementNameById.get(marker.settlementId) ?? marker.settlementId;
      if (!current) {
        grouped.set(marker.settlementId, {
          settlementId: marker.settlementId,
          settlementName: displaySettlementName,
          lat: marker.lat,
          lng: marker.lng,
          markers: [marker],
        });
        continue;
      }
      current.markers.push(marker);
    }
    return Array.from(grouped.values()).sort((a, b) => a.settlementName.localeCompare(b.settlementName));
  }, [visibleMarkers, settlementNameById]);

  const selectedEntity = useMemo(() => {
    if (!shapeEditTargetId) {
      return null;
    }
    if (shapeTargetType === 'region') {
      return regionList.find((region) => region.id === shapeEditTargetId) as Region | undefined;
    }
    return settlementList.find((settlement) => settlement.id === shapeEditTargetId) as Settlement | undefined;
  }, [shapeEditTargetId, shapeTargetType, regionList, settlementList]);

  const effectiveShapePreview = useMemo(() => {
    if (shapeDraft) return shapeDraft;
    if (!selectedEntity) {
      return null;
    }

    return selectedEntity.shape || null;
  }, [shapeDraft, selectedEntity]);

  const handleOpenSiteByMarker = useCallback(
    (siteId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(OPEN_ENTITY_QUERY, 'site');
      params.set(OPEN_ID_QUERY, siteId);
      const nextQuery = params.toString();
      const target = nextQuery ? `${pathname || '/admin/map'}?${nextQuery}` : (pathname || '/admin/map');

      router.replace(target, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const handleMapDrawingClick = useCallback(
    (event: LeafletMouseEvent) => {
      if (!isDrawing || !shapeTargetType || !shapeEditTargetId) {
        return;
      }

      setShapeError('');
      const nextPoint: [number, number] = [event.latlng.lat, event.latlng.lng];

      if (shapeMode === 'polygon') {
        setShapeDraftPoints((prev) => {
          if (prev.length >= maxPolygonVertices) return prev;
          return [...prev, nextPoint];
        });
        return;
      }

      if (shapeMode === 'rectangle') {
        if (shapeDraftPoints.length === 0) {
          setShapeDraftPoints([nextPoint]);
          return;
        }

        if (shapeDraftPoints.length >= 1) {
          const first = shapeDraftPoints[0];
          const swLat = Math.min(first[0], nextPoint[0]);
          const swLng = Math.min(first[1], nextPoint[1]);
          const neLat = Math.max(first[0], nextPoint[0]);
          const neLng = Math.max(first[1], nextPoint[1]);
          const bounds: [[number, number], [number, number]] = [
            [swLat, swLng],
            [neLat, neLng]
          ];
          setShapeDraft({
            type: 'rectangle',
            bounds,
            center: {
              lat: (swLat + neLat) / 2,
              lng: (swLng + neLng) / 2
            }
          });
          setShapeDraftPoints([]);
          setIsDrawing(false);
          return;
        }
      }

      if (shapeMode === 'circle') {
        if (shapeDraftPoints.length === 0) {
          setShapeDraftPoints([nextPoint]);
          return;
        }

        const centerPoint = shapeDraftPoints[0];
        const center = L.latLng(centerPoint[0], centerPoint[1]);
        const target = L.latLng(nextPoint[0], nextPoint[1]);
        const radius = center.distanceTo(target);
        setShapeDraft({
          type: 'circle',
          center: {
            lat: centerPoint[0],
            lng: centerPoint[1]
          },
          radius
        });
        setShapeDraftPoints([]);
        setIsDrawing(false);
      }
    },
    [isDrawing, shapeTargetType, shapeEditTargetId, shapeMode, shapeDraftPoints]
  );

  const resetShapeDraft = useCallback(() => {
    setShapeDraft(null);
    setShapeDraftPoints([]);
    setShapeError('');
  }, []);

  const finishPolygonDraft = useCallback(() => {
    if (shapeMode !== 'polygon') return;
    if (shapeDraftPoints.length < 3) return;
    const coords = shapeDraftPoints.map(([lat, lng]) => ({ lat, lng }));
    setShapeDraft({
      type: 'polygon',
      coordinates: coords,
      center: centroidFromCoords(coords),
    });
    setShapeDraftPoints([]);
    setIsDrawing(false);
  }, [shapeMode, shapeDraftPoints]);

  useEffect(() => {
    if (shapeMode !== 'polygon' || !isDrawing) return;
    if (shapeDraftPoints.length !== maxPolygonVertices) return;
    const coords = shapeDraftPoints.map(([lat, lng]) => ({ lat, lng }));
    setShapeDraft({
      type: 'polygon',
      coordinates: coords,
      center: centroidFromCoords(coords),
    });
    setShapeDraftPoints([]);
    setIsDrawing(false);
  }, [shapeMode, isDrawing, shapeDraftPoints]);

  const handleSaveShape = useCallback(async () => {
    if (!shapeEditTargetId || !shapeDraft) return;
    setShapeSaving(true);
    setShapeError('');
    try {
      if (shapeTargetType === 'region') {
        const target = regionList.find((item) => item.id === shapeEditTargetId);
        if (!target) {
          throw new Error('Region not found');
        }
        let nextCenter = target.center;
        if (shapeDraft.type === 'rectangle' && shapeDraft.center) {
          nextCenter = shapeDraft.center;
        } else if (shapeDraft.type === 'circle' && shapeDraft.center) {
          nextCenter = shapeDraft.center;
        } else if (shapeDraft.type === 'polygon' && shapeDraft.coordinates?.length) {
          nextCenter = centroidFromCoords(shapeDraft.coordinates);
        }

        let nextMaxBounds = target.maxBounds;
        if (shapeDraft.type === 'rectangle' && shapeDraft.bounds) {
          nextMaxBounds = shapeDraft.bounds;
        } else if (shapeDraft.type === 'polygon' && shapeDraft.coordinates?.length) {
          nextMaxBounds = boundsFromCoordPoints(shapeDraft.coordinates);
        }

        let payload: Region = {
          ...target,
          shape: shapeDraft,
          center: nextCenter,
          maxBounds: nextMaxBounds,
          updatedAt: new Date(),
        };
        const saved = await ClientAPI.upsertRegion(payload);
        onRegionShapeSave?.(saved);
        setIsDrawing(false);
        resetShapeDraft();
        window.dispatchEvent(new Event('mapDataRefreshNeeded'));
        if (saved.isUnlocked !== true) {
          setMapUnlockPrompt({ kind: 'region', entity: saved });
        }
      } else {
        const target = settlementList.find((item) => item.id === shapeEditTargetId);
        if (!target) {
          throw new Error('Settlement not found');
        }
        let nextCoords: Settlement['coordinates'] = target.coordinates;
        if (shapeDraft.type === 'rectangle' && shapeDraft.center) {
          nextCoords = { ...shapeDraft.center };
        } else if (shapeDraft.type === 'circle' && shapeDraft.center) {
          nextCoords = { ...shapeDraft.center };
        } else if (shapeDraft.type === 'polygon' && shapeDraft.coordinates?.length) {
          nextCoords = centroidFromCoords(shapeDraft.coordinates);
        }

        let payload: Settlement = {
          ...target,
          shape: shapeDraft,
          coordinates: nextCoords,
          updatedAt: new Date(),
        };
        const saved = await ClientAPI.upsertSettlement(payload);
        onSettlementShapeSave?.(saved);
        setIsDrawing(false);
        resetShapeDraft();
        window.dispatchEvent(new Event('mapDataRefreshNeeded'));
        if (saved.isUnlocked !== true) {
          setMapUnlockPrompt({ kind: 'settlement', entity: saved });
        }
      }
    } catch (error) {
      console.error('Failed to save shape:', error);
      setShapeError('Unable to save shape. Please retry.');
    } finally {
      setShapeSaving(false);
    }
  }, [regionList, settlementList, shapeDraft, shapeEditTargetId, shapeTargetType, onRegionShapeSave, onSettlementShapeSave, resetShapeDraft]);

  const handleConfirmMapUnlock = useCallback(async () => {
    if (!mapUnlockPrompt) return;
    setMapUnlockBusy(true);
    setShapeError('');
    try {
      if (mapUnlockPrompt.kind === 'region') {
        const updated = await ClientAPI.upsertRegion({ ...mapUnlockPrompt.entity, isUnlocked: true });
        onRegionShapeSave?.(updated);
      } else {
        const updated = await ClientAPI.upsertSettlement({ ...mapUnlockPrompt.entity, isUnlocked: true });
        onSettlementShapeSave?.(updated);
      }
      window.dispatchEvent(new Event('mapDataRefreshNeeded'));
      setMapUnlockPrompt(null);
    } catch (e) {
      console.error('Failed to unlock on map:', e);
      setShapeError('Unable to unlock on the map. You can unlock from the entity form.');
    } finally {
      setMapUnlockBusy(false);
    }
  }, [mapUnlockPrompt, onRegionShapeSave, onSettlementShapeSave]);

  const businessTypeLegend = useMemo(() => {
    const countByType = new Map<PhysicalBusinessType, number>();
    for (const marker of visibleMarkers) {
      const prev = countByType.get(marker.businessType) || 0;
      countByType.set(marker.businessType, prev + 1);
    }

    return BUSINESS_TYPES_ORDER.map<MarkerLegendEntry>((type) => ({
      type,
      label: BUSINESS_TYPE_THEME[type].label,
      iconPath: BUSINESS_TYPE_THEME[type].iconPath,
      glowColor: BUSINESS_TYPE_THEME[type].glowColor,
      count: countByType.get(type) || 0,
    }));
  }, [visibleMarkers]);

  const missingCoordinatesSettlementNames = useMemo(
    () => mapData.missingCoordinatesSettlementIds.map((id) => settlementNameById.get(id) ?? id),
    [mapData.missingCoordinatesSettlementIds, settlementNameById]
  );

  const isPlacingShapePoints = Boolean(isDrawing && !coordinatePickSession && !shapeDraft);
  const mapInteractionLocked = Boolean(coordinatePickSession || isPlacingShapePoints);

  const shapeAdjustHandlesActive =
    isShapeMode &&
    Boolean(shapeEditTargetId) &&
    (Boolean(shapeDraft) ||
      (isDrawing && shapeMode === 'polygon' && shapeDraftPoints.length > 0 && !shapeDraft));

  const isPolygonPlacingForHandles = Boolean(isDrawing && shapeMode === 'polygon' && !shapeDraft);

  const hasSavedAreaShape = Boolean(selectedEntity?.shape);
  const hasShapeDraft = Boolean(shapeDraft);
  const placeOrEditButtonLabel = isPlacingShapePoints
    ? 'Stop placing'
    : !hasShapeDraft && hasSavedAreaShape
      ? 'Edit area'
      : hasShapeDraft
        ? 'Redraw from scratch'
        : 'Start placing';

  const handlePlaceOrEditShapeClick = () => {
    const canShapeTarget =
      (shapeTargetType === 'region' && regionShapeTargetId) || (shapeTargetType === 'settlement' && shapeTargetId);
    if (!canShapeTarget) return;

    if (isPlacingShapePoints) {
      setIsDrawing(false);
      return;
    }

    if (!shapeDraft && selectedEntity?.shape) {
      setShapeDraft(cloneMapGeometryShape(selectedEntity.shape));
      setShapeDraftPoints([]);
      setIsDrawing(false);
      setShapeError('');
      return;
    }

    if (shapeDraft && !isPlacingShapePoints) {
      resetShapeDraft();
      setIsDrawing(true);
      setShapeError('');
      return;
    }

    resetShapeDraft();
    setIsDrawing(true);
    setShapeError('');
  };

  return (
    <>
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="relative min-h-[20rem] w-full shrink-0 rounded-lg border border-border bg-muted md:min-h-[28rem]">
        {coordinatePickSession && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex justify-center px-2 pt-3">
            <div className="pointer-events-auto rounded-md border border-sky-500/50 bg-sky-950/90 px-3 py-2 text-center text-xs text-sky-100 shadow-lg">
              Crosshair mode: click once on the map to set coordinates. Drag is off until you finish. Closing the form
              cancels.
            </div>
          </div>
        )}
        {isPlacingShapePoints && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex justify-center px-2 pt-3">
            <div className="pointer-events-auto rounded-md border border-amber-500/50 bg-amber-950/90 px-3 py-2 text-center text-xs text-amber-100 shadow-lg">
              Placing points: map drag is off. Stop placing to pan and drag handles to adjust the shape.
            </div>
          </div>
        )}
        <MapContainer
          center={[activeRegion.center.lat, activeRegion.center.lng]}
          zoom={activeRegion.defaultZoom}
          className="h-[20rem] w-full md:h-[28rem]"
          scrollWheelZoom={isScrollWheelZoomEnabled}
          maxBounds={activeRegion.maxBounds || WORLD_BOUNDS}
          maxBoundsViscosity={activeRegion.maxBounds ? 1.0 : 0}
          doubleClickZoom={false}
          attributionControl={false}
          zoomControl={false}
        >
          <MapInteractionMode mapInteractionLocked={mapInteractionLocked} />
          {coordinatePickSession && onCoordinatePickComplete && (
            <CoordinatePickHandler session={coordinatePickSession} onComplete={onCoordinatePickComplete} />
          )}
          {isPlacingShapePoints && <MapDrawingEventHandler onMapDrawingClick={handleMapDrawingClick} />}
          {shapeAdjustHandlesActive && (
            <ShapeAdjustHandles
              shapeDraft={shapeDraft}
              setShapeDraft={setShapeDraft}
              shapeDraftPoints={shapeDraftPoints}
              setShapeDraftPoints={setShapeDraftPoints}
              isPolygonPlacing={isPolygonPlacingForHandles}
            />
          )}
          <MapControls
            visible={showZoomControls}
            isScrollWheelZoomEnabled={isScrollWheelZoomEnabled}
            onToggleScrollWheelZoom={() => setIsScrollWheelZoomEnabled((state) => !state)}
          />
          <MapBoardCameraController region={activeRegion} />
          <TileLayer url={tileUrl} attribution={tileAttribution} />
          {visibleMarkerStacks.map((stack) => {
            const settlementOwners = [
              ...new Set(
              stack.markers.flatMap((marker) => marker.owners.map((owner) => owner.name))
              )
            ];

            return (
            <Marker
              key={stack.settlementId}
              position={[stack.lat, stack.lng]}
              icon={createStackMarkerIcon(stack.markers.length)}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                <div className="text-xs">
                  <div className="font-semibold">{stack.settlementName}</div>
                  <div>Sites: {stack.markers.length}</div>
                  <div className="text-muted-foreground">
                    Owners: {settlementOwners.join(', ') || 'Unassigned'}
                  </div>
                  <div className="text-muted-foreground">
                    Preview: {stack.markers.slice(0, 3).map((site) => site.siteName).join(', ')}
                  </div>
                </div>
              </Tooltip>
              <Popup>
                <div className="min-w-[14rem] text-xs">
                  <div className="mb-2 font-semibold">{stack.settlementName}</div>
                  <div className="text-muted-foreground">Sites on this point: {stack.markers.length}</div>
                  <div className="mt-2 space-y-2">
                    {stack.markers.map((marker) => {
                      const theme = BUSINESS_TYPE_THEME[marker.businessType];
                      const owners = marker.owners.map((owner) => owner.name).join(', ');
                      return (
                        <div key={marker.siteId} className="rounded border border-border p-2">
                          <div className="flex items-center gap-2">
                            <img
                              src={theme.iconPath}
                              alt={theme.label}
                              className="h-4 w-4 rounded-sm"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{marker.siteName}</p>
                              <p className="text-[10px] text-muted-foreground">
                                Owners: {owners.length > 0 ? owners : 'Unassigned'}
                              </p>
                            </div>
                            <button
                              type="button"
                              className="inline-flex rounded border border-emerald-300/40 bg-emerald-500/90 px-2 py-1 text-[11px] font-medium text-white hover:bg-emerald-500"
                              onClick={() => handleOpenSiteByMarker(marker.siteId)}
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Popup>
            </Marker>
            );
          })}
          {effectiveShapePreview?.type === 'rectangle' && effectiveShapePreview.bounds && (
            <Rectangle
              bounds={effectiveShapePreview.bounds}
              pathOptions={
                shapeDraft
                  ? { color: '#f59e0b', weight: 2, fillColor: '#f59e0b', fillOpacity: 0.2 }
                  : { color: '#34d399', weight: 2, fillColor: '#34d399', fillOpacity: 0.15 }
              }
            />
          )}
          {effectiveShapePreview?.type === 'circle' && effectiveShapePreview.center && effectiveShapePreview.radius && (
            <Circle
              center={[effectiveShapePreview.center.lat, effectiveShapePreview.center.lng]}
              radius={effectiveShapePreview.radius}
              pathOptions={
                shapeDraft
                  ? { color: '#f59e0b', weight: 2, fillColor: '#f59e0b', fillOpacity: 0.2 }
                  : { color: '#60a5fa', weight: 2, fillColor: '#60a5fa', fillOpacity: 0.12 }
              }
            />
          )}
          {effectiveShapePreview?.type === 'polygon' &&
            effectiveShapePreview.coordinates &&
            effectiveShapePreview.coordinates.length >= 3 && (
              <Polygon
                positions={effectiveShapePreview.coordinates.map((c) => [c.lat, c.lng])}
                pathOptions={
                  shapeDraft
                    ? { color: '#f59e0b', weight: 2, fillColor: '#f59e0b', fillOpacity: 0.18 }
                    : { color: '#34d399', weight: 2, fillColor: '#34d399', fillOpacity: 0.12 }
                }
              />
            )}
          {isDrawing && shapeMode === 'polygon' && shapeDraftPoints.length >= 2 && (
            <Polyline
              positions={shapeDraftPoints}
              pathOptions={{ color: '#f59e0b', weight: 2 }}
            />
          )}
          {isDrawing && shapeMode === 'polygon' && shapeDraftPoints.length >= 3 && (
            <Polygon
              positions={shapeDraftPoints.map(([lat, lng]) => [lat, lng])}
              pathOptions={{ color: '#f59e0b', weight: 2, fillColor: '#f59e0b', fillOpacity: 0.12 }}
            />
          )}
          {showBoardHud && (
            <MapHUD
              activeRegionName={activeRegion.name}
              visibleMarkerCount={visibleMarkers.length}
              missingCoordinatesSettlementIds={missingCoordinatesSettlementNames}
              legend={businessTypeLegend.filter((entry) => entry.count > 0)}
              showLegend={showHudLegend}
            />
          )}
        </MapContainer>
      </div>

      <div className="shrink-0 border-t border-border pt-4">
        <section className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Map</h3>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <label className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-border"
                  checked={showBoardHud}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setShowBoardHud(next);
                    writeAdminMapBoolPref(adminMapLocalStorageKeys.showBoardHud, next);
                  }}
                />
                HUD
              </label>
              <label className={`flex cursor-pointer items-center gap-1.5 ${!showBoardHud ? 'pointer-events-none opacity-40' : ''}`}>
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-border"
                  checked={showHudLegend}
                  disabled={!showBoardHud}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setShowHudLegend(next);
                    writeAdminMapBoolPref(adminMapLocalStorageKeys.showHudLegend, next);
                  }}
                />
                Legend
              </label>
              <label className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-border"
                  checked={showZoomControls}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setShowZoomControls(next);
                    writeAdminMapBoolPref(adminMapLocalStorageKeys.showZoomControls, next);
                  }}
                />
                Zoom bar
              </label>
            </div>
          </div>

          <div className="max-w-md">
            <label htmlFor="map-region-select" className="mb-1 block text-xs text-muted-foreground">
              Region (saved in this browser)
            </label>
            <select
              id="map-region-select"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={activeRegion.id}
              onChange={(event) => handleRegionSelectChange(event.target.value)}
              disabled={availableRegions.length === 0}
            >
              {availableRegions.length === 0 ? (
                <option value={FALLBACK_REGION.id}>Global view</option>
              ) : (
                availableRegions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                    {region.isUnlocked === false ? ' (locked)' : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="rounded-md border border-border bg-background/60 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">Draw area on map</span>
              <button
                type="button"
                className="rounded-md border border-zinc-700/70 bg-zinc-950/90 px-2 py-1 text-xs text-foreground"
                onClick={() => {
                  if (isShapeMode) {
                    setIsDrawing(false);
                    resetShapeDraft();
                  }
                  setIsShapeMode((value) => !value);
                }}
              >
                {isShapeMode ? 'Hide' : 'Show'}
              </button>
            </div>
            {!isShapeMode ? (
              <p className="text-xs text-muted-foreground">
                Open to draw a rectangle, circle, or polygon for the <strong>region selected above</strong> or for a settlement
                in that region. Use <strong>Start placing</strong>, then click the map (crosshair mode).
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="rounded border border-border bg-background px-2 py-1.5 text-sm"
                    value={shapeTargetType}
                    onChange={(event) => {
                      const v = event.target.value as 'region' | 'settlement';
                      setShapeTargetType(v);
                      resetShapeDraft();
                      setIsDrawing(false);
                    }}
                  >
                    <option value="region">Region (this scope)</option>
                    <option value="settlement">Settlement</option>
                  </select>
                  {shapeTargetType === 'settlement' ? (
                    <select
                      className="min-w-[10rem] flex-1 rounded border border-border bg-background px-2 py-1.5 text-sm"
                      value={shapeTargetId}
                      onChange={(event) => setShapeTargetId(event.target.value)}
                      disabled={settlementsInMapScope.length === 0}
                    >
                      {settlementsInMapScope.length === 0 ? (
                        <option value="">No settlements in this region</option>
                      ) : (
                        settlementsInMapScope.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))
                      )}
                    </select>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {regionShapeTargetId ? (
                        <>
                          Editing region: <strong className="text-foreground">{activeRegion.name}</strong>
                        </>
                      ) : (
                        <>Choose a region above (not global view) to edit its shape.</>
                      )}
                    </span>
                  )}
                  <select
                    className="rounded border border-border bg-background px-2 py-1.5 text-sm"
                    value={shapeMode}
                    onChange={(event) => {
                      setShapeMode(event.target.value as MapGeometryShapeType);
                      resetShapeDraft();
                      setIsDrawing(false);
                    }}
                  >
                    <option value="rectangle">Rectangle</option>
                    <option value="circle">Circle</option>
                    <option value="polygon">Polygon</option>
                  </select>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-zinc-700/70 bg-zinc-950/90 px-2 py-1.5 text-xs disabled:opacity-40"
                    disabled={
                      !(
                        (shapeTargetType === 'region' && regionShapeTargetId) ||
                        (shapeTargetType === 'settlement' && shapeTargetId)
                      )
                    }
                    onClick={handlePlaceOrEditShapeClick}
                  >
                    {placeOrEditButtonLabel}
                  </button>
                  {isShapeMode && shapeMode === 'polygon' && isDrawing && (
                    <button
                      type="button"
                      className="rounded-md border border-sky-600/60 bg-sky-500/10 px-2 py-1.5 text-xs text-sky-100 disabled:opacity-50"
                      disabled={shapeDraftPoints.length < 3}
                      onClick={finishPolygonDraft}
                    >
                      Finish polygon
                    </button>
                  )}
                  <button
                    type="button"
                    className="rounded-md border border-emerald-600/60 bg-emerald-500/10 px-2 py-1.5 text-xs text-emerald-100 disabled:opacity-50"
                    disabled={!shapeDraft || shapeSaving}
                    onClick={handleSaveShape}
                  >
                    {shapeSaving ? 'Saving…' : 'Save to entity'}
                  </button>
                  <button type="button" className="rounded-md border border-border px-2 py-1.5 text-xs" onClick={resetShapeDraft}>
                    Clear draft
                  </button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {isPlacingShapePoints
                    ? shapeMode === 'polygon'
                      ? `Polygon: ${shapeDraftPoints.length}/${maxPolygonVertices} points (min 3), then Finish polygon. Drag square handles to move vertices.`
                      : shapeMode === 'rectangle'
                        ? 'Click two opposite corners.'
                        : 'Click center, then edge for radius.'
                    : shapeDraft
                      ? 'Drag orange corner handles or the dashed center to move the shape; blue dot adjusts circle radius. Save or clear when done.'
                      : hasSavedAreaShape
                        ? 'An area is already saved. Use Edit area to load it and adjust with handles, or Redraw from scratch to define a new shape.'
                        : 'Start placing, then click the map.'}
                </p>
                {shapeError && <div className="mt-1 text-xs text-red-400">{shapeError}</div>}
              </>
            )}
          </div>
        </section>
      </div>
    </div>

    <Dialog
      open={mapUnlockPrompt !== null}
      onOpenChange={(open) => {
        if (!open && !mapUnlockBusy) {
          setMapUnlockPrompt(null);
        }
      }}
    >
      <DialogContent zIndexLayer="SUB_MODALS" className="max-w-md">
        <DialogHeader>
          <DialogTitle>Unlock on the map?</DialogTitle>
          <DialogDescription>
            {mapUnlockPrompt?.kind === 'region' ? (
              <>
                Region <span className="font-medium text-foreground">&ldquo;{mapUnlockPrompt.entity.name}&rdquo;</span> is
                saved but still locked (hidden from the public map). Unlock it now?
              </>
            ) : mapUnlockPrompt?.kind === 'settlement' ? (
              <>
                Settlement <span className="font-medium text-foreground">&ldquo;{mapUnlockPrompt.entity.name}&rdquo;</span>{' '}
                is saved but still locked (hidden from the public map). Unlock it now?
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={mapUnlockBusy} onClick={() => setMapUnlockPrompt(null)}>
            Not now
          </Button>
          <Button type="button" disabled={mapUnlockBusy} onClick={() => void handleConfirmMapUnlock()}>
            {mapUnlockBusy ? 'Unlocking…' : 'Unlock on map'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
