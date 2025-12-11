'use client';

import { useState, useMemo } from 'react';
import { Task } from '@/types/entities';
import { TaskType } from '@/types/enums';
import { format, addDays, startOfWeek, getHours, setHours, setMinutes, differenceInMinutes, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useThemeColors } from '@/lib/hooks/use-theme-colors';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, Star, Zap, Brain, TrendingUp, Heart, Clock } from 'lucide-react';
import { BUSINESS_STRUCTURE } from '@/types/enums';
import { AREA_COLORS, getStationColorClasses } from '@/lib/constants/color-constants';

interface WeeklyScheduleProps {
    tasks: Task[];
    onNewTask: () => void;
    onEditTask: (task: Task) => void;
}

const HOURS_IN_DAY = 24;
// CELL_HEIGHT removed (now state)

export default function WeeklySchedule({ tasks, onNewTask, onEditTask }: WeeklyScheduleProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [startHour, setStartHour] = useState(6);
    const [cellHeight, setCellHeight] = useState(60); // Default reduced for compactness

    // Calculate week days
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
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

    // Filter tasks for this week
    const weeklyTasks = useMemo(() => {
        return tasks.filter(task => {
            if (!task.scheduledStart || !task.scheduledEnd) return false;
            const taskDate = new Date(task.scheduledStart);
            return weekDays.some(day => isSameDay(day, taskDate));
        });
    }, [tasks, weekDays]);

    // Helper: Station Colors
    const getStationColor = (task: Task) => {
        let area: keyof typeof AREA_COLORS | undefined;
        // Search in BUSINESS_STRUCTURE
        for (const [key, stations] of Object.entries(BUSINESS_STRUCTURE)) {
            if ((stations as readonly string[]).includes(task.station)) {
                area = key as keyof typeof AREA_COLORS;
                break;
            }
        }
        return getStationColorClasses(task.station, area);
    };

    // Helper: Position & Size
    const getTaskStyle = (task: Task) => {
        if (!task.scheduledStart || !task.scheduledEnd) return {};
        const start = new Date(task.scheduledStart);
        const end = new Date(task.scheduledEnd);

        let startHourVal = getHours(start);
        const startMin = start.getMinutes();

        let adjustedStartHour = startHourVal - startHour;
        if (adjustedStartHour < 0) adjustedStartHour += 24;

        const top = (adjustedStartHour * 60 + startMin) * (cellHeight / 60);
        const durationMinutes = differenceInMinutes(end, start);
        const height = durationMinutes * (cellHeight / 60);

        return { top: `${top}px`, height: `${height}px` };
    };

    // Helper: Points Display
    const renderPoints = (task: Task) => {
        if (!task.rewards?.points) return null;
        const { xp, rp, fp, hp } = task.rewards.points;
        const points = [];
        if (xp) points.push({ type: 'XP', val: xp, icon: Star, color: 'text-orange-600 dark:text-orange-400' });
        if (rp) points.push({ type: 'RP', val: rp, icon: Brain, color: 'text-blue-600 dark:text-blue-400' });
        if (fp) points.push({ type: 'FP', val: fp, icon: Heart, color: 'text-pink-600 dark:text-pink-400' });
        if (hp) points.push({ type: 'HP', val: hp, icon: Zap, color: 'text-green-600 dark:text-green-400' });

        if (points.length === 0) return null;

        return (
            <div className="flex flex-wrap gap-1 mt-0.5">
                {points.map((p, i) => (
                    <span key={i} className={`flex items-center gap-0.5 text-[0.6rem] font-medium bg-background/50 px-1 rounded ${p.color}`}>
                        <p.icon className="w-2 h-2" /> {p.val} <span className="opacity-70">{p.type}</span>
                    </span>
                ))}
            </div>
        );
    };

    // Helper: Parent Name
    const getParentName = (parentId?: string | null) => {
        if (!parentId) return null;
        const parent = tasks.find(t => t.id === parentId);
        return parent ? parent.name : null;
    };

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden relative">
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: hsl(var(--muted-foreground) / 0.3);
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: hsl(var(--muted-foreground) / 0.5);
                }
            `}</style>

            {/* Header */}
            <header className="flex shrink-0 items-center justify-between border-b px-4 py-2 bg-card/50 backdrop-blur-sm z-40">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold">Weekly Schedule</h2>

                    {/* Controls */}
                    <div className="flex items-center gap-4 bg-muted/20 p-1.5 rounded-lg border text-sm">

                        {/* Start Hour Input */}
                        <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Start:</span>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="0"
                                    max="23"
                                    value={startHour}
                                    onChange={(e) => setStartHour(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                                    className="w-10 h-6 bg-background border rounded px-1 text-center font-medium focus:ring-1 focus:ring-primary outline-none text-xs"
                                />
                                <span className="absolute top-0.5 right-[-14px] text-xs text-muted-foreground">:00</span>
                            </div>
                        </div>

                        <div className="w-px h-4 bg-border" />

                        {/* Density Slider */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Zoom:</span>
                            <input
                                type="range"
                                min="20"
                                max="100"
                                value={cellHeight}
                                onChange={(e) => setCellHeight(parseInt(e.target.value))}
                                className="w-24 h-1.5 bg-muted-foreground/20 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                        </div>
                    </div>
                </div>

                {/* Date Nav */}
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(addDays(currentDate, -7))}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium w-28 text-center tabular-nums">
                        {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'd')}
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(addDays(currentDate, 7))}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                <Button onClick={onNewTask} size="sm" className="gap-1.5 h-8">
                    <Plus className="h-3.5 w-3.5" />
                    New Task
                </Button>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Main Grid */}
                <main className="flex-1 overflow-auto custom-scrollbar">
                    <div className="flex min-h-full min-w-max">
                        {/* Time Column */}
                        <div className="flex flex-col shrink-0 sticky left-0 z-30 bg-background/95 border-r w-14 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                            <div className="sticky top-0 z-40 bg-background h-[50px] border-b" />
                            <div className="flex-1 relative">
                                {timeSlots.map(hour => (
                                    <div key={hour} className="flex items-start justify-end pr-2 border-b border-transparent relative" style={{ height: `${cellHeight}px` }}>
                                        <span className="text-[10px] font-medium text-muted-foreground/70 -translate-y-1/2 bg-background pl-1">
                                            {hour.toString().padStart(2, '0')}:00
                                        </span>
                                        <div className="absolute right-0 top-0 w-1.5 h-px bg-border" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Days Columns */}
                        <div className="flex-1 grid grid-cols-7 min-w-0 divide-x">
                            {weekDays.map(day => {
                                const isToday = isSameDay(day, new Date());
                                return (
                                    <div key={day.toISOString()} className="flex flex-col min-h-full bg-background/50">
                                        {/* Day Header */}
                                        <div className={cn(
                                            "sticky top-0 z-30 border-b backdrop-blur p-2 text-center h-[50px] flex flex-col justify-center gap-0.5 border-r",
                                            isToday ? "bg-primary/5 border-primary/20" : "bg-card/95"
                                        )}>
                                            <p className={cn("font-bold text-xs", isToday && "text-primary")}>
                                                {format(day, 'EEE').toUpperCase()}
                                            </p>
                                            <div className={cn("text-xs", isToday ? "text-primary font-bold" : "text-muted-foreground")}>
                                                {format(day, 'd')}
                                            </div>
                                        </div>

                                        {/* Day Content */}
                                        <div className="flex-1 relative group">
                                            {/* Grid Lines */}
                                            <div className="absolute inset-0 flex flex-col pointer-events-none">
                                                {timeSlots.map(hour => (
                                                    <div key={hour} className="border-b border-dashed border-border/30 w-full" style={{ height: `${cellHeight}px` }} />
                                                ))}
                                            </div>

                                            {/* Tasks */}
                                            <div className="relative h-full w-full">
                                                {weeklyTasks
                                                    .filter(task => isSameDay(new Date(task.scheduledStart!), day))
                                                    .map(task => {
                                                        const stationColors = getStationColor(task);
                                                        const isShort = differenceInMinutes(new Date(task.scheduledEnd!), new Date(task.scheduledStart!)) <= 30 && cellHeight < 50;
                                                        const parentName = getParentName(task.parentId);

                                                        return (
                                                            <div
                                                                key={task.id}
                                                                className="absolute left-0.5 right-1 rounded border bg-card p-1.5 text-xs shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden group/card hover:z-50 hover:scale-[1.02] flex flex-col"
                                                                style={getTaskStyle(task)}
                                                                onClick={() => onEditTask(task)}
                                                            >
                                                                {/* Station Badge Header */}
                                                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                                                    <span className={cn(
                                                                        "rounded px-1.5 py-px text-[0.6rem] font-bold uppercase tracking-wider truncate border",
                                                                        stationColors
                                                                    )}>
                                                                        {task.station}
                                                                    </span>

                                                                    {!isShort && (
                                                                        <div className="text-[0.6rem] text-muted-foreground whitespace-nowrap">
                                                                            {format(new Date(task.scheduledStart!), 'HH:mm')}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Parent (if exists) */}
                                                                {parentName && !isShort && (
                                                                    <div className="text-[0.65rem] text-muted-foreground/80 truncate mb-px flex items-center gap-1">
                                                                        <span className="w-1 h-1 rounded-full bg-border" />
                                                                        {parentName}
                                                                    </div>
                                                                )}

                                                                {/* Task Name */}
                                                                <p className={cn(
                                                                    "font-medium truncate leading-tight mt-0.5",
                                                                    isShort ? "line-clamp-1" : "line-clamp-2"
                                                                )}>
                                                                    {task.name}
                                                                </p>

                                                                {/* Points */}
                                                                {!isShort && renderPoints(task)}
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
