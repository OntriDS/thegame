'use client';

import { TreeNode } from '@/lib/utils/tree-utils';
import { Task } from '@/types/entities';
import { TaskType, TaskStatus, TaskPriority } from '@/types/enums';
import { getAllStationNames } from '@/lib/utils/searchable-select-utils';
import { TASK_STATUS_COLORS } from '@/lib/constants/color-constants';
import { TASK_TYPE_ICONS } from '@/lib/constants/icon-maps';
import { getPointsMetadata, hasAnyPoints } from '@/lib/utils/points-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Edit, BarChart, CheckSquare, Flag, ChevronsRight, Users, Copy, Check, ChevronDown, Tag, Play } from 'lucide-react';
import TaskModal from '@/components/modals/task-modal';
import { useState, useRef, useEffect } from 'react';
import { ClientAPI } from '@/lib/client-api';
import { ORDER_INCREMENT } from '@/lib/constants/app-constants';
import { formatDisplayDate } from '@/lib/utils/date-utils';
import { fromRecurrentUTC } from '@/lib/utils/recurrent-date-utils';
import { computeNextSiblingOrder } from '@/lib/utils/task-order-utils';
import { useThemeColors } from '@/lib/hooks/use-theme-colors';
import ConfirmationModal from '@/components/modals/submodals/confirmation-submodal';

interface TaskDetailViewProps {
  node: TreeNode | null;
  onEditTask: (task: Task) => void;
  onTaskUpdate?: () => void;
  /** Used to assign sibling order (1000, 2000, …) for quick-create prefills instead of Date.now(). */
  allTasks?: Task[];
}

// Re-use the same icon mapping from the tree for consistency
const categoryIcons = TASK_TYPE_ICONS;

// Use centralized status colors from enums
const getStatusColor = (status: string, isDarkMode: boolean = false) => {
  const taskStatus = Object.values(TaskStatus).find(ts => ts === status);
  if (taskStatus && TASK_STATUS_COLORS[taskStatus]) {
    return isDarkMode ? TASK_STATUS_COLORS[taskStatus].dark : TASK_STATUS_COLORS[taskStatus].light;
  }

  // Default fallback
  return isDarkMode ? TASK_STATUS_COLORS[TaskStatus.NONE].dark : TASK_STATUS_COLORS[TaskStatus.NONE].light;
};

