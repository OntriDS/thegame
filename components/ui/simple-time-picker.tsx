'use client';

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
}

// Common time intervals in 30-minute increments
const TIME_OPTIONS = [
  '12:00 AM', '12:30 AM', '1:00 AM', '1:30 AM', '2:00 AM', '2:30 AM', '3:00 AM', '3:30 AM',
  '4:00 AM', '4:30 AM', '5:00 AM', '5:30 AM', '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM',
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM',
  '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM'
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

  // Handle "840" case (hStr captures 840 if no separator) - wait, regex above expects separator or separate groups
  // Let's refine regex for "840" case: ^(\d{1,2})(\d{2})\s*(a|p|am|pm)?$
  // Actually, simpler to handle numeric only specially

  if (!mStr && hStr.length >= 3) {
    // e.g. "830" -> h=8, m=30; "1400" -> h=14, m=0
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
  if (hours > 24) return null; // Allow 24h input

  // AM/PM logic
  if (period) {
    if (period.startsWith('p') && hours < 12) hours += 12;
    if (period.startsWith('a') && hours === 12) hours = 0;
  } else {
    // Guess AM/PM if ambiguous? No, standard behavior is 24h or AM if < 12 usually, but let's stick to 24h interpretation if no AM/PM
    // Exception: "8" usually means 8:00 (AM), "20" means 8:00 PM.
    // If user types "2", do they mean 2 AM or 2 PM? 24h standard says 2 AM.
  }

  // Clamp 24h
  if (hours === 24) hours = 0;
  if (hours > 23) return null;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

export default function SimpleTimePicker({ value, onChange, placeholder = "Select time...", className }: SimpleTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize display value from prop
  useEffect(() => {
    // Only update display value from prop if we're not currently editing (focused)
    // Actually, we should update it if the prop changes externally, but we need to be careful not to overwrite user typing.
    // For now, simple sync.
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
    setIsOpen(true); // Open dropdown while typing to show options? Or maybe not. Let's keep it open if they click.
  };

  const handleBlur = () => {
    // Small delay to allow click on dropdown items to register
    setTimeout(() => {
      if (document.activeElement && containerRef.current?.contains(document.activeElement)) {
        return;
      }

      const parsed = parseTimeInput(displayValue);
      if (parsed) {
        onChange(parsed);
        setDisplayValue(to12Hour(parsed));
      } else {
        // Revert to valid value if invalid
        setDisplayValue(to12Hour(value));
      }
      setIsOpen(false);
    }, 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur(); // Trigger blur logic
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
          tabIndex={-1} // Skip tab index as input handles focus
        >
          <Clock className="h-4 w-4" />
        </Button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
          <div className="p-1">
            {/* Time Options Grid */}
            <div className="grid grid-cols-1 gap-0.5">
              {TIME_OPTIONS.map((time) => {
                const time24 = to24Hour(time);
                const isSelected = time24 === value;

                // Filter options if typing? Optional, but nice.
                // For now, just show all or maybe scroll to closest?

                return (
                  <button
                    key={time}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent blur on input
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