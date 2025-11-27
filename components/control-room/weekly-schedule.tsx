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
const CELL_HEIGHT = 80; // Increased height for better visibility

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
                    New Task
                </Button>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Main Grid */}
                <main className="flex-1 overflow-x-auto">
                    <div className="flex h-full min-w-max">
                        {/* Time Column */}
                        <div className="flex flex-col shrink-0 sticky left-0 z-20 bg-background shadow-sm border-r w-16">
                            <div className="sticky top-0 z-30 bg-background h-[60px] border-b" /> {/* Header spacer */}
                            <div className="flex-1 relative">
                                {timeSlots.map(hour => (
                                    <div key={hour} className="flex items-start justify-end pr-2 border-b border-transparent" style={{ height: `${CELL_HEIGHT}px` }}>
                                        <span className="text-xs font-medium text-muted-foreground -mt-2 bg-background px-1">
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
                                    <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur p-3 text-center h-[60px] flex flex-col justify-center gap-1">
                                        <p className="font-bold text-sm">{format(day, 'EEE').toUpperCase()}</p>
                                        {/* Busy Bar */}
                                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary transition-all duration-500"
                                                style={{ width: `${getDayBusyPercentage(day)}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Day Content */}
                                    <div className="flex-1 relative">
                                        {/* No Grid Lines - Just a clean background */}
                                        <div className="absolute inset-0 flex flex-col pointer-events-none">
                                            {/* Optional: Subtle hour markers if needed, but removing for 'No Grid' request */}
                                        </div>

                                        {/* Tasks */}
                                        <div className="relative h-full w-full">
                                            {weeklyTasks
                                                .filter(task => isSameDay(new Date(task.scheduledStart!), day))
                                                .map(task => (
                                                    <div
                                                        key={task.id}
                                                        className="absolute left-1 right-1 rounded-lg border border-border/50 bg-card/90 p-2 text-xs shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden group hover:z-10 hover:scale-[1.02]"
                                                        style={getTaskStyle(task)}
                                                        onClick={() => onEditTask(task)}
                                                    >
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[0.6rem] text-primary font-bold uppercase tracking-wider">
                                                                {task.station}
                                                            </span>
                                                            {task.rewards?.points?.xp ? (
                                                                <span className="text-[0.6rem] text-muted-foreground flex items-center gap-0.5">
                                                                    <Star className="w-2 h-2" /> {task.rewards.points.xp} XP
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                        <p className="font-semibold truncate text-foreground group-hover:text-primary transition-colors">{task.name}</p>
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
