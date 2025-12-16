'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import SimpleTimePicker from '@/components/ui/simple-time-picker';
import { FrequencyCalendar, FrequencyConfig } from '@/components/ui/frequency-calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Repeat, ArrowRight } from 'lucide-react';
import { format, addHours, isBefore, startOfDay } from 'date-fns';
import { getInteractiveSubModalZIndex } from '@/lib/utils/z-index-utils';

interface SchedulerValue {
    dueDate?: Date;
    scheduledStart?: Date;
    scheduledEnd?: Date;
    frequencyConfig?: FrequencyConfig;
}

interface SmartSchedulerSubmodalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    value: SchedulerValue;
    onChange: (value: SchedulerValue) => void;
    isRecurrent: boolean;
}

export function SmartSchedulerSubmodal({
    open,
    onOpenChange,
    value,
    onChange,
    isRecurrent
}: SmartSchedulerSubmodalProps) {
    // Local state for editing
    const [activeTab, setActiveTab] = useState<'schedule' | 'recurrence'>('schedule');
    const [dueDate, setDueDate] = useState<Date | undefined>(value.dueDate);
    const [startDate, setStartDate] = useState<Date | undefined>(value.scheduledStart);
    const [startTime, setStartTime] = useState<string>(value.scheduledStart ? format(value.scheduledStart, 'HH:mm') : '');
    const [endDate, setEndDate] = useState<Date | undefined>(value.scheduledEnd);
    const [endTime, setEndTime] = useState<string>(value.scheduledEnd ? format(value.scheduledEnd, 'HH:mm') : '');
    const [frequencyConfig, setFrequencyConfig] = useState<FrequencyConfig | undefined>(value.frequencyConfig);

    // Sync with props when opening
    useEffect(() => {
        if (open) {
            setDueDate(value.dueDate);
            setStartDate(value.scheduledStart);
            setStartTime(value.scheduledStart ? format(value.scheduledStart, 'HH:mm') : '');
            setEndDate(value.scheduledEnd);
            setEndTime(value.scheduledEnd ? format(value.scheduledEnd, 'HH:mm') : '');
            setFrequencyConfig(value.frequencyConfig);

            // Select appropriate tab
            if (isRecurrent && !value.scheduledStart) {
                setActiveTab('recurrence');
            } else {
                setActiveTab('schedule');
            }
        }
    }, [open, value, isRecurrent]);

    // Handler helpers
    const handleStartTimeChange = (time: string) => {
        setStartTime(time);
        // Auto-adjust end time if needed (default 1 hour duration)
        if (time && !endTime) {
            const [h, m] = time.split(':').map(Number);
            const start = new Date();
            start.setHours(h, m);
            const end = addHours(start, 1);
            setEndTime(format(end, 'HH:mm'));
        }
    };

    const handleApply = () => {
        // Construct final dates
        let finalStart: Date | undefined = undefined;
        if (startDate && startTime) {
            const [h, m] = startTime.split(':').map(Number);
            finalStart = new Date(startDate);
            finalStart.setHours(h, m);
        }

        let finalEnd: Date | undefined = undefined;
        if (endDate && endTime) {
            const [h, m] = endTime.split(':').map(Number);
            finalEnd = new Date(endDate);
            finalEnd.setHours(h, m);
        } else if (finalStart && endTime) {
            // If end date is missing but time is present, assume same day
            const [h, m] = endTime.split(':').map(Number);
            finalEnd = new Date(finalStart); // same day as start
            finalEnd.setHours(h, m);
        }

        onChange({
            dueDate,
            scheduledStart: finalStart,
            scheduledEnd: finalEnd,
            frequencyConfig
        });
        onOpenChange(false);
    };

    // Quick preset handlers
    const setToday = () => {
        const now = new Date();
        setDueDate(now);
        setStartDate(now);
    };

    const setTomorrow = () => {
        const tmrw = new Date();
        tmrw.setDate(tmrw.getDate() + 1);
        setDueDate(tmrw);
        setStartDate(tmrw);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="sm:max-w-[600px] flex flex-col gap-0 p-0 overflow-hidden"
                style={{ zIndex: getInteractiveSubModalZIndex() }}
            >
                <DialogHeader className="px-6 py-4 border-b bg-muted/10">
                    <DialogTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-indigo-500" />
                        Smart Scheduler
                    </DialogTitle>
                    <DialogDescription>
                        Configure time, duration and recurrence for this task.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6">
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-6">
                            <TabsTrigger value="schedule" className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Date & Time
                            </TabsTrigger>
                            <TabsTrigger value="recurrence" disabled={!isRecurrent} className="flex items-center gap-2">
                                <Repeat className="w-4 h-4" />
                                Recurrence
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="schedule" className="space-y-6 mt-0">

                            {/* Quick Presets */}
                            <div className="flex gap-2 mb-2">
                                <Button variant="outline" size="sm" onClick={setToday} className="text-xs">Today</Button>
                                <Button variant="outline" size="sm" onClick={setTomorrow} className="text-xs">Tomorrow</Button>
                            </div>

                            {/* Due Date Section */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right text-xs uppercase tracking-wider text-muted-foreground w-full">Due Date</Label>
                                <div className="col-span-3">
                                    <DatePicker
                                        date={dueDate}
                                        setDate={setDueDate}
                                        className="w-full"
                                        placeholder="Select due date (deadline)"
                                    />
                                </div>
                            </div>

                            <div className="border-t border-border/50 my-2"></div>

                            {/* Scheduled Start */}
                            <div className="grid grid-cols-4 items-start gap-4">
                                <Label className="text-right text-xs uppercase tracking-wider text-muted-foreground w-full pt-2">Start</Label>
                                <div className="col-span-3 grid grid-cols-2 gap-2">
                                    <DatePicker
                                        date={startDate}
                                        setDate={setStartDate}
                                        placeholder="Start Date"
                                    />
                                    <SimpleTimePicker
                                        value={startTime}
                                        onChange={handleStartTimeChange}
                                        placeholder="Start Time"
                                    />
                                </div>
                            </div>

                            {/* Scheduled End */}
                            <div className="grid grid-cols-4 items-start gap-4">
                                <Label className="text-right text-xs uppercase tracking-wider text-muted-foreground w-full pt-2">End</Label>
                                <div className="col-span-3 grid grid-cols-2 gap-2">
                                    <DatePicker
                                        date={endDate || startDate} // Default to start date if not set
                                        setDate={setEndDate}
                                        placeholder="End Date"
                                    />
                                    <SimpleTimePicker
                                        value={endTime}
                                        onChange={setEndTime}
                                        placeholder="End Time"
                                    />
                                </div>
                            </div>

                        </TabsContent>

                        <TabsContent value="recurrence" className="mt-0">
                            <div className="border rounded-md p-4 bg-muted/20">
                                <FrequencyCalendar
                                    config={frequencyConfig}
                                    onChange={setFrequencyConfig}
                                />
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                <DialogFooter className="px-6 py-4 border-t bg-muted/10">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleApply} className="bg-indigo-600 hover:bg-indigo-700 min-w-[100px]">
                        Apply Schedule
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
