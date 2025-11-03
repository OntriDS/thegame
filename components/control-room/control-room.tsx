'use client';

import { useState, useEffect, useCallback } from 'react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { useSensors, useSensor, PointerSensor } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { Task } from '@/types/entities';
import { TaskType } from '@/types/enums';
import type { Station } from '@/types/type-aliases';
import { reviveDates } from '@/lib/utils/date-utils';
import { ClientAPI } from '@/lib/client-api';
// Side effects handled by ClientAPI via API calls
import { buildTaskTree, TreeNode } from '@/lib/utils/tree-utils';
import { useThemeColors } from '@/lib/hooks/use-theme-colors';
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts';
import { useEntityUpdates } from '@/lib/hooks/use-entity-updates';
import TaskModal from '@/components/modals/task-modal';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ORDER_INCREMENT, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH, SIDEBAR_DEFAULT_WIDTH, DRAG_ACTIVATION_DISTANCE } from '@/lib/constants/app-constants';
import TaskTree from './task-tree';
import TaskDetailView from './task-detail-view';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserPreferences } from '@/lib/hooks/use-user-preferences';

// Custom resizable sidebar component
const ResizableSidebar = ({ 
  children, 
  width, 
  onResize, 
  minWidth, 
  maxWidth 
}: { 
  children: React.ReactNode; 
  width: number; 
  onResize: (width: number) => void; 
  minWidth: number; 
  maxWidth: number; 
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    setStartX(e.clientX);
    setStartWidth(width);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - startX;
    const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + deltaX));
    onResize(newWidth);
  }, [isResizing, startX, startWidth, minWidth, maxWidth, onResize]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div 
      className="relative flex-shrink-0"
      style={{ width: `${width}px` }}
    >
      {children}
      <div 
        className="absolute top-0 right-0 h-full w-2 cursor-col-resize bg-primary/20 opacity-0 hover:opacity-100 transition-opacity"
        onMouseDown={handleMouseDown}
      />
    </div>
  );
};

