'use client';

import { useState, useEffect, useMemo } from 'react';
import { Task } from '@/types/entities';
import { ClientAPI } from '@/lib/client-api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MonthYearSelector } from '@/components/ui/month-year-selector';
import { format } from 'date-fns';
import { Loader2, Calendar, ChevronRight, FolderOpen } from 'lucide-react';
import { reviveDates } from '@/lib/utils/date-utils';
import { TASK_TYPE_ICONS } from '@/lib/constants/app-constants';
import { TaskType, TaskStatus } from '@/types/enums';

interface TaskHistoryViewProps {
    onSelectTask?: (task: Task) => void;
}

interface EnrichedTask extends Task {
    _parentTrail?: string[];
    _hasCollectedParent?: boolean;
    _displayParentId?: string | null | undefined;
}

// Build hierarchy from collected tasks + all tasks
const buildTaskHierarchy = (collectedTasks: Task[], allTasks: Task[]): EnrichedTask[] => {
    const allTaskMap = new Map(allTasks.map(t => [t.id, t]));
    const collectedTaskMap = new Map(collectedTasks.map(t => [t.id, t]));

    // Build hierarchy for each collected task
    const enrichedTasks = collectedTasks.map(task => {
        const enrichedTask = { ...task } as EnrichedTask;

        // Build parent trail
        const parentTrail: string[] = [];
        let hasCollectedParentInChain = false;
        let currentId: string | null | undefined = task.parentId;

        while (currentId) {
            const parent = allTaskMap.get(currentId);
            if (parent) {
                parentTrail.unshift(parent.name || 'Unknown Parent');
                if (parent.isCollected) {
                    hasCollectedParentInChain = true;
                }
                currentId = parent.parentId;
            } else {
                break;
            }
        }

        enrichedTask._parentTrail = parentTrail;
        enrichedTask._hasCollectedParent = hasCollectedParentInChain;

        enrichedTask._displayParentId = enrichedTask._hasCollectedParent
            ? parentTrail[parentTrail.length - 1]!
            : task.parentId || undefined;

        return enrichedTask;
    });

    return enrichedTasks;
};

