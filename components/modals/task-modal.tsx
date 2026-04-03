// Task modal — same role as sales-modal.tsx: Dialog shell, data load, route to workflow content.
// Header / Footer chrome lives in this file; body is task-modal-*-content.tsx (dynamic import avoids circular deps).

'use client';

import React, { useEffect, useState, type ComponentPropsWithoutRef } from 'react';
import dynamic from 'next/dynamic';
import { Dialog, DialogContent, DialogClose, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Task, Item, Site } from '@/types/entities';
import { TaskType } from '@/types/enums';
import { ClientAPI } from '@/lib/client-api';

export type TaskModalContentKind = 'Mission' | 'Recurrent' | 'Automation';

export function TaskModalHeader({
  title,
  contentKind,
}: {
  title: string;
  contentKind: TaskModalContentKind;
}) {
  return (
    <DialogHeader className="shrink-0 space-y-0 border-b px-6 py-4 text-left">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <DialogTitle className="m-0 shrink-0 text-xl font-semibold tracking-tight">{title}</DialogTitle>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>
            Content: <span className="font-medium text-foreground">{contentKind}</span>
          </span>
        </div>
        <div className="ml-auto flex shrink-0 items-center">
          <DialogClose
            className="inline-flex h-8 w-8 items-center justify-center rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            type="button"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>
      </div>
    </DialogHeader>
  );
}

export function TaskModalFooter({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogFooter>) {
  return (
    <DialogFooter
      className={cn(
        'mt-auto flex w-full shrink-0 flex-row flex-wrap items-center justify-between gap-4 overflow-x-auto border-t bg-background px-6 py-4',
        className
      )}
      {...props}
    />
  );
}

const MissionTreeModalContent = dynamic(() => import('./task-modal-missions-content'), { ssr: false });
const RecurrentTreeModalContent = dynamic(() => import('./task-modal-recurrents-content'), { ssr: false });
const AutomationTaskModalContent = dynamic(() => import('./task-modal-automation-content'), { ssr: false });

interface TaskModalProps {
  task?: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (task: Task) => Promise<void>;
  onComplete?: () => void;
  allTasksForOrder?: Task[];
  isRecurrentModal?: boolean;
}

const RECURRENT_TYPES: TaskType[] = [
  TaskType.RECURRENT_GROUP,
  TaskType.RECURRENT_TEMPLATE,
  TaskType.RECURRENT_INSTANCE,
];

function isRecurrentTaskType(t: TaskType): boolean {
  return RECURRENT_TYPES.includes(t);
}

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

  useEffect(() => {
    if (open) {
      void loadData();
    }
  }, [open]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tasks, items, sites, characters] = await Promise.all([
        ClientAPI.getAllTasks(),
        ClientAPI.getItems(),
        ClientAPI.getSites(),
        ClientAPI.getCharacters(),
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

  const handleSave = async (saved: Task) => {
    await onSave(saved);
  };

  const handleDeleteComplete = () => {
    onComplete?.();
  };

  const showAutomation = Boolean(task?.type === TaskType.AUTOMATION);
  const showRecurrent = showAutomation ? false : task ? isRecurrentTaskType(task.type) : Boolean(isRecurrentModal);

  const contentKind: TaskModalContentKind = showAutomation ? 'Automation' : showRecurrent ? 'Recurrent' : 'Mission';

  const modalTitle = task ? 'Edit Task' : showRecurrent ? 'Create New Recurrent Task' : 'Create New Task';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        zIndexLayer="MODALS"
        hideClose
        className="flex h-[90vh] w-full max-w-7xl flex-col gap-0 overflow-hidden p-0"
      >
        {showAutomation ? (
          <AutomationTaskModalContent onOpenChange={onOpenChange} modalTitle={modalTitle} />
        ) : showRecurrent ? (
          <RecurrentTreeModalContent
            task={task}
            open={open}
            allTasks={allTasks}
            allItems={allItems}
            allSites={allSites}
            allCharacters={allCharacters}
            allTasksForOrder={allTasksForOrder}
            onSave={handleSave}
            onOpenChange={onOpenChange}
            onDeleteComplete={handleDeleteComplete}
            modalTitle={modalTitle}
            contentKind={contentKind}
            isLoading={isLoading}
          />
        ) : (
          <MissionTreeModalContent
            task={task}
            open={open}
            allTasks={allTasks}
            allItems={allItems}
            allSites={allSites}
            allCharacters={allCharacters}
            allTasksForOrder={allTasksForOrder}
            onSave={handleSave}
            onOpenChange={onOpenChange}
            onDeleteComplete={handleDeleteComplete}
            modalTitle={modalTitle}
            contentKind={contentKind}
            isLoading={isLoading}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
