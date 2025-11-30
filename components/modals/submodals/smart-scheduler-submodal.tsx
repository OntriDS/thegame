'use client';

import * as React from 'react';
import { Calendar as CalendarIcon, Clock, Repeat, ChevronDown, X, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { format, addHours, isSameDay, addDays, nextSaturday, nextMonday, startOfToday, isBefore } from 'date-fns';
import { FrequencyCalendar, FrequencyConfig } from '@/components/ui/frequency-calendar';
import SimpleTimePicker from '@/components/ui/simple-time-picker';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { getZIndexClass, getInteractiveSubModalZIndex } from '@/lib/utils/z-index-utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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
    const [activeTab, setActiveTab] = React.useState<'schedule' | 'deadline'>('schedule');
    const [defaultDuration, setDefaultDuration] = React.useState(1); // Default to 1 hour
    const [startHour, setStartHour] = React.useState(0); // Default start hour for dropdown

    // Initialize showFrequency based on incoming value
    React.useEffect(() => {
        if (value.frequencyConfig && !showFrequency) {
            setShowFrequency(true);
        }
    }, [value.frequencyConfig]);

    const handleScheduleDateSelect = (date: Date | undefined) => {
        if (!date) return;

        // Preserve time if exists
        let newStart = date;
        if (value.scheduledStart) {
            newStart = new Date(date);
            newStart.setHours(value.scheduledStart.getHours(), value.scheduledStart.getMinutes());
        } else {
            // Default to 9 AM if no time set
            newStart.setHours(9, 0, 0, 0);
        }

        // Smart End Time: Maintain duration or default to configured duration
        let newEnd = value.scheduledEnd;
        if (value.scheduledEnd && value.scheduledStart) {
            const duration = value.scheduledEnd.getTime() - value.scheduledStart.getTime();
            newEnd = new Date(newStart.getTime() + duration);
        } else {
            newEnd = addHours(newStart, defaultDuration);
        }

        // Smart Due Date: If due date is missing or before new start, sync it
        let newDueDate = value.dueDate;
        if (!newDueDate || (isBefore(newDueDate, newStart) && !isSameDay(newDueDate, newStart))) {
            newDueDate = newStart;
        }

        onChange({
            ...value,
            scheduledStart: newStart,
            scheduledEnd: newEnd,
            dueDate: newDueDate
        });
    };

    const handleDeadlineDateSelect = (date: Date | undefined) => {
        onChange({
            ...value,
            dueDate: date
        });
    };

    const handleStartTimeChange = (timeStr: string) => {
        if (!timeStr) return;

        const [hours, minutes] = timeStr.split(':').map(Number);
        const baseDate = value.scheduledStart || startOfToday();

        const newStart = new Date(baseDate);
        newStart.setHours(hours, minutes);

        // Smart End Time: Use default duration if not set or if end is before new start
        let newEnd = value.scheduledEnd;
        if (!newEnd || isBefore(newEnd, newStart)) {
            newEnd = addHours(newStart, defaultDuration);
        } else {
            // Keep end date synced to start date if it was on the same day
            if (value.scheduledEnd && isSameDay(value.scheduledStart || new Date(), value.scheduledEnd)) {
                const endBase = new Date(newStart);
                endBase.setHours(newEnd.getHours(), newEnd.getMinutes());
                newEnd = endBase;
            }
        }

        onChange({
            ...value,
            scheduledStart: newStart,
            scheduledEnd: newEnd,
            // Ensure due date is at least this day
            dueDate: (value.dueDate && isBefore(value.dueDate, newStart)) ? newStart : value.dueDate
        });
    };

    const handleEndTimeChange = (timeStr: string) => {
        if (!timeStr) return;

        const [hours, minutes] = timeStr.split(':').map(Number);
        const baseDate = value.scheduledEnd || value.scheduledStart || startOfToday();

        const newEnd = new Date(baseDate);
        newEnd.setHours(hours, minutes);

        onChange({
            ...value,
            scheduledEnd: newEnd,
        });
    };

    const applyPreset = (preset: 'today' | 'tomorrow' | 'next-week' | 'next-month' | 'due-date') => {
        let date = startOfToday();

        switch (preset) {
            case 'today':
                date = startOfToday();
                break;
            case 'tomorrow':
                date = addDays(startOfToday(), 1);
                break;
            case 'next-week':
                date = nextMonday(startOfToday());
                break;
            case 'next-month':
                date = addDays(startOfToday(), 30);
                break;
            case 'due-date':
                // Use the existing due date if available, otherwise use today
                date = value.dueDate || startOfToday();
                break;
        }

        // Default times for presets using default duration
        const start = new Date(date);
        start.setHours(9, 0, 0, 0);
        const end = addHours(start, defaultDuration);

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
            <DialogContent zIndexLayer="SUB_MODALS" className="w-[420px] max-w-[95vw] p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-4 pb-2">
                    <DialogTitle>Schedule Task</DialogTitle>
                    <DialogDescription>
                        Set work block and deadline.
                    </DialogDescription>
                </DialogHeader>

                <div className="px-4 pb-4 space-y-4">
                    {/* Tabs for Schedule vs Deadline */}
                    <div className="flex items-center border-b">
                        <button
                            className={cn(
                                "flex-1 pb-2 text-sm font-medium transition-colors",
                                activeTab === 'schedule' ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                            onClick={() => setActiveTab('schedule')}
                        >
                            Work Schedule
                        </button>
                        <button
                            className={cn(
                                "flex-1 pb-2 text-sm font-medium transition-colors",
                                activeTab === 'deadline' ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                            onClick={() => setActiveTab('deadline')}
                        >
                            Deadline {value.dueDate && <span className="ml-1 text-xs bg-muted px-1.5 rounded-full">{format(value.dueDate, 'MMM d')}</span>}
                        </button>
                    </div>

                    {activeTab === 'schedule' ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-200">
                            {/* 1. Quick Presets */}
                            <div className="grid grid-cols-5 gap-2">
                                <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => applyPreset('today')}>Today</Button>
                                <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => applyPreset('tomorrow')}>Tomorrow</Button>
                                <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => applyPreset('next-week')}>Next Week</Button>
                                <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => applyPreset('next-month')}>Next Month</Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-7"
                                    onClick={() => applyPreset('due-date')}
                                    disabled={!value.dueDate}
                                    title={value.dueDate ? `Schedule for ${format(value.dueDate, 'MMM d')}` : 'Set a due date first'}
                                >
                                    Due Date
                                </Button>
                            </div>

                            {/* 2. Time Selection */}
                            <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg border">
                                <div className="flex-1 space-y-1">
                                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Start</Label>
                                    <SimpleTimePicker
                                        value={value.scheduledStart ? format(value.scheduledStart, 'HH:mm') : ''}
                                        onChange={handleStartTimeChange}
                                        placeholder="Start"
                                        className="w-full h-8 text-sm bg-background"
                                        startHour={startHour}
                                    />
                                </div>
                                <ArrowRight className="w-4 h-4 text-muted-foreground mt-5" />
                                <div className="flex-1 space-y-1">
                                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">End</Label>
                                    <SimpleTimePicker
                                        value={value.scheduledEnd ? format(value.scheduledEnd, 'HH:mm') : ''}
                                        onChange={handleEndTimeChange}
                                        placeholder="End"
                                        className="w-full h-8 text-sm bg-background"
                                        startHour={startHour}
                                    />
                                </div>
                            </div>

                            {/* 3. Calendar */}
                            <div className="border rounded-md p-2 flex justify-center bg-background">
                                <Calendar
                                    mode="single"
                                    selected={value.scheduledStart}
                                    onSelect={handleScheduleDateSelect}
                                    initialFocus
                                    className="rounded-md border shadow-sm"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200 min-h-[300px]">
                            <div className="space-y-2">
                                <Label>Due Date (Deadline)</Label>
                                <div className="text-xs text-muted-foreground mb-2">
                                    {isRecurrent
                                        ? "For recurring tasks, this acts as the safety limit (stop date)."
                                        : "The absolute deadline for this task."}
                                </div>
                                <div className="border rounded-md p-2 flex justify-center bg-background">
                                    <Calendar
                                        mode="single"
                                        selected={value.dueDate}
                                        onSelect={handleDeadlineDateSelect}
                                        initialFocus
                                        className="rounded-md border shadow-sm"
                                    />
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => handleDeadlineDateSelect(value.scheduledStart)}
                                    disabled={!value.scheduledStart}
                                >
                                    Sync with Schedule Date
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* 4. Recurrence Toggle - Always visible */}
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
                                    popoverZIndex={getInteractiveSubModalZIndex()}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="flex justify-between sm:justify-between items-center w-full p-4 bg-muted/20 border-t">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-muted-foreground hover:text-destructive"
                            onClick={() => onChange({ dueDate: undefined, scheduledStart: undefined, scheduledEnd: undefined, frequencyConfig: undefined })}
                        >
                            Clear
                        </Button>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-2">
                            <span>Default:</span>
                            <select
                                value={defaultDuration}
                                onChange={(e) => setDefaultDuration(Number(e.target.value))}
                                className="h-7 px-2 rounded border bg-background text-foreground text-xs"
                            >
                                <option value={0.5}>30 min</option>
                                <option value={1}>1 hour</option>
                                <option value={1.5}>1.5 hours</option>
                                <option value={2}>2 hours</option>
                                <option value={3}>3 hours</option>
                                <option value={4}>4 hours</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span>Start:</span>
                            <select
                                value={startHour}
                                onChange={(e) => setStartHour(Number(e.target.value))}
                                className="h-7 px-2 rounded border bg-background text-foreground text-xs"
                            >
                                <option value={0}>12 AM</option>
                                <option value={6}>6 AM</option>
                                <option value={7}>7 AM</option>
                                <option value={8}>8 AM</option>
                                <option value={9}>9 AM</option>
                                <option value={12}>12 PM</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>
                            Done
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
