'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Settlement } from '@/types/entities';
import { MapPin, X } from 'lucide-react';
import { getZIndexClass } from '@/lib/utils/z-index-utils';

interface SettlementSubmodalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (settlement: Settlement) => void;
  settlement?: Settlement | null;
}

export default function SettlementSubmodal({ 
  open, 
  onOpenChange, 
  onSave, 
  settlement 
}: SettlementSubmodalProps) {
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [googleMapsAddress, setGoogleMapsAddress] = useState('');
  const [coordinates, setCoordinates] = useState<{lat: number; lng: number} | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when modal opens/closes or settlement changes
  useEffect(() => {
    if (open) {
      if (settlement) {
        setName(settlement.name || '');
        setCountry(settlement.country || '');
        setRegion(settlement.region || '');
        setGoogleMapsAddress(settlement.googleMapsAddress || '');
        setCoordinates(settlement.coordinates || null);
        setIsActive(settlement.isActive !== undefined ? settlement.isActive : true);
      } else {
        // Reset for new settlement
        setName('');
        setCountry('');
        setRegion('');
        setGoogleMapsAddress('');
        setCoordinates(null);
        setIsActive(true);
      }
    }
  }, [open, settlement]);

  const handleSave = async () => {
    if (!name.trim() || !country.trim() || !region.trim()) {
      alert('Please fill in all required fields (Name, Country, Region)');
      return;
    }

    try {
      setIsSaving(true);
      
      const settlementData: Settlement = {
        id: settlement?.id || `settlement-${Date.now()}`,
        name: name.trim(),
        country: country.trim(),
        region: region.trim(),
        googleMapsAddress: googleMapsAddress.trim(),
        coordinates: coordinates?.lat && coordinates?.lng ? coordinates : undefined,
        isActive,
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

          {/* Country */}
          <div className="space-y-2">
            <Label htmlFor="country" className="text-sm font-medium">
              Country *
            </Label>
            <Input
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g., Costa Rica, United States"
              className="h-9"
            />
          </div>

          {/* Region */}
          <div className="space-y-2">
            <Label htmlFor="region" className="text-sm font-medium">
              Region *
            </Label>
            <Input
              id="region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g., Puntarenas, California"
              className="h-9"
            />
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
              <Input
                placeholder="Latitude"
                type="number"
                step="any"
                value={coordinates?.lat || ''}
                onChange={(e) => setCoordinates(prev => ({
                  lat: parseFloat(e.target.value) || 0,
                  lng: prev?.lng || 0
                }))}
                className="h-9"
              />
              <Input
                placeholder="Longitude"
                type="number"
                step="any"
                value={coordinates?.lng || ''}
                onChange={(e) => setCoordinates(prev => ({
                  lat: prev?.lat || 0,
                  lng: parseFloat(e.target.value) || 0
                }))}
                className="h-9"
              />
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
        </div>

        <DialogFooter className="border-t pt-4">
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
            disabled={isSaving || !name.trim() || !country.trim() || !region.trim()}
            className="h-9"
          >
            <MapPin className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : (settlement ? 'Update Settlement' : 'Create Settlement')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
