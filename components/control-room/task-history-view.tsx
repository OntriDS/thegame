'use client';

import { useState, useEffect } from 'react';
import { Task } from '@/types/entities';
import { ClientAPI } from '@/lib/client-api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MonthSelector } from '@/components/ui/month-selector';
import { getCurrentMonthKey, sortMonthKeys } from '@/lib/utils/date-utils';
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
    parentName?: string;
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
        const visitedIds = new Set<string>();

        while (currentId) {
            if (visitedIds.has(currentId)) {
                console.warn(`[task-history-view] Circular reference detected! Breaking loop at task ID: ${currentId}`);
                break;
            }
            visitedIds.add(currentId);

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

        // NEW: Store the actual parent name for rendering
        if (task.parentId && allTaskMap.has(task.parentId)) {
            enrichedTask.parentName = allTaskMap.get(task.parentId)!.name;
        }

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
        // Group by the name of the parent to display it cleanly, or fallback to 'Unknown Parent' if it has an ID but wasn't mapped
        const parentKey = task._hasCollectedParent
            ? task._displayParentId
            : (task.parentId ? (task as any).parentName || 'Unknown Parent' : undefined);

        if (parentKey && groupedTasks.has(parentKey)) {
            groupedTasks.get(parentKey)!.push(task);
        } else if (parentKey) {
            groupedTasks.set(parentKey, [task]);
        } else {
            // No parent to group under
            orphanTasks.push(task);
        }
    });

    return (
        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
            {groupedTasks.size === 0 && orphanTasks.length === 0 ? (
                <div className="text-center text-muted-foreground py-10">
                    No completed tasks found for this month.
                </div>
            ) : (
                <>
                    {/* Orphaned tasks at top level */}
                    {orphanTasks.map((task) => {
                        const Icon = TASK_TYPE_ICONS[task.type as TaskType] || TASK_TYPE_ICONS[TaskType.ASSIGNMENT];
                        return (
                            <Card
                                key={task.id}
                                className={`hover:bg-muted/50 transition-colors cursor-pointer border-l-4 ${task.status === TaskStatus.COLLECTED ? 'border-l-emerald-500' : 'border-l-green-400'}`}
                                onClick={() => onSelectTask?.(task)}
                            >
                                <CardContent className="p-3 flex items-center gap-3">
                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate">{(task as any)?.name?.toString()?.trim() || '(Untitled Task)'}</div>
                                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                            <span className="px-1.5 py-0.5 bg-muted rounded-sm text-[10px] font-semibold uppercase tracking-wider">
                                                {(task as any)?.station?.toString()?.trim() || 'Unknown'}
                                            </span>
                                            {task.status === TaskStatus.COLLECTED ? (
                                                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400/80 font-medium whitespace-nowrap">
                                                    <span>Done: {
                                                        !task || !(task as any).doneAt ? 'Unknown' : (() => {
                                                            const d = new Date((task as any).doneAt as any);
                                                            return isNaN(d.getTime()) ? 'Unknown' : format(d, 'PP');
                                                        })()}
                                                    </span>
                                                    <span className="opacity-50">•</span>
                                                    <span>Collected: {
                                                        !task || !(task as any).collectedAt ? 'Unknown' : (() => {
                                                            const d = new Date((task as any).collectedAt as any);
                                                            return isNaN(d.getTime()) ? 'Unknown' : format(d, 'PP');
                                                        })()}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-green-600 dark:text-green-400/80 font-medium">
                                                    Completed: {
                                                        !task || !(task as any).doneAt
                                                            ? 'Unknown'
                                                            : (() => {
                                                                const d = new Date((task as any).doneAt as any);
                                                                return isNaN(d.getTime()) ? 'Unknown' : format(d, 'PP p');
                                                            })()
                                                    }
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}

                    {/* Grouped tasks with parent headers */}
                    {Array.from(groupedTasks.entries()).map(([parentName, childTasks]) => {
                        return (
                            <div key={parentName} className="space-y-2 mb-4">
                                {/* True Parent Header */}
                                <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium px-2 py-1 bg-muted/30 rounded-md border border-muted">
                                    <FolderOpen className="h-4 w-4" />
                                    <span>{parentName}</span>
                                </div>

                                {/* Child tasks */}
                                <div className="ml-4 space-y-2">
                                    {childTasks.map((task, index) => {
                                        const Icon = TASK_TYPE_ICONS[task.type as TaskType] || TASK_TYPE_ICONS[TaskType.ASSIGNMENT];
                                        const isFirstChild = index === 0;

                                        return (
                                            <Card
                                                key={task.id}
                                                className={`hover:bg-muted/50 transition-colors cursor-pointer border-l-4 ${task.status === TaskStatus.COLLECTED ? 'border-l-emerald-500' : 'border-l-green-400'}`}
                                                onClick={() => onSelectTask?.(task)}
                                            >
                                                <CardContent className="p-3 flex items-center gap-3">
                                                    <div className="flex items-center">
                                                        {isFirstChild && <ChevronRight className="h-3 w-3 text-muted-foreground mr-2" />}
                                                        <Icon className="h-4 w-4 text-muted-foreground" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium truncate">{(task as any)?.name?.toString()?.trim() || '(Untitled Task)'}</div>
                                                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                                            <span className="px-1.5 py-0.5 bg-muted rounded-sm text-[10px] font-semibold uppercase tracking-wider">
                                                                {(task as any)?.station?.toString()?.trim() || 'Unknown'}
                                                            </span>
                                                            {task.status === TaskStatus.COLLECTED ? (
                                                                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400/80 font-medium whitespace-nowrap">
                                                                    <span>Done: {
                                                                        !task || !(task as any).doneAt ? 'Unknown' : (() => {
                                                                            const d = new Date((task as any).doneAt as any);
                                                                            return isNaN(d.getTime()) ? 'Unknown' : format(d, 'PP');
                                                                        })()}
                                                                    </span>
                                                                    <span className="opacity-50">•</span>
                                                                    <span>Collected: {
                                                                        !task || !(task as any).collectedAt ? 'Unknown' : (() => {
                                                                            const d = new Date((task as any).collectedAt as any);
                                                                            return isNaN(d.getTime()) ? 'Unknown' : format(d, 'PP');
                                                                        })()}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-green-600 dark:text-green-400/80 font-medium">
                                                                    Completed: {
                                                                        !task || !(task as any).doneAt
                                                                            ? 'Unknown'
                                                                            : (() => {
                                                                                const d = new Date((task as any).doneAt as any);
                                                                                return isNaN(d.getTime()) ? 'Unknown' : format(d, 'PP p');
                                                                            })()
                                                                    }
                                                                </span>
                                                            )}
                                                        </div>
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
}export default function TaskHistoryView({ onSelectTask }: TaskHistoryViewProps) {
    const [availableMonths, setAvailableMonths] = useState<string[]>([]);
    const [selectedMonthKey, setSelectedMonthKey] = useState(getCurrentMonthKey());
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMonths, setIsLoadingMonths] = useState(true);
    // Load available months
    useEffect(() => {
        const loadMonths = async () => {
            try {
                const months = await ClientAPI.getAvailableSummaryMonths();
                const current = getCurrentMonthKey();
                const allMonths = months.includes(current) ? months : [current, ...months];
                setAvailableMonths(sortMonthKeys(allMonths));
            } catch (error) {
                console.error('Failed to load archive months:', error);
                setAvailableMonths([getCurrentMonthKey()]);
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
                const [mm, yy] = selectedMonthKey.split('-');
                const monthNum = parseInt(mm, 10);
                const yearNum = 2000 + parseInt(yy, 10);

                // Load collected tasks from history API
                const collectedResponse = await fetch(`/api/tasks/history?month=${monthNum}&year=${yearNum}`);
                if (collectedResponse.ok) {
                    const collectedData = await collectedResponse.json();

                    // Load all tasks to build parent relationships (using ClientAPI for consistency)
                    const allTasks = reviveDates(await ClientAPI.getTasks());

                    // Merge data and build hierarchy
                    setTasks(buildTaskHierarchy(collectedData, allTasks as any));
                }
            } catch (error) {
                console.error('Failed to load task history:', error);
                setTasks([]);
            } finally {
                setIsLoading(false);
            }
        };

        loadTasks();
    }, [selectedMonthKey]);

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
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Calendar className="h-6 w-6 text-primary" />
                        Task History
                    </h2>
                    <p className="text-sm text-muted-foreground">Review completed missions and assignments</p>
                </div>
                
                <div className="flex items-center gap-4">
                    {/* Counts match the filtered history list (same month as selector), not rolling summary hash */}
                    {!isLoading && (
                        <div className="flex items-center gap-3 px-3 py-1.5 bg-muted/50 rounded-lg border border-muted text-xs font-medium">
                            <div className="flex items-center gap-1.5">
                                <span className="text-muted-foreground uppercase tracking-tight">Tasks Done:</span>
                                <span className="text-primary font-bold">{tasks.length}</span>
                            </div>
                            <div className="w-px h-3 bg-muted-foreground/20" />
                            <div className="flex items-center gap-1.5">
                                <span className="text-muted-foreground uppercase tracking-tight">Collected:</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                    {tasks.filter(t => t.status === TaskStatus.COLLECTED).length}
                                </span>
                            </div>
                        </div>
                    )}
                    
                    <MonthSelector
                        selectedMonth={selectedMonthKey}
                        availableMonths={availableMonths}
                        onChange={setSelectedMonthKey}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
                        <p className="text-sm text-muted-foreground animate-pulse">Rebuilding hierarchy...</p>
                    </div>
                ) : (
                    renderTaskHierarchy(tasks, onSelectTask)
                )}
            </div>
        </div>
    );
}
