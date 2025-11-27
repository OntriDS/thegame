'use client';

import { useState, useMemo } from 'react';
import { Task } from '@/types/entities';
import { format, addDays, startOfDay, differenceInMinutes, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useThemeColors } from '@/lib/hooks/use-theme-colors';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface GanttChartProps {
    tasks: Task[];
    onNewTask: () => void;
    onEditTask: (task: Task) => void;
}

type ViewMode = 'Day' | 'Week' | 'Month';

const CELL_WIDTH_DAY = 60;
const CELL_WIDTH_WEEK = 150;
const CELL_WIDTH_MONTH = 40;
const HEADER_HEIGHT = 50;
const ROW_HEIGHT = 48;

export default function GanttChart({ tasks, onNewTask, onEditTask }: GanttChartProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('Week');
    const { activeBg } = useThemeColors();

    const { startDate, endDate, ticks, cellWidth } = useMemo(() => {
        let start: Date, end: Date, tickList: Date[], width: number;

        if (viewMode === 'Day') {
            start = startOfDay(currentDate);
            end = addDays(start, 1);
            tickList = Array.from({ length: 24 }).map((_, i) => {
                const d = new Date(start);
                d.setHours(i);
                return d;
            });
            width = CELL_WIDTH_DAY;
        } else if (viewMode === 'Week') {
            start = startOfWeek(currentDate, { weekStartsOn: 1 });
            end = endOfWeek(currentDate, { weekStartsOn: 1 });
            tickList = eachDayOfInterval({ start, end });
            width = CELL_WIDTH_WEEK;
        } else {
            start = startOfMonth(currentDate);
            end = endOfMonth(currentDate);
            tickList = eachDayOfInterval({ start, end });
            width = CELL_WIDTH_MONTH;
        }

        return { startDate: start, endDate: end, ticks: tickList, cellWidth: width };
    }, [currentDate, viewMode]);

    const scheduledTasks = useMemo(() => {
        return tasks.filter(t => t.scheduledStart && t.scheduledEnd);
    }, [tasks]);

    const getBarStyle = (task: Task) => {
        if (!task.scheduledStart || !task.scheduledEnd) return {};

        const taskStart = new Date(task.scheduledStart);
        const taskEnd = new Date(task.scheduledEnd);

        if (taskEnd < startDate || taskStart > endDate) return { display: 'none' };

        let offset = 0;
        let duration = 0;

        if (viewMode === 'Day') {
            const startDiff = differenceInMinutes(taskStart, startDate);
            const endDiff = differenceInMinutes(taskEnd, startDate);
            offset = (startDiff / 60) * cellWidth;
            duration = ((endDiff - startDiff) / 60) * cellWidth;
        } else {
            const startDiff = differenceInMinutes(taskStart, startDate);
            const endDiff = differenceInMinutes(taskEnd, startDate);
            offset = (startDiff / 1440) * cellWidth;
            duration = ((endDiff - startDiff) / 1440) * cellWidth;
        }

        return {
            left: `${Math.max(0, offset)}px`,
            width: `${Math.max(duration, 4)}px`,
        };
    };

    const handlePrev = () => {
        if (viewMode === 'Day') setCurrentDate(addDays(currentDate, -1));
        else if (viewMode === 'Week') setCurrentDate(subWeeks(currentDate, 1));
        else setCurrentDate(subMonths(currentDate, 1));
    };

    const handleNext = () => {
        if (viewMode === 'Day') setCurrentDate(addDays(currentDate, 1));
        else if (viewMode === 'Week') setCurrentDate(addWeeks(currentDate, 1));
        else setCurrentDate(addMonths(currentDate, 1));
    };

    return (
        <div className="flex h-full flex-col bg-background border rounded-lg overflow-hidden">
            <header className="flex shrink-0 items-center justify-between border-b px-4 py-2 bg-muted/20">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 bg-muted rounded-md p-1">
                        <Button
                            variant={viewMode === 'Day' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('Day')}
                            className="h-7 text-xs"
                        >
                            Day
                        </Button>
                        <Button
                            variant={viewMode === 'Week' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('Week')}
                            className="h-7 text-xs"
                        >
                            Week
                        </Button>
                        <Button
                            variant={viewMode === 'Month' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('Month')}
                            className="h-7 text-xs"
                        >
                            Month
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={handlePrev}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium min-w-[120px] text-center">
                            {viewMode === 'Day' && format(currentDate, 'MMM d, yyyy')}
                            {viewMode === 'Week' && `Week of ${format(startDate, 'MMM d')}`}
                            {viewMode === 'Month' && format(currentDate, 'MMMM yyyy')}
                        </span>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleNext}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setCurrentDate(new Date())}>
                            Today
                        </Button>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 min-h-0">
                <div className="w-64 border-r flex flex-col shrink-0 bg-card z-10 shadow-sm">
                    <div className="h-[50px] border-b flex items-center px-4 font-semibold text-sm bg-muted/10">
                        Tasks
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="flex flex-col">
                            {scheduledTasks.map((task) => (
                                <div
                                    key={task.id}
                                    className="flex items-center px-4 border-b truncate hover:bg-accent/50 cursor-pointer transition-colors"
                                    style={{ height: ROW_HEIGHT }}
                                    onClick={() => onEditTask(task)}
                                >
                                    <div className="truncate text-sm font-medium">{task.name}</div>
                                </div>
                            ))}
                            {scheduledTasks.length === 0 && (
                                <div className="p-4 text-xs text-muted-foreground text-center">
                                    No scheduled tasks.
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>

                <ScrollArea className="flex-1">
                    <div className="flex flex-col min-w-full">
                        <div className="flex border-b bg-muted/5 sticky top-0 z-10" style={{ height: HEADER_HEIGHT }}>
                            {ticks.map((tick, i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-center border-r text-xs text-muted-foreground font-medium shrink-0"
                                    style={{ width: cellWidth }}
                                >
                                    {viewMode === 'Day' ? format(tick, 'HH:mm') : format(tick, 'd MMM')}
                                </div>
                            ))}
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex pointer-events-none">
                                {ticks.map((_, i) => (
                                    <div
                                        key={i}
                                        className="border-r h-full shrink-0 opacity-20"
                                        style={{ width: cellWidth }}
                                    />
                                ))}
                            </div>

                            {scheduledTasks.map((task) => (
                                <div
                                    key={task.id}
                                    className="relative border-b hover:bg-accent/10 transition-colors"
                                    style={{ height: ROW_HEIGHT }}
                                >
                                    <div
                                        className="absolute top-2 bottom-2 rounded-md bg-primary/80 hover:bg-primary cursor-pointer shadow-sm border border-primary-foreground/20 flex items-center px-2 overflow-hidden whitespace-nowrap text-[10px] text-primary-foreground font-medium transition-all"
                                        style={getBarStyle(task)}
                                        onClick={() => onEditTask(task)}
                                    >
                                        {task.name}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </div>
        </div>
    );
}
