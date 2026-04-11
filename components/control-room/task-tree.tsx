'use client';

import { TreeNode } from '@/lib/utils/tree-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TaskType, TaskStatus, TaskPriority } from '@/types/enums';
import type { Station } from '@/types/type-aliases';
import { ChevronRight, ChevronDown, PlusCircle } from 'lucide-react';
import { TRANSITION_DURATION_150, TASK_TYPE_ICONS } from '@/lib/constants/app-constants';
import { TASK_PRIORITY_ICON_COLORS, TASK_STATUS_ICON_COLORS } from '@/lib/constants/color-constants';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Tree } from 'react-arborist';
import type { CursorProps, DragPreviewProps, MoveHandler, NodeRendererProps, TreeApi } from 'react-arborist';

// --- UPDATED Props Interface ---
interface TaskTreeProps {
  tree: TreeNode[];
  expanded: Set<string>;
  selectedNode: TreeNode | null;
  onToggle: (nodeId: string) => void;
  onSelectNode: (node: TreeNode) => void;
  onNewTask: () => void;
  // --- NEW Filter Props ---
  stationFilters: Set<Station>;
  onStationFilterChange: (filters: Set<Station>) => void;
  typeFilter: TaskType | 'all';
  onTypeFilterChange: (value: TaskType | 'all') => void;
  // --- NEW Tab Props ---
  activeSubTab: 'mission-tree' | 'recurrent-tasks' | 'automation-tree' | 'schedule' | 'calendar';
  onChangeOrder: (taskId: string, parentId: string | null, newPosition: number) => Promise<void> | void;
  onMove?: MoveHandler<TreeNode>;
}

// Helper to get root stations (all stations are root level now)
const getRootStations = () => ['ADMIN', 'RESEARCH', 'DEV', 'ARTDESIGN', 'MAKERSPACE', 'SALES', 'PERSONAL'] as const;

// Collect all nodes of a given type across the entire tree (recursive)
function collectNodesByType(nodes: TreeNode[], type: TaskType): TreeNode[] {
  const result: TreeNode[] = [];
  for (const node of nodes) {
    if (node.task.type === type) {
      result.push(node);
    }
    if (node.children && node.children.length > 0) {
      result.push(...collectNodesByType(node.children, type));
    }
  }
  return result;
}



// ——— NEW: TreeNode Component (can use hooks) ———
const ThemedCursor: React.FC<CursorProps> = ({ top, left, indent }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: left + indent,
        right: 0,
        height: 2,
        borderRadius: 9999,
      }}
      className="bg-primary"
    />
  );
};

const makeDragPreview = (treeRef: React.RefObject<TreeApi<TreeNode>>) =>
  function DragPreview({ id, isDragging }: DragPreviewProps) {
    if (!id || !isDragging) return null;
    const node = treeRef.current?.get(id);
    if (!node) return null;
    const treeNode = node.data as TreeNode;
    const Icon = TASK_TYPE_ICONS[treeNode.task.type as keyof typeof TASK_TYPE_ICONS] || TASK_TYPE_ICONS[TaskType.ASSIGNMENT];

    const getTaskIconColorClass = (task: TreeNode['task']): string => {
      if (task.status === TaskStatus.COLLECTED) {
        return TASK_STATUS_ICON_COLORS[TaskStatus.COLLECTED];
      }
      if (task.status === TaskStatus.DONE) {
        return TASK_STATUS_ICON_COLORS[TaskStatus.DONE];
      }
      if (task.status === TaskStatus.FAILED) {
        return TASK_STATUS_ICON_COLORS[TaskStatus.FAILED];
      }

      const priority = task.priority as TaskPriority | undefined;
      if (priority && priority !== TaskPriority.NORMAL) {
        const color = TASK_PRIORITY_ICON_COLORS[priority as keyof typeof TASK_PRIORITY_ICON_COLORS];
        if (color) return color;
      }

      return 'text-muted-foreground';
    };

    const iconColorClass = getTaskIconColorClass(treeNode.task);

    return (
      <div className="pointer-events-none select-none rounded-md bg-background/90 shadow-lg ring-1 ring-primary/20 px-3 py-2 flex items-center gap-3">
        <Icon className={`h-4 w-4 ${iconColorClass}`} />
        <span className="text-sm font-medium truncate max-w-[280px]">{treeNode.task.name}</span>
      </div>
    );
  };


