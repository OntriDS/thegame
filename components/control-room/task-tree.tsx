'use client';

import { TreeNode } from '@/lib/utils/tree-utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { TaskType, STATION_CATEGORIES } from '@/types/enums';
import type { Station } from '@/types/type-aliases';
import { ChevronRight, ChevronDown, PlusCircle, Filter } from 'lucide-react';
import { DRAG_Z_INDEX, MIN_WIDTH_150, TRANSITION_DURATION_150, TASK_TYPE_ICONS } from '@/lib/constants/app-constants';
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
  activeSubTab: 'mission-tree' | 'recurrent-tasks' | 'schedule' | 'calendar';
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
}

function TreeNodeComponent({ node, depth, expanded, selectedNode, onToggle, onSelectNode }: TreeNodeProps) {
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
          className={`flex-1 text-left flex items-center gap-2 py-2 rounded-md transition-all duration-${TRANSITION_DURATION_150} ${
            isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
          } ${
            isOver ? 'ring-2 ring-accent ring-offset-2 ring-offset-background bg-accent/10' : ''
          } ${
            isDragging ? 'shadow-lg scale-105' : ''
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
          <Icon className="h-4 w-4 text-muted-foreground" />

          {/* Name */}
          <span className="flex-1 truncate text-sm font-medium">{node.task.name}</span>
        </button>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children.map(child => (
            <TreeNodeComponent
              key={child.task.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              selectedNode={selectedNode}
              onToggle={onToggle}
              onSelectNode={onSelectNode}
            />
          ))}
        </div>
      )}
    </div>
  );
}


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
  ...props 
}: TaskTreeProps) {
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
                {collectNodesByType(tree, TaskType.MISSION).length > 0 && (
                  <Button 
                    variant={(() => {
                      const missionNodes = collectNodesByType(tree, TaskType.MISSION);
                      return missionNodes.length > 0 && missionNodes.every(node => expanded.has(node.task.id)) ? "default" : "ghost";
                    })()}
                    size="sm"
                    className="text-xs px-2"
                    onClick={() => {
                      const missionNodes = collectNodesByType(tree, TaskType.MISSION);
                      const allMissionsExpanded = missionNodes.every(node => expanded.has(node.task.id));
                      
                      if (allMissionsExpanded) {
                        missionNodes.forEach(node => onToggle(node.task.id));
                      } else {
                        missionNodes.forEach(node => {
                          if (!expanded.has(node.task.id)) {
                            onToggle(node.task.id);
                          }
                        });
                      }
                    }}
                  >
                    {React.createElement(TASK_TYPE_ICONS[TaskType.MISSION] || TASK_TYPE_ICONS[TaskType.ASSIGNMENT], { className: "h-4 w-4" })}
                  </Button>
                )}
                {/* Milestone Toggle */}
                <Button 
                  variant={(() => {
                    const milestoneNodes = collectNodesByType(tree, TaskType.MILESTONE);
                    return milestoneNodes.length > 0 && milestoneNodes.every(node => expanded.has(node.task.id)) ? "default" : "ghost";
                  })()}
                  size="sm"
                  className="text-xs px-2"
                  onClick={() => {
                    const milestoneNodes = collectNodesByType(tree, TaskType.MILESTONE);
                    const missionNodes = collectNodesByType(tree, TaskType.MISSION);
                    const allMilestonesExpanded = milestoneNodes.length > 0 && milestoneNodes.every(node => expanded.has(node.task.id));
                    
                    if (allMilestonesExpanded) {
                      // Turn OFF milestones
                      milestoneNodes.forEach(node => onToggle(node.task.id));
                    } else {
                      // Turn ON milestones - this also turns ON missions
                      milestoneNodes.forEach(node => {
                        if (!expanded.has(node.task.id)) {
                          onToggle(node.task.id);
                        }
                      });
                      // Also turn ON all missions
                      missionNodes.forEach(node => {
                        if (!expanded.has(node.task.id)) {
                          onToggle(node.task.id);
                        }
                      });
                    }
                  }}
                  >
                    {React.createElement(TASK_TYPE_ICONS[TaskType.MILESTONE] || TASK_TYPE_ICONS[TaskType.ASSIGNMENT], { className: "h-4 w-4" })}
                  </Button>
              </>
            )}
            {activeSubTab === 'recurrent-tasks' && (
              <>
                {/* Recurrent Group Toggle */}
                {collectNodesByType(tree, TaskType.RECURRENT_GROUP).length > 0 && (
                  <Button 
                    variant={(() => {
                      const parentNodes = collectNodesByType(tree, TaskType.RECURRENT_GROUP);
                      return parentNodes.length > 0 && parentNodes.every(node => expanded.has(node.task.id)) ? "default" : "ghost";
                    })()}
                    size="sm"
                    className="text-xs px-2"
                    onClick={() => {
                      const parentNodes = collectNodesByType(tree, TaskType.RECURRENT_GROUP);
                      const allParentsExpanded = parentNodes.every(node => expanded.has(node.task.id));
                      
                      if (allParentsExpanded) {
                        parentNodes.forEach(node => onToggle(node.task.id));
                      } else {
                        parentNodes.forEach(node => {
                          if (!expanded.has(node.task.id)) {
                            onToggle(node.task.id);
                          }
                        });
                      }
                    }}
                  >
                    {React.createElement(TASK_TYPE_ICONS[TaskType.RECURRENT_GROUP] || TASK_TYPE_ICONS[TaskType.ASSIGNMENT], { className: "h-4 w-4" })}
                  </Button>
                )}
                {/* Recurrent Template Toggle */}
                {collectNodesByType(tree, TaskType.RECURRENT_TEMPLATE).length > 0 && (
                  <Button 
                    variant={(() => {
                      const templateNodes = collectNodesByType(tree, TaskType.RECURRENT_TEMPLATE);
                      return templateNodes.length > 0 && templateNodes.every(node => expanded.has(node.task.id)) ? "default" : "ghost";
                    })()}
                    size="sm"
                    className="text-xs px-2"
                    onClick={() => {
                      const templateNodes = collectNodesByType(tree, TaskType.RECURRENT_TEMPLATE);
                      const parentNodes = collectNodesByType(tree, TaskType.RECURRENT_GROUP);
                      const allTemplatesExpanded = templateNodes.every(node => expanded.has(node.task.id));
                      
                      if (allTemplatesExpanded) {
                        // Turn OFF templates
                        templateNodes.forEach(node => onToggle(node.task.id));
                      } else {
                        // Turn ON templates - this also turns ON parents
                        templateNodes.forEach(node => {
                          if (!expanded.has(node.task.id)) {
                            onToggle(node.task.id);
                          }
                        });
                        // Also turn ON all parents
                        parentNodes.forEach(node => {
                          if (!expanded.has(node.task.id)) {
                            onToggle(node.task.id);
                          }
                        });
                      }
                    }}
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
                {activeSubTab === 'recurrent-tasks' 
                  ? [
                      <SelectItem key={TaskType.RECURRENT_GROUP} value={TaskType.RECURRENT_GROUP}>Recurrent Group</SelectItem>,
                      <SelectItem key={TaskType.RECURRENT_TEMPLATE} value={TaskType.RECURRENT_TEMPLATE}>Recurrent Template</SelectItem>,
                      <SelectItem key={TaskType.RECURRENT_INSTANCE} value={TaskType.RECURRENT_INSTANCE}>Recurrent Instance</SelectItem>,
                    ]
                  : Object.values(TaskType)
                      .filter(t => t !== TaskType.RECURRENT_GROUP && t !== TaskType.RECURRENT_TEMPLATE && t !== TaskType.RECURRENT_INSTANCE)
                      .map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)
                }
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {tree.map(root => (
          <TreeNodeComponent
            key={root.task.id}
            node={root}
            depth={0}
            expanded={expanded}
            selectedNode={props.selectedNode}
            onToggle={onToggle}
            onSelectNode={props.onSelectNode}
          />
        ))}
      </div>
    </aside>
  );
} 