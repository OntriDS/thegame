'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { Settlement, Region } from '@/types/entities';
import { MapPin, MapPinned, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import RegionSubmodal from '@/components/modals/submodals/region-submodal';
import {
  adminMapWindowEvents,
  type CoordPickRequestDetail,
  type CoordPickResultDetail,
} from '@/lib/admin-map-events';

interface SettlementSubmodalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (settlement: Settlement) => void;
  onDelete?: (settlement: Settlement) => void;
  settlement?: Settlement | null;
  regions?: Region[];
  onCreateRegion?: (region: Region) => Promise<Region>;
}

export default function SettlementSubmodal({ 
  open, 
  onOpenChange, 
  onSave,
  onDelete,
  settlement,
  regions = [],
  onCreateRegion
}: SettlementSubmodalProps) {
  const [name, setName] = useState('');
  const [regionId, setRegionId] = useState('');
  const [googleMapsAddress, setGoogleMapsAddress] = useState('');
  const [coordinates, setCoordinates] = useState<{lat: number; lng: number} | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showRegionModal, setShowRegionModal] = useState(false);
  const pendingMapPickRef = useRef(false);
  const coordPickHandlerRef = useRef<((ev: Event) => void) | null>(null);
  const sortedRegions = useMemo(
    () => [...regions].sort((a, b) => a.name.localeCompare(b.name)),
    [regions]
  );
  const region = useMemo(
    () => regions.find((item) => item.id === regionId),
    [regions, regionId]
  );

  const parentRegionUnlocked = region?.isUnlocked === true;

  const hasCoords = Number.isFinite(coordinates?.lat ?? NaN) && Number.isFinite(coordinates?.lng ?? NaN);

  // Reset form when modal opens/closes or settlement changes
  useEffect(() => {
    if (open) {
      if (settlement) {
        setName(settlement.name || '');
        setRegionId(settlement.regionId || '');
        setGoogleMapsAddress(settlement.googleMapsAddress || '');
        setCoordinates(settlement.coordinates || null);
        setIsActive(settlement.isActive !== undefined ? settlement.isActive : true);
        setIsUnlocked(settlement.isUnlocked !== undefined ? settlement.isUnlocked : false);
      } else {
        // Reset for new settlement
        setName('');
        setRegionId('');
        setGoogleMapsAddress('');
        setCoordinates(null);
        setIsActive(true);
        setIsUnlocked(false);
      }
    }
  }, [open, settlement]);

  useEffect(() => {
    if (!open || !regionId) return;
    if (!parentRegionUnlocked && isUnlocked) {
      setIsUnlocked(false);
    }
  }, [open, regionId, parentRegionUnlocked, isUnlocked]);

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

  const handleSave = async () => {
    if (!name.trim() || !regionId.trim()) {
      alert('Please fill in all required fields (Name, Region)');
      return;
    }

    try {
      setIsSaving(true);
      
      const settlementData: Settlement = {
        id: settlement?.id || `settlement-${Date.now()}`,
        name: name.trim(),
        regionId,
        googleMapsAddress: googleMapsAddress.trim(),
        coordinates: coordinates?.lat && coordinates?.lng ? coordinates : undefined,
        isActive,
        isUnlocked: parentRegionUnlocked ? isUnlocked : false,
        createdAt: settlement?.createdAt || new Date(),
        updatedAt: new Date()
      };

      await onSave(settlementData);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save settlement:', error);
      alert('Failed to save settlement. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const openGoogleMapsForCoords = () => {
    if (hasCoords) {
      window.open(
        `https://www.google.com/maps?q=${encodeURIComponent(`${coordinates!.lat},${coordinates!.lng}`)}`,
        '_blank',
        'noopener,noreferrer'
      );
      return;
    }
    const query = googleMapsAddress || 'point';
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer');
  };

  const requestPickCoordsFromMap = () => {
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
      setCoordinates({ lat: ce.detail.lat, lng: ce.detail.lng });
    };
    coordPickHandlerRef.current = handler;
    window.addEventListener(adminMapWindowEvents.coordPicked, handler);
    window.dispatchEvent(
      new CustomEvent<CoordPickRequestDetail>(adminMapWindowEvents.requestCoordPick, {
        detail: { pickId, kind: 'settlement' },
      })
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent zIndexLayer={'SUB_MODALS'} className="w-[500px] max-w-[95vw]">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            <span>{settlement ? 'Edit Settlement' : 'New Settlement'}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Name *
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Uvita, Dominical, Ojochal"
              className="h-9"
            />
          </div>

          {/* Region */}
          <div className="space-y-2">
            <Label htmlFor="regionId" className="text-sm font-medium">
              Region *
            </Label>
            <div className="flex gap-2">
              <Select
                value={regionId}
                onValueChange={(value) => setRegionId(value)}
              >
                <SelectTrigger id="regionId" className="h-9 flex-1">
                  <SelectValue placeholder="Select a region" />
                </SelectTrigger>
                <SelectContent>
                  {sortedRegions.length === 0 ? (
                    <SelectItem value="_no_regions" disabled>
                      No regions configured
                    </SelectItem>
                  ) : (
                    sortedRegions.map((region) => (
                      <SelectItem key={region.id} value={region.id}>
                        {region.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!onCreateRegion}
                onClick={() => setShowRegionModal(true)}
                className="h-9 px-3"
              >
                + New
              </Button>
            </div>
          </div>

          {/* Google Maps Address */}
          <div className="space-y-2">
            <Label htmlFor="googleMapsAddress" className="text-sm font-medium">
              Google Maps Address
            </Label>
            <Input
              id="googleMapsAddress"
              value={googleMapsAddress}
              onChange={(e) => setGoogleMapsAddress(e.target.value)}
              placeholder="https://maps.app.goo.gl/..."
              className="h-9"
            />
          </div>

          {/* Coordinates */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Coordinates (Optional - for future map features)
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <NumericInput
                placeholder="Latitude"
                step="any"
                value={coordinates?.lat || 0}
                onChange={(value) => setCoordinates(prev => ({
                  lat: value,
                  lng: prev?.lng || 0
                }))}
                className="h-9"
              />
              <NumericInput
                placeholder="Longitude"
                step="any"
                value={coordinates?.lng || 0}
                onChange={(value) => setCoordinates(prev => ({
                  lat: prev?.lat || 0,
                  lng: value
                }))}
                className="h-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Optional: open these coordinates on Google’s map site, or switch to the Map tab and click once (drag pauses
              while picking).
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={openGoogleMapsForCoords}
              >
                <MapPinned className="h-4 w-4 mr-2" />
                Preview in Google Maps (new tab)
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={requestPickCoordsFromMap}>
                Set from map (1 click)
              </Button>
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="isActive" className="text-sm">
              Active (available for selection)
            </Label>
          </div>

          {/* Unlocked Status */}
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isUnlocked"
                checked={isUnlocked}
                disabled={!regionId || !parentRegionUnlocked}
                onChange={(e) => setIsUnlocked(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="isUnlocked" className="text-sm">
                Unlocked (eligible to appear on the map)
              </Label>
            </div>
            {regionId && !parentRegionUnlocked && (
              <p className="text-xs text-amber-600 dark:text-amber-400 pl-6">
                Unlock the parent region before this settlement can appear on the map.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          {settlement && onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                onDelete(settlement);
                onOpenChange(false);
              }}
              disabled={isSaving}
              className="mr-auto h-9"
            >
              Delete Settlement
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
            className="h-9"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !name.trim() || !regionId.trim()}
            className="h-9"
          >
            <MapPin className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : (settlement ? 'Update Settlement' : 'Create Settlement')}
          </Button>
        </DialogFooter>
        <RegionSubmodal
          open={showRegionModal}
          onOpenChange={setShowRegionModal}
          region={null}
          allRegions={regions}
          onSave={async (regionData) => {
            if (!onCreateRegion) {
              setShowRegionModal(false);
              return;
            }

            const savedRegion = await onCreateRegion(regionData);
            setRegionId(savedRegion.id || regionData.id);
            setShowRegionModal(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
