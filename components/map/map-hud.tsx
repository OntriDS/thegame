import type { PhysicalBusinessType } from '@/types/enums';

type MapHUDLegendItem = {
  type: PhysicalBusinessType;
  label: string;
  iconPath: string;
  glowColor: string;
  count: number;
};

type MapHUDProps = {
  activeRegionName: string;
  visibleMarkerCount: number;
  missingCoordinatesSettlementIds: string[];
  legend: MapHUDLegendItem[];
  /** When false, hide the marker-type legend block (stats stay visible). Default true. */
  showLegend?: boolean;
};

/**
 * Renders inside MapContainer using Leaflet control positioning (stable z-index, no overlay glitches).
 */
export default function MapHUD({
  activeRegionName,
  visibleMarkerCount,
  missingCoordinatesSettlementIds,
  legend,
  showLegend = true,
}: MapHUDProps) {
  const missingText = missingCoordinatesSettlementIds.length > 0
    ? `Missing coordinates in: ${missingCoordinatesSettlementIds.join(', ')}`
    : 'All active settlements have coordinates.';

  return (
    <div
      className="leaflet-bottom leaflet-left"
      style={{ paddingBottom: 12, paddingLeft: 12, pointerEvents: 'none' }}
    >
      <div className="leaflet-control pointer-events-auto !m-0 !border-0 !bg-transparent p-0 shadow-none">
        <div className="w-72 max-w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-zinc-700/70 bg-zinc-950/95 p-3 text-[11px] text-zinc-100 shadow-[0_10px_40px_rgba(0,0,0,0.45)]">
          <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-zinc-200">Board HUD</p>
          <p className="text-[11px] font-medium text-white">{activeRegionName}</p>
          <p className="mt-1 text-zinc-200">Markers visible: {visibleMarkerCount}</p>
          <p className="mt-1 break-words text-zinc-200">{missingText}</p>

          {showLegend && (
            <div className="mt-3 border-t border-zinc-700 pt-2">
              <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-200">Legend</p>
              <div className="mt-2 space-y-1">
                {legend.length === 0 ? (
                  <p className="text-zinc-300/80">No marker types active.</p>
                ) : (
                  legend.map((entry) => (
                    <div key={entry.type} className="flex items-center gap-2">
                      <img
                        src={entry.iconPath}
                        alt={entry.label}
                        className="h-4 w-4 rounded-sm"
                        style={{ boxShadow: `0 0 8px ${entry.glowColor}` }}
                      />
                      <span className="flex-1">{entry.label}</span>
                      <span className="text-zinc-100/90">{entry.count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
