'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown } from 'lucide-react';
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

export default function SimpleTimePicker({ value, onChange, placeholder = "Select time...", className }: SimpleTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState<string>('');

  // Initialize display value from prop
  useEffect(() => {
    setDisplayValue(to12Hour(value));
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

  const handlePrevious = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : TIME_OPTIONS.length - 1;
    handleSelect(TIME_OPTIONS[newIndex]);
  };

  const handleNext = () => {
    const newIndex = currentIndex < TIME_OPTIONS.length - 1 ? currentIndex + 1 : 0;
    handleSelect(TIME_OPTIONS[newIndex]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      handlePrevious();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      handleNext();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className={cn("relative", className)}>
      {/* Main Button - Large Click Target */}
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-32 h-10 justify-between text-sm font-mono px-3",
          !displayValue && "text-muted-foreground"
        )}
      >
        <span>{displayValue || placeholder}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 bg-background border rounded-md shadow-lg max-h-80 overflow-auto">
          <div className="py-1">
            {/* Quick Select Header */}
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground border-b">
              Quick Times
            </div>

            {/* Time Options Grid */}
            <div className="grid grid-cols-3 gap-1 px-2 py-2">
              {TIME_OPTIONS.map((time) => {
                const time24 = to24Hour(time);
                const isSelected = time24 === value;

                return (
                  <button
                    key={time}
                    type="button"
                    onClick={() => handleSelect(time)}
                    className={cn(
                      "px-2 py-1.5 text-xs rounded hover:bg-accent transition-colors",
                      isSelected && "bg-primary text-primary-foreground hover:bg-primary"
                    )}
                  >
                    {time}
                  </button>
                );
              })}
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center justify-between px-3 py-2 border-t">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handlePrevious}
                className="h-6 w-6 p-0"
                title="Previous time (↑/←)"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>

              <span className="text-xs text-muted-foreground">
                {currentIndex + 1} / {TIME_OPTIONS.length}
              </span>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleNext}
                className="h-6 w-6 p-0"
                title="Next time (↓/→)"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}