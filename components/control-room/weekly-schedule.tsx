'use client';

import { useState, useMemo, useEffect } from 'react';
import { Task } from '@/types/entities';
import { TaskType, TaskStatus } from '@/types/enums';
import { format, addDays, startOfWeek, getHours, setHours, setMinutes, differenceInMinutes, isSameDay, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { useThemeColors } from '@/lib/hooks/use-theme-colors';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, Star, Zap, Brain, TrendingUp, Heart, Clock } from 'lucide-react';
import { BUSINESS_STRUCTURE } from '@/types/enums';
import { AREA_COLORS, getStationColorClasses, TASK_STATUS_BADGE_COLORS, getStationColor, SOLID_COLOR_CLASSES } from '@/lib/constants/color-constants';

interface WeeklyScheduleProps {
    tasks: Task[];
    onNewTask: () => void;
    onEditTask: (task: Task) => void;
    onTaskUpdate?: (task: Task) => void;
}

const HOURS_IN_DAY = 24;
const MAX_WORK_HOURS = 12; // Max hours for bar scale

export default function WeeklySchedule({ tasks, onNewTask, onEditTask, onTaskUpdate }: WeeklyScheduleProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [startHour, setStartHour] = useState(6); // Default start hour: 06:00
    const [cellHeight, setCellHeight] = useState(50); // Dynamic cell height (20-100px)

    // DND State
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragState, setDragState] = useState<{
        type: 'move' | 'resize-top' | 'resize-bottom';
        task: Task;
        originalStart: Date;
        originalEnd: Date;
        startY: number;
        startX: number;
        currentY: number;
        currentX: number;
    } | null>(null);

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

    // Helper to get task card color based on Station -> Area mapping
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

        // Get color classes for card
        return getStationColorClasses(task.station, area);
    };

    // Helper to get status badge color (using centralized constants)
    const getStatusBadgeColor = (status: TaskStatus) => {
        return TASK_STATUS_BADGE_COLORS[status] || TASK_STATUS_BADGE_COLORS[TaskStatus.NONE];
    };

    // Helper to get parent task name
    const getParentTaskName = (task: Task) => {
        if (!task.parentId) return null;
        const parent = tasks.find(t => t.id === task.parentId);
        return parent?.name || null;
    };

    // Helper: Round date to nearest 15 minutes
    const snapToGrid = (date: Date) => {
        const minutes = date.getMinutes();
        const rounded = Math.round(minutes / 15) * 15;
        return setMinutes(date, rounded);
    };

    // Global pointer up listener to end drag
    useEffect(() => {
        const handlePointerUp = () => {
            if (dragState && onTaskUpdate) {
                // Determine Day Change
                // Calculate column index based on X position relative to grid
                // (This is simplified; for robust day changing we need refs to day columns)
                // For now, implementing Time Only changes for simplicity in this step, 
                // but the state is ready for Day changes if we add refs.

                // For MVP: Commit the time changes calculated during drag
                if (draggingId) {
                    onTaskUpdate(dragState.task);
                }
            }
            setDraggingId(null);
            setDragState(null);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        const handlePointerMove = (e: PointerEvent) => {
            if (!dragState) return;

            setDragState(prev => {
                if (!prev) return null;

                // Calculate time delta logic
                // Pixels moved
                const deltaY = e.clientY - prev.startY;
                // Minutes moved = (deltaY / cellHeight) * 60
                const minutesMoved = Math.round((deltaY / cellHeight) * 60);

                let newStart = new Date(prev.originalStart);
                let newEnd = new Date(prev.originalEnd);

                if (prev.type === 'move') {
                    // Calculate Date/Day Change
                    // Find the day element under the cursor
                    const elements = document.elementsFromPoint(e.clientX, e.clientY);
                    const dayElement = elements.find(el => el.hasAttribute('data-date'));

                    if (dayElement) {
                        const dateStr = dayElement.getAttribute('data-date');
                        if (dateStr) {
                            const targetDate = new Date(dateStr);

                            // Set the new date parts (Year, Month, Day) from target, keep Time from original + delta
                            // Actually easier: just take targetDate and set hours/mins
                            newStart = new Date(targetDate);
                            newEnd = new Date(targetDate);
                        }
                    }

                    newStart.setHours(prev.originalStart.getHours());
                    newStart.setMinutes(prev.originalStart.getMinutes() + minutesMoved);

                    // Recalculate end based on original duration
                    const duration = differenceInMinutes(prev.originalEnd, prev.originalStart);
                    newEnd = new Date(newStart);
                    newEnd.setMinutes(newStart.getMinutes() + duration);

                } else if (prev.type === 'resize-top') {
                    newStart.setMinutes(prev.originalStart.getMinutes() + minutesMoved);
                    // Prevent end < start
                    if (differenceInMinutes(newEnd, newStart) < 15) {
                        newStart = setMinutes(newEnd, newEnd.getMinutes() - 15);
                    }
                } else if (prev.type === 'resize-bottom') {
                    newEnd.setMinutes(prev.originalEnd.getMinutes() + minutesMoved);
                    // Prevent end < start
                    if (differenceInMinutes(newEnd, newStart) < 15) {
                        newEnd = setMinutes(newStart, newStart.getMinutes() + 15);
                    }
                }

                // Snap to 15 mins
                newStart = snapToGrid(newStart);
                newEnd = snapToGrid(newEnd);

                return {
                    ...prev,
                    currentY: e.clientY,
                    currentX: e.clientX,
                    task: {
                        ...prev.task,
                        scheduledStart: newStart,
                        scheduledEnd: newEnd
                    }
                };
            });
        };

        if (draggingId) {
            window.addEventListener('pointerup', handlePointerUp);
            window.addEventListener('pointermove', handlePointerMove);
        }

        return () => {
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('pointermove', handlePointerMove);
        };
    }, [draggingId, cellHeight, onTaskUpdate, dragState]); // Added dragState to dep array to satisfy linter, though refs are better for perf.

    const handleDragStart = (e: React.PointerEvent, task: Task, type: 'move' | 'resize-top' | 'resize-bottom') => {
        if (!onTaskUpdate) return;

        e.preventDefault();
        e.stopPropagation();

        // Capture initial state
        setDraggingId(task.id);
        setDragState({
            type,
            task: { ...task },
            originalStart: new Date(task.scheduledStart!),
            originalEnd: new Date(task.scheduledEnd!),
            startY: e.clientY,
            startX: e.clientX,
            currentY: e.clientY,
            currentX: e.clientX
        });

        document.body.style.cursor = type === 'move' ? 'grabbing' : 'ns-resize';
        document.body.style.userSelect = 'none';

        // If it's a move, we might need a reference to the container to calculate day changes
    };

    const getTaskStyle = (task: Task) => {
        // Use dragged state if this is the dragged task
        const isDragging = draggingId === task.id;
        const currentTask = (isDragging && dragState) ? dragState.task : task;

        if (!currentTask.scheduledStart || !currentTask.scheduledEnd) return {};

        const start = new Date(currentTask.scheduledStart);
        const end = new Date(currentTask.scheduledEnd);

        // Calculate position relative to startHour
        let startHourVal = getHours(start);
        const startMin = start.getMinutes();

        // Adjust for rotation
        let adjustedStartHour = startHourVal - startHour;
        if (adjustedStartHour < 0) adjustedStartHour += 24;

        // Handle overflow to next day (simplified visual) - if adjusted hour is massive

        const top = (adjustedStartHour * 60 + startMin) * (cellHeight / 60);
        const durationMinutes = differenceInMinutes(end, start);
        const height = durationMinutes * (cellHeight / 60);

        return {
            top: `${top}px`,
            height: `${height}px`,
            zIndex: isDragging ? 50 : 10,
            opacity: isDragging ? 0.9 : 1,
            boxShadow: isDragging ? '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.2)' : undefined,
            cursor: 'grab' // Default cursor for the task body
        };
    };

    const handleStartHourChange = (value: string) => {
        const num = parseInt(value);
        if (!isNaN(num) && num >= 0 && num <= 23) {
            setStartHour(num);
        }
    };

    // Calculate segments for the work bar
    const getDayWorkSegments = (day: Date) => {
        const dayTasks = weeklyTasks.filter(task => isSameDay(new Date(task.scheduledStart!), day));

        // Group minutes and stations by color
        const colorData: Record<string, { minutes: number, stations: Set<string> }> = {};

        dayTasks.forEach(task => {
            // Find area for fallback
            let area: keyof typeof AREA_COLORS | undefined;
            for (const [key, stations] of Object.entries(BUSINESS_STRUCTURE)) {
                if ((stations as readonly string[]).includes(task.station)) {
                    area = key as keyof typeof AREA_COLORS;
                    break;
                }
            }

            // Get base color name (e.g., 'purple', 'green')
            const colorName = getStationColor(task.station, area);

            const duration = differenceInMinutes(new Date(task.scheduledEnd!), new Date(task.scheduledStart!));

            if (!colorData[colorName]) {
                colorData[colorName] = { minutes: 0, stations: new Set() };
            }

            colorData[colorName].minutes += duration;
            colorData[colorName].stations.add(task.station);
        });

        // Convert to segments
        const totalMinutes = MAX_WORK_HOURS * 60;

        return Object.entries(colorData).map(([colorName, data]) => {
            const widthPercentage = (data.minutes / totalMinutes) * 100;
            const stationList = Array.from(data.stations).join(', ');
            const hours = Math.round(data.minutes / 60 * 10) / 10;

            return {
                color: SOLID_COLOR_CLASSES[colorName as keyof typeof SOLID_COLOR_CLASSES] || 'bg-gray-400', // Fallback
                width: widthPercentage,
                minutes: data.minutes,
                tooltip: `${hours}h • ${stationList}`
            };
        });
    };

    // Helper to check if task has any rewards
    const hasRewards = (task: Task) => {
        if (!task.rewards?.points) return false;
        const { xp, rp, fp, hp } = task.rewards.points;
        return (xp > 0 || rp > 0 || fp > 0 || hp > 0);
    };

    // Get individual point types for display with names
    const getPointTypes = (task: Task) => {
        if (!task.rewards?.points) return [];
        const { xp, rp, fp, hp } = task.rewards.points;
        const points = [];
        if (xp > 0) points.push({ type: 'xp', value: xp, icon: Star, label: 'XP', color: 'text-yellow-400' });
        if (rp > 0) points.push({ type: 'rp', value: rp, icon: Brain, label: 'RP', color: 'text-purple-400' });
        if (fp > 0) points.push({ type: 'fp', value: fp, icon: Heart, label: 'FP', color: 'text-pink-400' });
        if (hp > 0) points.push({ type: 'hp', value: hp, icon: Zap, label: 'HP', color: 'text-green-400' });
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
                            {weekDays.map(day => {
                                const segments = getDayWorkSegments(day);

                                return (
                                    <div key={day.toISOString()} className="flex flex-col border-r min-h-full">
                                        {/* Day Header */}
                                        <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur p-3 text-center h-[60px] flex flex-col justify-center gap-1 group hover:bg-muted/30 transition-colors">
                                            <div className="flex items-center justify-center gap-1.5 align-baseline">
                                                <p className={cn("text-sm font-semibold tracking-tight", isSameDay(day, new Date()) && "text-primary")}>
                                                    {format(day, 'EEE').toUpperCase()}
                                                </p>
                                                <span className="text-xs text-muted-foreground font-medium">{format(day, 'd')}</span>
                                                {isSameDay(day, new Date()) && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                            </div>

                                            {/* Segmented Work Bar */}
                                            <div className="h-3 w-full bg-muted/50 rounded-sm overflow-hidden mt-1 flex">
                                                {segments.map((seg, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={cn("h-full transition-all duration-300 hover:brightness-110", seg.color)}
                                                        style={{ width: `${seg.width}%` }}
                                                        title={seg.tooltip}
                                                    />
                                                ))}
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
                                                                className={cn(
                                                                    "absolute left-1 right-1 rounded-md border text-sm shadow-sm hover:shadow-md transition-shadow overflow-visible group hover:z-50",
                                                                    colorClass
                                                                )}
                                                                style={getTaskStyle(task)}
                                                                onPointerDown={(e) => handleDragStart(e, task, 'move')}
                                                            >
                                                                {/* Resize Handle Top */}
                                                                <div
                                                                    className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize z-20 hover:bg-white/30"
                                                                    onPointerDown={(e) => handleDragStart(e, task, 'resize-top')}
                                                                />

                                                                {/* Task Content */}
                                                                <div
                                                                    className="p-2.5 h-full overflow-hidden"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation(); // Prevent drag start from clicking
                                                                        onEditTask(task);
                                                                    }}
                                                                >
                                                                    {/* Header Row: Station | Time | Points */}
                                                                    <div className="flex items-center justify-between mb-1 gap-2 pointer-events-none">
                                                                        {/* Station Badge */}
                                                                        <span className={cn(
                                                                            "font-bold text-[0.7rem] uppercase tracking-wider truncate px-2 py-0.5 rounded",
                                                                            getStatusBadgeColor(task.status)
                                                                        )}>
                                                                            {task.station}
                                                                        </span>

                                                                        {/* Time - Always visible in center */}
                                                                        <span className="text-[0.7rem] text-muted-foreground/80 whitespace-nowrap">
                                                                            {format(new Date(draggingId === task.id && dragState ? dragState.task.scheduledStart! : task.scheduledStart!), 'HH:mm')} -
                                                                            {format(new Date(draggingId === task.id && dragState ? dragState.task.scheduledEnd! : task.scheduledEnd!), 'HH:mm')}
                                                                        </span>

                                                                        {/* Points - Always visible */}
                                                                        {pointTypes.length > 0 && (
                                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                                {pointTypes.map(pt => {
                                                                                    const Icon = pt.icon;
                                                                                    return (
                                                                                        <span key={pt.type} className="text-sm flex items-center gap-1 bg-background/40 rounded px-1.5 py-0.5">
                                                                                            <Icon className={cn("w-3 h-3", pt.color)} />
                                                                                            <span className="font-medium">{pt.label}</span>
                                                                                            <span className="font-semibold">{pt.value}</span>
                                                                                        </span>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Parent Task (if exists) */}
                                                                    {parentName && (
                                                                        <p className="text-[0.5rem] text-muted-foreground/80 truncate leading-tight mb-1 pointer-events-none">
                                                                            ↳ {parentName}
                                                                        </p>
                                                                    )}

                                                                    {/* Task Name */}
                                                                    <p className={cn(
                                                                        "font-semibold truncate transition-colors leading-snug pointer-events-none",
                                                                        isVeryCompact ? "line-clamp-1 text-xs" : isCompact ? "line-clamp-1 text-base" : "line-clamp-2 text-base"
                                                                    )}>
                                                                        {task.name}
                                                                    </p>
                                                                </div>

                                                                {/* Resize Handle Bottom */}
                                                                <div
                                                                    className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize z-20 hover:bg-white/30"
                                                                    onPointerDown={(e) => handleDragStart(e, task, 'resize-bottom')}
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

