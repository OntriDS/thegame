'use client';

import * as React from 'react';
import { Calendar as CalendarIcon, Clock, Repeat, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { format, addHours, isSameDay, addDays, nextSaturday, nextMonday, startOfToday } from 'date-fns';
import { FrequencyCalendar, FrequencyConfig } from '@/components/ui/frequency-calendar';
import SimpleTimePicker from '@/components/ui/simple-time-picker';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { getInteractiveZIndex } from '@/lib/utils/z-index-utils';

export interface ScheduleValue {
    dueDate?: Date;
    scheduledStart?: Date;
    scheduledEnd?: Date;
    frequencyConfig?: FrequencyConfig;
}

interface SmartSchedulerProps {
    value: ScheduleValue;
    onChange: (value: ScheduleValue) => void;
    className?: string;
    isRecurrent?: boolean;
}

export function SmartScheduler({
    value,
    onChange,
    className,
    isRecurrent = false,
}: SmartSchedulerProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [showFrequency, setShowFrequency] = React.useState(!!value.frequencyConfig);

    // Initialize showFrequency based on incoming value
    React.useEffect(() => {
        if (value.frequencyConfig && !showFrequency) {
            setShowFrequency(true);
        }
    }, [value.frequencyConfig]);

    const handleDateSelect = (date: Date | undefined) => {
        if (!date) return;

        // If we have a start time, preserve it
        let newStart = date;
        if (value.scheduledStart) {
            newStart = new Date(date);
            newStart.setHours(value.scheduledStart.getHours(), value.scheduledStart.getMinutes());
        }

        // If we have an end time, preserve its duration relative to start, or keep same time on new day
        let newEnd = value.scheduledEnd;
        if (value.scheduledEnd && value.scheduledStart) {
            const duration = value.scheduledEnd.getTime() - value.scheduledStart.getTime();
            newEnd = new Date(newStart.getTime() + duration);
        } else if (value.scheduledEnd) {
            // Just move end to new date if no start exists (unlikely but possible)
            newEnd = new Date(date);
            newEnd.setHours(value.scheduledEnd.getHours(), value.scheduledEnd.getMinutes());
        }

        onChange({
            ...value,
            dueDate: date, // Default due date to selected date
            scheduledStart: newStart,
            scheduledEnd: newEnd,
        });
    };

    const handleStartTimeChange = (timeStr: string) => {
        if (!timeStr) return;

        const [hours, minutes] = timeStr.split(':').map(Number);
        const baseDate = value.scheduledStart || value.dueDate || new Date();

        const newStart = new Date(baseDate);
        newStart.setHours(hours, minutes);

        // Smart End Time: Default to +1 hour if not set or if end is before new start
        let newEnd = value.scheduledEnd;
        if (!newEnd || newEnd <= newStart) {
            newEnd = addHours(newStart, 1);
        } else {
            // If end exists and is valid, keep the date synced if we changed the start date implicitly (not happening here, but good practice)
            const endBase = new Date(newStart);
            endBase.setHours(newEnd.getHours(), newEnd.getMinutes());
            newEnd = endBase;
        }

        onChange({
            ...value,
            dueDate: value.dueDate || baseDate, // Ensure due date is set if it wasn't
            scheduledStart: newStart,
            scheduledEnd: newEnd,
        });
    };

    const handleEndTimeChange = (timeStr: string) => {
        if (!timeStr) return;

        const [hours, minutes] = timeStr.split(':').map(Number);
        // Default to start date, or due date, or today
        const baseDate = value.scheduledEnd || value.scheduledStart || value.dueDate || new Date();

        const newEnd = new Date(baseDate);
        newEnd.setHours(hours, minutes);

        onChange({
            ...value,
            scheduledEnd: newEnd,
        });
    };

    const applyPreset = (preset: 'today' | 'tomorrow' | 'weekend' | 'next-week') => {
        let date = startOfToday();

        switch (preset) {
            case 'today':
                date = startOfToday();
                break;
            case 'tomorrow':
                date = addDays(startOfToday(), 1);
                break;
            case 'weekend':
                date = nextSaturday(startOfToday());
                break;
            case 'next-week':
                date = nextMonday(startOfToday());
                break;
        }

        // Default times for presets (e.g. 9am - 10am)
        const start = new Date(date);
        start.setHours(9, 0, 0, 0);
        const end = addHours(start, 1);

        onChange({
            ...value,
            dueDate: date,
            scheduledStart: start,
            scheduledEnd: end,
        });
    };

    const toggleFrequency = (checked: boolean) => {
        setShowFrequency(checked);
        if (!checked) {
            onChange({ ...value, frequencyConfig: undefined });
        } else {
            // Default frequency if none exists
            if (!value.frequencyConfig) {
                onChange({
                    ...value,
                    frequencyConfig: {
                        type: 1, // DAILY (assuming enum value, need to import enum to be safe, but using 1 for now or better: let FrequencyCalendar handle default)
                        interval: 1,
                        repeatMode: 'periodically'
                    } as any
                });
            }
        }
    };

    // Helper to format display
    const getSummaryText = () => {
        if (!value.dueDate && !value.scheduledStart) return 'Set Schedule';

        const dateStr = value.scheduledStart
            ? format(value.scheduledStart, 'MMM d')
            : (value.dueDate ? format(value.dueDate, 'MMM d') : '');

        const timeStr = value.scheduledStart
            ? `${format(value.scheduledStart, 'h:mm a')} - ${value.scheduledEnd ? format(value.scheduledEnd, 'h:mm a') : '...'}`
            : '';

        const freqStr = value.frequencyConfig ? ' (Repeat)' : '';

        return `${dateStr} ${timeStr}${freqStr}`;
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "w-full justify-start text-left font-normal h-auto py-2 px-3",
                        !value.dueDate && !value.scheduledStart && "text-muted-foreground",
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    <div className="flex flex-col items-start gap-0.5 overflow-hidden">
                        <span className="text-sm truncate w-full">{getSummaryText()}</span>
                        {value.frequencyConfig && (
                            <span className="text-[10px] text-muted-foreground flex items-center">
                                <Repeat className="w-3 h-3 mr-1" />
                                Recurring
                            </span>
                        )}
                    </div>
                </Button>
            </PopoverTrigger>
            <PopoverPrimitive.Portal>
                <PopoverContent
                    className={`w-[340px] p-4 ${getInteractiveZIndex('SUPRA_FIELDS')}`}
                    align="start"
                    side="bottom"
                    avoidCollisions={true}
                >
                    <div className="space-y-4">
                        {/* 1. Quick Presets */}
                        <div className="grid grid-cols-4 gap-2">
                            <Button variant="outline" size="sm" className="text-xs h-7 px-0" onClick={() => applyPreset('today')}>Today</Button>
                            <Button variant="outline" size="sm" className="text-xs h-7 px-0" onClick={() => applyPreset('tomorrow')}>Tmrw</Button>
                            <Button variant="outline" size="sm" className="text-xs h-7 px-0" onClick={() => applyPreset('weekend')}>Wknd</Button>
                            <Button variant="outline" size="sm" className="text-xs h-7 px-0" onClick={() => applyPreset('next-week')}>Next Wk</Button>
                        </div>

                        {/* 2. Time Selection */}
                        <div className="flex items-center gap-2">
                            <div className="flex-1 space-y-1">
                                <Label className="text-xs text-muted-foreground">Start Time</Label>
                                <SimpleTimePicker
                                    value={value.scheduledStart ? format(value.scheduledStart, 'HH:mm') : ''}
                                    onChange={handleStartTimeChange}
                                    placeholder="Start"
                                    className="w-full"
                                />
                            </div>
                            <div className="flex items-center pt-6 text-muted-foreground">-</div>
                            <div className="flex-1 space-y-1">
                                <Label className="text-xs text-muted-foreground">End Time</Label>
                                <SimpleTimePicker
                                    value={value.scheduledEnd ? format(value.scheduledEnd, 'HH:mm') : ''}
                                    onChange={handleEndTimeChange}
                                    placeholder="End"
                                    className="w-full"
                                />
                            </div>
                        </div>

                        {/* 3. Calendar */}
                        <div className="border rounded-md p-2 flex justify-center">
                            <Calendar
                                mode="single"
                                selected={value.scheduledStart || value.dueDate}
                                onSelect={handleDateSelect}
                                initialFocus
                            />
                        </div>

                        {/* 4. Recurrence Toggle */}
                        <div className="space-y-3 pt-2 border-t">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <Repeat className="w-4 h-4 text-muted-foreground" />
                                    <Label htmlFor="recurrence-mode" className="text-sm font-medium">Repeat Task</Label>
                                </div>
                                <Switch
                                    id="recurrence-mode"
                                    checked={showFrequency}
                                    onCheckedChange={toggleFrequency}
                                />
                            </div>

                            {showFrequency && (
                                <div className="pl-6 border-l-2 ml-2">
                                    <FrequencyCalendar
                                        value={value.frequencyConfig}
                                        onChange={(cfg) => onChange({ ...value, frequencyConfig: cfg })}
                                        allowAlways={isRecurrent}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="flex justify-between items-center pt-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs text-muted-foreground hover:text-destructive"
                                onClick={() => onChange({ dueDate: undefined, scheduledStart: undefined, scheduledEnd: undefined, frequencyConfig: undefined })}
                            >
                                Clear
                            </Button>
                            <Button size="sm" className="h-8 text-xs" onClick={() => setIsOpen(false)}>
                                Done
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </PopoverPrimitive.Portal>
        </Popover>
    );
}
