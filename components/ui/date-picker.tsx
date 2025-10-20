'use client';

import * as React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { formatDisplayDate } from '@/lib/utils/date-utils';
import { getInteractiveZIndex } from '@/lib/utils/z-index-utils';

interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const handleDateSelect = (date: Date | undefined) => {
    onChange?.(date);
    setOpen(false); // Close the popover when date is selected
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal h-8 text-sm',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? formatDisplayDate(value) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverPrimitive.Portal>
        <PopoverContent 
          className={`p-0 ${getInteractiveZIndex('DROPDOWNS')}`} 
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
