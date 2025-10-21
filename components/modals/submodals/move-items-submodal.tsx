'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getZIndexClass } from '@/lib/utils/z-index-utils';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ItemStatus, SiteType } from '@/types/enums';
import { ClientAPI } from '@/lib/client-api';
import { Item } from '@/types/entities';
import { Package, MapPin, Cloud, Globe } from 'lucide-react';
import { 
  getSitesByType, 
  getSiteInfoByName 
} from '@/lib/utils/site-migration-utils';

interface MoveItemsModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  items: Item[];
  onComplete: () => void;
  onStatusCheck?: (item: Item, isMovingToSold: boolean) => void;
}

export default function MoveItemsModal({ open, onOpenChange, items, onComplete, onStatusCheck }: MoveItemsModalProps) {
  const [destination, setDestination] = useState<string>('Feria Box');
  const [quantity, setQuantity] = useState<string>('1');
  const [isProcessing, setIsProcessing] = useState(false);

  // Helper functions to organize sites
  const getPhysicalSites = () => getSitesByType('PHYSICAL');
  const getCloudSites = () => getSitesByType('CLOUD');
  const getSpecialSites = () => getSitesByType('SPECIAL');

  // Get business type groups for physical sites
  const getPhysicalSitesGroupedByBusinessType = () => {
    const physicalSites = getPhysicalSites();
    const grouped: Record<string, string[]> = {};
    
    physicalSites.forEach(site => {
      // For now, group by site name since business type metadata doesn't exist
      const group = 'Physical';
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(site.name); // Extract string name
    });
    
    return grouped;
  };

  // Check if movement is valid based on item type and destination
  const isValidDestination = (item: Item, destinationSite: string): boolean => {
    const siteInfo = getSiteInfoByName(destinationSite);
    if (!siteInfo) return false;
    
    // Digital items can ONLY go to cloud sites
    if (item.type === 'Digital') {
      return siteInfo.type === 'CLOUD';
    }
    
    // Physical items can go to physical and special sites (NOT cloud)
    return ['PHYSICAL', 'SPECIAL'].includes(siteInfo.type);
  };

  const handleMove = async () => {
    if (items.length === 0 || parseInt(quantity) < 1) return;
    
    setIsProcessing(true);
    
    try {
      for (const item of items) {
        const quantityToMove = parseInt(quantity) || 0;
        
        // Check if we have enough quantity to move
        const items = await ClientAPI.getItems();
        const currentQuantity = ClientAPI.getItemTotalQuantity(item.id, items);
        if (currentQuantity < quantityToMove) {
          throw new Error(`Insufficient quantity. Available: ${currentQuantity}, Requested: ${quantityToMove}`);
        }
        
        // Use the new unified stock management system
        const updatedSourceItem = await ClientAPI.moveItemsBetweenSites(
          item, 
          item.stock[0]?.siteId || 'Home', 
          destination, 
          quantityToMove
        );
        
        // Save the updated item with side effects
        await ClientAPI.upsertItem(updatedSourceItem);
        
        // Create SITE_SITE link using standalone utility
        const { createSiteMovementLink } = await import('@/workflows/site-movement-utils');
        await createSiteMovementLink(
          item.stock[0]?.siteId || 'Home',
          destination,
          {
            itemId: item.id,
            quantity: quantityToMove,
            movedAt: new Date()
          }
        );
      }
      
      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Move failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Move failed: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-md ${getZIndexClass('SUB_MODALS')}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Move {items.length} Item{items.length > 1 ? 's' : ''}
          </DialogTitle>
          <DialogDescription>
            Select the destination site for the selected items.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="destination">Destination Site</Label>
            <Select value={destination} onValueChange={(value) => setDestination(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-96">
                {/* Physical Sites - Grouped by Business Type */}
                {Object.entries(getPhysicalSitesGroupedByBusinessType()).map(([businessType, sites]) => (
                  <div key={businessType}>
                    <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground bg-muted/50 rounded-md mb-1">
                      <MapPin className="inline h-3 w-3 mr-1" />
                      {businessType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                    {sites.map(siteName => (
                      <SelectItem 
                        key={siteName} 
                        value={siteName}
                        disabled={!items.every(item => isValidDestination(item, siteName))}
                        className="ml-4"
                      >
                        {siteName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </div>
                ))}
                
                {/* Special Sites */}
                {getSpecialSites().length > 0 && (
                  <div>
                    <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground bg-muted/50 rounded-md mb-1">
                      <Globe className="inline h-3 w-3 mr-1" />
                      Special Sites
                    </div>
                    {getSpecialSites().map(site => (
                      <SelectItem 
                        key={site.name} 
                        value={site.name}
                        disabled={!items.every(item => isValidDestination(item, site.name))}
                        className="ml-4"
                      >
                        {site.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </div>
                )}
                
                {/* Cloud Sites - Only for Digital Items */}
                {getCloudSites().length > 0 && items.every(item => item.type === 'Digital') && (
                  <div>
                    <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground bg-muted/50 rounded-md mb-1">
                      <Cloud className="inline h-3 w-3 mr-1" />
                      Cloud Sites
                    </div>
                    {getCloudSites().map(site => (
                      <SelectItem 
                        key={site.name} 
                        value={site.name}
                        className="ml-4"
                      >
                        {site.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </div>
                )}
              </SelectContent>
            </Select>
            
            {/* Show validation message */}
            {destination && items.length > 0 && (
              <div className="text-xs text-muted-foreground">
                {items.every(item => isValidDestination(item, destination)) 
                  ? '✅ Valid destination for all items' 
                  : '❌ Some items cannot be moved to this destination'
                }
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity to Move</Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="1"
              min="1"
            />
          </div>
          
          <div className="text-sm text-muted-foreground">
            This will create new items at the destination and reduce quantities at the source.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleMove} 
            disabled={
              items.length === 0 || 
              parseInt(quantity) < 1 || 
              isProcessing || 
              !items.every(item => isValidDestination(item, destination))
            }
          >
            {isProcessing ? 'Moving...' : 'Move Items'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
