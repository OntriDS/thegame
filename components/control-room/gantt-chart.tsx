'use client';

import { useState, useMemo } from 'react';
import { Task } from '@/types/entities';
import { format, addDays, startOfDay, getHours, differenceInMinutes, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { useThemeColors } from '@/lib/hooks/use-theme-colors';

interface GanttChartProps {
    tasks: Task[];
    onNewTask: () => void;
    onEditTask: (task: Task) => void;
}

const HOURS_IN_DAY = 24;
const START_HOUR = 6; // Start at 6 AM
const CELL_HEIGHT = 60; // Height per hour
const DAYS_TO_SHOW = 3;

export default function GanttChart({ tasks, onNewTask, onEditTask }: GanttChartProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const { activeBg } = useThemeColors();

    // Calculate days to show
    const days = useMemo(() => {
        return Array.from({ length: DAYS_TO_SHOW }).map((_, i) => addDays(startOfDay(currentDate), i));
    }, [currentDate]);

    // Split tasks into scheduled and unscheduled
    const { scheduledTasks, unscheduledTasks } = useMemo(() => {
        const scheduled: Task[] = [];
        const unscheduled: Task[] = [];

        tasks.forEach(task => {
            if (task.scheduledStart && task.scheduledEnd) {
                scheduled.push(task);
            } else {
                unscheduled.push(task);
            }
        });

        return { scheduledTasks: scheduled, unscheduledTasks: unscheduled };
    }, [tasks]);

    // Time slots for the gutter
    const timeSlots = useMemo(() => {
        return Array.from({ length: HOURS_IN_DAY - START_HOUR }).map((_, i) => START_HOUR + i);
    }, []);

    const getTaskStyle = (task: Task) => {
        if (!task.scheduledStart || !task.scheduledEnd) return {};

        const start = new Date(task.scheduledStart);
        const end = new Date(task.scheduledEnd);

        // Calculate minutes from start of day (relative to START_HOUR)
        const startHour = getHours(start);
        const startMin = start.getMinutes();

        // Adjust for start hour
        let adjustedStartHour = startHour - START_HOUR;
        // If before start hour, it might be from previous day or early morning
        // For now, just hide or clip if it's way off, but let's assume tasks are within view
        if (adjustedStartHour < 0) adjustedStartHour = 0; // Clamp for now

        const top = (adjustedStartHour * 60 + startMin) * (CELL_HEIGHT / 60);
        const durationMinutes = differenceInMinutes(end, start);
        const height = Math.max(durationMinutes * (CELL_HEIGHT / 60), 30); // Min height 30px

        // Random column for now to demonstrate "lanes" (0-11)
        // In a real app, we'd calculate non-overlapping lanes
        const lane = Math.floor(Math.random() * 6);
        const width = 12 - lane; // Span remaining width

        return {
            top: `${top}px`,
            height: `${height}px`,
            left: `calc((100% / 12) * ${lane})`,
            width: `calc((100% / 12) * ${6})`, // Fixed width for now
        };
    };

    return (
        <div className="flex h-full flex-col bg-background">
            {/* Header */}
            <header className="flex shrink-0 items-center justify-between border-b px-6 py-4 bg-card/50 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-primary" />
                        Schedule View
                    </h2>
                    <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(addDays(currentDate, -1))}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 font-medium" onClick={() => setCurrentDate(new Date())}>
                            Today
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(addDays(currentDate, 1))}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">
                        {format(days[0], 'MMM d')} – {format(days[days.length - 1], 'MMM d, yyyy')}
                    </span>
                </div>
                <Button onClick={onNewTask} className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Task
                </Button>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Unscheduled Tasks Sidebar */}
                <aside className="w-80 shrink-0 border-r bg-muted/10 flex flex-col">
                    <div className="p-4 border-b bg-muted/20">
                        <h3 className="font-semibold flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            Unscheduled
                            <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                {unscheduledTasks.length}
                            </span>
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {unscheduledTasks.map(task => (
                            <div
                                key={task.id}
                                className="p-3 rounded-lg border bg-card shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group"
                                onClick={() => onEditTask(task)}
                            >
                                <p className="font-medium text-sm group-hover:text-primary transition-colors">{task.name}</p>
                                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                                    <span className="px-2 py-0.5 rounded-full bg-muted font-medium uppercase text-[10px] tracking-wider">
                                        {task.station}
                                    </span>
                                    {task.rewards?.points?.xp && (
                                        <span className="flex items-center gap-1">
                                            <span className="text-yellow-500">★</span> {task.rewards.points.xp} XP
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Main Schedule Area */}
                <main className="flex-1 overflow-x-auto">
                    <div className="flex min-w-max h-full">
                        {days.map((day, index) => (
                            <div
                                key={day.toISOString()}
                                className={cn(
                                    "flex flex-col min-w-[400px] border-r h-full",
                                    index === 0 ? "min-w-[460px]" : "" // Extra width for time labels
                                )}
                            >
                                {/* Day Header */}
                                <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur p-4 text-center h-[60px] flex items-center justify-center">
                                    <p className={cn(
                                        "font-bold",
                                        isSameDay(day, new Date()) ? "text-primary" : ""
                                    )}>
                                        {isSameDay(day, new Date()) ? "Today, " : ""}
                                        {format(day, 'EEE, MMM d')}
                                    </p>
                                </div>

                                {/* Day Grid */}
                                <div className="flex-1 relative overflow-y-auto">
                                    <div className="grid h-full" style={{
                                        gridTemplateColumns: index === 0 ? '60px 1fr' : '1fr',
                                        gridTemplateRows: `repeat(${timeSlots.length}, ${CELL_HEIGHT}px)`
                                    }}>
                                        {/* Time Labels (Only for first day) */}
                                        {index === 0 && (
                                            <div className="border-r bg-muted/5 text-xs text-muted-foreground font-medium">
                                                {timeSlots.map(hour => (
                                                    <div key={hour} className="border-b flex items-start justify-end pr-2 pt-2" style={{ height: `${CELL_HEIGHT}px` }}>
                                                        {hour}:00
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Grid Content */}
                                        <div className="relative border-r border-dashed border-border/50">
                                            {/* Hour Lines */}
                                            {timeSlots.map(hour => (
                                                <div key={hour} className="border-b border-border/30 w-full absolute" style={{ top: `${(hour - START_HOUR) * CELL_HEIGHT}px`, height: '1px' }} />
                                            ))}

                                            {/* Tasks */}
                                            {scheduledTasks
                                                .filter(task => isSameDay(new Date(task.scheduledStart!), day))
                                                .map(task => (
                                                    <div
                                                        key={task.id}
                                                        className="absolute rounded-md border bg-primary/10 border-primary/20 p-2 text-xs hover:bg-primary/20 transition-colors cursor-pointer overflow-hidden shadow-sm hover:z-10"
                                                        style={getTaskStyle(task)}
                                                        onClick={() => onEditTask(task)}
                                                    >
                                                        <div className="flex flex-col h-full justify-between">
                                                            <p className="font-semibold truncate text-primary-foreground/90">{task.name}</p>
                                                            <span className="inline-flex self-start px-1.5 py-0.5 rounded-sm bg-background/50 text-[10px] font-medium uppercase text-muted-foreground">
                                                                {task.station}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}

                                            {/* Current Time Indicator (if today) */}
                                            {isSameDay(day, new Date()) && (
                                                <div
                                                    className="absolute w-full border-t-2 border-red-500 z-20 pointer-events-none flex items-center"
                                                    style={{
                                                        top: `${(getHours(new Date()) - START_HOUR) * CELL_HEIGHT + (new Date().getMinutes() * (CELL_HEIGHT / 60))}px`
                                                    }}
                                                >
                                                    <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </main>
            </div>
        </div>
    );
}
