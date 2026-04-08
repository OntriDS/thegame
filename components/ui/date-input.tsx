'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
// UTC STANDARDIZATION: Using new UTC utilities
import { formatForDisplay } from '@/lib/utils/date-display-utils';
import { parseDisplayDateToUTC } from '@/lib/utils/date-parsers';
import { startOfDayUTC } from '@/lib/utils/utc-utils';
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
      setInputValue(formatForDisplay(value));
      setIsValid(true);
    } else {
      setInputValue('');
      setIsValid(true);
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Don't trigger onChange during typing - only validate and show errors
    // Only call onChange when we have a complete, valid date
    if (!newValue) {
      setIsValid(true);
      return;
    }

    // Parse DD-MM-YY or DD-MM-YYYY format
    const dateMatch = newValue.match(/^(\d{1,2})-(\d{1,2})-(\d{2}|\d{4})$/);
    if (dateMatch) {
      const [, day, month, year] = dateMatch;
      const dayNum = parseInt(day, 10);
      const monthNum = parseInt(month, 10);
      let yearNum = parseInt(year, 10);
      
      // Handle 2-digit year (assume 2000s)
      if (year.length === 2) {
        yearNum += 2000;
      }

      // Validate date and create UTC date
      if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 1900) {
        // Create UTC date at midnight
        const utcDate = startOfDayUTC(new Date(Date.UTC(yearNum, monthNum - 1, dayNum)));
        // Validate the date is correct (handles edge cases like Feb 31)
        if (
          utcDate.getUTCDate() === dayNum &&
          utcDate.getUTCMonth() === monthNum - 1 &&
          utcDate.getUTCFullYear() === yearNum
        ) {
          setIsValid(true);
          onChange?.(utcDate);
          return;
        }
      }
    }

    setIsValid(false);
  };

  const handleBlur = () => {
    if (!inputValue) {
      // User intentionally cleared the field
      onChange?.(undefined);
      return;
    }
    if (!isValid && inputValue) {
      // Reset to last valid value on blur if invalid
      if (value) {
        setInputValue(formatForDisplay(value));
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
