'use client';

import { useState, useMemo } from 'react';
import { Task } from '@/types/entities';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    addMonths,
    subMonths,
    isSameMonth,
    isSameDay,
    isToday
} from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeColors } from '@/lib/hooks/use-theme-colors';

interface CalendarViewProps {
    tasks: Task[];
    onNewTask: () => void;
    onEditTask: (task: Task) => void;
}

export default function CalendarView({ tasks, onNewTask, onEditTask }: CalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const { activeBg } = useThemeColors();

    // Calculate calendar grid
    const { days, monthStart } = useMemo(() => {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        const startDate = startOfWeek(start, { weekStartsOn: 1 }); // Monday start
        const endDate = endOfWeek(end, { weekStartsOn: 1 });

        const days = eachDayOfInterval({ start: startDate, end: endDate });
        return { days, monthStart: start };
    }, [currentDate]);

    // Filter tasks for the visible range
    const visibleTasks = useMemo(() => {
        return tasks.filter(task => task.scheduledStart);
    }, [tasks]);

    const getTasksForDay = (day: Date) => {
        return visibleTasks.filter(task => isSameDay(new Date(task.scheduledStart!), day));
    };

    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const handleToday = () => setCurrentDate(new Date());

    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
        <div className="flex flex-col h-full bg-background border rounded-lg overflow-hidden">
            {/* Header */}
            <header className="flex shrink-0 items-center justify-between border-b px-4 py-3 bg-muted/20">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        {format(currentDate, 'MMMM yyyy')}
                    </h2>
                    <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={handlePrevMonth}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleToday}>
                            Today
                        </Button>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleNextMonth}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <Button onClick={onNewTask} size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Task
                </Button>
            </header>

            {/* Calendar Grid */}
            <div className="flex-1 flex flex-col min-h-0">
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 border-b bg-muted/10">
                    {weekDays.map(day => (
                        <div key={day} className="py-2 text-center text-xs font-semibold text-muted-foreground border-r last:border-r-0">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days */}
                <div className="flex-1 grid grid-cols-7 grid-rows-5 md:grid-rows-6">
                    {days.map((day, dayIdx) => {
                        const dayTasks = getTasksForDay(day);
                        const isCurrentMonth = isSameMonth(day, monthStart);
                        const isDayToday = isToday(day);

                        return (
                            <div
                                key={day.toISOString()}
                                className={cn(
                                    "relative border-b border-r p-2 flex flex-col gap-1 transition-colors hover:bg-accent/5",
                                    !isCurrentMonth && "bg-muted/5 text-muted-foreground/50",
                                    isDayToday && "bg-primary/5"
                                )}
                                onClick={() => {
                                    // Optional: Open modal with pre-filled date
                                    // onNewTaskWithDate(day); 
                                }}
                            >
                                <div className="flex items-center justify-between">
                                    <span
                                        className={cn(
                                            "text-xs font-medium h-6 w-6 flex items-center justify-center rounded-full",
                                            isDayToday && "bg-primary text-primary-foreground",
                                            !isCurrentMonth && "text-muted-foreground"
                                        )}
                                    >
                                        {format(day, 'd')}
                                    </span>
                                </div>

                                <div className="flex-1 flex flex-col gap-1 overflow-y-auto min-h-0">
                                    {dayTasks.map(task => (
                                        <div
                                            key={task.id}
                                            className="group relative flex items-center gap-1 rounded px-1.5 py-1 text-[10px] font-medium border bg-card hover:border-primary/50 hover:shadow-sm cursor-pointer transition-all truncate"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEditTask(task);
                                            }}
                                        >
                                            <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                                            <span className="truncate">{task.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
