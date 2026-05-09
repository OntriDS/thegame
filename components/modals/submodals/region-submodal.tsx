'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Region } from '@/types/entities';
import { MapPin, MapPinned, X } from 'lucide-react';
import {
  adminMapWindowEvents,
  type CoordPickRequestDetail,
  type CoordPickResultDetail,
} from '@/lib/admin-map-events';

interface RegionSubmodalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (region: Region) => Promise<void> | void;
  onDelete?: (region: Region) => void;
  region?: Region | null;
  allRegions?: Region[];
}

export default function RegionSubmodal({
  open,
  onOpenChange,
  onSave,
  onDelete,
  region,
  allRegions = []
}: RegionSubmodalProps) {
  const [name, setName] = useState('');
  const [centerLat, setCenterLat] = useState(0);
  const [centerLng, setCenterLng] = useState(0);
  const [defaultZoom, setDefaultZoom] = useState(8);
  const [isActive, setIsActive] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [parentId, setParentId] = useState<string>('');
  const [useMaxBounds, setUseMaxBounds] = useState(false);
  const [southWestLat, setSouthWestLat] = useState(0);
  const [southWestLng, setSouthWestLng] = useState(0);
  const [northEastLat, setNorthEastLat] = useState(0);
  const [northEastLng, setNorthEastLng] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const pendingMapPickRef = useRef(false);
  const coordPickHandlerRef = useRef<((ev: Event) => void) | null>(null);

  useEffect(() => {
    if (!open) return;

    if (region) {
      setName(region.name || '');
      setCenterLat(region.center?.lat ?? 0);
      setCenterLng(region.center?.lng ?? 0);
      setDefaultZoom(region.defaultZoom ?? 8);
      setIsActive(region.isActive !== undefined ? region.isActive : true);
      setIsUnlocked(region.isUnlocked !== undefined ? region.isUnlocked : true);
      setParentId(region.parentId || '');

      const bounds = region.maxBounds || [];
      if (bounds.length === 2) {
        setUseMaxBounds(true);
        setSouthWestLat(bounds[0]?.[0] ?? 0);
        setSouthWestLng(bounds[0]?.[1] ?? 0);
        setNorthEastLat(bounds[1]?.[0] ?? 0);
        setNorthEastLng(bounds[1]?.[1] ?? 0);
      } else {
        setUseMaxBounds(false);
        setSouthWestLat(0);
        setSouthWestLng(0);
        setNorthEastLat(0);
        setNorthEastLng(0);
      }
    } else {
      setName('');
      setCenterLat(0);
      setCenterLng(0);
      setDefaultZoom(8);
      setIsActive(true);
      setIsUnlocked(false);
      setParentId('');
      setUseMaxBounds(false);
      setSouthWestLat(0);
      setSouthWestLng(0);
      setNorthEastLat(0);
      setNorthEastLng(0);
    }
  }, [open, region]);

  useEffect(() => {
    if (open) return;
    if (coordPickHandlerRef.current) {
      window.removeEventListener(adminMapWindowEvents.coordPicked, coordPickHandlerRef.current);
      coordPickHandlerRef.current = null;
    }
    if (!pendingMapPickRef.current) return;
    pendingMapPickRef.current = false;
    window.dispatchEvent(new Event(adminMapWindowEvents.coordPickCancelled));
  }, [open]);

  const requestPickCenterFromMap = () => {
    if (coordPickHandlerRef.current) {
      window.removeEventListener(adminMapWindowEvents.coordPicked, coordPickHandlerRef.current);
      coordPickHandlerRef.current = null;
    }
    const pickId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    pendingMapPickRef.current = true;
    const handler = (ev: Event) => {
      const ce = ev as CustomEvent<CoordPickResultDetail>;
      if (ce.detail?.pickId !== pickId) return;
      window.removeEventListener(adminMapWindowEvents.coordPicked, handler);
      coordPickHandlerRef.current = null;
      pendingMapPickRef.current = false;
      setCenterLat(ce.detail.lat);
      setCenterLng(ce.detail.lng);
    };
    coordPickHandlerRef.current = handler;
    window.addEventListener(adminMapWindowEvents.coordPicked, handler);
    window.dispatchEvent(
      new CustomEvent<CoordPickRequestDetail>(adminMapWindowEvents.requestCoordPick, {
        detail: { pickId, kind: 'regionCenter' },
      })
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Please enter a region name.');
      return;
    }

    const maxBounds: Region['maxBounds'] = useMaxBounds
      ? [[southWestLat, southWestLng] as [number, number], [northEastLat, northEastLng] as [number, number]]
      : undefined;

    const regionData: Region = {
      id: region?.id || `region-${Date.now()}`,
      name: name.trim(),
      center: {
        lat: Number.isFinite(centerLat) ? centerLat : 0,
        lng: Number.isFinite(centerLng) ? centerLng : 0,
      },
      defaultZoom: Number.isFinite(defaultZoom) ? defaultZoom : 8,
      maxBounds,
      parentId: parentId || null,
      isActive,
      isUnlocked,
      createdAt: region?.createdAt || new Date(),
      updatedAt: new Date()
    };

    try {
      setIsSaving(true);
      await onSave(regionData);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save region:', error);
      alert('Failed to save region. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenGoogleMaps = () => {
    const hasCoords = Number.isFinite(centerLat) && Number.isFinite(centerLng);
    if (hasCoords) {
      window.open(
        `https://www.google.com/maps?q=${encodeURIComponent(`${centerLat},${centerLng}`)}`,
        '_blank',
        'noopener,noreferrer'
      );
    } else {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('global view')}`,
        '_blank',
        'noopener,noreferrer'
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent zIndexLayer={'SUB_MODALS'} className="w-[560px] max-w-[95vw]">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            <span>{region ? 'Edit Region' : 'New Region'}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Name *
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Puntarenas"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="parentId" className="text-sm font-medium">
              Parent Region (optional)
            </Label>
            <Select
              value={parentId}
              onValueChange={(value) => setParentId(value === '__none__' ? '' : value)}
            >
              <SelectTrigger id="parentId">
                <SelectValue placeholder="No parent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No parent</SelectItem>
                {allRegions
                  .filter((candidate) => candidate.id !== region?.id)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {candidate.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Center *</Label>
            <div className="grid grid-cols-2 gap-2">
              <NumericInput
                value={centerLat}
                onChange={(value) => setCenterLat(value)}
                placeholder="Latitude"
                step="any"
                min={-90}
                max={90}
              />
              <NumericInput
                value={centerLng}
                onChange={(value) => setCenterLng(value)}
                placeholder="Longitude"
                step="any"
                min={-180}
                max={180}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Optional helpers: preview the lat/lng in a normal map website, or jump to the Map tab and click once (drag is
              paused while picking).
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={handleOpenGoogleMaps}>
                <MapPinned className="h-4 w-4 mr-2" />
                Preview in Google Maps (new tab)
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={requestPickCenterFromMap}>
                Set center from map (1 click)
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultZoom" className="text-sm font-medium">Default Zoom *</Label>
            <NumericInput
              id="defaultZoom"
              value={defaultZoom}
              onChange={(value) => setDefaultZoom(Math.max(1, Math.min(22, Math.round(value))))}
              step="1"
              min={1}
              max={22}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="useMaxBounds"
              type="checkbox"
              checked={useMaxBounds}
              onChange={(e) => setUseMaxBounds(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="useMaxBounds" className="text-sm">
              Constrain map to max bounds
            </Label>
          </div>

          {useMaxBounds && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Max Bounds (Leaflet bounds)</Label>
              <div className="grid grid-cols-2 gap-2">
                <NumericInput
                  value={southWestLat}
                  onChange={(value) => setSouthWestLat(value)}
                  placeholder="South-West Latitude"
                  step="any"
                />
                <NumericInput
                  value={southWestLng}
                  onChange={(value) => setSouthWestLng(value)}
                  placeholder="South-West Longitude"
                  step="any"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <NumericInput
                  value={northEastLat}
                  onChange={(value) => setNorthEastLat(value)}
                  placeholder="North-East Latitude"
                  step="any"
                />
                <NumericInput
                  value={northEastLng}
                  onChange={(value) => setNorthEastLng(value)}
                  placeholder="North-East Longitude"
                  step="any"
                />
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <input
              id="isActive"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="isActive" className="text-sm">
              Active (available for map selection)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              id="isUnlocked"
              type="checkbox"
              checked={isUnlocked}
              onChange={(e) => setIsUnlocked(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="isUnlocked" className="text-sm">
              Unlocked (eligible to appear on map when settlement unlocked)
            </Label>
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          {region && onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                onDelete(region);
                onOpenChange(false);
              }}
              disabled={isSaving}
              className="mr-auto"
            >
              Delete Region
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
          >
            {isSaving ? 'Saving...' : (region ? 'Update Region' : 'Create Region')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
