'use client';

import dynamic from 'next/dynamic';
import type { MapReadModel } from '@/types/map-types';
import type { Region, Settlement } from '@/types/entities';

type MapBoardProps = {
  mapData: MapReadModel;
  coordinatePickSession?: { pickId: string } | null;
  onCoordinatePickComplete?: () => void;
  onRegionShapeSave?: (region: Region) => void;
  onSettlementShapeSave?: (settlement: Settlement) => void;
};

const MapBoard = dynamic<MapBoardProps>(() => import('./map-board'), {
  ssr: false,
});

export default function MapWrapper({
  mapData,
  coordinatePickSession,
  onCoordinatePickComplete,
  onRegionShapeSave,
  onSettlementShapeSave,
}: MapBoardProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MapBoard
        mapData={mapData}
        coordinatePickSession={coordinatePickSession}
        onCoordinatePickComplete={onCoordinatePickComplete}
        onRegionShapeSave={onRegionShapeSave}
        onSettlementShapeSave={onSettlementShapeSave}
      />
    </div>
  );
}
