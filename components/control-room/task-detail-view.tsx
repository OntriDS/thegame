'use client';

import { TreeNode } from '@/lib/utils/tree-utils';
import { Task } from '@/types/entities';
import { TaskType, TaskStatus, TaskPriority, STATION_CATEGORIES } from '@/types/enums';
import { TASK_STATUS_COLORS } from '@/lib/constants/color-constants';
import { TASK_TYPE_ICONS } from '@/lib/constants/icon-maps';
import { getPointsMetadata, hasAnyPoints } from '@/lib/utils/points-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Edit, BarChart, Target, Award, CheckSquare, Flag, ChevronsRight, Users, Copy, Check, ChevronDown, Tag } from 'lucide-react';
import TaskModal from '@/components/modals/task-modal';
import { useState, useRef, useEffect } from 'react';
import { ClientAPI } from '@/lib/client-api';
import { useThemeColors } from '@/lib/hooks/use-theme-colors';

interface TaskDetailViewProps {
  node: TreeNode | null;
  onEditTask: (task: Task) => void;
  onTaskUpdate?: () => void;
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

export default function TaskDetailView({ node, onEditTask, onTaskUpdate }: TaskDetailViewProps) {
  const { isDarkMode } = useThemeColors();
  const Icon = node ? (categoryIcons[node.task.type as keyof typeof categoryIcons] || CheckSquare) : BarChart;
  
  // Inline editing states
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');
  
  const [showDuplicateSuccess, setShowDuplicateSuccess] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<number>(0);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [prefillTemplateTask, setPrefillTemplateTask] = useState<Task | null>(null);
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
    
    const duplicatedTask: Task = {
      ...node.task,
      id: crypto.randomUUID(),
      name: `${node.task.name} (Copy)`,
      status: TaskStatus.CREATED,
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      parentId: null, // Remove parent relationship for duplicate
    };
    
    // Save the task first - logging is handled server-side automatically
    await ClientAPI.upsertTask(duplicatedTask);
    
    setShowDuplicateSuccess(true);
    setTimeout(() => setShowDuplicateSuccess(false), 2000);
    onTaskUpdate?.();
    setShowDuplicateModal(false);
  };

  // Open Template Modal prefilled from Recurrent Parent
  const handleOpenTemplateFromParent = () => {
    if (!node) return;
    const parent = node.task;
    if (parent.type !== TaskType.RECURRENT_GROUP) return;
    const prefill: Task = {
      id: crypto.randomUUID(),
      name: `${parent.name} • Template`,
      description: parent.description || '',
      type: TaskType.RECURRENT_TEMPLATE,
      status: TaskStatus.CREATED,
      priority: parent.priority || TaskPriority.NORMAL,
      station: parent.station as any,
      progress: 0,
      order: Date.now(),
      parentId: parent.id,
      isRecurrentParent: false,
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
      links: [] // ✅ Initialize links array (The Rosetta Stone)
    };
    setPrefillTemplateTask(prefill);
    setShowTemplateModal(true);
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
            {task.type === TaskType.RECURRENT_GROUP && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleOpenTemplateFromParent}
              >
                Template
              </Button>
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
                  className={`h-3 w-3 text-muted-foreground/60 transition-transform duration-200 ${
                    isDescriptionExpanded ? 'rotate-180' : ''
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
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
                  {Object.keys(STATION_CATEGORIES).map((station) => (
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
          <Card className="p-3">
            <div className="flex items-center justify-between mb-2">
              <CardTitle className="text-xs font-medium">Station</CardTitle>
              <Tag className="w-3 h-3 text-muted-foreground" />
            </div>
            <div className="text-sm font-bold">
              {task.station}
            </div>
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
                <div className={`text-sm font-bold ${
                  (() => {
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
                <div>• A new task will be created with &ldquo;(Copy)&rdquo; added to the name</div>
                <div>• The duplicate will be reset to &ldquo;Not Started&rdquo; status</div>
                <div>• Progress will be reset to 0%</div>
                <div>• Parent relationship will be removed</div>
                <div>• Task creation will be logged</div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDuplicateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleDuplicateTask}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate Task
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
          onSave={async (newTask) => {
            // Save as new template, do not set side effects beyond creation flag
            await ClientAPI.upsertTask(newTask);
            setShowTemplateModal(false);
            onTaskUpdate?.();
          }}
        />
      )}
    </div>
  );
} 