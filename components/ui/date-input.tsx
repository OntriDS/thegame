'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { formatDisplayDate, parseInputDate } from '@/lib/utils/date-utils';
import { cn } from '@/lib/utils';

interface DateInputProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DateInput({
  value,
  onChange,
  placeholder = 'DD-MM-YYYY',
  className,
  disabled = false,
}: DateInputProps) {
  const [inputValue, setInputValue] = React.useState('');
  const [isValid, setIsValid] = React.useState(true);

  // Update input value when value prop changes
  React.useEffect(() => {
    if (value) {
      setInputValue(formatDisplayDate(value));
      setIsValid(true);
    } else {
      setInputValue('');
      setIsValid(true);
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    if (!newValue) {
      setIsValid(true);
      onChange?.(undefined);
      return;
    }

    // Parse DD-MM-YYYY format
    const dateMatch = newValue.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (dateMatch) {
      const [, day, month, year] = dateMatch;
      const dayNum = parseInt(day, 10);
      const monthNum = parseInt(month, 10);
      const yearNum = parseInt(year, 10);

      // Validate date
      if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 1900) {
        const date = new Date(yearNum, monthNum - 1, dayNum);
        if (date.getDate() === dayNum && date.getMonth() === monthNum - 1 && date.getFullYear() === yearNum) {
          setIsValid(true);
          onChange?.(date);
          return;
        }
      }
    }

    setIsValid(false);
  };

  const handleBlur = () => {
    if (!isValid && inputValue) {
      // Reset to last valid value on blur if invalid
      if (value) {
        setInputValue(formatDisplayDate(value));
        setIsValid(true);
      } else {
        setInputValue('');
        setIsValid(true);
      }
    }
  };

  return (
    <Input
      type="text"
      value={inputValue}
      onChange={handleInputChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        'w-32',
        !isValid && 'border-red-500 focus:border-red-500',
        className
      )}
    />
  );
}
