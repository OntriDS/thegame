'use client';

import { TreeNode } from '@/lib/utils/tree-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { TaskType, STATION_CATEGORIES, TaskStatus, TaskPriority } from '@/types/enums';
import type { Station } from '@/types/type-aliases';
import { ChevronRight, ChevronDown, PlusCircle, Filter } from 'lucide-react';
import { DRAG_Z_INDEX, MIN_WIDTH_150, TRANSITION_DURATION_150, TASK_TYPE_ICONS } from '@/lib/constants/app-constants';
import { TASK_PRIORITY_ICON_COLORS, TASK_STATUS_ICON_COLORS } from '@/lib/constants/color-constants';
import { getInteractiveInnerModalZIndex, getInteractiveSubModalZIndex } from '@/lib/utils/z-index-utils';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import React, { useState, useEffect, useRef } from 'react';

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
}

// Helper to get root stations (all stations are root level now)
const getRootStations = () => ['ADMIN', 'DESIGN', 'PRODUCTION', 'SALES', 'PERSONAL'] as const;

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
interface TreeNodeProps {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  selectedNode: TreeNode | null;
  onToggle: (nodeId: string) => void;
  onSelectNode: (node: TreeNode) => void;
  position: number;
  count: number;
  onChangeOrder: (taskId: string, parentId: string | null, newPosition: number) => Promise<void> | void;
}

const TreeNodeComponent = React.memo(function TreeNodeComponent({ node, depth, expanded, selectedNode, onToggle, onSelectNode, position, count, onChangeOrder }: TreeNodeProps) {
  const nodeId = node.task.id;
  const isExpanded = expanded.has(nodeId);
  const isSelected = selectedNode?.task.id === nodeId;
  const hasChildren = node.children.length > 0;

  // --- dnd-kit hooks ---
  const { attributes, listeners, setNodeRef: draggableRef, transform, isDragging } = useDraggable({ id: nodeId });
  const { setNodeRef: droppableRef, isOver } = useDroppable({ id: nodeId });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? DRAG_Z_INDEX : 'auto',
  };

  const dropLine = isOver && !isDragging
    ? 'after:absolute after:left-0 after:right-0 after:-bottom-[1px] after:h-0 after:border-b-2 after:border-accent/60'
    : '';

  const Icon = TASK_TYPE_ICONS[node.task.type as keyof typeof TASK_TYPE_ICONS] || TASK_TYPE_ICONS[TaskType.ASSIGNMENT];
  const getTaskIconColorClass = (task: TreeNode['task']): string => {
    if (task.status === TaskStatus.DONE) {
      return TASK_STATUS_ICON_COLORS[TaskStatus.DONE];
    }

    const priority = task.priority as TaskPriority | undefined;
    if (priority && priority !== TaskPriority.NORMAL) {
      const color = TASK_PRIORITY_ICON_COLORS[priority as keyof typeof TASK_PRIORITY_ICON_COLORS];
      if (color) return color;
    }

    return 'text-muted-foreground';
  };
  const iconColorClass = getTaskIconColorClass(node.task);
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [orderInput, setOrderInput] = useState(String(position + 1));

  useEffect(() => {
    setOrderInput(String(position + 1));
  }, [position, count]);

  const submitOrderChange = async () => {
    const parsed = parseInt(orderInput, 10);
    if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= count) {
      try {
        await onChangeOrder(node.task.id, node.task.parentId || null, parsed);
      } catch (error) {
        console.error('Failed to change order:', error);
      }
    }
    setIsEditingOrder(false);
  };

  return (
    <div ref={droppableRef} style={style} className={`relative ${dropLine}`}>
      <div className="flex items-center">
        {/* Main Button is now the draggable element */}
        <button
          ref={draggableRef}
          {...listeners}
          {...attributes}
          onClick={() => onSelectNode(node)}
          style={{ paddingLeft: `${depth * 1.25}rem`, cursor: isDragging ? 'grabbing' : 'pointer' }}
          className={`flex-1 text-left flex items-center gap-3 py-3 rounded-md transition-all duration-${TRANSITION_DURATION_150} ${isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
            } ${isOver ? 'ring-2 ring-accent ring-offset-2 ring-offset-background bg-accent/10' : ''
            } ${isDragging ? 'shadow-lg scale-105' : ''
            }`}
        >
          {/* Toggle Chevron */}
          <div className="w-6 h-6 flex items-center justify-center">
            {hasChildren && (
              <span
                onClick={(e) => { e.stopPropagation(); onToggle(nodeId); }}
                className="p-1 hover:bg-muted/50 rounded cursor-pointer transition-colors"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </span>
            )}
          </div>

          {/* Category Icon */}
          <Icon className={`h-4 w-4 ${iconColorClass}`} />

          {/* Ordinal badge */}
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
                  // min/max not supported on text input directly, handled via validation
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
                  /{count}
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
                {position + 1}/{count}
              </span>
            )}
          </div>

          {/* Name */}
          <span className="flex-1 truncate text-base font-medium">{node.task.name}</span>
        </button>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child, idx) => (
            <TreeNodeComponent
              key={child.task.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              selectedNode={selectedNode}
              onToggle={onToggle}
              onSelectNode={onSelectNode}
              position={idx}
              count={node.children.length}
              onChangeOrder={onChangeOrder}
            />
          ))}
        </div>
      )}
    </div>
  );
});


