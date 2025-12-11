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
    const [startHour, setStartHour] = useState(6); // Default start hour: 06:00
    const [cellHeight, setCellHeight] = useState(50); // Dynamic cell height (20-100px)

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

    // Helper to get task color based on Station -> Area mapping (for badge only)
    const getTaskColorClass = (task: Task) => {
        // Find the area for this station
        let area: keyof typeof AREA_COLORS | undefined;

        // Search in BUSINESS_STRUCTURE
        for (const [key, stations] of Object.entries(BUSINESS_STRUCTURE)) {
            if ((stations as readonly string[]).includes(task.station)) {
                area = key as keyof typeof AREA_COLORS;
                break;
            }
        }

        // Get color classes for badge
        return getStationColorClasses(task.station, area);
    };

    // Helper to get parent task name
    const getParentTaskName = (task: Task) => {
        if (!task.parentId) return null;
        const parent = tasks.find(t => t.id === task.parentId);
        return parent?.name || null;
    };

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

        const top = (adjustedStartHour * 60 + startMin) * (cellHeight / 60);
        const durationMinutes = differenceInMinutes(end, start);
        const height = durationMinutes * (cellHeight / 60);

        return {
            top: `${top}px`,
            height: `${height}px`,
        };
    };

    const handleStartHourChange = (value: string) => {
        const num = parseInt(value);
        if (!isNaN(num) && num >= 0 && num <= 23) {
            setStartHour(num);
        }
    };

    // Calculate busy percentage for each day (simple heuristic: hours scheduled / 12 * 100)
    const getDayBusyPercentage = (day: Date) => {
        const dayTasks = weeklyTasks.filter(task => isSameDay(new Date(task.scheduledStart!), day));
        const totalMinutes = dayTasks.reduce((acc, task) => {
            const start = new Date(task.scheduledStart!);
            const end = new Date(task.scheduledEnd!);
            return acc + differenceInMinutes(end, start);
        }, 0);
        return Math.min((totalMinutes / (12 * 60)) * 100, 100); // Cap at 100% (based on 12h active day)
    };

    // Helper to check if task has any rewards
    const hasRewards = (task: Task) => {
        if (!task.rewards?.points) return false;
        const { xp, rp, fp, hp } = task.rewards.points;
        return (xp > 0 || rp > 0 || fp > 0 || hp > 0);
    };

    // Get individual point types for display
    const getPointTypes = (task: Task) => {
        if (!task.rewards?.points) return [];
        const { xp, rp, fp, hp } = task.rewards.points;
        const points = [];
        if (xp > 0) points.push({ type: 'xp', value: xp, icon: Star, label: 'XP' });
        if (rp > 0) points.push({ type: 'rp', value: rp, icon: Brain, label: 'RP' });
        if (fp > 0) points.push({ type: 'fp', value: fp, icon: Heart, label: 'FP' });
        if (hp > 0) points.push({ type: 'hp', value: hp, icon: Zap, label: 'HP' });
        return points;
    };

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <header className="flex shrink-0 items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold">Weekly Schedule</h2>

                    {/* View Controls */}
                    <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-md border">
                        <div className="flex items-center gap-2 px-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Start:</span>
                            <input
                                type="number"
                                min="0"
                                max="23"
                                value={startHour}
                                onChange={(e) => handleStartHourChange(e.target.value)}
                                className="w-14 px-2 py-1 text-xs font-medium text-center bg-background border border-border rounded hover:border-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                            />
                            <span className="text-xs text-muted-foreground">:00</span>
                        </div>
                        <div className="h-4 w-px bg-border mx-1" />
                        <div className="flex items-center gap-2 px-2">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Density:</span>
                            <span className="text-[0.65rem] text-muted-foreground/70">Compact</span>
                            <input
                                type="range"
                                min="20"
                                max="100"
                                value={cellHeight}
                                onChange={(e) => setCellHeight(parseInt(e.target.value))}
                                className="w-24 h-1.5 bg-muted-foreground/20 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            <span className="text-[0.65rem] text-muted-foreground/70">Detailed</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" onClick={() => setCurrentDate(addDays(currentDate, -7))}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium w-32 text-center">
                        {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d')}
                    </span>
                    <Button variant="outline" size="icon" onClick={() => setCurrentDate(addDays(currentDate, 7))}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                <Button onClick={onNewTask} className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Task
                </Button>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Main Grid */}
                <main className="flex-1 overflow-auto" style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'hsl(var(--muted-foreground) / 0.3) transparent'
                } as any}>
                    <div className="flex min-h-full min-w-max">
                        {/* Time Column */}
                        <div className="flex flex-col shrink-0 sticky left-0 z-20 bg-background shadow-sm border-r w-16">
                            <div className="sticky top-0 z-30 bg-background h-[60px] border-b" /> {/* Header spacer */}
                            <div className="flex-1 relative">
                                {timeSlots.map(hour => (
                                    <div key={hour} className="flex items-start justify-end pr-2 border-b border-transparent group" style={{ height: `${cellHeight}px` }}>
                                        <span className="text-xs font-medium text-muted-foreground bg-background px-1 pt-1 opacity-70 group-hover:opacity-100">
                                            {hour.toString().padStart(2, '0')}:00
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Days Columns */}
                        <div className="flex-1 grid grid-cols-7 min-w-0">
                            {weekDays.map(day => (
                                <div key={day.toISOString()} className="flex flex-col border-r min-h-full">
                                    {/* Day Header */}
                                    <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur p-3 text-center h-[60px] flex flex-col justify-center gap-1 group hover:bg-muted/30 transition-colors">
                                        <p className={`font-bold text-sm ${isSameDay(day, new Date()) ? 'text-primary' : ''}`}>
                                            {format(day, 'EEE').toUpperCase()}
                                            {isSameDay(day, new Date()) && <span className="ml-1 text-xs">•</span>}
                                        </p>
                                        <div className="text-xs text-muted-foreground">{format(day, 'd')}</div>
                                        {/* Busy Bar */}
                                        <div className="h-1 w-full max-w-[80%] mx-auto bg-muted rounded-full overflow-hidden mt-1">
                                            <div
                                                className="h-full bg-primary/70 transition-all duration-500"
                                                style={{ width: `${getDayBusyPercentage(day)}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Day Content */}
                                    <div className="flex-1 relative">
                                        {/* Hour markers background */}
                                        <div className="absolute inset-0 flex flex-col pointer-events-none">
                                            {timeSlots.map(hour => (
                                                <div key={hour} className="border-b border-border/10 w-full" style={{ height: `${cellHeight}px` }} />
                                            ))}
                                        </div>

                                        {/* Tasks */}
                                        <div className="relative h-full w-full">
                                            {weeklyTasks
                                                .filter(task => isSameDay(new Date(task.scheduledStart!), day))
                                                .map(task => {
                                                    const colorClass = getTaskColorClass(task);
                                                    const parentName = getParentTaskName(task);
                                                    const pointTypes = getPointTypes(task);
                                                    const isVeryCompact = cellHeight < 35;
                                                    const isCompact = cellHeight < 55;
                                                    const isDetailed = cellHeight >= 70;

                                                    return (
                                                        <div
                                                            key={task.id}
                                                            className="absolute left-1 right-1 rounded-md border p-2 text-xs shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden group hover:z-50 hover:scale-[1.02] bg-card"
                                                            style={getTaskStyle(task)}
                                                            onClick={() => onEditTask(task)}
                                                        >
                                                            {/* Header Row */}
                                                            <div className="flex items-center justify-between mb-0.5 gap-1">
                                                                <span className={cn(
                                                                    "font-bold text-[0.65rem] uppercase tracking-wider truncate px-1.5 py-0.5 rounded",
                                                                    colorClass
                                                                )}>
                                                                    {task.station}
                                                                </span>
                                                                {pointTypes.length > 0 && !isVeryCompact && (
                                                                    <div className="flex items-center gap-1 bg-muted/30 rounded px-1 min-w-fit">
                                                                        {pointTypes.map(pt => {
                                                                            const Icon = pt.icon;
                                                                            return (
                                                                                <span key={pt.type} className="text-[0.65rem] opacity-80 flex items-center gap-0.5" title={pt.label}>
                                                                                    <Icon className="w-2.5 h-2.5 fill-current" />
                                                                                    {pt.value}
                                                                                </span>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Parent Task (if exists and space permits) */}
                                                            {parentName && !isCompact && (
                                                                <p className="text-[0.6rem] text-muted-foreground/70 truncate leading-tight mb-0.5">
                                                                    ↳ {parentName}
                                                                </p>
                                                            )}

                                                            {/* Task Name */}
                                                            <p className={cn(
                                                                "font-semibold truncate transition-colors leading-tight",
                                                                isVeryCompact ? "line-clamp-1 text-[0.7rem]" : isCompact ? "line-clamp-1" : "line-clamp-2"
                                                            )}>
                                                                {task.name}
                                                            </p>

                                                            {/* Time Footer (only if height permits) */}
                                                            {!isCompact && (
                                                                <div className="flex items-center gap-1 text-[0.6rem] text-muted-foreground/70 mt-0.5">
                                                                    <Clock className="w-2.5 h-2.5" />
                                                                    <span>
                                                                        {format(new Date(task.scheduledStart!), 'HH:mm')} - {format(new Date(task.scheduledEnd!), 'HH:mm')}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
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
