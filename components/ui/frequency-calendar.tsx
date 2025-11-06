'use client';

import * as React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { DateInput } from '@/components/ui/date-input';
import { RecurrentFrequency } from '@/types/enums';
import { formatDisplayDate, formatInputDate } from '@/lib/utils/date-utils';
import { getInteractiveInnerModalZIndex, getInteractiveSubModalZIndex } from '@/lib/utils/z-index-utils';

export interface FrequencyConfig {
  type: RecurrentFrequency;
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  customDays?: Date[];
  stopsAfter?: {
    type: 'times' | 'date';
    value: number | Date;
  };
  repeatMode: 'after_done' | 'periodically';
}

interface FrequencyCalendarProps {
  value?: FrequencyConfig;
  onChange?: (config: FrequencyConfig | undefined) => void;
  className?: string;
  allowAlways?: boolean; // Only allow ALWAYS for Recurrent Parent
}

export function FrequencyCalendar({
  value,
  onChange,
  className,
  allowAlways = false,
}: FrequencyCalendarProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [config, setConfig] = React.useState<FrequencyConfig>(
    value || {
      type: RecurrentFrequency.ONCE,
      interval: 1,
      repeatMode: 'periodically',
    }
  );
  const [customDays, setCustomDays] = React.useState<Date[]>([]);

  const handleDateSelect = (days: Date[] | Date | undefined) => {
    let safe: Date[];
    if (Array.isArray(days)) {
      safe = days;
    } else if (days) {
      safe = [days];
    } else {
      safe = [];
    }
    
    setCustomDays(safe);
    handleConfigChange({ customDays: safe });
    // Only close for single selection (Daily, Weekly, Monthly), keep open for Custom
    if (config.type !== RecurrentFrequency.CUSTOM) {
      setIsOpen(false);
    }
  };

  React.useEffect(() => {
    if (value) {
      // Convert customDays strings to Date objects if needed (from JSON serialization)
      const normalizedConfig = { ...value };
      if (normalizedConfig.customDays && Array.isArray(normalizedConfig.customDays)) {
        normalizedConfig.customDays = normalizedConfig.customDays.map((day: any) => {
          if (day instanceof Date) {
            return day;
          }
          if (typeof day === 'string') {
            const date = new Date(day);
            return isNaN(date.getTime()) ? null : date;
          }
          return day;
        }).filter((day: any) => day instanceof Date && !isNaN(day.getTime())) as Date[];
      }
      
      // Also normalize stopsAfter.value if it's a date string
      if (normalizedConfig.stopsAfter?.type === 'date' && normalizedConfig.stopsAfter.value) {
        if (typeof normalizedConfig.stopsAfter.value === 'string') {
          const date = new Date(normalizedConfig.stopsAfter.value);
          if (!isNaN(date.getTime())) {
            normalizedConfig.stopsAfter.value = date;
          }
        }
      }
      
      setConfig(normalizedConfig);
      setCustomDays(normalizedConfig.customDays || []);
    }
  }, [value]);

  const handleConfigChange = (newConfig: Partial<FrequencyConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    onChange?.(updated);
  };

  const getPreviewText = () => {
    switch (config.type) {
      case RecurrentFrequency.ONCE:
        return 'Once';
      case RecurrentFrequency.ALWAYS:
        return 'Always';
      case RecurrentFrequency.DAILY:
        return `Every ${config.interval} day${config.interval > 1 ? 's' : ''}`;
      case RecurrentFrequency.WEEKLY:
        return `Every ${config.interval} week${config.interval > 1 ? 's' : ''}`;
      case RecurrentFrequency.MONTHLY:
        return `Every ${config.interval} month${config.interval > 1 ? 's' : ''}`;
      case RecurrentFrequency.CUSTOM:
        return `${customDays.length} custom day${customDays.length !== 1 ? 's' : ''} selected`;
      default:
        return 'Select frequency';
    }
  };

  const getRepeatModeText = () => {
    return config.repeatMode === 'after_done' ? 'After Done' : 'Periodically';
  };

  const getStopsAfterText = () => {
    if (!config.stopsAfter) return 'Never';
    if (config.stopsAfter.type === 'times') {
      return `After ${config.stopsAfter.value} times`;
    }
    // Ensure value is a Date object before formatting
    const dateValue = config.stopsAfter.value instanceof Date 
      ? config.stopsAfter.value 
      : typeof config.stopsAfter.value === 'string' 
        ? new Date(config.stopsAfter.value) 
        : new Date();
    return `Until ${formatDisplayDate(dateValue)}`;
  };

  return (
    <div className={cn('space-y-4', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal h-8 text-sm',
              !config && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {getPreviewText()}
          </Button>
        </PopoverTrigger>
        <PopoverPrimitive.Portal>
          <PopoverContent 
            className={`w-80 p-3 ${getInteractiveInnerModalZIndex()}`} 
            align="start"
            side="bottom"
            avoidCollisions={true}
            collisionPadding={8}
          >
            <div className="space-y-3">
              {/* Header */}
              <div className="text-sm font-medium">Frequency</div>
              
              {/* 1. Frequency Type - Top */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Frequency Type</Label>
                <Select
                  value={String(config.type)}
                  onValueChange={(val) =>
                    handleConfigChange({ type: val as unknown as RecurrentFrequency })
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={getInteractiveSubModalZIndex()}>
                    <SelectItem value={String(RecurrentFrequency.ONCE)}>Once</SelectItem>
                    <SelectItem value={String(RecurrentFrequency.DAILY)}>Daily</SelectItem>
                    <SelectItem value={String(RecurrentFrequency.WEEKLY)}>Weekly</SelectItem>
                    <SelectItem value={String(RecurrentFrequency.MONTHLY)}>Monthly</SelectItem>
                    <SelectItem value={String(RecurrentFrequency.CUSTOM)}>Custom</SelectItem>
                    {allowAlways && <SelectItem value={String(RecurrentFrequency.ALWAYS)}>Always</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              {/* 2. Day Selection - Show for Daily, Weekly, Monthly, and Custom */}
              {(config.type === RecurrentFrequency.DAILY || config.type === RecurrentFrequency.WEEKLY || config.type === RecurrentFrequency.MONTHLY || config.type === RecurrentFrequency.CUSTOM) && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {config.type === RecurrentFrequency.DAILY ? 'Starting Day' :
                     config.type === RecurrentFrequency.WEEKLY ? 'Starting Day of Week' :
                     config.type === RecurrentFrequency.MONTHLY ? 'Starting Day of Month' :
                     'Select Custom Days'}
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start h-8 text-sm">
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {config.type === RecurrentFrequency.DAILY ? 
                          (customDays.length > 0 && customDays[0] instanceof Date ? customDays[0].toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : 'Select starting day') :
                         config.type === RecurrentFrequency.WEEKLY ?
                          (customDays.length > 0 && customDays[0] instanceof Date ? customDays[0].toLocaleDateString('en-US', { weekday: 'long' }) : 'Select starting day of week') :
                         config.type === RecurrentFrequency.MONTHLY ? 
                          (customDays.length > 0 && customDays[0] instanceof Date ? `Day ${customDays[0].getDate()}` : 'Select starting day of month') :
                          (customDays.length > 0 ? `${customDays.length} day${customDays.length !== 1 ? 's' : ''} selected` : 'Select custom days')
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverPrimitive.Portal>
                      <PopoverContent 
                        className={`p-0 ${getInteractiveSubModalZIndex()}`}
                        align="start"
                        side="bottom"
                        avoidCollisions={true}
                        sideOffset={-28}
                        alignOffset={4}
                        >
                        <div className="w-[280px] min-h-[320px]">
                          {config.type === RecurrentFrequency.CUSTOM ? (
                            <Calendar
                              mode="multiple"
                              selected={customDays}
                              onSelect={handleDateSelect}
                              className="rounded-md border"
                              modifiersClassNames={{
                                selected: 'bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground',
                              }}
                            />
                          ) : (
                            <Calendar
                              mode="single"
                              selected={customDays.length > 0 ? customDays[0] : undefined}
                              onSelect={handleDateSelect}
                              className="rounded-md border"
                              modifiersClassNames={{
                                selected: 'bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground',
                              }}
                            />
                          )}
                        </div>
                      </PopoverContent>
                    </PopoverPrimitive.Portal>
                  </Popover>
                </div>
              )}

              {/* 3. Interval and Repeat Mode Row */}
              <div className="grid grid-cols-2 gap-3">
                {/* Interval */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Interval</Label>
                  {config.type === RecurrentFrequency.ONCE || config.type === RecurrentFrequency.ALWAYS ? (
                    <div className="h-8 flex items-center text-xs text-muted-foreground">
                      {config.type === RecurrentFrequency.ONCE ? 'N/A' : 'Continuous'}
                    </div>
                  ) : config.type !== RecurrentFrequency.CUSTOM ? (
                    <NumericInput
                      min={1}
                      value={config.interval}
                      onChange={(value) =>
                        handleConfigChange({
                          interval: Math.floor(value) || 1,
                        })
                      }
                      className="h-8 text-sm"
                    />
                  ) : (
                    <div className="h-8 flex items-center text-xs text-muted-foreground">
                      Custom
                    </div>
                  )}
                </div>

                {/* Repeat Mode */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Repeat Mode</Label>
                  {config.type === RecurrentFrequency.ONCE || config.type === RecurrentFrequency.ALWAYS ? (
                    <div className="h-8 flex items-center text-xs text-muted-foreground">
                      {config.type === RecurrentFrequency.ONCE ? 'N/A' : 'Continuous'}
                    </div>
                  ) : (
                    <Select
                      value={config.repeatMode}
                      onValueChange={(val) =>
                        handleConfigChange({
                          repeatMode: val as 'after_done' | 'periodically',
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={getInteractiveSubModalZIndex()}>
                        <SelectItem value="periodically">Periodically</SelectItem>
                        <SelectItem value="after_done">After Done</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* 4. Stops After Row */}
              <div className="grid grid-cols-2 gap-3">
                {/* Stops After Type */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Stops After</Label>
                  {config.type === RecurrentFrequency.ONCE || config.type === RecurrentFrequency.ALWAYS ? (
                    <div className="h-8 flex items-center text-xs text-muted-foreground">
                      {config.type === RecurrentFrequency.ONCE ? 'N/A' : 'Never'}
                    </div>
                  ) : (
                    <Select
                      value={config.stopsAfter?.type || 'never'}
                      onValueChange={(val) => {
                        if (val === 'never') {
                          handleConfigChange({ stopsAfter: undefined });
                        } else {
                          handleConfigChange({
                            stopsAfter: {
                              type: val as 'times' | 'date',
                              value: val === 'times' ? 10 : new Date(),
                            },
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={getInteractiveSubModalZIndex()}>
                        <SelectItem value="never">Never</SelectItem>
                        <SelectItem value="times">After X times</SelectItem>
                        <SelectItem value="date">Until date</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Additional inputs for Stops After */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {config.type === RecurrentFrequency.ONCE || config.type === RecurrentFrequency.ALWAYS ? 'Value' :
                     config.stopsAfter?.type === 'times' ? 'Number of times' : 
                     config.stopsAfter?.type === 'date' ? 'Until date' : 'Value'}
                  </Label>
                  {config.type === RecurrentFrequency.ONCE || config.type === RecurrentFrequency.ALWAYS ? (
                    <div className="h-8 flex items-center text-xs text-muted-foreground">
                      {config.type === RecurrentFrequency.ONCE ? 'N/A' : 'Continuous'}
                    </div>
                  ) : config.stopsAfter?.type === 'times' ? (
                    <NumericInput
                      min={1}
                      value={config.stopsAfter.value as number}
                      onChange={(value) =>
                        handleConfigChange({
                          stopsAfter: {
                            type: 'times',
                            value: Math.floor(value) || 1,
                          },
                        })
                      }
                      className="h-8 text-sm"
                    />
                  ) : config.stopsAfter?.type === 'date' ? (
                    <DateInput
                      value={
                        config.stopsAfter.value instanceof Date
                          ? config.stopsAfter.value
                          : typeof config.stopsAfter.value === 'string'
                            ? new Date(config.stopsAfter.value)
                            : new Date()
                      }
                      onChange={(date) =>
                        handleConfigChange({
                          stopsAfter: {
                            type: 'date',
                            value: date || new Date(),
                          },
                        })
                      }
                      className="h-8 text-sm"
                    />
                  ) : (
                    <div className="h-8 flex items-center text-xs text-muted-foreground">
                      Never
                    </div>
                  )}
                </div>
              </div>

              {/* 5. Action Buttons */}
              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    handleConfigChange({ customDays });
                    setIsOpen(false);
                  }}
                  className="h-7 text-xs"
                >
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
        </PopoverPrimitive.Portal>
      </Popover>

      {/* Preview */}
      <div className="text-xs text-muted-foreground space-y-1">
        <div>Mode: {getRepeatModeText()}</div>
        <div>Stops: {getStopsAfterText()}</div>
      </div>
    </div>
  );
}