export default function ControlRoom() {
  // ————— state —————
  const { getPreference, setPreference } = useUserPreferences();
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [isMounted, setIsMounted] = useState(false);
  
  // Keyboard shortcuts for modal navigation
  useKeyboardShortcuts({
    onOpenTaskModal: () => setTaskToEdit({} as Task),
  });
  // Filter State
  const [stationFilters, setStationFilters] = useState<Set<Station>>(new Set());
  const [typeFilter, setTypeFilter] = useState<TaskType | 'all'>('all');
  // Sub-tab State
  const [activeSubTab, setActiveSubTab] = useState<'mission-tree' | 'recurrent-tasks' | 'schedule' | 'calendar'>('mission-tree');
  const [refreshKey, setRefreshKey] = useState(0);

  // Define sensors with an activation constraint
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require the mouse to move by DRAG_ACTIVATION_DISTANCE px before starting a drag
      // This allows onClick events to fire on the draggable element
      activationConstraint: {
        distance: DRAG_ACTIVATION_DISTANCE,
      },
    })
  );

  const { activeBg, readableTextColor } = useThemeColors();

  useEffect(() => setIsMounted(true), []);

  // Initialize DataStore
  useEffect(() => {
    // DataStore initialization handled automatically in KV-only architecture
  }, []);

  // Data loading
  const loadTasks = useCallback(async () => {
    try {
      let tasks = reviveDates<Task[]>(await ClientAPI.getTasks());

    // Apply tab-based filtering
    if (activeSubTab === 'recurrent-tasks') {
      // Only show RECURRENT tasks for Recurrent Tree tab
      tasks = tasks.filter(task => 
        task.type === TaskType.RECURRENT_GROUP || 
        task.type === TaskType.RECURRENT_TEMPLATE || 
        task.type === TaskType.RECURRENT_INSTANCE
      );
    } else {
      // Mission Tree tab: exclude RECURRENT tasks
      tasks = tasks.filter(task => 
        task.type !== TaskType.RECURRENT_GROUP && 
        task.type !== TaskType.RECURRENT_TEMPLATE && 
        task.type !== TaskType.RECURRENT_INSTANCE
      );
    }

    // Apply filters
    if (stationFilters.size > 0) {
      tasks = tasks.filter(task => stationFilters.has(task.station));
    }
    if (typeFilter !== 'all') {
      // Show all tasks of the selected type, plus their descendants only
      const tasksOfCategory = tasks.filter(t => t.type === typeFilter);
      const tasksToInclude = new Set<string>();
      
      // Add all tasks of the selected category plus their descendants
      tasksOfCategory.forEach(task => {
        tasksToInclude.add(task.id);
        // Add all descendants of this task
        const addDescendants = (taskId: string) => {
          tasks.forEach(t => {
            if (t.parentId === taskId && !tasksToInclude.has(t.id)) {
              tasksToInclude.add(t.id);
              addDescendants(t.id);
            }
          });
        };
        addDescendants(task.id);
      });
      
      // Filter tasks to only include the ones we want to show
      tasks = tasks.filter(t => tasksToInclude.has(t.id));
      
      // For filtered tasks, we need to adjust parent references to create a proper tree
      // If a task's parent is not in the filtered set, make it a top-level task
      tasks = tasks.map(task => {
        if (task.parentId && !tasksToInclude.has(task.parentId)) {
          return { ...task, parentId: null };
        }
        return task;
      });
    }

    const newTree = buildTaskTree(tasks);
    setTree(newTree);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  }, [stationFilters, typeFilter, activeSubTab, refreshKey]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Load preferences on mount
  useEffect(() => {
    const savedSubTab = getPreference('control-room-active-sub-tab', 'mission-tree');
    setActiveSubTab(savedSubTab as 'mission-tree' | 'recurrent-tasks' | 'schedule' | 'calendar');
  }, [getPreference]);

  // Update selectedNode when tasks change (avoid render loops by only updating on real changes)
  const selectedTaskId = selectedNode?.task.id;
  useEffect(() => {
    if (!selectedTaskId) return;
    let cancelled = false;
    (async () => {
      try {
        const tasks = reviveDates<Task[]>(await ClientAPI.getTasks());
        const updatedTask = tasks.find(t => t.id === selectedTaskId);
        if (!updatedTask) return;

        // Only update when task actually changed (compare updatedAt timestamp or shallow props)
        const prevUpdatedAt = selectedNode?.task.updatedAt?.toString();
        const nextUpdatedAt = updatedTask.updatedAt?.toString();
        const hasMeaningfulChange = prevUpdatedAt !== nextUpdatedAt;

        if (hasMeaningfulChange && !cancelled && selectedNode) {
          setSelectedNode({ ...selectedNode, task: updatedTask });
        }
      } catch (error) {
        console.error('Failed to update selected node:', error);
      }
    })();
    return () => { cancelled = true; };
  }, [tree, selectedTaskId, selectedNode]);

  // Listen for task updates to refresh the tree
  useEntityUpdates('task', () => setRefreshKey(prev => prev + 1));

  // Event handlers
  const handleToggle = (nodeId: string) => {
    setExpanded(current => {
      const next = new Set(current);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleSelectNode = (node: TreeNode) => {
    setSelectedNode(node);
  };

  const handleNewTask = () => {
    setTaskToEdit({} as Task); // Use empty object to trigger modal for new task
  };

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task);
  }

  // Drag and Drop Handler
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const draggedId = active.id as string;
    const targetId = over.id as string;
    const allTasks = await ClientAPI.getTasks();
    
    const draggedTask = allTasks.find(t => t.id === draggedId);
    const targetTask = allTasks.find(t => t.id === targetId);
    
    if (!draggedTask || !targetTask) return;

    // Hierarchy rules: Mission > Milestone > Goal > Assignment
    // Only allow valid parent-child relationships
    const canBeParent = (() => {
      if (targetTask.type === TaskType.MISSION) {
        // Mission can accept Milestone, Goal, Assignment
        return [TaskType.MILESTONE, TaskType.GOAL, TaskType.ASSIGNMENT].includes(draggedTask.type);
      }
      if (targetTask.type === TaskType.MILESTONE) {
        // Milestone can accept Goal, Assignment
        return [TaskType.GOAL, TaskType.ASSIGNMENT].includes(draggedTask.type);
      }
      if (targetTask.type === TaskType.GOAL) {
        // Goal can accept Assignment only
        return draggedTask.type === TaskType.ASSIGNMENT;
      }
      // Assignment cannot accept any children
      return false;
    })();
    
    if (canBeParent) {
      // NESTING: Make target the parent
      const updatedTask: Task = {
        ...draggedTask,
        parentId: targetTask.id,
        order: Date.now(),
      };
      await ClientAPI.upsertTask(updatedTask);
    } else {
      // REORDERING: Keep same parent, just change order
      const parentId = targetTask.parentId;
      const siblings = allTasks
        .filter(t => t.parentId === parentId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      
      const oldIndex = siblings.findIndex(t => t.id === draggedId);
      const newIndex = siblings.findIndex(t => t.id === targetId);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        // Simple reordering: place after target
        const newOrder = (targetTask.order || 0) + ORDER_INCREMENT;
        const updatedTask: Task = {
          ...draggedTask,
          parentId: targetTask.parentId,
          order: newOrder,
        };
        await ClientAPI.upsertTask(updatedTask);
      }
    }
    
    loadTasks();
  };

  return (
    <TooltipProvider>
      <DndContext
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        sensors={sensors}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col border-2 border-muted shadow-2xl rounded-xl h-[calc(100vh-12rem)] min-h-[600px] bg-background">
          
          {/* Sub-tabs */}
          <Tabs value={activeSubTab} onValueChange={(value) => {
            const newTab = value as 'mission-tree' | 'recurrent-tasks' | 'schedule' | 'calendar';
            setActiveSubTab(newTab);
            setPreference('control-room-active-sub-tab', newTab);
          }} className="flex flex-col h-full">
            <div className="border-b bg-muted/20 py-0">
              <TabsList className="grid w-full grid-cols-4 h-10">
                <TabsTrigger value="mission-tree" className="py-2">Mission Tree</TabsTrigger>
                <TabsTrigger value="recurrent-tasks" className="py-2">Recurrent Tree</TabsTrigger>
                <TabsTrigger value="schedule" className="py-2">Schedule</TabsTrigger>
                <TabsTrigger value="calendar" className="py-2">Calendar</TabsTrigger>
              </TabsList>
            </div>

            {/* Main Content Area */}
            <TabsContent value="mission-tree" className="mt-0 p-0 data-[state=active]:flex flex-col sm:flex-row flex-1 min-h-0">
            {/* Left Panel: Resizable Tree Sidebar */}
            {isMounted ? (
              <ResizableSidebar
                width={sidebarWidth}
                onResize={setSidebarWidth}
                minWidth={SIDEBAR_MIN_WIDTH}
                maxWidth={SIDEBAR_MAX_WIDTH}
              >
                <TaskTree
                  tree={tree}
                  expanded={expanded}
                  selectedNode={selectedNode}
                  onToggle={handleToggle}
                  onSelectNode={handleSelectNode}
                  onNewTask={handleNewTask}
                  stationFilters={stationFilters}
                  onStationFilterChange={setStationFilters}
                  typeFilter={typeFilter}
                  onTypeFilterChange={setTypeFilter}
                  activeSubTab={activeSubTab}
                />
              </ResizableSidebar>
            ) : (
              <div className="w-80 h-full bg-muted/20 animate-pulse" />
            )}

            {/* Right Panel: Detail View */}
            <div className="flex-1 flex flex-col w-full overflow-y-auto">
              <TaskDetailView
                node={selectedNode}
                onEditTask={handleEditTask}
                onTaskUpdate={loadTasks}
              />
            </div>
              </TabsContent>

              {/* Recurrent Tree Content */}
              <TabsContent value="recurrent-tasks" className="mt-0 p-0 data-[state=active]:flex flex-col sm:flex-row flex-1 min-h-0">
            {/* Left Panel: Resizable Tree Sidebar */}
            {isMounted ? (
              <ResizableSidebar
                width={sidebarWidth}
                onResize={setSidebarWidth}
                minWidth={SIDEBAR_MIN_WIDTH}
                maxWidth={SIDEBAR_MAX_WIDTH}
              >
                <TaskTree
                  tree={tree}
                  expanded={expanded}
                  selectedNode={selectedNode}
                  onToggle={handleToggle}
                  onSelectNode={handleSelectNode}
                  onNewTask={handleNewTask}
                  stationFilters={stationFilters}
                  onStationFilterChange={setStationFilters}
                  typeFilter={typeFilter}
                  onTypeFilterChange={setTypeFilter}
                  activeSubTab={activeSubTab}
                />
              </ResizableSidebar>
            ) : (
              <div className="w-80 h-full bg-muted/20 animate-pulse" />
            )}

            {/* Right Panel: Detail View */}
            <div className="flex-1 flex flex-col w-full overflow-y-auto">
              <TaskDetailView
                node={selectedNode}
                onEditTask={handleEditTask}
                onTaskUpdate={loadTasks}
              />
            </div>
            </TabsContent>

            {/* Schedule Tab Content */}
            <TabsContent value="schedule" className="mt-0 p-0 data-[state=active]:flex flex-col flex-1 min-h-0">
              <div className="flex-1 flex flex-col w-full overflow-y-auto p-6">
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold">Schedule</h2>
                  <p className="text-muted-foreground">
                    Schedule view for planning and organizing tasks by time periods.
                  </p>
                  <div className="bg-muted/20 rounded-lg p-8 text-center">
                    <p className="text-muted-foreground">
                      Schedule functionality coming soon...
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Calendar Tab Content */}
            <TabsContent value="calendar" className="mt-0 p-0 data-[state=active]:flex flex-col flex-1 min-h-0">
              <div className="flex-1 flex flex-col w-full overflow-y-auto p-6">
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold">Calendar</h2>
                  <p className="text-muted-foreground">
                    Calendar view for visualizing tasks and deadlines.
                  </p>
                  <div className="bg-muted/20 rounded-lg p-8 text-center">
                    <p className="text-muted-foreground">
                      Calendar functionality coming soon...
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DndContext>

      {/* Modal for Creating/Editing Tasks */}
      {taskToEdit && (
        <TaskModal
          task={taskToEdit.id ? taskToEdit : null}
          open={!!taskToEdit}
          onOpenChange={isOpen => !isOpen && setTaskToEdit(null)}
          isRecurrentModal={activeSubTab === 'recurrent-tasks'}
          onSave={async (task) => {
            try {
              // Parent only calls DataStore - Adapter processes through Link Connector automatically
              const finalTask = await ClientAPI.upsertTask(task);
              
              // Update taskToEdit with fresh data BEFORE modal closes (fixes stale UI issue)
              setTaskToEdit(finalTask);
              
              // Reload tasks immediately after save to reflect changes
              await loadTasks();
              
              // If editing a selected task, update the selected node
              if (selectedNode && selectedNode.task.id === finalTask.id) {
                const updatedNode = { ...selectedNode, task: finalTask };
                setSelectedNode(updatedNode);
              }
              
              // Financial records, items, and points will be created automatically when task status changes to "Done"
              

            } catch (error) {
              console.error('Failed to save task:', error);
            }
          }}
          onComplete={async () => {
            try {
              // Reload tasks immediately after delete to reflect changes
              await loadTasks();
              // Clear selected node if it was the deleted task
              if (selectedNode && selectedNode.task.id === taskToEdit.id) {
                setSelectedNode(null);
              }
              

            } catch (error) {
              console.error('Failed to reload tasks after completion:', error);
            }
          }}
        />
      )}
    </TooltipProvider>
  );
}
