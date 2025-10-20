'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getZIndexClass } from '@/lib/utils/z-index-utils';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ItemType, ItemStatus, Collection } from '@/types/enums';
import { getSubTypesForItemType } from '@/lib/utils/item-utils';
import type { SubItemType } from '@/types/type-aliases';
// Side effects handled by parent component via API calls
import { Item } from '@/types/entities';
import { PRICE_STEP, DEFAULT_MIN_VALUE, MODAL_MAX_HEIGHT, MODAL_MAX_WIDTH } from '@/lib/constants/app-constants';
import { MapPin, Package, Trash2 } from 'lucide-react';
import MoveItemsModal from './move-items-submodal';
import { getAllSiteNames } from '@/lib/utils/site-migration-utils';
import { ClientAPI } from '@/lib/client-api';
import DeleteModal from './delete-submodal';

interface BulkEditModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  itemType: ItemType;
  onComplete: () => void;
}

export default function BulkEditModal({ open, onOpenChange, itemType, onComplete }: BulkEditModalProps) {
  const [field, setField] = useState<string>('price');
  const [value, setValue] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [collectionFilter, setCollectionFilter] = useState<string>('all');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [subItemFilter, setSubItemFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fieldOptions = [
    { value: 'price', label: 'Price' },
    { value: 'unitCost', label: 'Unit Cost' },
    { value: 'status', label: 'Status' },
    { value: 'collection', label: 'Collection' },
    { value: 'subItemType', label: 'Sub Type' },
    { value: 'size', label: 'Size' },
            { value: 'site', label: 'Site' }
  ];

  // Load items when modal opens
  useEffect(() => {
    const loadItems = async () => {
      if (open) {
        try {
          const allItems = await ClientAPI.getItems();
          const filteredItems = allItems.filter(item => item.type === itemType);
          setItems(filteredItems);
          setSelectedItems(new Set());
          setSelectAll(false);
        } catch (error) {
          console.error('Failed to load items for bulk edit:', error);
        }
      }
    };
    loadItems();
  }, [open, itemType]);

  // Get filtered items based on selected filters
  const getFilteredItems = useCallback(() => {
    return items.filter(item => {
      if (collectionFilter !== 'all' && item.collection !== collectionFilter) return false;
      if (siteFilter !== 'all' && item.stock[0]?.siteId !== siteFilter) return false;
      if (subItemFilter !== 'all' && item.subItemType !== subItemFilter) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      return true;
    });
  }, [items, collectionFilter, siteFilter, subItemFilter, statusFilter]);

  const filteredItems = useMemo(getFilteredItems, [getFilteredItems]);

  const handleBulkEdit = async () => {
    // Check value and selected items
    if (!value.trim() || selectedItems.size === 0) return;
    
    setIsProcessing(true);
    
    try {
      const itemsToUpdate = items.filter(item => selectedItems.has(item.id));
      
      // Update each selected item
      for (const item of itemsToUpdate) {
        let newValue: any = value;
        
        // Convert value based on field type
        if (field === 'price' || field === 'unitCost') {
          newValue = parseFloat(value) || 0;
        } else if (field === 'status') {
          newValue = value as ItemStatus;
        } else if (field === 'collection') {
          newValue = value === 'none' ? undefined : value as Collection;
        } else if (field === 'site') {
          // Handle site change using the unified stock system
          const currentQuantity = ClientAPI.getItemTotalQuantity(item.id, items);
          const newSiteId = value as any; // Site enum
          const updatedItem = await ClientAPI.updateStockAtSite(item.id, newSiteId, currentQuantity);
        } else {
          // Handle other field updates
          const updatedItem = { ...item, [field]: newValue };
          await ClientAPI.upsertItem(updatedItem);
        }
      }
      
      // Dispatch events
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('itemsUpdated'));
        window.dispatchEvent(new Event('linksUpdated'));
      }
      
      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Bulk edit failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getFieldInput = () => {
    switch (field) {
      case 'status':
        return (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(ItemStatus).map(status => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'collection':
        return (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger>
              <SelectValue placeholder="Select collection" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Collection</SelectItem>
              {Object.values(Collection).map(collection => (
                <SelectItem key={collection} value={collection}>{collection}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'subItemType':
        return (
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter sub type"
          />
        );
      
      case 'site':
        return (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger>
              <SelectValue placeholder="Select site" />
            </SelectTrigger>
            <SelectContent>
              {getAllSiteNames().map(site => (
                <SelectItem key={site} value={site}>
                  {site}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      default:
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={field === 'price' ? '0.00' : '0'}
            step={PRICE_STEP}
            min={DEFAULT_MIN_VALUE}
          />
        );
    }
  };

  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
    setSelectAll(newSelected.size === filteredItems.length);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-4xl max-h-[90vh] overflow-y-auto ${getZIndexClass('MODALS')}`}>
        <DialogHeader>
          <DialogTitle>Bulk Edit {itemType}</DialogTitle>
          <DialogDescription>
            Select fields to update and apply changes to multiple items at once.
          </DialogDescription>
          <div className="flex gap-2 mt-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowMoveModal(true)}
              disabled={selectedItems.size === 0}
              className="flex items-center gap-2"
            >
              <Package className="h-4 w-4" />
              Move {selectedItems.size > 0 ? `(${selectedItems.size})` : ''}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowDeleteModal(true)}
              disabled={selectedItems.size === 0}
              className="flex items-center gap-2 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
              Delete {selectedItems.size > 0 ? `(${selectedItems.size})` : ''}
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Field Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="field">Field to Edit</Label>
              <Select value={field} onValueChange={setField}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fieldOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="value">New Value</Label>
              {getFieldInput()}
            </div>
          </div>
          
          {/* Item Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select Items to Edit</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="selectAll"
                  checked={selectAll}
                  onCheckedChange={(checked) => {
                    const isChecked = checked as boolean;
                    setSelectAll(isChecked);
                    if (isChecked) {
                      setSelectedItems(new Set(filteredItems.map(item => item.id)));
                    } else {
                      setSelectedItems(new Set());
                    }
                  }}
                />
                <Label htmlFor="selectAll">Select All ({filteredItems.length})</Label>
              </div>
            </div>
            
            {/* Filter Dropdowns */}
            <div className="grid grid-cols-4 gap-2">
              <Select value={collectionFilter} onValueChange={setCollectionFilter}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Collection" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Collections</SelectItem>
                  {Object.values(Collection).map(collection => (
                    <SelectItem key={collection} value={collection}>{collection}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={siteFilter} onValueChange={setSiteFilter}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Site" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sites</SelectItem>
                  {getAllSiteNames().map(site => (
                    <SelectItem key={site} value={site}>
                      {site}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={subItemFilter} onValueChange={setSubItemFilter}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Sub Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sub Types</SelectItem>
                  {getSubTypesForItemType(itemType).map(subType => (
                    <SelectItem key={subType} value={subType}>{subType}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.values(ItemStatus).map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="border rounded-lg max-h-60 overflow-y-auto">
              {filteredItems.map(item => (
                <div key={item.id} className="flex items-center space-x-3 p-3 hover:bg-accent/50">
                  <Checkbox
                    id={item.id}
                    checked={selectedItems.has(item.id)}
                    onCheckedChange={() => toggleItemSelection(item.id)}
                  />
                  <Label htmlFor={item.id} className="flex-1 cursor-pointer">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {item.subItemType && `${item.subItemType} • `}
                        {item.collection && `${item.collection} • `}
                        {item.stock[0]?.siteId && <><MapPin className="inline h-3 w-3" /> {item.stock[0].siteId} • </>}
                        {item.status && `${item.status} • `}
                        Qty: {item.stock?.reduce((sum, s) => sum + s.quantity, 0) || 0}
                      </span>
                    </div>
                  </Label>
                </div>
              ))}
            </div>
          </div>
           
          <div className="text-sm text-muted-foreground">
            {selectedItems.size > 0 
              ? `This will update ${selectedItems.size} selected ${itemType} item${selectedItems.size > 1 ? 's' : ''}.`
              : `Please select at least one ${itemType} item to edit.`
            }
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleBulkEdit} 
            disabled={!value.trim() || selectedItems.size === 0 || isProcessing}
          >
            {isProcessing ? 'Processing...' : 
              `Update ${selectedItems.size} Selected Item${selectedItems.size > 1 ? 's' : ''}`
            }
          </Button>
        </DialogFooter>
      </DialogContent>
      
      {/* MOVE Modal */}
      <MoveItemsModal
        open={showMoveModal}
        onOpenChange={setShowMoveModal}
        items={items.filter(item => selectedItems.has(item.id))}
        onComplete={async () => {
          setShowMoveModal(false);
          // Refresh items list and reset selection after move
          const allItems = await ClientAPI.getItems();
          const filteredItems = allItems.filter(item => item.type === itemType);
          setItems(filteredItems);
          setSelectedItems(new Set());
          setSelectAll(false);
          onComplete();
        }}
      />
      
      {/* DELETE Modal */}
      <DeleteModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        entityType="item"
        entities={items.filter(item => selectedItems.has(item.id))}
        onComplete={async () => {
          setShowDeleteModal(false);
          // Refresh items list and reset selection after delete
          const allItems = await ClientAPI.getItems();
          const filteredItems = allItems.filter(item => item.type === itemType);
          setItems(filteredItems);
          setSelectedItems(new Set());
          setSelectAll(false);
          onComplete();
        }}
      />
    </Dialog>
  );
}