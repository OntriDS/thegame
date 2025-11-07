'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import NumericInput from '@/components/ui/numeric-input';
import { Item } from '@/types/entities';
import { createSiteOptionsWithCategories } from '@/lib/utils/site-options-utils';
import { createItemOptions, createItemOptionsForSite } from '@/lib/utils/searchable-select-utils';
import { ClientAPI } from '@/lib/client-api';
import { Trash2, Plus } from 'lucide-react';
import { v4 as uuid } from 'uuid';
import { getZIndexClass } from '@/lib/utils/z-index-utils';

export interface SaleItemLine {
  id: string;
  itemId: string;
  itemName: string;
  siteId: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface SaleItemsSubModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (items: SaleItemLine[]) => void;
  initialItems?: SaleItemLine[];
  defaultSiteId?: string;
}

export default function SaleItemsSubModal({
  open,
  onOpenChange,
  onSave,
  initialItems = [],
  defaultSiteId = ''
}: SaleItemsSubModalProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [lines, setLines] = useState<SaleItemLine[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>(defaultSiteId);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    try {
      const [itemsData, sitesData] = await Promise.all([
        ClientAPI.getItems(),
        ClientAPI.getSites()
      ]);
      setItems(itemsData);
      setSites(sitesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const createEmptyLine = useCallback((): SaleItemLine => ({
    id: uuid(),
    itemId: '',
    itemName: '',
    siteId: selectedSiteId,
    quantity: 1,
    unitPrice: 0,
    total: 0
  }), [selectedSiteId]);

  useEffect(() => {
    if (open) {
      loadData();
      setLines(initialItems.length > 0 ? initialItems : [createEmptyLine()]);
      setSelectedSiteId(defaultSiteId);
    }
  }, [open, initialItems, defaultSiteId, createEmptyLine]);

  const getItemOptions = (lineId: string) => {
    if (selectedSiteId) {
      return createItemOptionsForSite(items, selectedSiteId, true);
    } else {
      return createItemOptions(items, true, false);
    }
  };

  const handleItemSelect = (lineId: string, itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    setLines(prev => prev.map(line => {
      if (line.id === lineId) {
        const newLine = {
          ...line,
          itemId: item.id,
          itemName: item.name,
          siteId: selectedSiteId,
          unitPrice: item.price || 0,
          quantity: 1
        };
        newLine.total = newLine.quantity * newLine.unitPrice;
        return newLine;
      }
      return line;
    }));
  };

  const handleQuantityChange = (lineId: string, quantity: number) => {
    setLines(prev => prev.map(line => {
      if (line.id === lineId) {
        const newLine = { ...line, quantity };
        newLine.total = newLine.quantity * newLine.unitPrice;
        return newLine;
      }
      return line;
    }));
  };

  const handlePriceChange = (lineId: string, unitPrice: number) => {
    setLines(prev => prev.map(line => {
      if (line.id === lineId) {
        const newLine = { ...line, unitPrice };
        newLine.total = newLine.quantity * newLine.unitPrice;
        return newLine;
      }
      return line;
    }));
  };

  const handleAddLine = () => {
    setLines(prev => [...prev, createEmptyLine()]);
  };

  const handleRemoveLine = (lineId: string) => {
    setLines(prev => prev.filter(line => line.id !== lineId));
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      // Filter out empty lines
      const validLines = lines.filter(line => line.itemId && line.quantity > 0);

      if (validLines.length === 0) {
        onSave(validLines);
        onOpenChange(false);
        return;
      }

      const updates: Promise<Item | void>[] = [];

      validLines.forEach(line => {
        const originalItem = items.find(item => item.id === line.itemId);
        if (originalItem && originalItem.price !== line.unitPrice) {
          updates.push(
            ClientAPI.upsertItem({
              ...originalItem,
              price: line.unitPrice,
              updatedAt: new Date().toISOString(),
            })
          );
        }
      });

      if (updates.length > 0) {
        await Promise.all(updates);
        setItems(prev =>
          prev.map(item => {
            const line = validLines.find(l => l.itemId === item.id);
            if (line && item.price !== line.unitPrice) {
              return { ...item, price: line.unitPrice };
            }
            return item;
          })
        );
      }

      onSave(validLines);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save sale item changes:', error);
      alert('Failed to save items. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const totalQuantity = lines.reduce((sum, line) => sum + (line.quantity || 0), 0);
  const totalPrice = lines.reduce((sum, line) => sum + (line.total || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent zIndexLayer={'SUB_MODALS'} className="w-full max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select Sale Items</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto max-h-[60vh] px-1">
          {/* Site Selector */}
          <div className="space-y-2">
            <Label htmlFor="site" className="text-xs">Site</Label>
            <SearchableSelect
              value={selectedSiteId}
              onValueChange={setSelectedSiteId}
              options={createSiteOptionsWithCategories(sites)}
              autoGroupByCategory={true}
              placeholder="Select site..."
              className="h-8 text-sm"
            />
          </div>

          {/* Items Table */}
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground px-2">
              <div className="col-span-5">Item</div>
              <div className="col-span-2">Price</div>
              <div className="col-span-2">Qty</div>
              <div className="col-span-2">Total</div>
              <div className="col-span-1"></div>
            </div>

            {lines.map((line, index) => (
              <div key={line.id} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  <SearchableSelect
                    value={line.itemId}
                    onValueChange={(value) => handleItemSelect(line.id, value)}
                    options={getItemOptions(line.id)}
                    autoGroupByCategory={true}
                    placeholder="Select item..."
                    className="h-8 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <NumericInput
                    value={line.unitPrice}
                    onChange={(value) => handlePriceChange(line.id, value)}
                    min={0}
                    step={1}
                    placeholder="0"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <NumericInput
                    value={line.quantity}
                    onChange={(value) => handleQuantityChange(line.id, value)}
                    min={1}
                    step={1}
                    placeholder="1"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <div className="h-8 text-sm bg-muted px-3 py-2 rounded-md border flex items-center">
                    {line.total.toFixed(2)}
                  </div>
                </div>
                <div className="col-span-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveLine(line.id)}
                    className="h-8 w-8 p-0"
                    disabled={lines.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={handleAddLine}
              className="w-full h-8 text-xs"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Item
            </Button>
          </div>

          {/* Totals */}
          <div className="flex items-center justify-end gap-6 pt-4 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Total Quantity:</span>
              <span className="text-lg font-bold">{totalQuantity}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Total Price:</span>
              <span className="text-lg font-bold">${totalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {lines.filter(l => l.itemId).length} item(s) selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button onClick={handleSave} className="h-8 text-xs" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Items'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