export default function TaskTree({
  tree,
  expanded,
  onToggle,
  onNewTask,
  stationFilters,
  onStationFilterChange,
  typeFilter,
  onTypeFilterChange,
  activeSubTab,
  onChangeOrder,
  ...props
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
  const missionNodes = React.useMemo(() => collectNodesByType(tree, TaskType.MISSION), [tree]);
  const milestoneNodes = React.useMemo(() => collectNodesByType(tree, TaskType.MILESTONE), [tree]);
  const recurrentGroupNodes = React.useMemo(() => collectNodesByType(tree, TaskType.RECURRENT_GROUP), [tree]);
  const recurrentTemplateNodes = React.useMemo(() => collectNodesByType(tree, TaskType.RECURRENT_TEMPLATE), [tree]);

  // --- Optimization: Memoize states derived from expanded set ---
  // This avoids re-scanning arrays on every render, only when expanded set changes
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

  // Handlers for bulk toggles using memoized lists
  const handleToggleMissions = () => {
    if (allMissionsExpanded) {
      missionNodes.forEach(node => onToggle(node.task.id));
    } else {
      missionNodes.forEach(node => {
        if (!expanded.has(node.task.id)) {
          onToggle(node.task.id);
        }
      });
    }
  };

  const handleToggleMilestones = () => {
    if (allMilestonesExpanded) {
      // Turn OFF milestones
      milestoneNodes.forEach(node => onToggle(node.task.id));
    } else {
      // Turn ON milestones - this also turns ON missions (hierarchical requirement)
      milestoneNodes.forEach(node => {
        if (!expanded.has(node.task.id)) onToggle(node.task.id);
      });
      // Also turn ON all missions
      missionNodes.forEach(node => {
        if (!expanded.has(node.task.id)) onToggle(node.task.id);
      });
    }
  };

  const handleToggleRecurrentGroups = () => {
    if (allRecurrentGroupsExpanded) {
      recurrentGroupNodes.forEach(node => onToggle(node.task.id));
    } else {
      recurrentGroupNodes.forEach(node => {
        if (!expanded.has(node.task.id)) onToggle(node.task.id);
      });
    }
  };

  const handleToggleRecurrentTemplates = () => {
    if (allRecurrentTemplatesExpanded) {
      // Turn OFF templates
      recurrentTemplateNodes.forEach(node => onToggle(node.task.id));
    } else {
      // Turn ON templates - also turns ON parents
      recurrentTemplateNodes.forEach(node => {
        if (!expanded.has(node.task.id)) onToggle(node.task.id);
      });
      // Also turn ON all parents
      recurrentGroupNodes.forEach(node => {
        if (!expanded.has(node.task.id)) onToggle(node.task.id);
      });
    }
  };

  return (
    <aside className="w-full h-full border-b sm:border-b-0 sm:border-r bg-muted/20 flex flex-col overflow-hidden">
      <div className="p-3 border-b space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* No master toggle - removed */}
          </div>
          <div className="flex gap-1">
            {activeSubTab === 'mission-tree' && (
              <>
                {/* Mission Toggle */}
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
                {/* Milestone Toggle */}
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
                {/* Recurrent Group Toggle */}
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
                {/* Recurrent Template Toggle */}
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
          <Button variant="ghost" size="sm" onClick={onNewTask}>
            <PlusCircle className="h-4 w-4 mr-2" />
            {activeSubTab === 'recurrent-tasks' ? '+ New Recurrent' : '+ New Task'}
          </Button>
        </div>

        {/* --- NEW: Filter Controls --- */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Select value={stationFilters.size === 0 ? 'all' : Array.from(stationFilters)[0]} onValueChange={v => {
              if (v === 'all') {
                onStationFilterChange(new Set());
              } else {
                onStationFilterChange(new Set([v as Station]));
              }
            }}>
              <SelectTrigger className="text-xs w-full">
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
              <SelectTrigger className="text-xs w-full">
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
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {tree.map((root, idx) => (
          <TreeNodeComponent
            key={root.task.id}
            node={root}
            depth={0}
            expanded={expanded}
            selectedNode={props.selectedNode}
            onToggle={onToggle}
            onSelectNode={props.onSelectNode}
            position={idx}
            count={tree.length}
            onChangeOrder={onChangeOrder}
          />
        ))}
      </div>
    </aside>
  );
} 