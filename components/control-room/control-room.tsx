'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { MoveHandler } from 'react-arborist';
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
import { useShortcutScope } from '@/lib/shortcuts/keyboard-shortcuts-provider';
import TaskModal from '@/components/modals/task-modal';
import { ControlRoomDeepLinkTrigger } from '@/components/admin/admin-deep-link-triggers';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ORDER_INCREMENT, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH, SIDEBAR_DEFAULT_WIDTH } from '@/lib/constants/app-constants';
import TaskTree from './task-tree';
import WeeklySchedule from './weekly-schedule';
import CalendarView from './calendar-view';
import GanttChart from './gantt-chart';
import TaskDetailView from './task-detail-view';
import TaskHistoryView from './task-history-view';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserPreferences } from '@/lib/hooks/use-user-preferences';

type ControlRoomTab = 'mission-tree' | 'recurrent-tasks' | 'automation-tree' | 'weekly-schedule' | 'calendar' | 'gantt-chart' | 'task-history';

const findNodeInTree = (nodes: TreeNode[], taskId: string): TreeNode | null => {
  for (const node of nodes) {
    if (node.task.id === taskId) {
      return node;
    }
    const found = findNodeInTree(node.children, taskId);
    if (found) {
      return found;
    }
  }
  return null;
};

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
  const expandedPreferenceKey = 'control-room-expanded-nodes';
  const parseExpandedPreference = () => {
    const saved = getPreference(expandedPreferenceKey);
    if (!saved) return new Set<string>();
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return new Set<string>(parsed.filter((id): id is string => typeof id === 'string'));
      }
    } catch (error) {
      console.warn('[ControlRoom] Failed to parse expanded preference', error);
    }
    return new Set<string>();
  };
  const [expanded, setExpanded] = useState<Set<string>>(parseExpandedPreference);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const selectedNodeRef = useRef<TreeNode | null>(null);
  selectedNodeRef.current = selectedNode;
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  // Sidebar width with persistence
  const getInitialSidebarWidth = () => {
    const saved = getPreference('control-room-sidebar-width');
    return saved ? parseInt(saved, 10) : SIDEBAR_DEFAULT_WIDTH;
  };

  const [sidebarWidth, setSidebarWidthState] = useState(getInitialSidebarWidth);

  const setSidebarWidth = (width: number) => {
    setSidebarWidthState(width);
    setPreference('control-room-sidebar-width', width.toString());
  };
  const [isMounted, setIsMounted] = useState(false);

  // Filter State
  const [stationFilters, setStationFilters] = useState<Set<Station>>(new Set());
  const [typeFilter, setTypeFilter] = useState<TaskType | 'all'>('all');
  // Sub-tab State
  const [activeSubTab, setActiveSubTab] = useState<ControlRoomTab>('mission-tree');
  const [refreshKey, setRefreshKey] = useState(0);
  const [allTasks, setAllTasks] = useState<Task[]>([]);

  const { activeBg, readableTextColor } = useThemeColors();
  const { setActiveScope } = useShortcutScope();

  useEffect(() => setIsMounted(true), []);

  // Set active scope to control-room when component mounts
  useEffect(() => {
    setActiveScope('control-room');
    return () => {
      // Reset to global scope when unmounting
      setActiveScope('global');
    };
  }, [setActiveScope]);

  // Initialize DataStore
  useEffect(() => {
    // DataStore initialization handled automatically in KV-only architecture
  }, []);

  // Load sidebar width from preferences when they become available
  useEffect(() => {
    const savedWidth = getPreference('control-room-sidebar-width');
    if (savedWidth) {
      const width = parseInt(savedWidth, 10);
      if (width >= SIDEBAR_MIN_WIDTH && width <= SIDEBAR_MAX_WIDTH) {
        setSidebarWidthState(width);
      }
    }
  }, [getPreference]);

  useEffect(() => {
    if (activeSubTab === 'automation-tree') {
      setTypeFilter('all');
    }
  }, [activeSubTab]);

  /** Single GET /api/tasks per run: updates `allTasks` (calendar, weekly, gantt) and filtered `tree`. */
  const loadTasks = useCallback(async (): Promise<TreeNode[]> => {
    try {
      let tasks = reviveDates<Task[]>(await ClientAPI.getTasks());
      setAllTasks(tasks);

      // Apply tab-based filtering
      if (activeSubTab === 'gantt-chart') {
        // No filtering for Gantt Chart - show all tasks
      } else if (activeSubTab === 'recurrent-tasks') {
        // Only show RECURRENT tasks for Recurrent Tree tab
        tasks = tasks.filter(task =>
          task.type === TaskType.RECURRENT_GROUP ||
          task.type === TaskType.RECURRENT_TEMPLATE ||
          task.type === TaskType.RECURRENT_INSTANCE
        );
      } else if (activeSubTab === 'automation-tree') {
        tasks = tasks.filter(task => task.type === TaskType.AUTOMATION);
      } else {
        // Mission tree (and default views): exclude RECURRENT and AUTOMATION tasks
        tasks = tasks.filter(task =>
          task.type !== TaskType.RECURRENT_GROUP &&
          task.type !== TaskType.RECURRENT_TEMPLATE &&
          task.type !== TaskType.RECURRENT_INSTANCE &&
          task.type !== TaskType.AUTOMATION
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
      return newTree;
    } catch (error) {
      console.error('Failed to load tasks:', error);
      setTree([]);
      return [];
    }
  }, [stationFilters, typeFilter, activeSubTab]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks, refreshKey]);

  // Helper function to check if a task type can be parent of another (Mission tree)
  const canBeParentMission = (parentType: TaskType, childType: TaskType): boolean => {
    if (parentType === TaskType.MISSION) {
      return [TaskType.MILESTONE, TaskType.GOAL, TaskType.ASSIGNMENT].includes(childType);
    }
    if (parentType === TaskType.MILESTONE) {
      return [TaskType.GOAL, TaskType.ASSIGNMENT].includes(childType);
    }
    if (parentType === TaskType.GOAL) {
      return childType === TaskType.ASSIGNMENT;
    }
    return false;
  };

  // Helper function to check if a task type can be parent of another (Recurrent tree)
  const canBeParentRecurrent = (parentType: TaskType, childType: TaskType): boolean => {
    if (parentType === TaskType.RECURRENT_GROUP) {
      return [TaskType.RECURRENT_TEMPLATE, TaskType.RECURRENT_INSTANCE].includes(childType);
    }
    if (parentType === TaskType.RECURRENT_TEMPLATE) {
      return childType === TaskType.RECURRENT_INSTANCE;
    }
    return false;
  };

  const normalizeSiblings = useCallback(async (parentId: string | null, sourceTasks?: Task[]) => {
    const tasks = sourceTasks ? [...sourceTasks] : reviveDates<Task[]>(await ClientAPI.getTasks());
    const siblings = tasks
      .filter(task => (task.parentId || null) === parentId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    await Promise.all(
      siblings.map((task, index) => {
        const desiredOrder = (index + 1) * ORDER_INCREMENT;
        if ((task.order || 0) !== desiredOrder) {
          return ClientAPI.upsertTask({ ...task, order: desiredOrder });
        }
        return Promise.resolve();
      })
    );
  }, []);

  // Reentrancy guard for move operations
  const isMovingRef = useRef(false);

  // Move selection up handler
  const handleMoveUp = useCallback(async (options: { alt: boolean }) => {
    if (!selectedNode) return;

    if (isMovingRef.current) {
      return;
    }
    isMovingRef.current = true;

    try {
      const allTasks = reviveDates<Task[]>(await ClientAPI.getTasks());
      const selectedTask = selectedNode.task;

      if (options.alt) {
        if (!selectedTask.parentId) return;

        const parent = allTasks.find(task => task.id === selectedTask.parentId);
        if (!parent) return;

        const grandParentId = parent.parentId || null;
        const grandParentSiblings = allTasks
          .filter(task => (task.parentId || null) === grandParentId)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        const parentIndex = grandParentSiblings.findIndex(task => task.id === parent.id);
        if (parentIndex === -1) return;

        const beforeSibling = parentIndex > 0 ? grandParentSiblings[parentIndex - 1] : null;
        const newOrder = beforeSibling
          ? ((beforeSibling.order || 0) + (parent.order || 0)) / 2
          : (parent.order || 0) - ORDER_INCREMENT;

        await ClientAPI.upsertTask({
          ...selectedTask,
          parentId: grandParentId,
          order: newOrder,
        });

        await normalizeSiblings(grandParentId, [
          ...allTasks.filter(task => task.id !== selectedTask.id),
          { ...selectedTask, parentId: grandParentId, order: newOrder },
        ]);

        const newTree = await loadTasks();
        const updatedNode = findNodeInTree(newTree, selectedTask.id);
        if (updatedNode) {
          setSelectedNode(updatedNode);
        }
        return;
      }

      const parentId = selectedTask.parentId || null;
      const siblings = allTasks
        .filter(task => (task.parentId || null) === parentId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      const currentIndex = siblings.findIndex(task => task.id === selectedTask.id);
      if (currentIndex <= 0) return;

      const previousSibling = siblings[currentIndex - 1];
      const previousOrder = previousSibling.order || 0;
      const currentOrder = selectedTask.order || 0;

      let updatedTasks = [...allTasks];

      if (previousOrder + ORDER_INCREMENT < currentOrder) {
        const midpoint = (previousOrder + currentOrder) / 2;
        await ClientAPI.upsertTask({ ...selectedTask, order: midpoint });
        updatedTasks = updatedTasks.map(task =>
          task.id === selectedTask.id ? { ...selectedTask, order: midpoint } : task
        );
      } else {
        await ClientAPI.upsertTask({ ...previousSibling, order: currentOrder });
        await ClientAPI.upsertTask({ ...selectedTask, order: previousOrder });
        updatedTasks = updatedTasks.map(task => {
          if (task.id === previousSibling.id) {
            return { ...previousSibling, order: currentOrder };
          }
          if (task.id === selectedTask.id) {
            return { ...selectedTask, order: previousOrder };
          }
          return task;
        });
      }

      await normalizeSiblings(parentId, updatedTasks);
      const newTree = await loadTasks();
      const updatedNode = findNodeInTree(newTree, selectedTask.id);
      if (updatedNode) {
        setSelectedNode(updatedNode);
      }
    } catch (error) {
      console.error('Failed to move task up:', error);
    } finally {
      isMovingRef.current = false;
    }
  }, [selectedNode, normalizeSiblings, loadTasks]);

  const handleChangeOrder = useCallback(async (taskId: string, parentId: string | null, newPosition: number) => {
    if (newPosition < 1) return;

    try {
      const allTasks = reviveDates<Task[]>(await ClientAPI.getTasks());
      const targetTask = allTasks.find(task => task.id === taskId);
      if (!targetTask) return;

      const normalizedParentId = parentId || null;
      const siblings = allTasks
        .filter(task => (task.parentId || null) === normalizedParentId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      const currentIndex = siblings.findIndex(task => task.id === taskId);
      if (currentIndex === -1) return;

      const boundedIndex = Math.min(Math.max(newPosition - 1, 0), siblings.length - 1);
      if (boundedIndex === currentIndex) return;

      const reordered = [...siblings];
      const [moved] = reordered.splice(currentIndex, 1);
      reordered.splice(boundedIndex, 0, moved);

      await Promise.all(
        reordered.map((task, index) => {
          const desiredOrder = (index + 1) * ORDER_INCREMENT;
          if ((task.order || 0) !== desiredOrder) {
            return ClientAPI.upsertTask({ ...task, order: desiredOrder });
          }
          return Promise.resolve();
        })
      );

      const newTree = await loadTasks();
      const updatedNode = findNodeInTree(newTree, taskId);
      if (updatedNode) {
        setSelectedNode(updatedNode);
      }
    } catch (error) {
      console.error('Failed to change task order:', error);
    }
  }, [loadTasks]);

  // Move selection down handler
  const handleMoveDown = useCallback(async (options: { alt: boolean }) => {
    if (!selectedNode) return;

    if (isMovingRef.current) {
      return;
    }
    isMovingRef.current = true;

    try {
      const allTasks = reviveDates<Task[]>(await ClientAPI.getTasks());
      const selectedTask = selectedNode.task;

      if (options.alt) {
        if (!selectedTask.parentId) return;

        const parent = allTasks.find(task => task.id === selectedTask.parentId);
        if (!parent) return;

        const grandParentId = parent.parentId || null;
        const grandParentSiblings = allTasks
          .filter(task => (task.parentId || null) === grandParentId)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        const parentIndex = grandParentSiblings.findIndex(task => task.id === parent.id);
        if (parentIndex === -1) return;

        const afterSibling = parentIndex < grandParentSiblings.length - 1 ? grandParentSiblings[parentIndex + 1] : null;
        const newOrder = afterSibling
          ? ((afterSibling.order || 0) + (parent.order || 0)) / 2
          : (parent.order || 0) + ORDER_INCREMENT;

        await ClientAPI.upsertTask({
          ...selectedTask,
          parentId: grandParentId,
          order: newOrder,
        });

        await normalizeSiblings(grandParentId, [
          ...allTasks.filter(task => task.id !== selectedTask.id),
          { ...selectedTask, parentId: grandParentId, order: newOrder },
        ]);

        const newTree = await loadTasks();
        const updatedNode = findNodeInTree(newTree, selectedTask.id);
        if (updatedNode) {
          setSelectedNode(updatedNode);
        }
        return;
      }

      const parentId = selectedTask.parentId || null;
      const siblings = allTasks
        .filter(task => (task.parentId || null) === parentId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      const currentIndex = siblings.findIndex(task => task.id === selectedTask.id);
      if (currentIndex >= siblings.length - 1) return;

      const nextSibling = siblings[currentIndex + 1];
      const nextOrder = nextSibling.order || 0;
      const currentOrder = selectedTask.order || 0;

      let updatedTasks = [...allTasks];

      if (nextOrder - ORDER_INCREMENT > currentOrder) {
        const midpoint = (nextOrder + currentOrder) / 2;
        await ClientAPI.upsertTask({ ...selectedTask, order: midpoint });
        updatedTasks = updatedTasks.map(task =>
          task.id === selectedTask.id ? { ...selectedTask, order: midpoint } : task
        );
      } else {
        await ClientAPI.upsertTask({ ...nextSibling, order: currentOrder });
        await ClientAPI.upsertTask({ ...selectedTask, order: nextOrder });
        updatedTasks = updatedTasks.map(task => {
          if (task.id === nextSibling.id) {
            return { ...nextSibling, order: currentOrder };
          }
          if (task.id === selectedTask.id) {
            return { ...selectedTask, order: nextOrder };
          }
          return task;
        });
      }

      await normalizeSiblings(parentId, updatedTasks);
      const newTree = await loadTasks();
      const updatedNode = findNodeInTree(newTree, selectedTask.id);
      if (updatedNode) {
        setSelectedNode(updatedNode);
      }
    } catch (error) {
      console.error('Failed to move task down:', error);
    } finally {
      isMovingRef.current = false;
    }
  }, [selectedNode, normalizeSiblings, loadTasks]);

  const handleNewTask = useCallback(() => {
    setTaskToEdit({} as Task);
  }, []);

  // Keyboard shortcuts for modal navigation and task reordering (control-room scope)
  useKeyboardShortcuts({
    scope: 'control-room',
    onOpenTaskModal: handleNewTask,
    onMoveSelectionUp: handleMoveUp,
    onMoveSelectionDown: handleMoveDown,
  });

  // Load preferences on mount
  useEffect(() => {
    const savedSubTab = getPreference('control-room-active-sub-tab', 'mission-tree');
    const allowedTabs: ControlRoomTab[] = ['mission-tree', 'automation-tree', 'recurrent-tasks', 'weekly-schedule', 'calendar', 'gantt-chart', 'task-history'];
    setActiveSubTab(allowedTabs.includes(savedSubTab as ControlRoomTab) ? savedSubTab as ControlRoomTab : 'mission-tree');
  }, [getPreference]);

  // After a single shared fetch updates `allTasks`, refresh selected row without a second GET
  const selectedTaskId = selectedNode?.task.id;
  useEffect(() => {
    if (!selectedTaskId || !selectedNodeRef.current) return;
    if (selectedNodeRef.current.task.id !== selectedTaskId) return;
    const updatedTask = allTasks.find(t => t.id === selectedTaskId);
    if (!updatedTask) return;
    const prevUpdatedAt = selectedNodeRef.current.task.updatedAt?.toString();
    const nextUpdatedAt = updatedTask.updatedAt?.toString();
    if (prevUpdatedAt === nextUpdatedAt) return;
    setSelectedNode({ ...selectedNodeRef.current, task: updatedTask });
  }, [allTasks, selectedTaskId]);

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
      setPreference(expandedPreferenceKey, JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const handleSelectNode = (node: TreeNode) => {
    setSelectedNode(node);
  };

  const handleEditTask = async (task: Task) => {
    // SECURITY: Automation tasks are strictly programmatic. They must NEVER open the standard task edit modal.
    if (task.type === TaskType.AUTOMATION) {
      console.log('Automation tasks cannot be edited via the standard modal.');
      return;
    }

    // Always fetch fresh task data to avoid using filtered/modified task objects
    try {
      const freshTask = await ClientAPI.getTaskById(task.id);
      setTaskToEdit(freshTask || task); // Fallback to provided task if fetch fails
    } catch (error) {
      console.error('Failed to fetch fresh task data:', error);
      setTaskToEdit(task); // Fallback to provided task on error
    }
  };

  const handleTaskUpdate = async (updatedTask: Task) => {
    try {
      // Optimistic update locally
      setAllTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));

      // Save to server
      await ClientAPI.upsertTask(updatedTask);

      // Refresh tree if needed (debounced or relies on useEntityUpdates)
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Failed to update task:', error);
      void loadTasks();
    }
  };

  const flattenTasks = (nodes: TreeNode[]): Task[] => {
    const result: Task[] = [];
    const visit = (node: TreeNode) => {
      result.push(node.task);
      node.children.forEach(visit);
    };
    nodes.forEach(visit);
    return result;
  };

  const handleTreeMove = useCallback<MoveHandler<TreeNode>>(({ dragIds, parentId, index }) => {
    if (!dragIds.length) return;

    // Enforce business rules about which task types can be nested under which parents
    if (parentId && (activeSubTab === 'mission-tree' || activeSubTab === 'recurrent-tasks')) {
      const parentNode = findNodeInTree(tree, parentId);
      if (!parentNode) return;

      const parentType = parentNode.task.type;
      const isValid = dragIds.every(id => {
        const childNode = findNodeInTree(tree, id);
        if (!childNode) return false;
        const childType = childNode.task.type;
        if (activeSubTab === 'mission-tree') {
          return canBeParentMission(parentType, childType);
        }
        if (activeSubTab === 'recurrent-tasks') {
          return canBeParentRecurrent(parentType, childType);
        }
        return true;
      });

      if (!isValid) return;
    }

    const tasks = flattenTasks(tree);
    const taskById = new Map<string, Task>();
    tasks.forEach(t => taskById.set(t.id, t));

    const movedTasks: Task[] = [];
    const previousParentIds = new Set<string | null>();

    for (const id of dragIds) {
      const task = taskById.get(id);
      if (!task) continue;
      previousParentIds.add(task.parentId || null);
      movedTasks.push(task);
    }

    if (!movedTasks.length) return;

    const newParentId = parentId ?? null;

    // Build the new sibling list under the destination parent, excluding moved tasks.
    const siblings = tasks
      .filter(task => (task.parentId || null) === newParentId && !dragIds.includes(task.id))
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const clampedIndex = Math.min(Math.max(index, 0), siblings.length);
    const reordered = [...siblings];
    reordered.splice(clampedIndex, 0, ...movedTasks);

    const updatedTaskMap = new Map<string, Task>();
    reordered.forEach((task, idx) => {
      const desiredOrder = (idx + 1) * ORDER_INCREMENT;
      if ((task.parentId ?? null) !== newParentId || (task.order ?? 0) !== desiredOrder) {
        const updated: Task = {
          ...task,
          parentId: newParentId,
          order: desiredOrder,
        };
        updatedTaskMap.set(updated.id, updated);
      }
    });

    const updatedTasks: Task[] = tasks.map(task => updatedTaskMap.get(task.id) ?? task);

    // Optimistic UI: update local tree immediately
    const optimisticTree = buildTaskTree(updatedTasks);
    setTree(optimisticTree);

    const primaryDraggedId = dragIds[0];
    const updatedNode = findNodeInTree(optimisticTree, primaryDraggedId);
    if (updatedNode) {
      setSelectedNode(updatedNode);
    }

    // Persist changes in the background without blocking the UI
    (async () => {
      try {
        await Promise.all(
          Array.from(updatedTaskMap.values()).map(task => ClientAPI.upsertTask(task))
        );

        const parentsToNormalize = new Set<string | null>([newParentId, ...previousParentIds]);
        for (const pid of parentsToNormalize) {
          await normalizeSiblings(pid, updatedTasks);
        }

        await loadTasks();
      } catch (error) {
        console.error('Failed to persist task move:', error);
        await loadTasks();
      }
    })();
  }, [tree, activeSubTab, normalizeSiblings, loadTasks]);

  return (
    <TooltipProvider>
      <div className="flex flex-col border-2 border-muted shadow-2xl rounded-xl h-[calc(100vh-12rem)] min-h-[600px] bg-background">

          {/* Sub-tabs */}
          <Tabs value={activeSubTab} onValueChange={(value) => {
            const newTab = value as ControlRoomTab;
            setActiveSubTab(newTab);
            setPreference('control-room-active-sub-tab', newTab);
          }} className="flex flex-col h-full">
            <div className="border-b bg-muted/20 py-0">
              <TabsList className="grid w-full grid-cols-7 h-10">
                <TabsTrigger value="mission-tree" className="py-2">Mission Tree</TabsTrigger>
                <TabsTrigger value="recurrent-tasks" className="py-2">Recurrent Tree</TabsTrigger>
                <TabsTrigger value="automation-tree" className="py-2">Automation Tree</TabsTrigger>
                <TabsTrigger value="weekly-schedule" className="py-2">Weekly Schedule</TabsTrigger>
                <TabsTrigger value="calendar" className="py-2">Calendar</TabsTrigger>
                <TabsTrigger value="gantt-chart" className="py-2">Gantt Chart</TabsTrigger>
                <TabsTrigger value="task-history" className="py-2">History</TabsTrigger>
              </TabsList>
            </div>

            {/* Main Content Area */}
            <TabsContent value="mission-tree" className="mt-0 p-0 data-[state=active]:flex flex-col sm:flex-row flex-1 min-h-0">
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
                    activeSubTab="mission-tree"
                    onChangeOrder={handleChangeOrder}
                    onMove={handleTreeMove}
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
                  allTasks={allTasks}
                />
              </div>
            </TabsContent>

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
                    activeSubTab="recurrent-tasks"
                    onChangeOrder={handleChangeOrder}
                    onMove={handleTreeMove}
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
                  allTasks={allTasks}
                />
              </div>
            </TabsContent>

            <TabsContent value="automation-tree" className="mt-0 p-0 data-[state=active]:flex flex-col sm:flex-row flex-1 min-h-0">
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
                    activeSubTab="automation-tree"
                    onChangeOrder={handleChangeOrder}
                    onMove={handleTreeMove}
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
                  allTasks={allTasks}
                />
              </div>
            </TabsContent>

            {/* Weekly Schedule Tab Content */}
            <TabsContent value="weekly-schedule" className="h-full m-0 p-0 border-none data-[state=inactive]:hidden">
              <WeeklySchedule
                tasks={allTasks}
                onNewTask={handleNewTask}
                onEditTask={handleEditTask}
                onTaskUpdate={handleTaskUpdate}
              />
            </TabsContent>

            {/* Calendar Tab Content */}
            <TabsContent value="calendar" className="mt-0 p-0 data-[state=active]:flex flex-col flex-1 min-h-0">
              <CalendarView
                tasks={allTasks}
                onNewTask={handleNewTask}
                onEditTask={handleEditTask}
              />
            </TabsContent>

            {/* Gantt Chart Tab Content */}
            <TabsContent value="gantt-chart" className="mt-0 p-0 data-[state=active]:flex flex-col flex-1 min-h-0">
              <GanttChart
                tasks={allTasks}
                onNewTask={handleNewTask}
                onEditTask={handleEditTask}
              />
            </TabsContent>

            {/* Task History Tab Content */}
            <TabsContent value="task-history" className="mt-0 p-0 data-[state=active]:flex flex-col flex-1 min-h-0">
              <TaskHistoryView
                refreshKey={refreshKey}
                onSelectTask={(task) => {
                  handleEditTask(task);
                }}
              />
            </TabsContent>
          </Tabs>
        </div>

      <ControlRoomDeepLinkTrigger
        onTask={async (task) => {
          if (task.type === TaskType.AUTOMATION) return;
          setActiveSubTab('mission-tree');
          await handleEditTask(task);
        }}
      />

      {/* Modal for Creating/Editing Tasks */}
      {taskToEdit && (
        <TaskModal
          task={taskToEdit.id ? taskToEdit : null}
          open={!!taskToEdit}
          onOpenChange={isOpen => !isOpen && setTaskToEdit(null)}
          allTasksForOrder={allTasks}
          isRecurrentModal={
            activeSubTab === 'recurrent-tasks' ||
            (
              !!taskToEdit && (
                taskToEdit.type === TaskType.RECURRENT_GROUP ||
                taskToEdit.type === TaskType.RECURRENT_TEMPLATE ||
                taskToEdit.type === TaskType.RECURRENT_INSTANCE
              )
            )
          }
          onSave={async (task) => {
            // Parent only calls DataStore - Adapter processes through Link Connector automatically
            const finalTask = await ClientAPI.upsertTask(task);

            // Update taskToEdit with fresh data BEFORE modal closes (fixes stale UI issue)
            setTaskToEdit(finalTask);

            await loadTasks();

            // If editing a selected task, update the selected node
            if (selectedNode && selectedNode.task.id === finalTask.id) {
              const updatedNode = { ...selectedNode, task: finalTask };
              setSelectedNode(updatedNode);
            }

            // Financial records, items, and points will be created automatically when task status changes to "Done"
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
