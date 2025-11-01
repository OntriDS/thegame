'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Site, PhysicalSiteMetadata, DigitalSiteMetadata, SystemSiteMetadata, Settlement } from '@/types/entities';
import { 
  SiteType, 
  SiteStatus, 
  PhysicalBusinessType, 
  DigitalSiteType, 
  SystemSiteType, 
  LOCATION_HIERARCHY,
  EntityType
} from '@/types/enums';
import { createSettlementOptions } from '@/lib/utils/searchable-select-utils';
import SettlementSubmodal from './submodals/settlement-submodal';
import { MapPin, Cloud, Sparkles, Trash2 } from 'lucide-react';
import { getZIndexClass } from '@/lib/utils/z-index-utils';
// No complex categorization needed for site fields
import DeleteModal from './submodals/delete-submodal';
import { dispatchEntityUpdated, entityTypeToKind } from '@/lib/ui/ui-events';
// Side effects handled by parent component via API calls

interface SiteModalProps {
  site?: Site | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (site: Site) => Promise<void>;
}

export function SiteModal({ site, open, onOpenChange, onSave }: SiteModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<SiteStatus>(SiteStatus.ACTIVE);
  const [siteType, setSiteType] = useState<SiteType>(SiteType.PHYSICAL);
  
  // Physical site fields
  const [settlementId, setSettlementId] = useState<string>('');
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [businessType, setBusinessType] = useState<PhysicalBusinessType>(PhysicalBusinessType.STORAGE);
  const [googleMapsAddress, setGoogleMapsAddress] = useState('');
  
  // Digital site fields
  const [digitalUrl, setDigitalUrl] = useState('');
  const [digitalType, setDigitalType] = useState<DigitalSiteType>(DigitalSiteType.DIGITAL_STORAGE);
  
  // Special site fields
  const [systemPurpose, setSystemPurpose] = useState<SystemSiteType>(SystemSiteType.UNIVERSAL_TRACKING);
  
  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Settlement submodal
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  
  // UI state
  const [showDescription, setShowDescription] = useState(false);

  // Load settlements when modal opens
  const loadSettlements = async () => {
    try {
      const { ClientAPI } = await import('@/lib/client-api');
      const allSettlements = await ClientAPI.getSettlements();
      setSettlements(allSettlements);
    } catch (error) {
      console.error('Failed to load settlements:', error);
    }
  };

  useEffect(() => {
    if (open) {
      loadSettlements();
    }
  }, [open]);

  useEffect(() => {
    if (site) {
      setName(site.name || '');
      setDescription(site.description || '');
      setStatus((site.status as SiteStatus) || SiteStatus.ACTIVE);
      setSiteType(site.metadata.type);
      
      // Load type-specific fields
      if (site.metadata.type === SiteType.PHYSICAL) {
        const physicalMeta = site.metadata as PhysicalSiteMetadata;
        setSettlementId(physicalMeta.settlementId || '');
        setBusinessType(physicalMeta.businessType || PhysicalBusinessType.STORAGE);
        setGoogleMapsAddress(physicalMeta.googleMapsAddress || '');
      } else if (site.metadata.type === SiteType.DIGITAL) {
        const digitalMeta = site.metadata as DigitalSiteMetadata;
        setDigitalType(digitalMeta.digitalType || DigitalSiteType.DIGITAL_STORAGE);
        setDigitalUrl((digitalMeta as any).url || '');
      } else if (site.metadata.type === SiteType.SYSTEM) {
        const systemMeta = site.metadata as SystemSiteMetadata;
        setSystemPurpose(systemMeta.systemType || SystemSiteType.UNIVERSAL_TRACKING);
      }
    } else {
      // Reset form for new site
      setName('');
      setDescription('');
      setStatus(SiteStatus.ACTIVE);
      setSiteType(SiteType.PHYSICAL);
      setSettlementId('');
      setBusinessType(PhysicalBusinessType.STORAGE);
      setGoogleMapsAddress('');
      setDigitalUrl('');
      setDigitalType(DigitalSiteType.DIGITAL_STORAGE);
      setSystemPurpose(SystemSiteType.UNIVERSAL_TRACKING);
    }
  }, [site, open]);

  const handleSave = async () => {
    if (isSaving) return;
    
    // Block saving changes to "None" site - it's a protected system site
    if (site && (site.name === 'None' || site.id === 'none')) {
      console.warn('Cannot save changes to "None" site - it is a protected system site');
      alert('Cannot save changes to "None" site. It is a protected system site.');
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Build metadata based on site type
      let metadata;
      
      if (siteType === SiteType.PHYSICAL) {
        metadata = {
          type: SiteType.PHYSICAL,
          businessType,
          settlementId,
          googleMapsAddress
        } as PhysicalSiteMetadata;
      } else if (siteType === SiteType.DIGITAL) {
        metadata = {
          type: SiteType.DIGITAL,
          digitalType,
          url: digitalUrl
        } as DigitalSiteMetadata & { url: string };
      } else {
        metadata = {
          type: SiteType.SYSTEM,
          systemType: systemPurpose
        } as SystemSiteMetadata;
      }

      const siteData: Site = {
        id: site?.id || `site-${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`,
        name,
        description,
        status,
        metadata,
        createdAt: site?.createdAt || new Date(),
        updatedAt: new Date(),
        links: site?.links || []
      };

      await onSave(siteData);
      
      // Dispatch UI update events AFTER successful save
      dispatchEntityUpdated(entityTypeToKind(EntityType.SITE));
      
      onOpenChange(false);
    } catch (error) {
      console.error('Save failed:', error);
      // Keep modal open on error
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDelete = () => {
    if (!site) return;
    setShowDeleteModal(true);
  };

  const handleSettlementSave = async (settlement: Settlement) => {
    try {
      const { ClientAPI } = await import('@/lib/client-api');
      await ClientAPI.upsertSettlement(settlement);
      
      // Refresh settlements list
      await loadSettlements();
      
      // Select the newly created settlement
      setSettlementId(settlement.id);
    } catch (error) {
      console.error('Failed to save settlement:', error);
      alert('Failed to save settlement. Please try again.');
    }
  };

  const [settlementOptions, setSettlementOptions] = useState<Array<{value: string, label: string, category: string}>>([]);

  // Load settlement options when settlements change
  useEffect(() => {
    const options = settlements.map(settlement => ({
      value: settlement.id,
      label: settlement.name,
      category: settlement.country
    }));
    setSettlementOptions(options);
  }, [settlements]);
  
  const handleDeleteComplete = () => {
    setShowDeleteModal(false);
    // Dispatch UI update event after successful deletion
    dispatchEntityUpdated(entityTypeToKind(EntityType.SITE));
    onOpenChange(false);
  };
  
  // Simple settlement options - no categorization needed
  const getSettlementOptions = () => {
    return settlements.map(settlement => ({
      value: settlement.id,
      label: settlement.name
    }));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent zIndexLayer={'MODALS'} className="w-[1000px] max-w-[95vw]">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="flex items-center gap-2">
              {siteType === SiteType.PHYSICAL && <MapPin className="h-5 w-5" />}
              {siteType === SiteType.DIGITAL && <Cloud className="h-5 w-5" />}
              {siteType === SiteType.SYSTEM && <Sparkles className="h-5 w-5" />}
              <span>{site ? 'Edit Site' : 'New Site'}</span>
            </DialogTitle>
          </DialogHeader>

          {/* Content Area - Fixed Height with Internal Scroll */}
          <div className="px-6 overflow-y-auto space-y-4" style={{ maxHeight: 'calc(90vh - 280px)' }}>
            {/* Column Headers */}
            {site && (site.name === 'None' || site.id === 'none') && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md text-sm text-amber-800 dark:text-amber-200">
                ⚠️ "None" is a protected system site. This site cannot be edited or deactivated.
              </div>
            )}

            {/* Row 1: Name and Type in 4-column grid */}
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="name" className="text-xs">Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="New Site"
                  className="h-8 text-sm"
                  disabled={site && (site.name === 'None' || site.id === 'none')}
                />
              </div>
              
              <div className="col-span-2 space-y-2">
                <Label htmlFor="siteType" className="text-xs">Type *</Label>
                <Select 
                  value={siteType} 
                  onValueChange={(v) => setSiteType(v as SiteType)}
                  disabled={site && (site.name === 'None' || site.id === 'none')}
                >
                  <SelectTrigger id="siteType" className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SiteType.PHYSICAL}>Physical</SelectItem>
                    <SelectItem value={SiteType.DIGITAL}>Digital</SelectItem>
                    <SelectItem value={SiteType.SYSTEM}>System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Conditional Fields Based on Type - 4 columns */}
            {siteType === SiteType.PHYSICAL && (
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="settlement" className="text-xs">Settlement *</Label>
                  <div className="flex gap-2">
                    <SearchableSelect
                      value={settlementId}
                      onValueChange={(v) => setSettlementId(v)}
                      placeholder="Select settlement..."
                      options={settlementOptions}
                      className="h-8 text-sm flex-1"
                      autoGroupByCategory={true}
                      disabled={site && (site.name === 'None' || site.id === 'none')}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSettlementModal(true)}
                      className="h-8 px-3"
                      disabled={site && (site.name === 'None' || site.id === 'none')}
                    >
                      + New
                    </Button>
                  </div>
                </div>
                
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="businessType" className="text-xs">Business Type *</Label>
                  <Select
                    value={businessType}
                    onValueChange={(v) => setBusinessType(v as PhysicalBusinessType)}
                    disabled={site && (site.name === 'None' || site.id === 'none')}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select business type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(PhysicalBusinessType).map(type => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {siteType === SiteType.DIGITAL && (
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="digitalType" className="text-xs">Digital Type *</Label>
                  <Select
                    value={digitalType}
                    onValueChange={(v) => setDigitalType(v as DigitalSiteType)}
                    disabled={site && (site.name === 'None' || site.id === 'none')}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select digital type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(DigitalSiteType).map(type => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="digitalUrl" className="text-xs">URL</Label>
                  <Input
                    id="digitalUrl"
                    value={digitalUrl}
                    onChange={(e) => setDigitalUrl(e.target.value)}
                    placeholder="https://..."
                    className="h-8 text-sm"
                    disabled={site && (site.name === 'None' || site.id === 'none')}
                  />
                </div>
              </div>
            )}

            {siteType === SiteType.SYSTEM && (
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="specialPurpose" className="text-xs">Purpose *</Label>
                  <Select
                    value={systemPurpose}
                    onValueChange={(v) => setSystemPurpose(v as SystemSiteType)}
                    disabled={site && (site.name === 'None' || site.id === 'none')}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select purpose..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(SystemSiteType).map(type => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Row 3: Google Maps (Physical only) - Full width */}
            {siteType === SiteType.PHYSICAL && (
              <div className="space-y-2">
                <Label htmlFor="googleMaps" className="text-xs">Google Maps Address</Label>
                <Input
                  id="googleMaps"
                  value={googleMapsAddress}
                  onChange={(e) => setGoogleMapsAddress(e.target.value)}
                  placeholder="Google Maps URL or coordinates"
                  className="h-8 text-sm"
                  disabled={site && (site.name === 'None' || site.id === 'none')}
                />
              </div>
            )}

            {/* Description - Collapsible */}
            <div className="mt-4">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setShowDescription(!showDescription)}
                className={`h-8 text-xs ${showDescription ? 'bg-transparent text-white' : 'bg-muted text-muted-foreground'}`}
              >
                Description
              </Button>
              
              {showDescription && (
                <div className="mt-3 space-y-2">
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional notes about this site..."
                    rows={3}
                    className="resize-none text-sm"
                    disabled={site && (site.name === 'None' || site.id === 'none')}
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between py-2 border-t px-6">
            <div className="flex items-center gap-4">
              {site && site.name !== 'None' && site.id !== 'none' && (
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                >
                  Delete
                </Button>
              )}
              {site && (site.name === 'None' || site.id === 'none') && (
                <div className="text-xs text-muted-foreground italic">
                  "None" is a protected system site and cannot be deleted
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="hidden sm:block">
                  <Label className="text-xs">Status</Label>
                </div>
                {(site && (site.name === 'None' || site.id === 'none')) ? (
                  <div className="text-xs text-muted-foreground italic px-3 py-2 border rounded-md bg-muted/50">
                    Always Active
                  </div>
                ) : (
                  <Select value={status} onValueChange={(v) => setStatus(v as SiteStatus)}>
                    <SelectTrigger className="h-8 text-sm w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(SiteStatus).map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="h-8 text-xs" disabled={isSaving}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                className="h-8 text-xs" 
                disabled={!name.trim() || isSaving || (site && (site.name === 'None' || site.id === 'none'))}
              >
                {isSaving ? 'Saving...' : (site ? 'Update' : 'Create')} Site
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Modal */}
      {site && (
        <DeleteModal
          open={showDeleteModal}
          onOpenChange={setShowDeleteModal}
          entityType={EntityType.SITE}
          entities={[site]}
          onComplete={handleDeleteComplete}
        />
      )}

      {/* Settlement Creation Modal */}
      <SettlementSubmodal
        open={showSettlementModal}
        onOpenChange={setShowSettlementModal}
        onSave={handleSettlementSave}
      />
    </>
  );
}
