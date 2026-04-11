'use client';

import * as React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { formatForDisplay } from '@/lib/utils/date-display-utils';
import {
  getBrowserTimezone,
  getUserTimezone,
  startOfCalendarDayInTimezone,
} from '@/lib/utils/user-timezone';
import { getInteractiveZIndex } from '@/lib/utils/z-index-utils';

interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  className,
  disabled = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      onChange?.(undefined);
      setOpen(false);
      return;
    }
    // react-day-picker: start of selected day in browser local time (correct UTC instant).
    const browserTz = getBrowserTimezone();
    const userTz = getUserTimezone();
    const y = date.getFullYear();
    const m = date.getMonth();
    const d = date.getDate();
    const stored =
      browserTz === userTz
        ? new Date(date.getTime())
        : startOfCalendarDayInTimezone(y, m, d, userTz);
    onChange?.(stored);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal h-8 text-sm',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? formatForDisplay(value) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverPrimitive.Portal>
        <PopoverContent
          className={`p-0 ${getInteractiveZIndex('SUPRA_FIELDS')}`}
          align="start"
          side="bottom"
          avoidCollisions={true}
          sideOffset={-28}
          alignOffset={4}
        >
          <div className="w-[280px] min-h-[320px]">
            <Calendar
              mode="single"
              selected={value}
              onSelect={handleDateSelect}
              modifiersClassNames={{
                selected: 'bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground',
              }}
            />
          </div>
        </PopoverContent>
      </PopoverPrimitive.Portal>
    </Popover>
  );
}