// Render tasks with hierarchy and parent trails
function renderTaskHierarchy(tasks: EnrichedTask[], onSelectTask?: (task: Task) => void): JSX.Element {
    // Group tasks by immediate parent
    const groupedTasks = new Map<string, EnrichedTask[]>();
    const orphanTasks: EnrichedTask[] = [];

    tasks.forEach(task => {
        const parentId = task._displayParentId;
        if (parentId && groupedTasks.has(parentId)) {
            groupedTasks.get(parentId)!.push(task);
        } else if (parentId) {
            groupedTasks.set(parentId, [task]);
        } else {
            // No parent to group under
            orphanTasks.push(task);
        }
    });

    return (
        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
            {groupedTasks.size === 0 && orphanTasks.length === 0 ? (
                <div className="text-center text-muted-foreground py-10">
                    No collected tasks found for this month.
                </div>
            ) : (
                <>
                    {/* Orphaned tasks at top level */}
                    {orphanTasks.map((task) => {
                        const Icon = TASK_TYPE_ICONS[task.type as TaskType] || TASK_TYPE_ICONS[TaskType.ASSIGNMENT];
                        return (
                            <Card
                                key={task.id}
                                className="hover:bg-muted/50 transition-colors cursor-pointer border-l-4 border-l-green-500"
                                onClick={() => onSelectTask?.(task)}
                            >
                                <CardContent className="p-3 flex items-center gap-3">
                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate">{(task as any)?.name?.toString()?.trim() || '(Untitled Task)'}</div>
                                        <div className="text-xs text-muted-foreground flex gap-2">
                                            <span>{(task as any)?.station?.toString()?.trim() || 'Unknown'}</span>
                                            <span>•</span>
                                            <span>Collected: {
                                                !task || !(task as any).collectedAt
                                                  ? 'Unknown'
                                                  : (() => {
                                                      const d = new Date((task as any).collectedAt as any);
                                                      return isNaN(d.getTime()) ? 'Unknown' : format(d, 'PP p');
                                                    })()
                                              }</span>
                                        </div>
                                    </div>
                                    <div className="text-xs font-mono bg-muted px-2 py-1 rounded">
                                        {task.status}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}

                    {/* Grouped tasks with parent headers */}
                    {Array.from(groupedTasks.entries()).map(([parentId, childTasks]) => {
                        const parentTask = childTasks[0]; // First child represents the parent

                        if (!parentTask) return null;

                        const Icon = TASK_TYPE_ICONS[parentTask.type as TaskType] || TASK_TYPE_ICONS[TaskType.ASSIGNMENT];
                        const parentCollected = parentTask.isCollected;

                        return (
                            <div key={parentId} className="space-y-2">
                                {/* Parent task */}
                                <Card
                                    className={`hover:bg-muted/50 transition-colors cursor-pointer border-l-4 ${
                                        parentCollected ? 'border-l-blue-500' : 'border-l-green-500'
                                    }`}
                                    onClick={() => onSelectTask?.(parentTask)}
                                >
                                    <CardContent className="p-3 flex items-center gap-3">
                                        <Icon className="h-4 w-4 text-muted-foreground" />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate">{(parentTask as any)?.name?.toString()?.trim() || '(Untitled Task)'}</div>
                                            <div className="text-xs text-muted-foreground flex gap-2">
                                                <span>{(parentTask as any)?.station?.toString()?.trim() || 'Unknown'}</span>
                                                <span>•</span>
                                                <span>Collected: {
                                                    !parentTask || !(parentTask as any).collectedAt
                                                      ? 'Unknown'
                                                      : (() => {
                                                          const d = new Date((parentTask as any).collectedAt as any);
                                                          return isNaN(d.getTime()) ? 'Unknown' : format(d, 'PP p');
                                                        })()
                                                  }</span>
                                                {parentTask._hasCollectedParent && (
                                                    <span className="text-blue-600">• Parent Collected</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-xs font-mono bg-muted px-2 py-1 rounded">
                                            {parentTask.status}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Parent trail */}
                                {parentTask._parentTrail && parentTask._parentTrail.length > 0 && (
                                    <div className="ml-8 mb-2 text-xs text-muted-foreground">
                                        <FolderOpen className="h-3 w-3 inline mr-1" />
                                        <span>{parentTask._parentTrail.join(' → ')}</span>
                                    </div>
                                )}

                                {/* Child tasks */}
                                <div className="ml-4 space-y-2">
                                    {childTasks.map((task, index) => {
                                        const Icon = TASK_TYPE_ICONS[task.type as TaskType] || TASK_TYPE_ICONS[TaskType.ASSIGNMENT];
                                        const isFirstChild = index === 1;

                                        return (
                                            <Card
                                                key={task.id}
                                                className="hover:bg-muted/50 transition-colors cursor-pointer border-l-4 border-l-green-500"
                                                onClick={() => onSelectTask?.(task)}
                                            >
                                                <CardContent className="p-3 flex items-center gap-3">
                                                    <div className="flex items-center">
                                                        {isFirstChild && <ChevronRight className="h-3 w-3 text-muted-foreground mr-2" />}
                                                        <Icon className="h-4 w-4 text-muted-foreground" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium truncate">{(task as any)?.name?.toString()?.trim() || '(Untitled Task)'}</div>
                                                        <div className="text-xs text-muted-foreground flex gap-2">
                                                            <span>{(task as any)?.station?.toString()?.trim() || 'Unknown'}</span>
                                                            <span>•</span>
                                                            <span>Collected: {
                                                                !task || !(task as any).collectedAt
                                                                    ? 'Unknown'
                                                                    : (() => {
                                                                        const d = new Date((task as any).collectedAt as any);
                                                                        return isNaN(d.getTime()) ? 'Unknown' : format(d, 'PP p');
                                                                    })()
                                                            }</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-xs font-mono bg-muted px-2 py-1 rounded">
                                                        {task.status}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </>
            )}
        </div>
    );
}

interface AvailableMonth {
    key: string;
    label: string;
    summary: {
        tasks: number;
    };
}

export default function TaskHistoryView({ onSelectTask }: TaskHistoryViewProps) {
    const [months, setMonths] = useState<AvailableMonth[]>([]);
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1); // 1-12
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMonths, setIsLoadingMonths] = useState(true);

    // Load available months
    useEffect(() => {
        const loadMonths = async () => {
            try {
                const response = await fetch('/api/archive/months');
                if (response.ok) {
                    const data = await response.json();
                    setMonths(data);
                    // No need to set selectedMonth - we use currentMonth/currentYear state
                }
            } catch (error) {
                console.error('Failed to load archive months:', error);
            } finally {
                setIsLoadingMonths(false);
            }
        };
        loadMonths();
    }, []);

    // Load tasks for selected month/year + all tasks for hierarchy
    useEffect(() => {
        const loadTasks = async () => {
            setIsLoading(true);
            try {
                // Load collected tasks
                const collectedResponse = await fetch(`/api/tasks/history?month=${currentMonth}&year=${currentYear}`);
                if (collectedResponse.ok) {
                    const collectedData = await collectedResponse.json();

                    // Load all tasks to build parent relationships
                    const allResponse = await fetch('/api/tasks/all');
                    const allTasks = allResponse.ok ? reviveDates(await allResponse.json()) : [];

                    // Merge data and build hierarchy
                    setTasks(buildTaskHierarchy(collectedData, allTasks));
                }
            } catch (error) {
                console.error('Failed to load task history:', error);
                setTasks([]);
            } finally {
                setIsLoading(false);
            }
        };

        loadTasks();
    }, [currentMonth, currentYear]);

    if (isLoadingMonths) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col space-y-4 p-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Task History
                </h2>
                <MonthYearSelector
                    currentMonth={currentMonth}
                    currentYear={currentYear}
                    onMonthChange={setCurrentMonth}
                    onYearChange={setCurrentYear}
                />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    renderTaskHierarchy(tasks, onSelectTask)
                )}
            </div>
        </div>
    );
}