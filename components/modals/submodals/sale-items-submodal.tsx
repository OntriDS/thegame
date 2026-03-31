'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import { SearchableSelect } from '@/components/ui/searchable-select';
import NumericInput from '@/components/ui/numeric-input';
import { Item, Site } from '@/types/entities';
import {
  createDistinctItemOptions,
} from '@/lib/utils/searchable-select-utils';
import { ClientAPI } from '@/lib/client-api';
import { Trash2, Plus } from 'lucide-react';
import { v4 as uuid } from 'uuid';
import { ItemType, ItemStatus } from '@/types/enums';

// Default values for quick-created items
/** Sold rows show clean display name; id is rendered in a dedicated row below. */
function soldRowLabel(resolved: Item | undefined, lineName?: string): string {
  const base = lineName?.trim() || resolved?.name || 'Unknown item';
  return base;
}

const ITEM_DEFAULTS = {
  type: ItemType.ARTWORK, // Defaulting to Artwork for creative context
  status: ItemStatus.FOR_SALE,
  station: 'Strategy' as const, // Default station
  stock: [],
  unitCost: 0,
  additionalCost: 0,
  price: 0,
  value: 0,
  quantitySold: 0,
  isCollected: false
};


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
        // Match SalesModal: include all statuses so historic / non–for-sale items resolve like the sale record
        ClientAPI.getItems(undefined, undefined, undefined, 'all'),
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

  const isSoldItemId = (id: string): boolean => {
    return id.includes('-sold-') || id.includes('-manualsold-');
  };

  const isSoldLine = (line: SaleItemLine): boolean => {
    if (!line.itemId) return false;
    if (isSoldItemId(line.itemId)) return true;
    const resolved = items.find((i) => i.id === line.itemId);
    if (!resolved) return false;
    return resolved.status === ItemStatus.SOLD;
  };

  const soldLines = React.useMemo(
    () => lines.filter((line) => isSoldLine(line)),
    [lines, items]
  );

  const editableLines = React.useMemo(
    () => lines.filter((line) => !isSoldLine(line)),
    [lines, items]
  );

  // Inventory-only options for new selections (no sold items mixed in).
  const rowOptions = React.useMemo(() => {
    // Keep one consistent picker mode (normal inventory list with stock brackets).
    return createDistinctItemOptions(items, false, sites, true);
  }, [items, sites]);

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

  const handleCreateItem = async (lineId: string, name: string) => {
    try {
      // 1. Create minimal valid item
      const newItem: Item = {
        ...ITEM_DEFAULTS,
        id: uuid(),
        name: name,
        createdAt: new Date(),
        updatedAt: new Date(),
        links: []
      };

      // 2. Persist immediately (fire and forget pattern for UI responsiveness, but logic needs it)
      // We await to ensure we can select it validly
      await ClientAPI.upsertItem(newItem);

      // 3. Update local state
      setItems(prev => [...prev, newItem]);

      // 4. Select it for the line (composite value when using site-scoped options)
      const sitePart = selectedSiteId || 'none';
      handleItemSelect(lineId, `${newItem.id}:${sitePart}`);

    } catch (error) {
      console.error('Failed to create new item:', error);
    }
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

  /** Lines that actually participate in the sale (excludes blank “add” row with no item). */
  const quantifiedLines = React.useMemo(
    () => lines.filter((line) => line.itemId && (line.quantity || 0) > 0),
    [lines]
  );
  const totalQuantity = quantifiedLines.reduce((sum, line) => sum + (line.quantity || 0), 0);
  const totalPrice = quantifiedLines.reduce((sum, line) => sum + (line.total || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent zIndexLayer={'SUB_MODALS'} className="flex h-[min(90vh,900px)] w-full max-w-7xl flex-col gap-0 overflow-hidden p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle>Select Sale Items</DialogTitle>
          <DialogDescription>
            Search and select items to add to the sale.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 py-2">
          {/* Items Table — Item column uses half the row; matches parent sale modal width (max-w-7xl) */}
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 px-2 text-xs font-semibold text-muted-foreground">
              <div className="col-span-6">Item</div>
              <div className="col-span-1">Price ($)</div>
              <div className="col-span-1">Calc ($)</div>
              <div className="col-span-1 flex flex-col justify-center">
                <span>Calc (₡)</span>
                <span className="text-[9px] font-normal text-muted-foreground">Rate: {exchangeRate}</span>
              </div>
              <div className="col-span-1">Qty</div>
              <div className="col-span-1">Total ($)</div>
              <div className="col-span-1" />
            </div>

            {editableLines.map((line) => {
              // Robust matching logic for composite values (ItemId:SiteId)
              const primaryComposite = `${line.itemId}:${line.siteId || 'none'}`;

              // 1. Try exact match with current siteId (or 'none' if empty)
              let matchedOption = rowOptions.find(o => o.value === primaryComposite);

              if (!matchedOption && line.siteId !== (line.siteId || 'none')) {
                // 2. Try exact match with raw siteId (if it was different from 'none')
                matchedOption = rowOptions.find(o => o.value === `${line.itemId}:${line.siteId}`);
              }

              if (!matchedOption) {
                // 3. Plain item id (distinct options without site suffix)
                matchedOption = rowOptions.find(o => o.value === line.itemId);
              }

              if (!matchedOption) {
                // 4. Only accept a prefix match when exactly one site row exists (avoids wrong row)
                const byPrefix = rowOptions.filter(o => o.value.startsWith(`${line.itemId}:`));
                matchedOption = byPrefix.length === 1 ? byPrefix[0] : undefined;
              }

              const matchedValue = matchedOption ? matchedOption.value : line.itemId;

              return (
                <div key={line.id} className="grid grid-cols-12 items-end gap-2">
                  {/* Item Selector */}
                  <div className="col-span-6 min-w-0">
                    <SearchableSelect
                      value={matchedValue}
                      onValueChange={(value) => handleItemSelect(line.id, value)}
                      options={rowOptions}
                      autoGroupByCategory={true}
                      placeholder="Item..."
                      initialLabel={line.itemName}
                      className="h-8 min-h-8 text-sm"
                      popoverWiden
                      onCreate={(query) => handleCreateItem(line.id, query)}
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
                  <div className="col-span-1">
                    <input
                      type="text"
                      value={line.usdExpression || ''}
                      onChange={(e) => handleExpressionChange(line.id, 'usdExpression', e.target.value)}
                      placeholder="2+5.."
                      className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>

                  {/* CRC Calculator Input */}
                  <div className="col-span-1">
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
                  <div className="col-span-1 min-w-0">
                    <div className="flex h-8 items-center rounded-md border bg-muted px-2 py-1 font-mono text-xs">
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

            {soldLines.length > 0 && (
              <div className="mt-4 border-t border-border/70 pt-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Sold items
                </div>
                <div className="grid grid-cols-12 gap-2 px-2 text-xs font-semibold text-muted-foreground">
                  <div className="col-span-6">Item</div>
                  <div className="col-span-2">Price ($)</div>
                  <div className="col-span-1">Qty Sold</div>
                  <div className="col-span-2">Total ($)</div>
                  <div className="col-span-1" />
                </div>
                <div className="space-y-2">
                  {soldLines.map((line) => {
                    const resolved = items.find((i) => i.id === line.itemId);
                    const displayTotal =
                      Number.isFinite(line.total) && line.total !== 0
                        ? line.total
                        : (line.unitPrice || 0) * (line.quantity || 0);
                    return (
                      <div key={`sold-${line.id}`} className="grid grid-cols-12 gap-2">
                        <div className="col-span-6 min-w-0 space-y-1">
                          <div
                            className="flex h-8 items-center rounded-md border bg-muted/40 px-2 py-1 text-xs text-foreground"
                            title={line.itemId}
                          >
                            <span className="min-w-0 truncate">
                              {soldRowLabel(resolved, line.itemName)}
                            </span>
                          </div>
                          <div className="break-all font-mono text-[10px] leading-snug text-muted-foreground">
                            {line.itemId}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <div className="flex h-8 items-center rounded-md border bg-muted px-2 py-1 font-mono text-xs">
                            ${(line.unitPrice || 0).toFixed(2)}
                          </div>
                        </div>
                        <div className="col-span-1">
                          <div className="flex h-8 items-center rounded-md border bg-muted px-2 py-1 font-mono text-xs">
                            {line.quantity || 0}
                          </div>
                        </div>
                        <div className="col-span-2 min-w-0">
                          <div className="flex h-8 items-center rounded-md border bg-muted px-2 py-1 font-mono text-xs">
                            ${displayTotal.toFixed(2)}
                          </div>
                        </div>
                        <div className="col-span-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveLine(line.id)}
                            className="h-8 w-8 p-0 text-red-400 hover:text-red-500 hover:bg-red-50"
                            disabled={lines.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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

        <DialogFooter className="mt-auto shrink-0 flex items-center justify-between border-t pt-4">
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

