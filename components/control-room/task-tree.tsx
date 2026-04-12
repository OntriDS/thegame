'use client';

import { TreeNode } from '@/lib/utils/tree-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TaskType, TaskStatus, TaskPriority } from '@/types/enums';
import type { Station } from '@/types/type-aliases';
import { ChevronRight, ChevronDown, PlusCircle } from 'lucide-react';
import { TRANSITION_DURATION_150, TASK_TYPE_ICONS } from '@/lib/constants/app-constants';
import { TASK_PRIORITY_ICON_COLORS, TASK_STATUS_ICON_COLORS } from '@/lib/constants/color-constants';
import { getStationFromCombined } from '@/lib/utils/searchable-select-utils';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Tree } from 'react-arborist';
import type { CursorProps, DragPreviewProps, MoveHandler, NodeRendererProps, TreeApi } from 'react-arborist';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { STATION_CATEGORIES } from '@/types/enums';

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
  // --- NEW Tab Props ---
  activeSubTab: 'mission-tree' | 'recurrent-tasks' | 'automation-tree' | 'schedule' | 'calendar';
  onChangeOrder: (taskId: string, parentId: string | null, newPosition: number) => Promise<void> | void;
  onMove?: MoveHandler<TreeNode>;
}

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
  activeSubTab,
  onChangeOrder,
  onMove,
}: TaskTreeProps) {
  // --- Optimization: Memoize node collections ---
  // These specific traversals were previously happening multiple times per render
  const missionGroupNodes = React.useMemo(() => collectNodesByType(tree, TaskType.MISSION_GROUP), [tree]);
  const missionNodes = React.useMemo(() => collectNodesByType(tree, TaskType.MISSION), [tree]);
  const milestoneNodes = React.useMemo(() => collectNodesByType(tree, TaskType.MILESTONE), [tree]);
  const recurrentGroupNodes = React.useMemo(() => collectNodesByType(tree, TaskType.RECURRENT_GROUP), [tree]);
  const recurrentTemplateNodes = React.useMemo(() => collectNodesByType(tree, TaskType.RECURRENT_TEMPLATE), [tree]);
  const parentIdByNodeId = React.useMemo(() => {
    const map = new Map<string, string | null>();
    const walk = (nodes: TreeNode[]) => {
      nodes.forEach(node => {
        map.set(node.task.id, node.task.parentId ?? null);
        if (node.children.length > 0) {
          walk(node.children);
        }
      });
    };

    walk(tree);
    return map;
  }, [tree]);
  const expandableNodeIds = React.useMemo(() => {
    const ids = new Set<string>();
    const walk = (nodes: TreeNode[]) => {
      nodes.forEach(node => {
        if (node.children.length > 0) {
          ids.add(node.task.id);
          walk(node.children);
        }
      });
    };

    walk(tree);
    return ids;
  }, [tree]);
  const topLevelMissionGroupNodes = React.useMemo(
    () => missionGroupNodes.filter((node) => !parentIdByNodeId.get(node.task.id)),
    [missionGroupNodes, parentIdByNodeId]
  );
  const nestedMissionGroupNodes = React.useMemo(
    () => missionGroupNodes.filter((node) => parentIdByNodeId.get(node.task.id)),
    [missionGroupNodes, parentIdByNodeId]
  );

  const treeRef = useRef<TreeApi<TreeNode> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isRestoringTreeOpenState = useRef(false);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const stationFilterData = useMemo(() => {
    const options: Array<{ value: string; label: string; group: string }> = [
      { value: 'all', label: 'All Stations', group: 'All' },
    ];
    const stationGroups = new Map<string, Station[]>();

    Object.entries(STATION_CATEGORIES).forEach(([area, stations]) => {
      const stationList = [...stations] as Station[];
      stationGroups.set(area, stationList);
      options.push({
        value: `area:${area}`,
        label: `${area} (All Stations)`,
        group: 'Area',
      });
      stationList.forEach(station => {
        options.push({
          value: `${area}:${station}`,
          label: station,
          group: area,
        });
      });
    });

    return { options, stationGroups };
  }, []);
  const stationFilterValue = useMemo(() => {
    if (stationFilters.size === 0) {
      return 'all';
    }

    if (stationFilters.size === 1) {
      const selectedStation = Array.from(stationFilters)[0];
      for (const [area, stations] of stationFilterData.stationGroups.entries()) {
        if (stations.includes(selectedStation)) {
          return `${area}:${selectedStation}`;
        }
      }
      return 'all';
    }

    const areaMatch = Array.from(stationFilterData.stationGroups.entries()).find(([, stations]) =>
      stations.length === stationFilters.size && stations.every(station => stationFilters.has(station))
    );
    if (areaMatch) {
      return `area:${areaMatch[0]}`;
    }

    return 'multiple';
  }, [stationFilters, stationFilterData.stationGroups]);
  const stationFilterLabel = stationFilterValue === 'multiple' ? 'Multiple Stations' : '';
  const handleStationFilterValueChange = (value: string) => {
    if (value === 'all' || value === '') {
      onStationFilterChange(new Set());
      return;
    }

    if (value.startsWith('area:')) {
      const area = value.replace('area:', '');
      const areaStations = stationFilterData.stationGroups.get(area);
      if (areaStations) {
        onStationFilterChange(new Set(areaStations));
      } else {
        onStationFilterChange(new Set());
      }
      return;
    }

    const station = getStationFromCombined(value);
    if (station) {
      onStationFilterChange(new Set([station as Station]));
    } else {
      onStationFilterChange(new Set());
    }
  };

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

  const setNodeOpenState = useCallback((nodeId: string, isOpen: boolean) => {
    const api = treeRef.current;
    if (!api) return;
    if (isOpen) {
      const chain: string[] = [];
      const seen = new Set<string>();
      let currentId: string | null | undefined = nodeId;

      while (currentId) {
        if (seen.has(currentId)) break;
        chain.push(currentId);
        seen.add(currentId);
        const parentId = parentIdByNodeId.get(currentId);
        if (parentId === undefined) break;
        currentId = parentId;
      }

      for (let i = chain.length - 1; i >= 0; i--) {
        api.open(chain[i]);
      }
    } else {
      api.close(nodeId);
    }
  }, [parentIdByNodeId]);

  const setNodeStateForList = useCallback((nodes: TreeNode[], isOpen: boolean) => {
    nodes.forEach(node => {
      setNodeOpenState(node.task.id, isOpen);
    });
  }, [setNodeOpenState]);

  useEffect(() => {
    const api = treeRef.current;
    if (!api) return;

    isRestoringTreeOpenState.current = true;
    try {
      expandableNodeIds.forEach((nodeId) => {
        const shouldOpen = expanded.has(nodeId);
        const isOpen = api.isOpen(nodeId);

        if (shouldOpen !== isOpen) {
          setNodeOpenState(nodeId, shouldOpen);
        }
      });
    } finally {
      isRestoringTreeOpenState.current = false;
    }
  }, [expanded, expandableNodeIds, setNodeOpenState]);

  const isNodeEffectivelyOpen = useCallback((nodeId: string) => {
    const api = treeRef.current;
    if (!api) {
      return expanded.has(nodeId);
    }

    if (!api.isOpen(nodeId)) return false;

    const seen = new Set<string>();
    let currentId: string | null | undefined = parentIdByNodeId.get(nodeId);

    while (currentId) {
      if (seen.has(currentId)) break;
      if (!api.isOpen(currentId)) return false;
      seen.add(currentId);
      const parentId = parentIdByNodeId.get(currentId);
      if (parentId === undefined) break;
      currentId = parentId;
    }

    return true;
  }, [expanded, parentIdByNodeId]);

  const areAllNodesOpen = useCallback((nodes: TreeNode[]) => {
    const expandableNodes = nodes.filter(node => node.children.length > 0);
    if (expandableNodes.length === 0) return false;
    return expandableNodes.every(node => isNodeEffectivelyOpen(node.task.id));
  }, [isNodeEffectivelyOpen]);

  const handleToggleMissionGroups = () => {
    const allOpen = areAllNodesOpen(missionGroupNodes);
    if (allOpen) {
      setNodeStateForList(missionGroupNodes, false);
      setNodeStateForList(missionNodes, false);
      setNodeStateForList(milestoneNodes, false);
    } else {
      setNodeStateForList(missionNodes, false);
      setNodeStateForList(milestoneNodes, false);
      setNodeStateForList(nestedMissionGroupNodes, false);
      setNodeStateForList(topLevelMissionGroupNodes, true);
      setNodeStateForList(missionNodes, false);
      setNodeStateForList(milestoneNodes, false);
    }
  };

  const handleToggleMissions = () => {
    const allOpen = areAllNodesOpen(missionNodes);
    if (allOpen) {
      setNodeStateForList(missionNodes, false);
      setNodeStateForList(milestoneNodes, false);
    } else {
      setNodeStateForList(missionGroupNodes, true);
      setNodeStateForList(missionNodes, true);
    }
  };

  const handleToggleMilestones = () => {
    const allOpen = areAllNodesOpen(milestoneNodes);
    if (allOpen) {
      setNodeStateForList(milestoneNodes, false);
    } else {
      setNodeStateForList(missionGroupNodes, true);
      setNodeStateForList(missionNodes, true);
      setNodeStateForList(milestoneNodes, true);
    }
  };

  const handleToggleRecurrentGroups = () => {
    const allOpen = areAllNodesOpen(recurrentGroupNodes);
    if (allOpen) {
      setNodeStateForList(recurrentGroupNodes, false);
      setNodeStateForList(recurrentTemplateNodes, false);
    } else {
      setNodeStateForList(recurrentGroupNodes, true);
    }
  };

  const handleToggleRecurrentTemplates = () => {
    const allOpen = areAllNodesOpen(recurrentTemplateNodes);
    if (allOpen) {
      setNodeStateForList(recurrentTemplateNodes, false);
    } else {
      setNodeStateForList(recurrentGroupNodes, true);
      setNodeStateForList(recurrentTemplateNodes, true);
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
  const missionGroupsExpandedForUi = areAllNodesOpen(missionGroupNodes);
  const missionsExpandedForUi = areAllNodesOpen(missionNodes);
  const milestonesExpandedForUi = areAllNodesOpen(milestoneNodes);
  const recurrentGroupsExpandedForUi = areAllNodesOpen(recurrentGroupNodes);
  const recurrentTemplatesExpandedForUi = areAllNodesOpen(recurrentTemplateNodes);

  return (
    <aside className="w-full h-full border-b sm:border-b-0 sm:border-r bg-muted/20 flex flex-col overflow-hidden">
      <div className="p-3 border-b">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1">
            {activeSubTab === 'mission-tree' && (
              <>
                {missionGroupNodes.length > 0 && (
                  <Button
                    variant={missionGroupsExpandedForUi ? "default" : "ghost"}
                    size="sm"
                    className="text-xs px-2"
                    onClick={handleToggleMissionGroups}
                  >
                    {React.createElement(TASK_TYPE_ICONS[TaskType.MISSION_GROUP] || TASK_TYPE_ICONS[TaskType.ASSIGNMENT], { className: "h-4 w-4" })}
                  </Button>
                )}
                {missionNodes.length > 0 && (
                  <Button
                    variant={missionsExpandedForUi ? "default" : "ghost"}
                    size="sm"
                    className="text-xs px-2"
                    onClick={handleToggleMissions}
                  >
                    {React.createElement(TASK_TYPE_ICONS[TaskType.MISSION] || TASK_TYPE_ICONS[TaskType.ASSIGNMENT], { className: "h-4 w-4" })}
                  </Button>
                )}
                {milestoneNodes.length > 0 && (
                  <Button
                    variant={milestonesExpandedForUi ? "default" : "ghost"}
                    size="sm"
                    className="text-xs px-2"
                    onClick={handleToggleMilestones}
                  >
                    {React.createElement(TASK_TYPE_ICONS[TaskType.MILESTONE] || TASK_TYPE_ICONS[TaskType.ASSIGNMENT], { className: "h-4 w-4" })}
                  </Button>
                )}
              </>
            )}
            {activeSubTab === 'recurrent-tasks' && (
              <>
                {recurrentGroupNodes.length > 0 && (
                  <Button
                    variant={recurrentGroupsExpandedForUi ? "default" : "ghost"}
                    size="sm"
                    className="text-xs px-2"
                    onClick={handleToggleRecurrentGroups}
                  >
                    {React.createElement(TASK_TYPE_ICONS[TaskType.RECURRENT_GROUP] || TASK_TYPE_ICONS[TaskType.ASSIGNMENT], { className: "h-4 w-4" })}
                  </Button>
                )}
                {recurrentTemplateNodes.length > 0 && (
                  <Button
                    variant={recurrentTemplatesExpandedForUi ? "default" : "ghost"}
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
            <SearchableSelect
              value={stationFilterValue}
              onValueChange={handleStationFilterValueChange}
              placeholder="Filter by Station"
              options={stationFilterData.options}
              className="text-xs w-40"
              initialLabel={stationFilterLabel}
            />
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
            openByDefault={false}
            idAccessor={(node: TreeNode) => node.task.id}
            childrenAccessor={(node: TreeNode) => node.children}
            selection={selectedNode?.task.id}
            onSelect={handleSelectFromTree}
            onMove={onMove}
            onToggle={(nodeId) => {
              if (isRestoringTreeOpenState.current) return;
              onToggle(nodeId);
            }}
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