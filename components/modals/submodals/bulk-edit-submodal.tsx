'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ItemType, ItemStatus, Collection, EntityType } from '@/types/enums';
import { getItemStatusLabel } from '@/lib/constants/status-display-labels';
import { getSubTypesForItemType } from '@/lib/utils/item-utils';
import { getCategoryForItemType, createStationCategoryOptions, getStationFromCombined } from '@/lib/utils/searchable-select-utils';
import type { Station } from '@/types/type-aliases';
import { SearchableSelect } from '@/components/ui/searchable-select';
// Side effects handled by parent component via API calls
import { Item } from '@/types/entities';
import { PRICE_STEP, DEFAULT_MIN_VALUE } from '@/lib/constants/app-constants';
import { MapPin, Trash2 } from 'lucide-react';

import { getSiteNameFromId } from '@/lib/utils/site-options-utils';
import { ClientAPI } from '@/lib/client-api';
import { getCollectionLabel } from '@/lib/constants/collection-labels';
import DeleteModal from './delete-submodal';

interface BulkEditModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  itemType: ItemType;
  sites: any[];
  onComplete: () => void;
}

export default function BulkEditModal({ open, onOpenChange, itemType, sites, onComplete }: BulkEditModalProps) {
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

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fieldOptions = [
    { value: 'quantity', label: 'Quantity' },
    { value: 'targetAmount', label: 'Target Quantity' },
    { value: 'price', label: 'Price' },
    { value: 'unitCost', label: 'Unit Cost' },
    { value: 'status', label: 'Status' },
    { value: 'collection', label: 'Collection' },
    { value: 'subItemType', label: 'Sub Type' },
    { value: 'size', label: 'Size' },
    { value: 'station', label: 'Station' },
    { value: EntityType.SITE, label: 'Site' },
    { value: 'keepInInventoryAfterSold', label: 'Keep Item in Inventory after Sold?' },
    { value: 'restockToTarget', label: 'Restock when Sold?' },
  ];

  const booleanFields = new Set(['keepInInventoryAfterSold', 'restockToTarget']);
  const numericFields = new Set(['quantity', 'targetAmount', 'price', 'unitCost', 'size']);
  const hasNewValue = booleanFields.has(field) || field === EntityType.SITE || value.trim().length > 0;
  const canSubmit = hasNewValue && selectedItems.size > 0 && !isProcessing;

  const isValidSiteId = (siteId: string | undefined): boolean => {
    const normalizedSiteId = String(siteId || '').trim();
    return normalizedSiteId.length > 0 && sites.some(site => site.id === normalizedSiteId);
  };

  const updateStockAtPrimarySite = (item: Item, quantity: number): Item['stock'] => {
    const primarySiteId = item.stock.map(stock => stock.siteId).find(siteId => isValidSiteId(siteId)) || '';
    const updatedStock = [...(item.stock || [])].filter(stockPoint => isValidSiteId(stockPoint.siteId));
    if (quantity > 0 && !primarySiteId) {
      throw new Error(`Could not update stock for "${item.name}" because it has no valid location.`);
    }

    const stockIndex = updatedStock.findIndex(sp => sp.siteId === primarySiteId);

    if (stockIndex >= 0) {
      if (quantity <= 0) {
        updatedStock.splice(stockIndex, 1);
      } else {
        updatedStock[stockIndex] = { siteId: primarySiteId, quantity };
      }
    } else if (quantity > 0) {
      updatedStock.push({ siteId: primarySiteId, quantity });
    }

    return updatedStock;
  };

  const moveStockToSite = (item: Item, siteId: string): Item['stock'] => {
    const totalQuantity = item.stock.reduce((sum, sp) => sum + sp.quantity, 0);
    const normalizedSiteId = String(siteId || '').trim();
    return totalQuantity > 0 ? [{ siteId: normalizedSiteId, quantity: totalQuantity }] : [];
  };

  const handleFieldChange = (nextField: string) => {
    setField(nextField);
    setValue(booleanFields.has(nextField) ? 'false' : '');
  };

  // Load items when modal opens
  useEffect(() => {
    const loadItems = async () => {
      if (open) {
        try {
          const allItems = await ClientAPI.getItems(itemType, undefined, undefined, 'all');
          // Simple direct filter - no normalization 'masks'
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

  // If a site filter points to a site that no longer exists, reset to ALL
  useEffect(() => {
    if (!open) return;

    if (siteFilter !== 'all' && !sites.some(site => site.id === siteFilter)) {
      setSiteFilter('all');
    }
  }, [open, sites, siteFilter]);

  // Get filtered items based on selected filters
  const getFilteredItems = useCallback(() => {
    return items.filter(item => {
      const itemCollection = item.collection || Collection.NO_COLLECTION;
      if (collectionFilter !== 'all' && itemCollection !== collectionFilter) return false;
      if (siteFilter !== 'all' && !item.stock.some(stockPoint => stockPoint.siteId === siteFilter)) return false;
      if (subItemFilter !== 'all' && item.subItemType !== subItemFilter) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      return true;
    });
  }, [items, collectionFilter, siteFilter, subItemFilter, statusFilter]);

  const filteredItems = useMemo(getFilteredItems, [getFilteredItems]);

  useEffect(() => {
    const visibleIds = new Set(filteredItems.map(item => item.id));
    setSelectedItems(prev => {
      const next = new Set([...prev].filter(id => visibleIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [filteredItems]);

  useEffect(() => {
    setSelectAll(filteredItems.length > 0 && filteredItems.every(item => selectedItems.has(item.id)));
  }, [filteredItems, selectedItems]);

  const handleBulkEdit = async () => {
    // Check value and selected items
    if (!canSubmit) return;

    setIsProcessing(true);

    try {
      const itemsToUpdate = items.filter(item => selectedItems.has(item.id));
      const preparedUpdates: Item[] = [];

      // Prepare each item update locally
      for (const item of itemsToUpdate) {
        let newValue: any = value;
        let updatedItem: Item = { ...item };

        // Convert value based on field type
        if (numericFields.has(field)) {
          const parsed = Number(value);
          newValue = Number.isFinite(parsed) ? parsed : 0;
          if (field === 'quantity') {
            updatedItem = { ...item, stock: updateStockAtPrimarySite(item, newValue) };
          } else if (field === 'targetAmount') {
            updatedItem = {
              ...item,
              targetAmount: newValue > 0 ? newValue : undefined,
              restockToTarget: newValue > 0 ? item.restockToTarget : false,
            };
          } else {
            updatedItem = { ...item, [field]: newValue };
          }
        } else if (booleanFields.has(field)) {
          newValue = value === 'true';
          updatedItem = { ...item, [field]: newValue };
        } else if (field === 'status') {
          newValue = value as ItemStatus;
          updatedItem = { ...item, status: newValue };
      } else if (field === 'collection') {
          newValue = value === Collection.NO_COLLECTION ? Collection.NO_COLLECTION : value as Collection;
          updatedItem = { ...item, collection: newValue };
        } else if (field === 'station') {
          // IMPORTANT: Extract just the station name from the combined 'area:station' value
          newValue = getStationFromCombined(value) as Station;
          updatedItem = { ...item, station: newValue };
        } else if (field === EntityType.SITE) {
          updatedItem = { ...item, stock: moveStockToSite(item, value) };
        } else {
          // Handle other field updates
          updatedItem = { ...item, [field]: value };
        }

        preparedUpdates.push(updatedItem);
      }

      // Send ONE single bulk request
      await ClientAPI.upsertItem(preparedUpdates);

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
                <SelectItem key={status} value={status}>{getItemStatusLabel(status)}</SelectItem>
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
              <SelectItem value={Collection.NO_COLLECTION}>{getCollectionLabel(Collection.NO_COLLECTION)}</SelectItem>
              {Object.values(Collection).filter(collection => collection !== Collection.NO_COLLECTION).map(collection => (
                <SelectItem key={collection} value={collection}>{getCollectionLabel(collection)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'subItemType':
        const subTypeOptions = getSubTypesForItemType(itemType);
        return subTypeOptions.length > 0 ? (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger>
              <SelectValue placeholder="Select sub type" />
            </SelectTrigger>
            <SelectContent>
              {subTypeOptions.map(subType => (
                <SelectItem key={subType} value={subType}>{subType}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter sub type"
          />
        );

      case 'station':
        return (
          <SearchableSelect
            value={value}
            onValueChange={setValue}
            placeholder="Select station"
            options={createStationCategoryOptions()}
            getCategoryForValue={(station) => getCategoryForItemType(itemType)}
          />
        );

      case EntityType.SITE:
        return (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger>
              <SelectValue placeholder="Select site" />
            </SelectTrigger>
            <SelectContent>
              {sites.map(site => (
                <SelectItem key={site.id} value={site.id}>
                  {site.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'keepInInventoryAfterSold':
      case 'restockToTarget':
        return (
          <div className="flex h-10 items-center gap-3 rounded-md border px-3">
            <Switch
              id={`bulk-${field}`}
              checked={value === 'true'}
              onCheckedChange={(checked) => setValue(checked ? 'true' : 'false')}
            />
            <Label htmlFor={`bulk-${field}`} className="text-sm">
              {value === 'true' ? 'Enabled' : 'Disabled'}
            </Label>
          </div>
        );

      default:
        return (
          <NumericInput
            value={typeof value === 'number' ? value : parseFloat(value) || 0}
            onChange={(numValue) => setValue(numValue.toString())}
            placeholder={field === 'price' || field === 'unitCost' ? '0.00' : '0'}
            step={field === 'quantity' || field === 'targetAmount' ? 1 : PRICE_STEP}
            allowDecimals={field !== 'quantity' && field !== 'targetAmount'}
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
      <DialogContent zIndexLayer={'SUB_MODALS'} className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Edit {itemType}</DialogTitle>
          <DialogDescription>
            Select fields to update and apply changes to multiple items at once.
          </DialogDescription>
          <div className="flex gap-2 mt-2">
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
              <Select value={field} onValueChange={handleFieldChange}>
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
                <SelectItem value={Collection.NO_COLLECTION}>
                  {getCollectionLabel(Collection.NO_COLLECTION)}
                </SelectItem>
                  {Object.values(Collection).filter(collection => collection !== Collection.NO_COLLECTION).map(collection => (
                    <SelectItem key={collection} value={collection}>{getCollectionLabel(collection)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={siteFilter} onValueChange={setSiteFilter}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Site" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sites</SelectItem>
                  {sites.map(site => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
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
                    <SelectItem key={status} value={status}>{getItemStatusLabel(status)}</SelectItem>
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
                        {item.collection && `${getCollectionLabel(item.collection)} • `}
                        {item.stock?.[0]?.siteId && (
                          <>
                            <MapPin className="inline h-3 w-3" /> {getSiteNameFromId(item.stock[0].siteId, sites)} •{' '}
                          </>
                        )}
                        {item.status && `${getItemStatusLabel(item.status)} • `}
                        Qty: {item.stock?.reduce((sum, s) => sum + s.quantity, 0) || 0}
                        {item.targetAmount ? ` / Target: ${item.targetAmount}` : ''}
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
            disabled={!canSubmit}
          >
            {isProcessing ? 'Processing...' :
              `Update ${selectedItems.size} Selected Item${selectedItems.size > 1 ? 's' : ''}`
            }
          </Button>
        </DialogFooter>
      </DialogContent>


      {/* DELETE Modal */}
      <DeleteModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        entityType={EntityType.ITEM}
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