'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import NumericInput from '@/components/ui/numeric-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ItemType, Collection, ItemStatus } from '@/types/enums';
import { getSubTypesForItemType } from '@/lib/utils/item-utils';
import { getCategoryForItemType, createItemTypeSubTypeOptions, getItemTypeFromCombined } from '@/lib/utils/searchable-select-utils';
import { createSiteOptionsWithCategories } from '@/lib/utils/site-options-utils';
import type { SubItemType } from '@/types/type-aliases';
import { getZIndexClass } from '@/lib/utils/z-index-utils';
import { Package } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { ItemNameField } from '@/components/ui/item-name-field';
import { ClientAPI } from '@/lib/client-api';
import { Item } from '@/types/entities';

interface ItemCreationData {
  outputItemType: ItemType | '';
  outputItemSubType: SubItemType | '';
  outputItemQuantity: number;
  outputItemName: string;
  outputUnitCost: number;
  outputItemCollection: Collection | '';
  outputItemPrice: number;
  targetSite: string;
  outputItemStatus: ItemStatus;
}

interface ItemEmissarySubModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<ItemCreationData>;
  onSave: (data: ItemCreationData) => void;
  // Auto calculation data from caller entity
  entityCost?: number;
  entityRevenue?: number;
}

export default function ItemEmissarySubModal({
  open,
  onOpenChange,
  initialData = {},
  onSave,
  entityCost = 0,
  entityRevenue = 0,
}: ItemEmissarySubModalProps) {
  // Form state
  const [outputItemType, setOutputItemType] = useState<ItemType | ''>(initialData.outputItemType || '');
  const [outputItemSubType, setOutputItemSubType] = useState<SubItemType | ''>(initialData.outputItemSubType || '');
  const [outputItemTypeSubType, setOutputItemTypeSubType] = useState<string>('none:');
  const [outputItemQuantity, setOutputItemQuantity] = useState<number>(initialData.outputItemQuantity || 1);
  const [outputItemName, setOutputItemName] = useState<string>(initialData.outputItemName || '');
  const [outputUnitCost, setOutputUnitCost] = useState<number>(initialData.outputUnitCost || 0);
  const [outputItemCollection, setOutputItemCollection] = useState<Collection | ''>(initialData.outputItemCollection || '');
  const [outputItemPrice, setOutputItemPrice] = useState<number>(initialData.outputItemPrice || 0);
  const [targetSite, setTargetSite] = useState<string>('');
  const [outputItemStatus, setOutputItemStatus] = useState<ItemStatus>(ItemStatus.FOR_SALE);
  
  // State for existing items and sites
  const [existingItems, setExistingItems] = useState<Item[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>('');

  // Load existing items and sites when modal opens
  useEffect(() => {
    const loadData = async () => {
      if (open) {
        try {
          const [items, sitesData] = await Promise.all([
            ClientAPI.getItems(),
            ClientAPI.getSites()
          ]);
          setExistingItems(items);
          setSites(sitesData);
        } catch (error) {
          console.error('Failed to load data:', error);
        }
      }
    };
    loadData();
  }, [open]);

  // Initialize form when modal opens
  useEffect(() => {
    if (open) {
      setOutputItemType(initialData.outputItemType || '');
      setOutputItemSubType(initialData.outputItemSubType || '');
      setOutputItemQuantity(initialData.outputItemQuantity || 1);
      setOutputItemName(initialData.outputItemName || '');
      setOutputUnitCost(initialData.outputUnitCost || 0);
      setOutputItemCollection(initialData.outputItemCollection || '');
      setOutputItemPrice(initialData.outputItemPrice || 0);
      setTargetSite(initialData.targetSite || '');
      setOutputItemStatus(initialData.outputItemStatus || ItemStatus.FOR_SALE);
      setSelectedItemId(''); // Reset selected item
    }
  }, [open, initialData]);

  // Get available subtypes for the selected item type
  const getAvailableSubTypes = (): { value: SubItemType; label: string }[] => {
    if (!outputItemType) return [];
    return getSubTypesForItemType(outputItemType).map(subType => ({
      value: subType,
      label: subType
    }));
  };

  // Auto-calculate unit cost and price from entity cost/revenue and quantity
  const handleAutoCalculate = () => {
    if (outputItemQuantity > 0) {
      // Calculate unit cost if entity cost is available
      if (entityCost > 0) {
        const calculatedUnitCost = entityCost / outputItemQuantity;
        setOutputUnitCost(calculatedUnitCost);
      }
      
      // Calculate price if entity revenue is available
      if (entityRevenue > 0) {
        const calculatedPrice = entityRevenue / outputItemQuantity;
        setOutputItemPrice(calculatedPrice);
      }
    }
  };

  // Handle item selection from SearchableSelect
  const handleItemSelect = (itemId: string) => {
    setSelectedItemId(itemId);
    if (itemId) {
      const selectedItem = existingItems.find(item => item.id === itemId);
      if (selectedItem) {
        setOutputItemName(selectedItem.name);
        setOutputItemType(selectedItem.type);
        setOutputItemSubType(''); // Items don't have subType property
        setOutputUnitCost(selectedItem.unitCost);
        setOutputItemPrice(selectedItem.price);
        setOutputItemCollection(selectedItem.collection || '');
      }
    } else {
      setOutputItemName('');
      setOutputItemType('');
      setOutputItemSubType('');
      setOutputUnitCost(0);
      setOutputItemPrice(0);
      setOutputItemCollection('');
    }
  };

  const handleOutputItemTypeSubTypeChange = (newItemTypeSubType: string) => {
    setOutputItemTypeSubType(newItemTypeSubType);
    if (newItemTypeSubType === 'none:') {
      setOutputItemType('');
      setOutputItemSubType('');
    } else {
      const [itemType, subType] = newItemTypeSubType.split(':');
      setOutputItemType(itemType as ItemType);
      setOutputItemSubType(subType as SubItemType);
    }
  };

  // Prepare options for SearchableSelect
  const itemOptions = existingItems.map(item => ({
    value: item.id,
    label: `${item.name} (${item.type})`,
    category: getCategoryForItemType(item.type)
  }));

  const handleSave = () => {
    const data: ItemCreationData = {
      outputItemType,
      outputItemSubType,
      outputItemQuantity,
      outputItemName,
      outputUnitCost,
      outputItemCollection,
      outputItemPrice,
      targetSite,
      outputItemStatus,
    };
    onSave(data);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent zIndexLayer={'SUB_MODALS'} className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Item Creation
          </DialogTitle>
          <DialogDescription>
            Configure what item this entity will create when completed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Item Type & SubType */}
          <div className="space-y-2">
            <Label htmlFor="itemType">Item Type & SubType</Label>
            <SearchableSelect
              value={outputItemTypeSubType}
              onValueChange={handleOutputItemTypeSubTypeChange}
              placeholder="No Item Output"
              options={[
                { value: 'none:', label: 'No Item Output', category: 'None' },
                ...createItemTypeSubTypeOptions()
              ]}
              className="h-8 text-sm"
              autoGroupByCategory={true}
              getCategoryForValue={(value) => {
                if (value === 'none:') return 'None';
                return getItemTypeFromCombined(value);
              }}
            />
          </div>

          {/* Row 1: Quantity, Unit Cost, Price, Auto */}
          <div className="grid grid-cols-4 gap-2">
            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-xs">Quantity</Label>
              <NumericInput
                id="quantity"
                value={outputItemQuantity}
                onChange={setOutputItemQuantity}
                min={1}
                step={1}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitCost" className="text-xs">Unit Cost ($)</Label>
              <NumericInput
                id="unitCost"
                value={outputUnitCost}
                onChange={setOutputUnitCost}
                min={0}
                step={0.01}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="itemPrice" className="text-xs">Price ($)</Label>
              <NumericInput
                id="itemPrice"
                value={outputItemPrice}
                onChange={setOutputItemPrice}
                min={0}
                step={0.01}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auto" className="text-xs">Auto</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAutoCalculate}
                className="h-8 text-xs"
                title="Auto-calculate Unit Cost from Cost/Quantity and Price from Revenue/Quantity"
              >
                Auto
              </Button>
            </div>
          </div>

          {/* Row 2: Target Site, Item Status */}
          <div className="grid grid-cols-2 gap-2">
            <SearchableSelect
              value={targetSite}
              onValueChange={setTargetSite}
              placeholder="Target Site"
              options={createSiteOptionsWithCategories(sites)}
              autoGroupByCategory={true}
              className="h-8 text-sm"
            />
            <Select
              value={outputItemStatus}
              onValueChange={(value) => setOutputItemStatus(value as ItemStatus)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(ItemStatus).map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Item Search/Name & Collection */}
          <div className="grid grid-cols-2 gap-4">
            <ItemNameField
              value={outputItemName}
              onChange={setOutputItemName}
              placeholder="Item name"
              items={existingItems}
              selectedItemId={selectedItemId}
              onItemSelect={handleItemSelect}
              label="Item Name"
            />

            <div className="space-y-2">
              <Label htmlFor="itemCollection">Collection</Label>
              <Select value={outputItemCollection} onValueChange={(value) => setOutputItemCollection(value as Collection)}>
                <SelectTrigger>
                  <SelectValue placeholder="Uncategorized" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(Collection).map(collection => (
                    <SelectItem key={collection} value={collection}>
                      {collection}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Item Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { ItemCreationData };
