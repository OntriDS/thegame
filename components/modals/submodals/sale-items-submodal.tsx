'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import { SearchableSelect } from '@/components/ui/searchable-select';
import NumericInput from '@/components/ui/numeric-input';
import { Item, Site } from '@/types/entities';
import { createItemOptions, createItemOptionsForSite } from '@/lib/utils/searchable-select-utils';
import { ClientAPI } from '@/lib/client-api';
import { Trash2, Plus } from 'lucide-react';
import { v4 as uuid } from 'uuid';

export interface SaleItemLine {
  id: string;
  itemId: string;
  itemName: string;
  siteId: string;
  quantity: number;
  unitPrice: number;
  total: number;
  usdExpression?: string; // New: Raw expression for USD input
  crcExpression?: string; // New: Raw expression for CRC input
  totalCRC?: number; // New: Calculated CRC total
  totalUSD?: number; // New: Calculated USD total
}

interface SaleItemsSubModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (items: SaleItemLine[]) => void;
  initialItems?: SaleItemLine[];
  defaultSiteId?: string;
  exchangeRate?: number; // New: CRC to USD rate
}

export default function SaleItemsSubModal({
  open,
  onOpenChange,
  onSave,
  initialItems = [],
  defaultSiteId = '',
  exchangeRate = 500 // Default fallback
}: SaleItemsSubModalProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [lines, setLines] = useState<SaleItemLine[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>(defaultSiteId);
  const [isSaving, setIsSaving] = useState(false);
  const hasInitializedRef = useRef(false);

  // Helper: Safe Math Evaluation
  const evaluateMathExpression = (expression: string): number => {
    if (!expression) return 0;
    try {
      // 1. Sanitize: Allow digits, operators (+ - * / .), parentheses, and k/K
      const sanitized = expression.replace(/[^0-9+\-*/.()kK]/g, '');

      // 2. Handle 'k' or 'K' -> '*1000'
      // We replace k/K with *1000, but we need to be careful about context.
      // E.g. "1k" -> "1*1000". "1.5K" -> "1.5*1000".
      // Regex looks for a number followed immediately by K.
      const withMultipliers = sanitized.replace(/(\d*\.?\d+)[kK]/g, '$1*1000');

      // 3. Evaluate safely
      // using Function constructor is closer to eval but we sanitized characters.
      // We only allow math chars.
      // Returns 0 if calculation fails or result is NaN
      const result = new Function('return ' + withMultipliers)();
      return isNaN(result) ? 0 : result;
    } catch (e) {
      return 0;
    }
  };

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
    total: 0,
    usdExpression: '',
    crcExpression: ''
  }), [selectedSiteId]);

  useEffect(() => {
    if (open) {
      loadData();
      hasInitializedRef.current = false;
    }
  }, [open]);

  useEffect(() => {
    if (!open || hasInitializedRef.current) {
      return;
    }
    const siteId = defaultSiteId || '';
    const initialLines =
      initialItems.length > 0 ? initialItems : [createEmptyLine()];

    setLines(
      initialLines.map((line) => {
        // Ensure totals are calculated if missing (for existing lines)
        const usdVal = evaluateMathExpression(line.usdExpression || '');
        const crcVal = evaluateMathExpression(line.crcExpression || '');
        // If totals are missing but expressions exist, backfill them
        let tUSD = line.totalUSD ?? 0;
        let tCRC = line.totalCRC ?? 0;

        if (tUSD === 0 && tCRC === 0 && (usdVal > 0 || crcVal > 0)) {
          tUSD = usdVal;
          tCRC = crcVal;
        }

        return {
          ...line,
          siteId: siteId || line.siteId || '',
          usdExpression: line.usdExpression || '',
          crcExpression: line.crcExpression || '',
          totalUSD: tUSD,
          totalCRC: tCRC
        };
      })
    );
    hasInitializedRef.current = true;
  }, [open, initialItems, defaultSiteId, createEmptyLine]);

  useEffect(() => {
    if (!open) return;
    setSelectedSiteId(defaultSiteId || '');
  }, [defaultSiteId, open]);

  useEffect(() => {
    if (!open) return;
    setLines((prev) =>
      prev.map((line) => ({
        ...line,
        siteId: selectedSiteId || '',
      }))
    );
  }, [selectedSiteId, open]);

  // Optimize: Calculate options once, as they are the same for all rows based on selectedSiteId
  const rowOptions = React.useMemo(() => {
    if (selectedSiteId) {
      return createItemOptionsForSite(items, selectedSiteId, false, sites);
    } else {
      return createItemOptions(items, false, false, sites);
    }
  }, [items, selectedSiteId, sites]);

  const handleItemSelect = (lineId: string, rawValue: string) => {
    const [itemId, specificSiteId] = rawValue.split(':');
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    setLines(prev => prev.map(line => {
      if (line.id === lineId) {
        return {
          ...line,
          itemId: item.id,
          itemName: item.name,
          siteId: specificSiteId || selectedSiteId, // Use specific site from selection if available
          unitPrice: item.price || 0,
          quantity: 1,
          total: (item.price || 0) * 1,
          usdExpression: '',
          crcExpression: '',
          totalUSD: 0,
          totalCRC: 0
        };
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

  // Re-calculate quantity based on current expressions and (potentially new) price
  const recalculateQuantity = (currentLine: SaleItemLine, newPrice: number): number => {
    if (newPrice === 0) return currentLine.quantity;
    const usdVal = evaluateMathExpression(currentLine.usdExpression || '');
    const crcVal = evaluateMathExpression(currentLine.crcExpression || '');

    // Total Value in USD = USD + (CRC / ExchangeRate)
    const totalValueUsd = usdVal + (crcVal / exchangeRate);

    if (totalValueUsd === 0) return currentLine.quantity;

    const qty = Math.round(totalValueUsd / newPrice);
    return qty;
  };

  const handlePriceChange = (lineId: string, unitPrice: number) => {
    setLines(prev => prev.map(line => {
      if (line.id === lineId) {
        let newQuantity = line.quantity;
        if (line.usdExpression || line.crcExpression) {
          newQuantity = recalculateQuantity(line, unitPrice);
        }

        const newLine = { ...line, unitPrice, quantity: newQuantity };
        newLine.total = newQuantity * unitPrice;
        return newLine;
      }
      return line;
    }));
  };

  const handleExpressionChange = (lineId: string, field: 'usdExpression' | 'crcExpression', value: string) => {
    setLines(prev => prev.map(line => {
      if (line.id === lineId) {
        const updatedLine = { ...line, [field]: value };

        const usdVal = evaluateMathExpression(updatedLine.usdExpression || '');
        const crcVal = evaluateMathExpression(updatedLine.crcExpression || '');

        const totalValueUsd = usdVal + (crcVal / exchangeRate);

        if (updatedLine.unitPrice > 0) {
          updatedLine.quantity = Math.round(totalValueUsd / updatedLine.unitPrice);
        }

        updatedLine.total = updatedLine.quantity * updatedLine.unitPrice;
        updatedLine.totalUSD = usdVal;
        updatedLine.totalCRC = crcVal;

        return updatedLine;
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

  const handleSaveInternal = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const validLines = lines.filter(line => line.itemId && line.quantity > 0);
      if (validLines.length === 0) {
        onSave(validLines);
        onOpenChange(false);
        return;
      }
      onSave(validLines);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save sale item changes:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const totalQuantity = lines.reduce((sum, line) => sum + (line.quantity || 0), 0);
  const totalPrice = lines.reduce((sum, line) => sum + (line.total || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent zIndexLayer={'SUB_MODALS'} className="w-full max-w-5xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Select Sale Items</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto max-h-[60vh] px-1">
          {/* Items Table */}
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground px-2">
              <div className="col-span-3">Item</div>
              <div className="col-span-1">Price ($)</div>
              <div className="col-span-2">Calc ($)</div>
              <div className="col-span-2 flex flex-col justify-center">
                <span>Calc (₡)</span>
                <span className="text-[9px] text-muted-foreground font-normal">Rate: {exchangeRate}</span>
              </div>
              <div className="col-span-1">Qty</div>
              <div className="col-span-2">Total ($)</div>
              <div className="col-span-1"></div>
            </div>

            {lines.map((line, index) => {
              // Robust matching logic for composite values (ItemId:SiteId)
              const primaryComposite = `${line.itemId}:${line.siteId || 'none'}`;

              // 1. Try exact match with current siteId (or 'none' if empty)
              let matchedOption = rowOptions.find(o => o.value === primaryComposite);

              if (!matchedOption && line.siteId !== (line.siteId || 'none')) {
                // 2. Try exact match with raw siteId (if it was different from 'none')
                matchedOption = rowOptions.find(o => o.value === `${line.itemId}:${line.siteId}`);
              }

              if (!matchedOption) {
                // 3. Fallback: Find ANY option for this item (e.g. if site moved or first load)
                matchedOption = rowOptions.find(o => o.value.startsWith(`${line.itemId}:`));
              }

              const matchedValue = matchedOption ? matchedOption.value : line.itemId;

              return (
                <div key={line.id} className="grid grid-cols-12 gap-2 items-end">
                  {/* Item Selector */}
                  <div className="col-span-3">
                    <SearchableSelect
                      value={matchedValue}
                      onValueChange={(value) => handleItemSelect(line.id, value)}
                      options={rowOptions}
                      autoGroupByCategory={true}
                      placeholder="Item..."
                      className="h-8 text-sm"
                    />
                  </div>

                  {/* Unit Price */}
                  <div className="col-span-1">
                    <NumericInput
                      value={line.unitPrice}
                      onChange={(value) => handlePriceChange(line.id, value)}
                      min={0}
                      step={1}
                      placeholder="0"
                      className="h-8 text-sm"
                    />
                  </div>

                  {/* USD Calculator Input */}
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={line.usdExpression || ''}
                      onChange={(e) => handleExpressionChange(line.id, 'usdExpression', e.target.value)}
                      placeholder="2+5.."
                      className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>

                  {/* CRC Calculator Input */}
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={line.crcExpression || ''}
                      onChange={(e) => handleExpressionChange(line.id, 'crcExpression', e.target.value)}
                      placeholder="1k+500.."
                      className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 border-pink-500/20"
                    />
                  </div>

                  {/* Quantity (Auto-calc but editable) */}
                  <div className="col-span-1">
                    <NumericInput
                      value={line.quantity}
                      onChange={(value) => handleQuantityChange(line.id, value)}
                      min={1}
                      step={1}
                      placeholder="1"
                      className="h-8 text-sm font-bold bg-slate-50 dark:bg-slate-900"
                    />
                  </div>

                  {/* Total Line Price */}
                  <div className="col-span-2">
                    <div className="h-8 text-sm bg-muted px-3 py-2 rounded-md border flex items-center font-mono">
                      ${line.total.toFixed(2)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveLine(line.id)}
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-500 hover:bg-red-50"
                      disabled={lines.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}

            <Button
              variant="outline"
              size="sm"
              onClick={handleAddLine}
              className="w-full h-8 text-xs dash-border"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Item Row
            </Button>
          </div>

          {/* Totals Summary */}
          <div className="flex items-center justify-end gap-6 pt-4 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Total Quantity:</span>
              <span className="text-lg font-bold">{totalQuantity}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Grand Total:</span>
              <span className="text-lg font-bold text-green-600">${totalPrice.toFixed(2)}</span>
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
            <Button onClick={handleSaveInternal} className="h-8 text-xs" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Items'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

