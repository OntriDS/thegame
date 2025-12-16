'use client';

import * as React from 'react';
import { Calendar as CalendarIcon, Clock, Repeat, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { format, addHours, isSameDay, addDays, nextSaturday, nextMonday, startOfToday } from 'date-fns';
import { FrequencyCalendar, FrequencyConfig } from '@/components/ui/frequency-calendar';
import SimpleTimePicker from '@/components/ui/simple-time-picker';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { getZIndexClass } from '@/lib/utils/z-index-utils';

export interface ScheduleValue {
    dueDate?: Date;
    scheduledStart?: Date;
    scheduledEnd?: Date;
    frequencyConfig?: FrequencyConfig;
}

interface SmartSchedulerSubmodalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    value: ScheduleValue;
    onChange: (value: ScheduleValue) => void;
    isRecurrent?: boolean;
}

export function SmartSchedulerSubmodal({
    open,
    onOpenChange,
    value,
    onChange,
    isRecurrent = false,
}: SmartSchedulerSubmodalProps) {
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
                        type: 1, // DAILY
                        interval: 1,
                        repeatMode: 'periodically'
                    } as any
                });
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent zIndexLayer="SUB_MODALS" className="w-[400px] max-w-[90vw]">
                <DialogHeader>
                    <DialogTitle>Set Schedule</DialogTitle>
                    <DialogDescription>
                        Configure date, time, and recurrence.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* 1. Quick Presets */}
                    <div className="grid grid-cols-4 gap-2">
                        <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => applyPreset('today')}>Today</Button>
                        <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => applyPreset('tomorrow')}>Tomorrow</Button>
                        <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => applyPreset('weekend')}>Weekend</Button>
                        <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => applyPreset('next-week')}>Next Week</Button>
                    </div>

                    {/* 2. Time Selection */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Start Time</Label>
                            <SimpleTimePicker
                                value={value.scheduledStart ? format(value.scheduledStart, 'HH:mm') : ''}
                                onChange={handleStartTimeChange}
                                placeholder="Start"
                                className="w-full"
                            />
                        </div>
                        <div className="flex items-center pt-6 text-muted-foreground">-</div>
                        <div className="flex-1 space-y-1.5">
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
                </div>

                <DialogFooter className="flex justify-between sm:justify-between items-center w-full">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => onChange({ dueDate: undefined, scheduledStart: undefined, scheduledEnd: undefined, frequencyConfig: undefined })}
                    >
                        Clear Schedule
                    </Button>
                    <Button size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
