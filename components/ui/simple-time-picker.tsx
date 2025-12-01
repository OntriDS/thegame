'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronUp, ChevronDown, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SimpleTimePickerProps {
  value: string; // Format: "HH:mm" (24-hour for internal storage)
  onChange: (value: string) => void; // Receives "HH:mm" format
  placeholder?: string;
  className?: string;
  startHour?: number; // Starting hour for dropdown (0-23), default 0 (midnight)
}

// Common time intervals in 30-minute increments
const TIME_OPTIONS = [
  '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM',
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM',
  '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM'
];

// Convert 12-hour format to 24-hour format
const to24Hour = (time12: string): string => {
  const [time, period] = time12.split(' ');
  const [hours, minutes] = time.split(':');
  let hour24 = parseInt(hours, 10);

  if (period === 'PM' && hour24 !== 12) {
    hour24 += 12;
  } else if (period === 'AM' && hour24 === 12) {
    hour24 = 0;
  }

  return `${hour24.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}`;
};

// Convert 24-hour format to 12-hour format
const to12Hour = (time24: string): string => {
  if (!time24 || !time24.includes(':')) return '';

  const [hours, minutes] = time24.split(':');
  let hour24 = parseInt(hours, 10);
  const minute = minutes.padStart(2, '0');

  let period = 'AM';
  let hour12 = hour24;

  if (hour24 === 0) {
    hour12 = 12;
    period = 'AM';
  } else if (hour24 < 12) {
    hour12 = hour24;
    period = 'AM';
  } else if (hour24 === 12) {
    hour12 = 12;
    period = 'PM';
  } else {
    hour12 = hour24 - 12;
    period = 'PM';
  }

  return `${hour12}:${minute} ${period}`;
};

// Robust time parsing logic
const parseTimeInput = (input: string): string | null => {
  if (!input) return null;

  const clean = input.toLowerCase().replace(/\s/g, '');

  // Regex patterns
  const timeRegex = /^(\d{1,2})(?::?(\d{2}))?\s*(a|p|am|pm)?$/;
  const match = clean.match(timeRegex);

  if (!match) return null;

  let [_, hStr, mStr, period] = match;
  let hours = parseInt(hStr, 10);
  let minutes = mStr ? parseInt(mStr, 10) : 0;

  if (!mStr && hStr.length >= 3) {
    // e.g. "830" -> h=8, m=30; "1400" -> h=14, m=00
    if (hStr.length === 3) {
      hours = parseInt(hStr.substring(0, 1), 10);
      minutes = parseInt(hStr.substring(1), 10);
    } else {
      hours = parseInt(hStr.substring(0, 2), 10);
      minutes = parseInt(hStr.substring(2), 10);
    }
  }

  // Validation
  if (minutes >= 60) return null;
  if (hours > 24) return null;

  // AM/PM logic
  if (period) {
    if (period.startsWith('p') && hours < 12) hours += 12;
    if (period.startsWith('a') && hours === 12) hours = 0;
  }

  // Clamp 24h
  if (hours === 24) hours = 0;
  if (hours > 23) return null;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

export default function SimpleTimePicker({ value, onChange, placeholder = "Select time...", className, startHour = 0 }: SimpleTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reorder TIME_OPTIONS based on startHour
  const orderedTimeOptions = React.useMemo(() => {
    // Find the index of the first option that matches or exceeds startHour
    const startIndex = TIME_OPTIONS.findIndex(option => {
      const time24 = to24Hour(option);
      const hour = parseInt(time24.split(':')[0], 10);
      return hour >= startHour;
    });

    if (startIndex === -1 || startIndex === 0) return TIME_OPTIONS;

    // Rotate the array to start at startIndex
    return [...TIME_OPTIONS.slice(startIndex), ...TIME_OPTIONS.slice(0, startIndex)];
  }, [startHour]);

  // Initialize display value from prop
  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setDisplayValue(to12Hour(value));
    }
  }, [value]);

  // Find closest time option
  const getCurrentIndex = useCallback(() => {
    return TIME_OPTIONS.findIndex(option => to24Hour(option) === value);
  }, [value]);

  const currentIndex = getCurrentIndex();

  const handleSelect = (time12: string) => {
    const time24 = to24Hour(time12);
    onChange(time24);
    setDisplayValue(time12);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayValue(e.target.value);
    setIsOpen(true);
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (document.activeElement && containerRef.current?.contains(document.activeElement)) {
        return;
      }

      const parsed = parseTimeInput(displayValue);
      if (parsed) {
        onChange(parsed);
        setDisplayValue(to12Hour(parsed));
      } else {
        setDisplayValue(to12Hour(value));
      }
      setIsOpen(false);
    }, 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  return (
    <div className={cn("relative group", className)} ref={containerRef}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={displayValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pr-8 font-mono text-sm"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-2 text-muted-foreground hover:text-foreground"
          onClick={() => {
            if (isOpen) {
              setIsOpen(false);
            } else {
              inputRef.current?.focus();
              setIsOpen(true);
            }
          }}
          tabIndex={-1}
        >
          <Clock className="h-4 w-4" />
        </Button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
          <div className="p-1">
            <div className="grid grid-cols-1 gap-0.5">
              {orderedTimeOptions.map((time) => {
                const time24 = to24Hour(time);
                const isSelected = time24 === value;

                return (
                  <button
                    key={time}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(time);
                    }}
                    className={cn(
                      "px-2 py-1.5 text-xs text-left rounded hover:bg-accent transition-colors",
                      isSelected && "bg-primary text-primary-foreground hover:bg-primary"
                    )}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}