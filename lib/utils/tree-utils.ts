// Tree utilities for task hierarchy

export interface TreeNode {
  task: any;
  children: TreeNode[];
  level: number;
}

export function buildTaskTree(tasks: any[]): TreeNode[] {
  // Build tree structure from flat task list
  const taskMap = new Map(tasks.map(task => [task.id, { ...task, children: [] }]));
  const roots: TreeNode[] = [];
  
  for (const task of tasks) {
    const node: TreeNode = {
      task,
      children: [],
      level: 0
    };
    
    if (task.parentId) {
      const parent = taskMap.get(task.parentId);
      if (parent) {
        parent.children.push(node);
        node.level = parent.level + 1;
      }
    } else {
      roots.push(node);
    }
  }
  
  return roots;
}
