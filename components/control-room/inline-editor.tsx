'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collection } from '@/types/enums';

interface InlineEditorProps {
  value: string | number;
  field: string;
  itemId: string;
  onSave: (itemId: string, field: string, value: any) => Promise<void> | void;
  onCancel: () => void;
  onNavigateNextItem?: () => void;
  onNavigatePreviousItem?: () => void;
  onNavigateNextField?: () => void;
  onNavigatePreviousField?: () => void;
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
  onNavigateNextItem,
  onNavigatePreviousItem,
  onNavigateNextField,
  onNavigatePreviousField,
  type = 'text',
  options = [],
  step = '0.01',
  min = '0'
}: InlineEditorProps) {
  const [editValue, setEditValue] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLButtonElement>(null);
  const isSavingRef = useRef(false);
  const hasSubmittedRef = useRef(false);

  useEffect(() => {
    if (type === 'select') {
      selectRef.current?.focus();
    } else {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [type]);

  useEffect(() => {
    setEditValue(value.toString());
    isSavingRef.current = false;
    hasSubmittedRef.current = false;
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      const navigateNext = !e.shiftKey;
      void handleSave().then((didSave) => {
        if (!didSave) return;
        if (navigateNext && onNavigateNextItem) {
          onNavigateNextItem();
        } else if (!navigateNext && onNavigatePreviousItem) {
          onNavigatePreviousItem();
        }
      });
    } else if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      const navigateNext = !e.shiftKey;
      void handleSave().then((didSave) => {
        if (!didSave) return;
        if (navigateNext && onNavigateNextField) {
          onNavigateNextField();
        } else if (!navigateNext && onNavigatePreviousField) {
          onNavigatePreviousField();
        }
      });
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleCancel = () => {
    isSavingRef.current = false;
    hasSubmittedRef.current = false;
    onCancel();
  };

  const handleSave = async (): Promise<boolean> => {
    if (isSavingRef.current || hasSubmittedRef.current) return false;

    isSavingRef.current = true;
    hasSubmittedRef.current = true;

    let finalValue: any = editValue;
    
    if (type === 'number') {
      finalValue = parseFloat(editValue) || 0;
    } else if (type === 'select') {
      finalValue = editValue === 'none' ? undefined : editValue;
    }
    
    try {
      await onSave(itemId, field, finalValue);
      return true;
    } catch (error) {
      hasSubmittedRef.current = false;
      return false;
    } finally {
      isSavingRef.current = false;
    }
    return false;
  };

  const handleBlur = () => {
    if (isSavingRef.current || hasSubmittedRef.current) return;
    void handleSave();
  };

  const handleSelectOpenChange = (open: boolean) => {
    if (!open) {
      // When dropdown closes, ensure we save and cleanup
      setTimeout(() => {
        void handleSave();
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
