'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ItemStatus, Collection } from '@/types/enums';
import { ClientAPI } from '@/lib/client-api';

interface InlineEditorProps {
  value: string | number;
  field: string;
  itemId: string;
  onSave: (itemId: string, field: string, value: any) => void;
  onCancel: () => void;
  type?: 'text' | 'number' | 'select';
  options?: { value: string; label: string }[];
  step?: string;
  min?: string;
}

export default function InlineEditor({
  value,
  field,
  itemId,
  onSave,
  onCancel,
  type = 'text',
  options = [],
  step = '0.01',
  min = '0'
}: InlineEditorProps) {
  const [editValue, setEditValue] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (type === 'select') {
      selectRef.current?.focus();
    } else {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [type]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleSave = () => {
    let finalValue: any = editValue;
    
    if (type === 'number') {
      finalValue = parseFloat(editValue) || 0;
    } else if (type === 'select') {
      finalValue = editValue === 'none' ? undefined : editValue;
    }
    
    // Call the original onSave with the proper parameters
    onSave(itemId, field, finalValue);
  };

  const handleBlur = () => {
    // Immediate save and cleanup when blurring
    handleSave();
  };

  const handleSelectOpenChange = (open: boolean) => {
    if (!open) {
      // When dropdown closes, ensure we save and cleanup
      setTimeout(() => {
        handleSave();
      }, 0);
    }
  };

  if (type === 'select') {
    return (
      <div className="relative w-full">
        <Select 
          value={editValue} 
          onValueChange={setEditValue} 
          onOpenChange={handleSelectOpenChange}
        >
          <SelectTrigger 
            ref={selectRef} 
            className="h-6 border-none p-0 text-sm font-medium bg-transparent min-w-0 w-full focus:ring-1 focus:ring-blue-500 focus:ring-offset-0 text-center justify-center"
          >
            <SelectValue className="text-center" />
          </SelectTrigger>
          <SelectContent 
            className="min-w-[120px]" 
            side="bottom"
            align="center"
            sideOffset={4}
            position="popper"
            avoidCollisions={false}
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            {options.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <Input
      ref={inputRef}
      type={type}
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className="h-6 border-none p-0 text-sm font-medium bg-transparent focus:ring-1 focus:ring-blue-500 focus:ring-offset-0 text-center min-w-0 w-full"
      step={step}
      min={min}
    />
  );
}
