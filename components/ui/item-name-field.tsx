'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Item, Site } from '@/types/entities';
import { createItemOptions } from '@/lib/utils/searchable-select-utils';

interface ItemNameFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  items?: Item[];
  selectedItemId?: string;
  onItemSelect?: (itemId: string) => void;
  isNewItem?: boolean;
  onNewItemToggle?: (isNew: boolean) => void;
  label?: string;
  sites?: Site[];
  showPriceInOptions?: boolean;
  showQuantityInOptions?: boolean;
}

export function ItemNameField({
  value,
  onChange,
  placeholder = "Item name",
  className,
  disabled = false,
  items = [],
  selectedItemId = '',
  onItemSelect,
  isNewItem = false,
  onNewItemToggle,
  label = "Item Name",
  sites = [],
  showPriceInOptions = true,
  showQuantityInOptions = false,
}: ItemNameFieldProps) {
  const [internalIsNewItem, setInternalIsNewItem] = useState(isNewItem);
  const [internalSelectedItemId, setInternalSelectedItemId] = useState(selectedItemId);

  // Sync internal state with props
  useEffect(() => {
    setInternalIsNewItem(isNewItem);
  }, [isNewItem]);

  useEffect(() => {
    setInternalSelectedItemId(selectedItemId);
  }, [selectedItemId]);

  const handleToggleNewItem = (newIsNewItem: boolean) => {
    if (newIsNewItem === internalIsNewItem) {
      return;
    }
    setInternalIsNewItem(newIsNewItem);

    if (newIsNewItem) {
      // Switching to new item - clear selected item
      setInternalSelectedItemId('');
      onChange(''); // Clear the name field
      onItemSelect?.('');
    } else {
      // Switching to existing item - clear name field
      onChange('');
    }

    onNewItemToggle?.(newIsNewItem);
  };

  const handleItemSelect = (itemId: string) => {
    setInternalSelectedItemId(itemId);
    if (itemId && onItemSelect) {
      onItemSelect(itemId);
      // Find the selected item and set its name
      const selectedItem = items.find(item => item.id === itemId);
      if (selectedItem) {
        onChange(selectedItem.name);
      }
    } else {
      onChange('');
    }
  };

  // Create options for SearchableSelect
  const itemOptions = useMemo(
    () => createItemOptions(items, showPriceInOptions, showQuantityInOptions, sites),
    [items, showPriceInOptions, showQuantityInOptions, sites]
  );

  return (
    <div className={`space-y-2 ${className || ''}`}>
      <Label htmlFor="item-name-field" className="text-xs">{label}</Label>
      <div className="flex items-center justify-between">
        <TooltipProvider delayDuration={1000}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleToggleNewItem(!internalIsNewItem)}
                disabled={disabled}
                className="h-6 px-2 text-xs"
              >
                {internalIsNewItem ? 'New' : 'Existing'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>New: create a new item name. Existing: select from existing items.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {internalIsNewItem ? (
        <Input
          id="item-name-field"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="h-8 text-sm"
        />
      ) : (
        <SearchableSelect
          value={internalSelectedItemId}
          onValueChange={handleItemSelect}
          placeholder="Select item..."
          options={itemOptions}
          autoGroupByCategory={true}
          disabled={disabled}
          className="h-8 text-sm"
        />
      )}
    </div>
  );
}
