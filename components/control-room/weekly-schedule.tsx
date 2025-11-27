'use client';

import { useState, useMemo } from 'react';
import { Task } from '@/types/entities';
import { TaskType } from '@/types/enums';
import { format, addDays, startOfWeek, getHours, setHours, setMinutes, differenceInMinutes, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useThemeColors } from '@/lib/hooks/use-theme-colors';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, Star, Zap, Brain, TrendingUp, Heart } from 'lucide-react';

interface WeeklyScheduleProps {
    tasks: Task[];
    onNewTask: () => void;
    onEditTask: (task: Task) => void;
}

const HOURS_IN_DAY = 24;
const CELL_HEIGHT = 48; // px

export default function WeeklySchedule({ tasks, onNewTask, onEditTask }: WeeklyScheduleProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [startHour, setStartHour] = useState(6); // Default start hour: 06:00

    // Calculate week days
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
    const weekDays = useMemo(() => {
        return Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
    }, [weekStart]);

    // Generate time slots based on startHour
    const timeSlots = useMemo(() => {
        return Array.from({ length: HOURS_IN_DAY }).map((_, i) => {
            const hour = (startHour + i) % 24;
            return hour;
        });
    }, [startHour]);

    // Filter tasks for this week and with schedule data
    const weeklyTasks = useMemo(() => {
        return tasks.filter(task => {
            if (!task.scheduledStart || !task.scheduledEnd) return false;
            const taskDate = new Date(task.scheduledStart);
            return weekDays.some(day => isSameDay(day, taskDate));
        });
    }, [tasks, weekDays]);

    const getTaskStyle = (task: Task) => {
        if (!task.scheduledStart || !task.scheduledEnd) return {};

        const start = new Date(task.scheduledStart);
        const end = new Date(task.scheduledEnd);

        // Calculate position relative to startHour
        let startHourVal = getHours(start);
        const startMin = start.getMinutes();

        // Adjust for rotation
        let adjustedStartHour = startHourVal - startHour;
        if (adjustedStartHour < 0) adjustedStartHour += 24;

        const top = (adjustedStartHour * 60 + startMin) * (CELL_HEIGHT / 60);
        const durationMinutes = differenceInMinutes(end, start);
        const height = durationMinutes * (CELL_HEIGHT / 60);

        return {
            top: `${top}px`,
            height: `${height}px`,
        };
    };

    const rotateHours = () => {
        setStartHour(prev => (prev + 6) % 24);
    };

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <header className="flex shrink-0 items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold">Weekly Schedule</h2>
                    <Button variant="outline" size="sm" onClick={rotateHours}>
                        Rotate Hours (Start: {startHour}:00)
                    </Button>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" onClick={() => setCurrentDate(addDays(currentDate, -7))}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium">
                        {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d')}
                    </span>
                    <Button variant="outline" size="icon" onClick={() => setCurrentDate(addDays(currentDate, 7))}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                <Button onClick={onNewTask} className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Quest
                </Button>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar - Weekly Stats (Placeholder for now based on HTML) */}
                <aside className="hidden md:flex flex-col w-20 shrink-0 border-r bg-muted/10">
                    <div className="p-3 text-center border-b">
                        <span className="text-xs font-semibold text-muted-foreground">Week</span>
                    </div>
                    <div className="flex-1 overflow-y-auto py-2 px-2 space-y-3">
                        {weekDays.map(day => (
                            <div key={day.toISOString()} className="flex items-center gap-2">
                                <span className="text-xs font-bold w-4">{format(day, 'EEEEE')}</span>
                                <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-primary w-[40%]" />
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Main Grid */}
                <main className="flex-1 overflow-x-auto">
                    <div className="flex h-full min-w-max">
                        {/* Time Column */}
                        <div className="flex flex-col shrink-0 sticky left-0 z-20 bg-background shadow-sm border-r w-12">
                            <div className="sticky top-0 z-30 bg-background h-[49px] border-b" /> {/* Header spacer */}
                            <div className="flex-1 relative">
                                {timeSlots.map(hour => (
                                    <div key={hour} className="h-[48px] flex items-start justify-end pr-1 pt-1">
                                        <span className="text-[0.6rem] text-muted-foreground">
                                            {hour.toString().padStart(2, '0')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Days Columns */}
                        <div className="flex-1 grid grid-cols-7 min-w-[1000px]">
                            {weekDays.map(day => (
                                <div key={day.toISOString()} className="flex flex-col border-r min-w-[140px]">
                                    {/* Day Header */}
                                    <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur p-3 text-center h-[49px]">
                                        <p className="font-bold text-sm">{format(day, 'EEE').toUpperCase()}</p>
                                    </div>

                                    {/* Day Content */}
                                    <div className="flex-1 relative">
                                        {/* Grid Lines */}
                                        <div className="absolute inset-0 flex flex-col pointer-events-none">
                                            {timeSlots.map((_, i) => (
                                                <div key={i} className="h-[48px] border-b border-dashed border-muted/50" />
                                            ))}
                                        </div>

                                        {/* Tasks */}
                                        <div className="relative h-full w-full">
                                            {weeklyTasks
                                                .filter(task => isSameDay(new Date(task.scheduledStart!), day))
                                                .map(task => (
                                                    <div
                                                        key={task.id}
                                                        className="absolute left-1 right-1 rounded-md border bg-card p-2 text-xs shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                                                        style={getTaskStyle(task)}
                                                        onClick={() => onEditTask(task)}
                                                    >
                                                        <p className="font-medium truncate">{task.name}</p>
                                                        <div className="mt-1 flex items-center justify-between text-[0.6rem] text-muted-foreground">
                                                            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-primary font-medium">
                                                                {task.station}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-[0.6rem] text-muted-foreground mt-1">
                                                            <span>
                                                                {format(new Date(task.scheduledStart!), 'HH:mm')} - {format(new Date(task.scheduledEnd!), 'HH:mm')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
