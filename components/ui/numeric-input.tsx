'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';

interface NumericInputProps {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: number | string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  title?: string;
}

// NumericInput allows free typing (including empty string) while keeping a numeric value in parent state.
export function NumericInput({ id, value, onChange, min = 0, step = 1, placeholder, className, disabled, title }: NumericInputProps) {
  const [raw, setRaw] = useState<string>(Number.isFinite(value) ? String(value) : '');
  const isEditingRef = useRef(false);

  useEffect(() => {
    if (!isEditingRef.current) {
      setRaw(Number.isFinite(value) ? String(value) : '');
    }
  }, [value]);

  return (
    <Input
      id={id}
      type="number"
      inputMode="decimal"
      min={min}
      step={step}
      value={raw}
      disabled={disabled}
      title={title}
      onFocus={() => { isEditingRef.current = true; }}
      onBlur={() => {
        isEditingRef.current = false;
        const parsed = parseFloat(raw);
        const normalized = isNaN(parsed) || parsed < min ? min : parsed;
        setRaw(String(normalized));
        onChange(normalized);
      }}
      onChange={(e) => {
        const next = e.target.value;
        setRaw(next);
        const parsed = parseFloat(next);
        if (!isNaN(parsed)) {
          onChange(parsed);
        }
      }}
      placeholder={placeholder}
      className={className}
    />
  );
}

export default NumericInput;


