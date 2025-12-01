'use client';

import { useState, useEffect } from 'react';
import { Task } from '@/types/entities';
import { ClientAPI } from '@/lib/client-api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Loader2, Calendar } from 'lucide-react';
import { reviveDates } from '@/lib/utils/date-utils';
import { TASK_TYPE_ICONS } from '@/lib/constants/app-constants';
import { TaskType, TaskStatus } from '@/types/enums';

interface TaskHistoryViewProps {
    onSelectTask?: (task: Task) => void;
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
    const [selectedMonth, setSelectedMonth] = useState<string>('');
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
                    if (data.length > 0) {
                        setSelectedMonth(data[0].key);
                    }
                }
            } catch (error) {
                console.error('Failed to load archive months:', error);
            } finally {
                setIsLoadingMonths(false);
            }
        };
        loadMonths();
    }, []);

    // Load tasks for selected month
    useEffect(() => {
        if (!selectedMonth) return;

        const loadTasks = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`/api/archive/tasks?month=${selectedMonth}`);
                if (response.ok) {
                    const data = await response.json();
                    setTasks(reviveDates(data));
                }
            } catch (error) {
                console.error('Failed to load archived tasks:', error);
                setTasks([]);
            } finally {
                setIsLoading(false);
            }
        };

        loadTasks();
    }, [selectedMonth]);

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
                <div className="w-[200px]">
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Month" />
                        </SelectTrigger>
                        <SelectContent>
                            {months.map((month) => (
                                <SelectItem key={month.key} value={month.key}>
                                    {month.label} ({month.summary.tasks})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="text-center text-muted-foreground py-10">
                        No collected tasks found for this month.
                    </div>
                ) : (
                    tasks.map((task) => {
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
                                        <div className="font-medium truncate">{task.name}</div>
                                        <div className="text-xs text-muted-foreground flex gap-2">
                                            <span>{task.station}</span>
                                            <span>•</span>
                                            <span>Collected: {task.collectedAt ? format(new Date(task.collectedAt), 'PP p') : 'Unknown'}</span>
                                        </div>
                                    </div>
                                    <div className="text-xs font-mono bg-muted px-2 py-1 rounded">
                                        {task.status}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
}