export default function TaskDetailView({ node, onEditTask, onTaskUpdate, allTasks = [] }: TaskDetailViewProps) {
  const { isDarkMode } = useThemeColors();
  const Icon = node ? (categoryIcons[node.task.type as keyof typeof categoryIcons] || CheckSquare) : BarChart;
  const MilestoneIcon = categoryIcons[TaskType.MILESTONE] || CheckSquare;
  const GoalIcon = categoryIcons[TaskType.GOAL] || CheckSquare;

  // Inline editing states
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');

  const [showDuplicateSuccess, setShowDuplicateSuccess] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<number>(0);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [prefillTemplateTask, setPrefillTemplateTask] = useState<Task | null>(null);
  const [showMissionTreeModal, setShowMissionTreeModal] = useState(false);
  const [prefillMissionTreeTask, setPrefillMissionTreeTask] = useState<Task | null>(null);
  const [spawnErrorMessage, setSpawnErrorMessage] = useState<string | null>(null);
  const [isSpawnErrorOpen, setIsSpawnErrorOpen] = useState(false);
  const [nextSpawnDate, setNextSpawnDate] = useState<Date | null>(null);
  const [isNextSpawnLoading, setIsNextSpawnLoading] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // No initialization needed for ClientAPI

  // Sync currentProgress with task progress
  useEffect(() => {
    if (node) {
      setCurrentProgress(node.task.progress || 0);
    }
  }, [node]);

  // Reset description expansion when task changes
  useEffect(() => {
    setIsDescriptionExpanded(false);
  }, [node]);

  // Load next spawn preview for recurrent templates
  useEffect(() => {
    const loadNextSpawn = async () => {
      if (!node || node.task.type !== TaskType.RECURRENT_TEMPLATE || !node.task.frequencyConfig) {
        setNextSpawnDate(null);
        return;
      }
      try {
        setIsNextSpawnLoading(true);
        const resp = await fetch(`/api/tasks/${node.task.id}/spawn-next?preview=1`, { method: 'POST' });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok || !data?.success) {
          if (data.error) {
            console.error('Spawn Next Error:', data.error);
            setNextSpawnDate(null);
          } else {
            setNextSpawnDate(null);
          }
          return;
        }
        // Convert UTC midnight date to local for display
        setNextSpawnDate(data.nextDate ? fromRecurrentUTC(new Date(data.nextDate)) : null);
      } catch (err) {
        console.error('Failed to preview next spawn date:', err);
        setNextSpawnDate(null);
      } finally {
        setIsNextSpawnLoading(false);
      }
    };
    void loadNextSpawn();
  }, [node]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingField]);

  // Inline editing handlers
  const startEditing = (field: string, currentValue: any) => {
    setEditingField(field);
    setTempValue(currentValue?.toString() || '');
  };

  const saveEdit = async () => {
    if (!node || !editingField) return;

    let updatedTask: Task = {
      ...node.task,
      // Clear completion timestamps - The Ribosome will set them if task is completing
      doneAt: undefined,
      collectedAt: undefined
    };

    switch (editingField) {
      case 'status':
        updatedTask.status = tempValue as TaskStatus;
        break;
      case 'priority':
        updatedTask.priority = tempValue as TaskPriority;
        break;
      case 'type':
        updatedTask.type = tempValue as TaskType;
        break;
      case 'station':
        updatedTask.station = tempValue as any;
        // Station is now the primary field - no category reset needed
        break;
    }

    // Save task - The Ribosome (processTaskEffects) will handle:
    // - Completion detection (reads task.status DNA)
    // - Item creation (reads outputItemType DNA)
    // - Financial record creation (reads cost/revenue DNA)
    // - Rewards (reads task.rewards DNA)
    // - Links creation (reads all Ambassador fields)
    await ClientAPI.upsertTask(updatedTask);

    // Trigger parent update to refresh the selected node
    onTaskUpdate?.();



    setEditingField(null);
    setTempValue('');
  };

  const cancelEdit = () => {
    setEditingField(null);
    setTempValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  // Logging is handled server-side automatically in the new architecture

  // Duplicate task handler
  const handleDuplicateTask = async () => {
    if (!node) return;

    setIsDuplicating(true);

    try {
      const newId = crypto.randomUUID();
      const duplicatedTask: Task = {
        ...node.task,
        id: newId,
        name: node.task.name,
        status: TaskStatus.CREATED,
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        parentId: node.task.parentId || null,
        order:
          allTasks.length > 0
            ? computeNextSiblingOrder(allTasks, node.task.parentId ?? null, newId)
            : (Number(node.task.order) || 0) + ORDER_INCREMENT,
      };

      // Save the task first - logging is handled server-side automatically
      // Skip duplicate check since this is an intentional duplicate operation
      await ClientAPI.upsertTask(duplicatedTask, { skipDuplicateCheck: true });

      setShowDuplicateSuccess(true);
      setTimeout(() => setShowDuplicateSuccess(false), 2000);
      onTaskUpdate?.();
      setShowDuplicateModal(false);
    } catch (error) {
      console.error('Failed to duplicate task:', error);
      // You could show an error message here if needed
    } finally {
      setIsDuplicating(false);
    }
  };

  // Open Template Modal prefilled from Recurrent Parent
  const handleOpenTemplateFromParent = () => {
    if (!node) return;
    const parent = node.task;
    if (parent.type !== TaskType.RECURRENT_GROUP) return;
    const prefillId = crypto.randomUUID();
    const prefill: Task = {
      id: prefillId,
      name: `${parent.name} • Template`,
      description: parent.description || '',
      type: TaskType.RECURRENT_TEMPLATE,
      status: TaskStatus.CREATED,
      priority: parent.priority || TaskPriority.NORMAL,
      station: parent.station as any,
      progress: 0,
      order:
        allTasks.length > 0
          ? computeNextSiblingOrder(allTasks, parent.id, prefillId)
          : ORDER_INCREMENT,
      parentId: parent.id,
      isRecurrentGroup: false,
      isTemplate: true,
      frequencyConfig: undefined, // Do not set by default
      dueDate: parent.dueDate ? new Date(parent.dueDate) : undefined,
      siteId: parent.siteId,
      targetSiteId: parent.targetSiteId,
      cost: 0,
      revenue: 0,
      isNotPaid: false,
      isNotCharged: false,
      rewards: { points: { xp: 0, rp: 0, fp: 0, hp: 0 } },
      createdAt: new Date(),
      updatedAt: new Date(),
      isCollected: false,
      links: [] // initialize links array
    };
    setPrefillTemplateTask(prefill);
    setShowTemplateModal(true);
  };

  const handleSpawnNext = async () => {
    if (!node) return;
    try {
      const response = await fetch(`/api/tasks/${node.task.id}/spawn-next`, { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || (data && data.success === false)) {
        const message = data?.error || 'Failed to spawn instance.';
        const code = data?.errorCode;
        
        let detailedMessage = message;
        if (code === 'SAFETY_LIMIT_EXCEEDED') {
          detailedMessage = "Safety limit reached. This template has expired based on its End Date or Due Date.";
        } else if (code === 'STOP_TIMES_REACHED') {
          detailedMessage = "Execution limit reached. This template has already spawned the maximum number of times allowed.";
        } else if (code === 'NO_MORE_CUSTOM_DATES') {
          detailedMessage = "Custom date list exhausted. There are no more predefined dates left to spawn.";
        }

        setSpawnErrorMessage(detailedMessage);
        setIsSpawnErrorOpen(true);
        return;
      }
      onTaskUpdate?.();
    } catch (err) {
      console.error('Error spawning next instance:', err);
      setSpawnErrorMessage('Unexpected error while spawning the next instance.');
      setIsSpawnErrorOpen(true);
    }
  };

  // Open Mission Tree Modal with appropriate type and parent
  const handleOpenMissionTreeTask = (taskType: TaskType) => {
    if (!node) return;
    const parent = node.task;
    const prefillId = crypto.randomUUID();
    const prefill: Task = {
      id: prefillId,
      name: taskType === TaskType.MILESTONE ? `${parent.name} • Milestone` :
        taskType === TaskType.GOAL ? `${parent.name} • Goal` : 'New Task',
      description: '',
      type: taskType,
      status: TaskStatus.CREATED,
      priority: parent.priority || TaskPriority.NORMAL,
      station: parent.station as any,
      progress: 0,
      order:
        allTasks.length > 0
          ? computeNextSiblingOrder(allTasks, parent.id, prefillId)
          : ORDER_INCREMENT,
      parentId: parent.id,
      isRecurrentGroup: false,
      isTemplate: false,
      frequencyConfig: undefined,
      dueDate: undefined,
      siteId: parent.siteId,
      targetSiteId: parent.targetSiteId,
      cost: 0,
      revenue: 0,
      isNotPaid: false,
      isNotCharged: false,
      rewards: { points: { xp: 0, rp: 0, fp: 0, hp: 0 } },
      createdAt: new Date(),
      updatedAt: new Date(),
      isCollected: false,
      links: [] // initialize links array
    };
    setPrefillMissionTreeTask(prefill);
    setShowMissionTreeModal(true);
  };

  if (!node) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-muted/20">
        <BarChart className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h3 className="text-xl font-bold text-muted-foreground">Select a Task</h3>
        <p className="text-sm text-muted-foreground">Choose an item from the tree to see its details.</p>
      </div>
    );
  }

  const { task, children } = node;

  const hasTemplateChild =
    task.type === TaskType.RECURRENT_GROUP &&
    children.some(child => child.task.type === TaskType.RECURRENT_TEMPLATE);

  if (task.type === TaskType.AUTOMATION) {
    return (
      <div className="h-full overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center text-center">
        <Icon className="h-16 w-16 text-purple-600/50 mb-4" />
        <h2 className="text-2xl font-bold mb-2">{task.name}</h2>
        <p className="text-muted-foreground max-w-md mb-8">
          {task.description || "This is a programmatic system automation. It runs securely in the background on its scheduled routine."}
        </p>

        <div className="p-6 border rounded-xl bg-card shadow-sm w-full max-w-md space-y-4">
          <h3 className="font-semibold text-lg text-left">Manual Override</h3>
          <p className="text-sm text-left text-muted-foreground mb-4">
            Execute these automations immediately. This will trigger the backend workflow independent of the cron schedule.
          </p>

          <div className="flex flex-col gap-3">
            {/* Master Trigger */}
            <Button
              variant="default"
              size="lg"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white border-0 shadow-md font-bold"
              onClick={async () => {
                try {
                  const now = new Date();
                  await ClientAPI.collectAllEntities(now.getMonth() + 1, now.getFullYear());
                  alert(`Mega-Collection Complete! Successfully processed all items.`);
                } catch (error: any) {
                  alert(`Collection Failed: ${error.message}`);
                }
              }}
            >
              <Play className="h-5 w-5 mr-2" />
              Run All Monthly Rewards
            </Button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Individual Collections</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={async () => {
                  try {
                    const now = new Date();
                    const res = await ClientAPI.bulkCollectTasks(now.getMonth() + 1, now.getFullYear());
                    alert(`Tasks Collection Complete! Processed ${(res as any).collected || 0} records.`);
                  } catch (error: any) { alert(error.message); }
                }}
              >
                Tasks Only
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={async () => {
                  try {
                    const now = new Date();
                    const res = await ClientAPI.collectSales(now.getMonth() + 1, now.getFullYear());
                    alert(`Sales Collection Complete! Processed ${(res as any).collected || 0} records.`);
                  } catch (error: any) { alert(error.message); }
                }}
              >
                Sales Only
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold leading-tight">{task.name}</h1>
            {editingField === 'type' ? (
              <Select value={tempValue} onValueChange={setTempValue} onOpenChange={(open) => !open && saveEdit()}>
                <SelectTrigger className="h-8 text-xs w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TaskType).map((type) => (
                    <SelectItem key={type} value={type} className="text-xs">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2">
                <span
                  className="inline-block px-2 py-1 text-xs font-medium bg-muted text-muted-foreground rounded border cursor-pointer hover:bg-muted/80"
                  onClick={() => startEditing('type', task.type)}
                >
                  {task.type}
                </span>

                {/* Financial Status Badges */}
                {task.isNotPaid && (
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${TASK_STATUS_COLORS[TaskStatus.FAILED][isDarkMode ? 'dark' : 'light']}`}>
                    Not Paid
                  </span>
                )}
                {task.isNotCharged && (
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${TASK_STATUS_COLORS[TaskStatus.CREATED][isDarkMode ? 'dark' : 'light']}`}>
                    Not Charged
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {task.type === TaskType.RECURRENT_TEMPLATE && (
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleSpawnNext}>
                    Spawn
                  </Button>
                  <span className="text-[10px] font-medium text-primary">
                    {isNextSpawnLoading
                      ? 'Calculating...'
                      : nextSpawnDate
                        ? `Next: ${formatDisplayDate(nextSpawnDate)}`
                        : 'No next date'}
                  </span>
                </div>
                {(task.recurrenceStart || task.recurrenceEnd) && (
                  <div className="flex gap-2 text-[9px] text-muted-foreground uppercase tracking-wider">
                    {task.recurrenceStart && <span>Start: {formatDisplayDate(fromRecurrentUTC(task.recurrenceStart))}</span>}
                    {task.recurrenceEnd && <span>End: {formatDisplayDate(fromRecurrentUTC(task.recurrenceEnd))}</span>}
                  </div>
                )}
              </div>
            )}
            {task.type === TaskType.RECURRENT_GROUP && (
              <Button
                variant={hasTemplateChild ? 'default' : 'outline'}
                size="sm"
                onClick={handleOpenTemplateFromParent}
                className={hasTemplateChild ? 'border-primary bg-primary/10' : undefined}
              >
                Template
              </Button>
            )}
            {(task.type === TaskType.MISSION || task.type === TaskType.MILESTONE) && (
              <>
                {task.type === TaskType.MISSION && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenMissionTreeTask(TaskType.MILESTONE)}
                  >
                    <MilestoneIcon className="h-4 w-4 mr-2" />
                    Milestone
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenMissionTreeTask(TaskType.GOAL)}
                >
                  <GoalIcon className="h-4 w-4 mr-2" />
                  Goal
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDuplicateModal(true)}
              className={showDuplicateSuccess ? `${TASK_STATUS_COLORS[TaskStatus.DONE][isDarkMode ? 'dark' : 'light']} border-green-300` : ""}
            >
              {showDuplicateSuccess ? (
                <Check className={`h-4 w-4 mr-2 ${TASK_STATUS_COLORS[TaskStatus.DONE][isDarkMode ? 'dark' : 'light'].replace('bg-', 'text-').replace('-800', '-600').replace('-900', '-200')}`} />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {showDuplicateSuccess ? "Copied!" : "Duplicate"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => onEditTask(task)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <div className="mb-4">
            <div
              className="text-muted-foreground max-w-prose text-sm cursor-pointer hover:bg-muted/20 rounded p-2 -m-2 transition-colors"
              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
            >
              <div className={`whitespace-pre-line ${isDescriptionExpanded ? '' : 'line-clamp-1'}`}>
                {task.description}
              </div>
              <div className="flex items-center justify-between mt-1">
                <div className="text-xs text-muted-foreground/60">
                  {isDescriptionExpanded ? 'Click to collapse' : 'Click to expand'}
                </div>
                <ChevronDown
                  className={`h-3 w-3 text-muted-foreground/60 transition-transform duration-200 ${isDescriptionExpanded ? 'rotate-180' : ''
                    }`}
                />
              </div>
            </div>
          </div>
        )}

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
            <span className="text-sm font-bold text-primary">
              {currentProgress}%
            </span>
          </div>
          <div className="relative">
            <div className="w-full bg-muted rounded-full h-2 relative">
              {/* Progress Bar - Read Only */}
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${currentProgress}%` }}
              />
            </div>
            {/* Progress markers */}
            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <Card className="p-3">
            <div className="flex items-center justify-between mb-2">
              <CardTitle className="text-xs font-medium">Status</CardTitle>
              <Flag className="w-3 h-3 text-muted-foreground" />
            </div>
            {editingField === 'status' ? (
              <Select value={tempValue} onValueChange={setTempValue} onOpenChange={(open) => !open && saveEdit()}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TaskStatus).map((status) => (
                    <SelectItem key={status} value={status} className="text-xs">
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span
                className={`inline-block px-2 py-1 text-xs font-medium rounded cursor-pointer hover:opacity-80 ${getStatusColor(task.status, isDarkMode)}`}
                onClick={() => startEditing('status', task.status)}
              >
                {task.status}
              </span>
            )}
          </Card>
          <Card className="p-3">
            <div className="flex items-center justify-between mb-2">
              <CardTitle className="text-xs font-medium">Priority</CardTitle>
              <ChevronsRight className="w-3 h-3 text-muted-foreground" />
            </div>
            {editingField === 'priority' ? (
              <Select value={tempValue} onValueChange={setTempValue} onOpenChange={(open) => !open && saveEdit()}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TaskPriority).map((priority) => (
                    <SelectItem key={priority} value={priority} className="text-xs">
                      {priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div
                className="text-sm font-bold cursor-pointer hover:bg-muted/50 px-1 rounded"
                onClick={() => startEditing('priority', task.priority)}
              >
                {task.priority}
              </div>
            )}
          </Card>
          <Card className="p-3">
            <div className="flex items-center justify-between mb-2">
              <CardTitle className="text-xs font-medium">Station</CardTitle>
              <Users className="w-3 h-3 text-muted-foreground" />
            </div>
            {editingField === 'station' ? (
              <Select value={tempValue} onValueChange={setTempValue} onOpenChange={(open) => !open && saveEdit()}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAllStationNames().map((station) => (
                    <SelectItem key={station} value={station} className="text-xs">
                      {station}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div
                className="text-sm font-bold cursor-pointer hover:bg-muted/50 px-1 rounded"
                onClick={() => startEditing('station', task.station)}
              >
                {task.station}
              </div>
            )}
          </Card>
        </div>

        {/* Financial Information */}
        {(task.cost !== 0 || task.revenue !== 0) && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold mb-2">Financials</h3>
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3">
                <div className="text-xs font-medium mb-1">Cost</div>
                <div className={`text-sm font-bold ${(task.cost || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ${(task.cost || 0).toLocaleString()}
                </div>
              </Card>
              <Card className="p-3">
                <div className="text-xs font-medium mb-1">Revenue</div>
                <div className={`text-sm font-bold ${(task.revenue || 0) > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                  ${(task.revenue || 0).toLocaleString()}
                </div>
              </Card>
              <Card className="p-3">
                <div className="text-xs font-medium mb-1">Profit</div>
                <div className={`text-sm font-bold ${(() => {
                  const actualCost = task.isNotPaid ? 0 : (task.cost || 0);
                  const actualRevenue = task.isNotCharged ? 0 : (task.revenue || 0);
                  const profit = actualRevenue - actualCost;
                  return profit > 0 ? 'text-green-600' : profit < 0 ? 'text-red-600' : 'text-muted-foreground';
                })()
                  }`}>
                  ${(() => {
                    const actualCost = task.isNotPaid ? 0 : (task.cost || 0);
                    const actualRevenue = task.isNotCharged ? 0 : (task.revenue || 0);
                    return (actualRevenue - actualCost).toLocaleString();
                  })()}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Points Rewards */}
        {task.rewards?.points && hasAnyPoints(task.rewards.points) && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold mb-2">Points Rewards</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {getPointsMetadata().map((pointType) => {
                const pointValue = task.rewards?.points?.[pointType.key.toLowerCase() as keyof typeof task.rewards.points] || 0;
                return pointValue > 0 ? (
                  <Card key={pointType.key} className="p-2">
                    <div className="text-xs font-medium mb-1">{pointType.label}</div>
                    <div className="text-sm font-bold">{pointValue}</div>
                  </Card>
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* Sub-Tasks / Children */}
        {children.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2">Sub-Items ({children.length})</h3>
            <Card>
              <CardContent className="p-2">
                <div className="space-y-1">
                  {children.map(childNode => (
                    <div key={childNode.task.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <Icon className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-medium">{childNode.task.name}</span>
                      </div>
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${getStatusColor(childNode.task.status, isDarkMode)}`}>
                        {childNode.task.status}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      </div>

      {/* Duplicate Confirmation Modal */}
      <Dialog open={showDuplicateModal} onOpenChange={setShowDuplicateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Duplicate Task
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Are you sure you want to duplicate <strong>&ldquo;{task.name}&rdquo;</strong>?
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="text-blue-800 text-sm font-medium">
                ℹ️ What will happen:
              </div>
              <div className="text-blue-600 text-xs mt-1 space-y-1">
                <div>• A new task will be created with the same name</div>
                <div>• The duplicate will be reset to &ldquo;Not Started&rdquo; status</div>
                <div>• Progress will be reset to 0%</div>
                <div>• Parent relationship will be removed</div>
                <div>• Task creation will be logged</div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDuplicateModal(false)} disabled={isDuplicating}>
              Cancel
            </Button>
            <Button onClick={handleDuplicateTask} disabled={isDuplicating}>
              {isDuplicating ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Duplicating...
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate Task
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Template Modal (prefilled from parent) */}
      {showTemplateModal && (
        <TaskModal
          task={prefillTemplateTask}
          open={showTemplateModal}
          onOpenChange={setShowTemplateModal}
          isRecurrentModal={true}
          allTasksForOrder={allTasks}
          onSave={async (newTask) => {
            // Save as new template, do not set side effects beyond creation flag
            await ClientAPI.upsertTask(newTask);
            setShowTemplateModal(false);
            onTaskUpdate?.();
          }}
        />
      )}

      {/* Create Mission Tree Task Modal (prefilled from parent) */}
      {showMissionTreeModal && (
        <TaskModal
          task={prefillMissionTreeTask}
          open={showMissionTreeModal}
          onOpenChange={setShowMissionTreeModal}
          allTasksForOrder={allTasks}
          onSave={async (newTask) => {
            // Save as new Mission Tree task, do not set side effects beyond creation flag
            await ClientAPI.upsertTask(newTask);
            setShowMissionTreeModal(false);
            onTaskUpdate?.();
          }}
        />
      )}

      {spawnErrorMessage && (
        <ConfirmationModal
          open={isSpawnErrorOpen}
          onOpenChange={setIsSpawnErrorOpen}
          title="Spawn failed"
          description={spawnErrorMessage}
          confirmText="OK"
          cancelText="Close"
          variant="default"
          onConfirm={async () => {
            setIsSpawnErrorOpen(false);
          }}
        />
      )}
    </div>
  );
} 