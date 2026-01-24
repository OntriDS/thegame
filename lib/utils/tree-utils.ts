// Tree utilities for task hierarchy

import type { Task } from '@/types/entities';

export interface TreeNode {
  task: Task;
  children: TreeNode[];
  level: number;
}

/**
 * Sort comparator for tasks: order → createdAt → name
 */
function compareTasks(a: Task, b: Task): number {
  // Primary: order field (ascending)
  const orderA = a.order ?? 0;
  const orderB = b.order ?? 0;
  if (orderA !== orderB) {
    return orderA - orderB;
  }

  // Secondary: createdAt (ascending)
  const createdAtA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const createdAtB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  if (createdAtA !== createdAtB) {
    return createdAtA - createdAtB;
  }

  // Tertiary: name (ascending)
  const nameA = a.name || '';
  const nameB = b.name || '';
  return nameA.localeCompare(nameB);
}

/**
 * Recursively sort a tree node and all its children
 */
function sortTreeNode(node: TreeNode): void {
  // Sort children
  node.children.sort((a, b) => compareTasks(a.task, b.task));
  // Recursively sort all descendants
  node.children.forEach(child => sortTreeNode(child));
}

export function buildTaskTree(tasks: Task[]): TreeNode[] {
  // Step 1: Create TreeNode map with proper TreeNode objects
  const nodeMap = new Map<string, TreeNode>();

  // Initialize all nodes
  for (const task of tasks) {
    const node: TreeNode = {
      task,
      children: [],
      level: 0
    };
    nodeMap.set(task.id, node);
  }

  // Step 2: Build parent-child relationships using TreeNode objects
  const roots: TreeNode[] = [];

  for (const task of tasks) {
    const node = nodeMap.get(task.id)!;

    if (task.parentId) {
      const parent = nodeMap.get(task.parentId);
      if (parent) {
        parent.children.push(node);
        node.level = parent.level + 1;
      } else {
        // Parent not found, make it a root
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  // Step 3: Sort all roots and recursively sort all children
  roots.sort((a, b) => compareTasks(a.task, b.task));
  roots.forEach(root => sortTreeNode(root));

  return roots;
}