export default function TaskTree({
  tree,
  expanded,
  onToggle,
  onNewTask,
  selectedNode,
  onSelectNode,
  stationFilters,
  onStationFilterChange,
  typeFilter,
  onTypeFilterChange,
  activeSubTab,
  onChangeOrder,
  onMove,
}: TaskTreeProps) {
  const typeOptions: TaskType[] =
    activeSubTab === 'recurrent-tasks'
      ? [TaskType.RECURRENT_GROUP, TaskType.RECURRENT_TEMPLATE, TaskType.RECURRENT_INSTANCE]
      : activeSubTab === 'automation-tree'
        ? [TaskType.AUTOMATION]
        : Object.values(TaskType).filter(
          (t) =>
            t !== TaskType.RECURRENT_GROUP &&
            t !== TaskType.RECURRENT_TEMPLATE &&
            t !== TaskType.RECURRENT_INSTANCE &&
            t !== TaskType.AUTOMATION
        );

  // --- Optimization: Memoize node collections ---
  // These specific traversals were previously happening multiple times per render
  const missionGroupNodes = React.useMemo(() => collectNodesByType(tree, TaskType.MISSION_GROUP), [tree]);
  const missionNodes = React.useMemo(() => collectNodesByType(tree, TaskType.MISSION), [tree]);
  const milestoneNodes = React.useMemo(() => collectNodesByType(tree, TaskType.MILESTONE), [tree]);
  const recurrentGroupNodes = React.useMemo(() => collectNodesByType(tree, TaskType.RECURRENT_GROUP), [tree]);
  const recurrentTemplateNodes = React.useMemo(() => collectNodesByType(tree, TaskType.RECURRENT_TEMPLATE), [tree]);

  // --- Optimization: Memoize states derived from expanded set ---
  // This avoids re-scanning arrays on every render, only when expanded set changes
  const allMissionGroupsExpanded = React.useMemo(() =>
    missionGroupNodes.length > 0 && missionGroupNodes.every(node => expanded.has(node.task.id)),
    [missionGroupNodes, expanded]);

  const allMissionsExpanded = React.useMemo(() =>
    missionNodes.length > 0 && missionNodes.every(node => expanded.has(node.task.id)),
    [missionNodes, expanded]);

  const allMilestonesExpanded = React.useMemo(() =>
    milestoneNodes.length > 0 && milestoneNodes.every(node => expanded.has(node.task.id)),
    [milestoneNodes, expanded]);

  const allRecurrentGroupsExpanded = React.useMemo(() =>
    recurrentGroupNodes.length > 0 && recurrentGroupNodes.every(node => expanded.has(node.task.id)),
    [recurrentGroupNodes, expanded]);

  const allRecurrentTemplatesExpanded = React.useMemo(() =>
    recurrentTemplateNodes.length > 0 && recurrentTemplateNodes.every(node => expanded.has(node.task.id)),
    [recurrentTemplateNodes, expanded]);

  const treeRef = useRef<TreeApi<TreeNode> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize(prev => {
          if (prev.width === width && prev.height === height) return prev;
          return { width, height };
        });
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const toggleNode = useCallback((nodeId: string) => {
    treeRef.current?.toggle(nodeId);
    onToggle(nodeId);
  }, [onToggle]);

  const handleToggleMissionGroups = () => {
    if (allMissionGroupsExpanded) {
      missionGroupNodes.forEach(node => toggleNode(node.task.id));
    } else {
      missionGroupNodes.forEach(node => {
        if (!expanded.has(node.task.id)) {
          toggleNode(node.task.id);
        }
      });
    }
  };

  const handleToggleMissions = () => {
    if (allMissionsExpanded) {
      missionNodes.forEach(node => toggleNode(node.task.id));
    } else {
      missionNodes.forEach(node => {
        if (!expanded.has(node.task.id)) {
          toggleNode(node.task.id);
        }
      });
    }
  };

  const handleToggleMilestones = () => {
    if (allMilestonesExpanded) {
      milestoneNodes.forEach(node => toggleNode(node.task.id));
    } else {
      milestoneNodes.forEach(node => {
        if (!expanded.has(node.task.id)) toggleNode(node.task.id);
      });
      missionNodes.forEach(node => {
        if (!expanded.has(node.task.id)) toggleNode(node.task.id);
      });
      missionGroupNodes.forEach(node => {
        if (!expanded.has(node.task.id)) toggleNode(node.task.id);
      });
    }
  };

  const handleToggleRecurrentGroups = () => {
    if (allRecurrentGroupsExpanded) {
      recurrentGroupNodes.forEach(node => toggleNode(node.task.id));
    } else {
      recurrentGroupNodes.forEach(node => {
        if (!expanded.has(node.task.id)) {
          toggleNode(node.task.id);
        }
      });
    }
  };

  const handleToggleRecurrentTemplates = () => {
    if (allRecurrentTemplatesExpanded) {
      recurrentTemplateNodes.forEach(node => toggleNode(node.task.id));
    } else {
      recurrentTemplateNodes.forEach(node => {
        if (!expanded.has(node.task.id)) toggleNode(node.task.id);
      });
      recurrentGroupNodes.forEach(node => {
        if (!expanded.has(node.task.id)) toggleNode(node.task.id);
      });
    }
  };

  const initialOpenState = useMemo(() => {
    const map: Record<string, boolean> = {};
    expanded.forEach(id => {
      map[id] = true;
    });
    return map;
  }, [expanded]);

  const handleSelectFromTree = useCallback(
    (nodes: any[]) => {
      const first = nodes[0];
      const data = first?.data as TreeNode | undefined;
      if (data && onSelectNode) {
        onSelectNode(data);
      }
    },
    [onSelectNode]
  );

  const TaskTreeNode: React.FC<NodeRendererProps<TreeNode>> = ({ node, style, dragHandle, preview }) => {
      const treeNode = node.data as TreeNode;
      const hasChildren = !!treeNode.children.length;

      const Icon = TASK_TYPE_ICONS[treeNode.task.type as keyof typeof TASK_TYPE_ICONS] || TASK_TYPE_ICONS[TaskType.ASSIGNMENT];

      const getTaskIconColorClass = (task: TreeNode['task']): string => {
        if (task.status === TaskStatus.COLLECTED) {
          return TASK_STATUS_ICON_COLORS[TaskStatus.COLLECTED];
        }
        if (task.status === TaskStatus.DONE) {
          return TASK_STATUS_ICON_COLORS[TaskStatus.DONE];
        }
        if (task.status === TaskStatus.FAILED) {
          return TASK_STATUS_ICON_COLORS[TaskStatus.FAILED];
        }

        const priority = task.priority as TaskPriority | undefined;
        if (priority && priority !== TaskPriority.NORMAL) {
          const color = TASK_PRIORITY_ICON_COLORS[priority as keyof typeof TASK_PRIORITY_ICON_COLORS];
          if (color) return color;
        }

        return 'text-muted-foreground';
      };

      const iconColorClass = getTaskIconColorClass(treeNode.task);

      const parent = node.parent;
      const siblingCount = parent?.children?.length ?? 1;
      const position = node.childIndex >= 0 ? node.childIndex : 0;

      const [isEditingOrder, setIsEditingOrder] = useState(false);
      const [orderInput, setOrderInput] = useState(String(position + 1));

      useEffect(() => {
        setOrderInput(String(position + 1));
      }, [position, siblingCount]);

      const submitOrderChange = async () => {
        const parsed = parseInt(orderInput, 10);
        if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= siblingCount) {
          try {
            const parentId = (treeNode.task.parentId || null) as string | null;
            await onChangeOrder(treeNode.task.id, parentId, parsed);
          } catch (error) {
            console.error('Failed to change order:', error);
          }
        }
        setIsEditingOrder(false);
      };

      return (
        <div
          style={style}
          ref={dragHandle}
          className={`flex items-center ${preview ? 'opacity-80' : ''}`}
        >
          <button
            onClick={node.handleClick}
            style={{
              paddingLeft: `${node.level * 1.25}rem`,
              cursor: node.isDragging ? 'grabbing' : 'pointer',
            }}
            className={[
              'flex-1 text-left flex items-center gap-3 py-3 rounded-md',
              `transition-all duration-${TRANSITION_DURATION_150}`,
              node.isSelected ? 'bg-primary/10' : 'hover:bg-muted/50',
              node.willReceiveDrop ? 'ring-2 ring-primary ring-offset-2 ring-offset-background bg-primary/5' : '',
              node.isDragging ? 'shadow-lg scale-105' : '',
            ].join(' ')}
          >
            <div className="w-6 h-6 flex items-center justify-center">
              {hasChildren && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    node.toggle();
                  }}
                  className="p-1 hover:bg-muted/50 rounded cursor-pointer transition-colors"
                >
                  {node.isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </span>
              )}
            </div>

            <Icon className={`h-4 w-4 ${iconColorClass}`} />

            <div className="flex items-center">
              {isEditingOrder ? (
                <div
                  className="flex items-center gap-1"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <Input
                    type="text"
                    inputMode="numeric"
                    className="w-10 h-5 text-[0.625rem] px-1 border rounded bg-background"
                    value={orderInput}
                    onChange={(e) => setOrderInput(e.target.value)}
                    onBlur={submitOrderChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        submitOrderChange();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        setOrderInput(String(position + 1));
                        setIsEditingOrder(false);
                      }
                    }}
                    autoFocus
                  />
                  <span className="text-[0.625rem] text-muted-foreground whitespace-nowrap">
                    /{siblingCount}
                  </span>
                </div>
              ) : (
                <span
                  className="text-[0.625rem] px-1 py-0.5 rounded bg-muted text-muted-foreground cursor-text"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOrderInput(String(position + 1));
                    setIsEditingOrder(true);
                  }}
                >
                  {position + 1}/{siblingCount}
                </span>
              )}
            </div>

            <span className="flex-1 truncate text-base font-medium">{treeNode.task.name}</span>
          </button>
        </div>
      );
    };

  const dragPreviewRenderer = useMemo(() => makeDragPreview(treeRef), []);

  return (
    <aside className="w-full h-full border-b sm:border-b-0 sm:border-r bg-muted/20 flex flex-col overflow-hidden">
      <div className="p-3 border-b">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1">
            {activeSubTab === 'mission-tree' && (
              <>
                {missionGroupNodes.length > 0 && (
                  <Button
                    variant={allMissionGroupsExpanded ? "default" : "ghost"}
                    size="sm"
                    className="text-xs px-2"
                    onClick={handleToggleMissionGroups}
                  >
                    {React.createElement(TASK_TYPE_ICONS[TaskType.MISSION_GROUP] || TASK_TYPE_ICONS[TaskType.ASSIGNMENT], { className: "h-4 w-4" })}
                  </Button>
                )}
                {missionNodes.length > 0 && (
                  <Button
                    variant={allMissionsExpanded ? "default" : "ghost"}
                    size="sm"
                    className="text-xs px-2"
                    onClick={handleToggleMissions}
                  >
                    {React.createElement(TASK_TYPE_ICONS[TaskType.MISSION] || TASK_TYPE_ICONS[TaskType.ASSIGNMENT], { className: "h-4 w-4" })}
                  </Button>
                )}
                <Button
                  variant={allMilestonesExpanded ? "default" : "ghost"}
                  size="sm"
                  className="text-xs px-2"
                  onClick={handleToggleMilestones}
                >
                  {React.createElement(TASK_TYPE_ICONS[TaskType.MILESTONE] || TASK_TYPE_ICONS[TaskType.ASSIGNMENT], { className: "h-4 w-4" })}
                </Button>
              </>
            )}
            {activeSubTab === 'recurrent-tasks' && (
              <>
                {recurrentGroupNodes.length > 0 && (
                  <Button
                    variant={allRecurrentGroupsExpanded ? "default" : "ghost"}
                    size="sm"
                    className="text-xs px-2"
                    onClick={handleToggleRecurrentGroups}
                  >
                    {React.createElement(TASK_TYPE_ICONS[TaskType.RECURRENT_GROUP] || TASK_TYPE_ICONS[TaskType.ASSIGNMENT], { className: "h-4 w-4" })}
                  </Button>
                )}
                {recurrentTemplateNodes.length > 0 && (
                  <Button
                    variant={allRecurrentTemplatesExpanded ? "default" : "ghost"}
                    size="sm"
                    className="text-xs px-2"
                    onClick={handleToggleRecurrentTemplates}
                  >
                    {React.createElement(TASK_TYPE_ICONS[TaskType.RECURRENT_TEMPLATE] || TASK_TYPE_ICONS[TaskType.ASSIGNMENT], { className: "h-4 w-4" })}
                  </Button>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Select value={stationFilters.size === 0 ? 'all' : Array.from(stationFilters)[0]} onValueChange={v => {
              if (v === 'all') {
                onStationFilterChange(new Set());
              } else {
                onStationFilterChange(new Set([v as Station]));
              }
            }}>
              <SelectTrigger className="text-xs w-40">
                <SelectValue placeholder="Filter by Station" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stations</SelectItem>
                {getRootStations().map(station => (
                  <SelectItem key={station} value={station}>
                    {station}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={v => onTypeFilterChange(v as TaskType | 'all')}>
              <SelectTrigger className="text-xs w-44">
                <SelectValue placeholder="Filter by Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {typeOptions.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {activeSubTab !== 'automation-tree' && (
            <Button variant="ghost" size="sm" onClick={onNewTask}>
              <PlusCircle className="h-4 w-4 mr-2" />
              + New Task
            </Button>
          )}
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-hidden relative">
        {containerSize.height > 0 && (
          <Tree
            data={tree}
            height={containerSize.height}
            width={containerSize.width || '100%'}
            rowHeight={40}
            indent={24}
            idAccessor={(node: TreeNode) => node.task.id}
            childrenAccessor={(node: TreeNode) => node.children}
            selection={selectedNode?.task.id}
            onSelect={handleSelectFromTree}
            onMove={onMove}
            onToggle={onToggle}
            initialOpenState={initialOpenState}
            ref={treeRef}
            renderCursor={ThemedCursor}
            renderDragPreview={dragPreviewRenderer}
            className="absolute inset-0 custom-scrollbar"
          >
            {TaskTreeNode}
          </Tree>
        )}
      </div>
    </aside>
  );
} 