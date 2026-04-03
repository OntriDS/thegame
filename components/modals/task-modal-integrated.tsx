// components/modals/task-modal-integrated.tsx
// Integrated Task Modal - Refactored to use extracted forms
// Implements Shell/Core pattern for cleaner separation of concerns

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Task, Item, Site } from '@/types/entities';
import { TaskType, TaskStatus, FOUNDER_CHARACTER_ID } from '@/types/enums';
import { TaskModalShell } from './task-modal-shell';
import MissionTreeModalContent from './mission-tree-modal-content';
import RecurrentTreeModalContent from './recurrent-tree-modal-content';
import { getAllTasks, getAllItems, getAllSites, getTasksByParentId, getAllCharacters } from '@/data-store/datastore';
import { getZIndexClass } from '@/lib/utils/z-index-utils';

interface TaskModalProps {
  task?: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (task: Task) => Promise<void>;
  onComplete?: () => void;
  /** When set, new tasks / reparented tasks get max(sibling order)+ORDER_INCREMENT instead of Date.now() */
  allTasksForOrder?: Task[];
  isRecurrentModal?: boolean;
}

/**
 * Integrated Task Modal Component
 * Uses Shell/Core pattern to delegate to specialized forms:
 * - MissionTreeModalContent for standard tasks (MISSION, MILESTONE, GOAL, ASSIGNMENT)
 * - RecurrentTreeModalContent for recurrent tasks (RECURRENT_GROUP, RECURRENT_TEMPLATE, RECURRENT_INSTANCE)
 *
 * Integration Benefits:
 * - Cleaner separation of concerns
 * - Easier maintenance
 * - Reusable form components
 * - Consistent modal structure
 */
export default function TaskModal({
  task,
  open,
  onOpenChange,
  onSave,
  onComplete,
  allTasksForOrder,
  isRecurrentModal = false,
}: TaskModalProps) {
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [allSites, setAllSites] = useState<Site[]>([]);
  const [allCharacters, setAllCharacters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load data when modal opens
  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tasks, items, sites, characters] = await Promise.all([
        getAllTasks(),
        getAllItems(),
        getAllSites(),
        getAllCharacters(),
      ]);
      setAllTasks(tasks);
      setAllItems(items);
      setAllSites(sites);
      setAllCharacters(characters);
    } catch (error) {
      console.error('[TaskModal] Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Determine which form to show based on task type
  const getModalContent = () => {
    if (!task) {
      if (isRecurrentModal) {
        return (
          <RecurrentTreeModalContent
            task={null}
            allTasks={allTasks}
            allCharacters={allCharacters}
            allTasksForOrder={allTasksForOrder}
            onSave={handleSave}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        );
      }
      // Default to mission form when creating new task
      return (
        <MissionTreeModalContent
          task={null}
          allTasks={allTasks}
          allItems={allItems}
          allSites={allSites}
          allCharacters={allCharacters}
          allTasksForOrder={allTasksForOrder}
          onSave={handleSave}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      );
    }

    // Determine form type based on task type
    const taskType = task.type as TaskType;
    const isRecurrent = [
      TaskType.RECURRENT_GROUP,
      TaskType.RECURRENT_TEMPLATE,
      TaskType.RECURRENT_INSTANCE,
    ].includes(taskType);

    if (isRecurrent) {
      return (
        <RecurrentTreeModalContent
          task={task}
          allTasks={allTasks}
          allCharacters={allCharacters}
          allTasksForOrder={allTasksForOrder}
          onSave={handleSave}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      );
    } else {
      return (
        <MissionTreeModalContent
          task={task}
          allTasks={allTasks}
          allItems={allItems}
          allSites={allSites}
          allCharacters={allCharacters}
          allTasksForOrder={allTasksForOrder}
          onSave={handleSave}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      );
    }
  };

  const handleSave = async (task: Task) => {
    await onSave(task);
    if (onComplete) {
      onComplete();
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  // Determine modal title and description
  const getModalTitle = () => {
    if (task) return 'Edit Task';

    // Creating new task - default to mission form
    return 'Create New Task';
  };

  const getModalDescription = () => {
    if (task) return 'Modify the task details below';

    // Creating new task - default description
    return 'Fill in the task information to create a new task';
  };

  return (
    <TaskModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={getModalTitle()}
      description={getModalDescription()}
    >
      {getModalContent()}
    </TaskModalShell>
  );
}
