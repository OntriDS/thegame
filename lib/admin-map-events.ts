/**
 * Browser-only: custom event names and localStorage keys for /admin/map.
 * String values stay stable; reference them via `adminMapWindowEvents` / `adminMapLocalStorageKeys`.
 */
export const adminMapWindowEvents = {
  requestCoordPick: 'thegame:admin-map:request-coord-pick',
  coordPicked: 'thegame:admin-map:coord-picked',
  /** Submodal closed while a map pick was in progress — clears the map overlay. */
  coordPickCancelled: 'thegame:admin-map:coord-pick-cancelled',
} as const;

export const adminMapLocalStorageKeys = {
  activeRegionId: 'thegame:admin-map:active-region-id',
  /** '1' / '0' — stats panel on the map (region, markers, missing coords) */
  showBoardHud: 'thegame:admin-map:show-board-hud',
  /** '1' / '0' — marker-type legend block inside the board HUD */
  showHudLegend: 'thegame:admin-map:show-hud-legend',
  /** '1' / '0' — zoom +/- and scroll-wheel toggle on the map */
  showZoomControls: 'thegame:admin-map:show-zoom-controls',
} as const;

export function readAdminMapBoolPref(key: string, defaultValue: boolean): boolean {
  if (typeof window === 'undefined') return defaultValue;
  const raw = localStorage.getItem(key);
  if (raw === null) return defaultValue;
  return raw === '1' || raw === 'true';
}

export function writeAdminMapBoolPref(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export type CoordPickRequestDetail = {
  pickId: string;
  kind: 'settlement' | 'regionCenter';
};

export type CoordPickResultDetail = {
  pickId: string;
  lat: number;
  lng: number;
};
