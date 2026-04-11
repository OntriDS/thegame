'use client';

import { useState, useEffect } from 'react';
import { Task } from '@/types/entities';
import { ClientAPI } from '@/lib/client-api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MonthSelector } from '@/components/ui/month-selector';
import { getCurrentMonthKey, sortMonthKeys } from '@/lib/utils/date-utils';
import { format } from 'date-fns';
import { Loader2, Calendar, ChevronRight, FolderOpen, ArrowUpDown } from 'lucide-react';
import { reviveDates } from '@/lib/utils/date-utils';
import { TASK_TYPE_ICONS } from '@/lib/constants/app-constants';
import { TaskType, TaskStatus } from '@/types/enums';

interface TaskHistoryViewProps {
    onSelectTask?: (task: Task) => void;
    refreshKey?: number;
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

function formatTaskHistoryDate(value: unknown): string {
    if (value == null || value === '') return 'Unknown';
    const d = new Date(value as string | number | Date);
    return isNaN(d.getTime()) ? 'Unknown' : format(d, 'PP');
}

/** Timeline line for History rows: Done + Collected, or Failed (no collection). */
function TaskHistoryDoneCollectedLine({ task }: { task: Task | EnrichedTask }) {
    if (task.status === TaskStatus.FAILED) {
        const failedLabel = formatTaskHistoryDate(task.doneAt);
        return (
            <div className="flex items-center gap-1.5 font-medium whitespace-nowrap text-red-600 dark:text-red-400/80">
                <span>Failed: {failedLabel}</span>
            </div>
        );
    }
    const doneLabel = formatTaskHistoryDate(task.doneAt);
    const collectedLabel = formatTaskHistoryDate(task.collectedAt);
    const tone =
        task.status === TaskStatus.COLLECTED
            ? 'text-emerald-600 dark:text-emerald-400/80'
            : 'text-green-600 dark:text-green-400/80';
    return (
        <div className={`flex items-center gap-1.5 font-medium whitespace-nowrap ${tone}`}>
            <span>Done: {doneLabel}</span>
            <span className="opacity-50">•</span>
            <span>Collected: {collectedLabel}</span>
        </div>
    );
}

function taskHistoryBorderClass(task: Task | EnrichedTask): string {
    if (task.status === TaskStatus.COLLECTED) return 'border-l-emerald-500';
    if (task.status === TaskStatus.FAILED) return 'border-l-red-500';
    return 'border-l-green-400';
}

// Sort orphan tasks by the selected criteria
const sortOrphanTasks = (tasks: EnrichedTask[], sortOption: TaskHistorySort): EnrichedTask[] => {
    const sortedTasks = [...tasks];
    if (sortOption === 'done-date') {
        return sortedTasks.sort((a, b) => {
            const dateA = new Date(a.doneAt || 0).getTime();
            const dateB = new Date(b.doneAt || 0).getTime();
            return dateB - dateA; // Newest first
        });
    } else {
        // name-asc
        return sortedTasks.sort((a, b) => {
            const nameA = (a as any)?.name?.toString()?.toLowerCase() || '';
            const nameB = (b as any)?.name?.toString()?.toLowerCase() || '';
            return nameA.localeCompare(nameB);
        });
    }
};

// Sort parent groups and child tasks within each group
const sortGroupedTasks = (groupedTasks: Map<string, EnrichedTask[]>, sortOption: TaskHistorySort): Array<[string, EnrichedTask[]]> => {
    const entries = Array.from(groupedTasks.entries());

    if (sortOption === 'done-date') {
        // Sort by parent done date (use first child's done date as proxy for parent)
        return entries.sort(([parentNameA, childTasksA], [parentNameB, childTasksB]) => {
            const doneDateA = childTasksA.length > 0 ? new Date(childTasksA[0].doneAt || 0).getTime() : 0;
            const doneDateB = childTasksB.length > 0 ? new Date(childTasksB[0].doneAt || 0).getTime() : 0;
            return doneDateB - doneDateA; // Newest parent first
        }).map(([parentName, childTasks]) => {
            // Sort child tasks within each parent group by done date
            const sortedChildren = [...childTasks].sort((a, b) => {
                const doneDateA = new Date(a.doneAt || 0).getTime();
                const doneDateB = new Date(b.doneAt || 0).getTime();
                return doneDateB - doneDateA; // Newest first
            });
            return [parentName, sortedChildren];
        });
    } else {
        // name-asc: Sort by parent name, then by child names within each group
        return entries.sort(([parentNameA], [parentNameB]) => {
            return parentNameA.localeCompare(parentNameB);
        }).map(([parentName, childTasks]) => {
            // Sort child tasks within each parent group by name
            const sortedChildren = [...childTasks].sort((a, b) => {
                const nameA = (a as any)?.name?.toString()?.toLowerCase() || '';
                const nameB = (b as any)?.name?.toString()?.toLowerCase() || '';
                return nameA.localeCompare(nameB);
            });
            return [parentName, sortedChildren];
        });
    }
};

// Render tasks with hierarchy and parent trails
function renderTaskHierarchy(
  tasks: EnrichedTask[],
  onSelectTask: ((task: Task) => void) | undefined,
  sortOption: TaskHistorySort
): JSX.Element {
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

    // Apply sorting to both orphan tasks and grouped tasks
    const sortedOrphanTasks = sortOrphanTasks(orphanTasks, sortOption);
    const sortedGroupedTasks = sortGroupedTasks(groupedTasks, sortOption);

    return (
        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
            {groupedTasks.size === 0 && orphanTasks.length === 0 ? (
                <div className="text-center text-muted-foreground py-10">
                    No archived tasks found for this month.
                </div>
            ) : (
                <>
                    {/* Orphaned tasks at top level */}
                    {sortedOrphanTasks.map((task) => {
                        const Icon = TASK_TYPE_ICONS[task.type as TaskType] || TASK_TYPE_ICONS[TaskType.ASSIGNMENT];
                        return (
                            <Card
                                key={task.id}
                                className={`hover:bg-muted/50 transition-colors cursor-pointer border-l-4 ${taskHistoryBorderClass(task)}`}
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
                                            <TaskHistoryDoneCollectedLine task={task} />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}

                    {/* Grouped tasks with parent headers */}
                    {sortedGroupedTasks.map(([parentName, childTasks]) => {
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
                                                className={`hover:bg-muted/50 transition-colors cursor-pointer border-l-4 ${taskHistoryBorderClass(task)}`}
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
                                                            <TaskHistoryDoneCollectedLine task={task} />
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
}

export type TaskHistorySort = 'done-date' | 'name-asc';

export default function TaskHistoryView({ onSelectTask, refreshKey = 0 }: TaskHistoryViewProps) {
    const [availableMonths, setAvailableMonths] = useState<string[]>([]);
    const [selectedMonthKey, setSelectedMonthKey] = useState(getCurrentMonthKey());
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMonths, setIsLoadingMonths] = useState(true);
    const [sortOption, setSortOption] = useState<TaskHistorySort>('done-date');
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
    }, [selectedMonthKey, refreshKey]);

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
                    <p className="text-sm text-muted-foreground">Review done, collected, and failed tasks</p>
                </div>
                
                <div className="flex items-center gap-4">
                    {/* Counts match the filtered history list (same month as selector), not rolling summary hash */}
                    {!isLoading && (
                        <div className="flex items-center gap-3 px-3 py-1.5 bg-muted/50 rounded-lg border border-muted text-xs font-medium">
                            <div className="flex items-center gap-1.5">
                                <span className="text-muted-foreground uppercase tracking-tight">Total:</span>
                                <span className="text-primary font-bold">{tasks.length}</span>
                            </div>
                            <div className="w-px h-3 bg-muted-foreground/20" />
                            <div className="flex items-center gap-1.5">
                                <span className="text-muted-foreground uppercase tracking-tight">Done:</span>
                                <span className="text-green-600 dark:text-green-400 font-bold">
                                    {tasks.filter(t => t.status === TaskStatus.DONE).length}
                                </span>
                            </div>
                            <div className="w-px h-3 bg-muted-foreground/20" />
                            <div className="flex items-center gap-1.5">
                                <span className="text-muted-foreground uppercase tracking-tight">Collected:</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                    {tasks.filter(t => t.status === TaskStatus.COLLECTED).length}
                                </span>
                            </div>
                            <div className="w-px h-3 bg-muted-foreground/20" />
                            <div className="flex items-center gap-1.5">
                                <span className="text-muted-foreground uppercase tracking-tight">Failed:</span>
                                <span className="text-red-600 dark:text-red-400 font-bold">
                                    {tasks.filter(t => t.status === TaskStatus.FAILED).length}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-xs">
                            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                            <Select value={sortOption} onValueChange={(value: TaskHistorySort) => setSortOption(value)}>
                                <SelectTrigger className="w-36 h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="done-date">Done Date</SelectItem>
                                    <SelectItem value="name-asc">Name A-Z</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <MonthSelector
                            selectedMonth={selectedMonthKey}
                            availableMonths={availableMonths}
                            onChange={setSelectedMonthKey}
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
                        <p className="text-sm text-muted-foreground animate-pulse">Rebuilding hierarchy...</p>
                    </div>
                ) : (
                    renderTaskHierarchy(tasks, onSelectTask, sortOption)
                )}
            </div>
        </div>
    );
}
