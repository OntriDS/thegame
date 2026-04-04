// Task modal — same role as sales-modal.tsx: Dialog shell, data load, route to workflow content.
// Header / Footer chrome lives in this file; body is task-modal-*-content.tsx (dynamic import avoids circular deps).

'use client';

import React, { useEffect, useState, type ComponentPropsWithoutRef } from 'react';
import dynamic from 'next/dynamic';
import { Dialog, DialogContent, DialogClose, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Task, Item, Site } from '@/types/entities';
import { TaskType } from '@/types/enums';
import { ClientAPI } from '@/lib/client-api';

export type TaskModalContentKind = 'Mission' | 'Recurrent' | 'Automation';

const WORKFLOW_KINDS: TaskModalContentKind[] = ['Mission', 'Recurrent', 'Automation'];

/** Sales-modal-style workflow strip (Mission | Recurrent | Automation) + close. */
export function TaskModalHeader({
  title,
  selectedKind,
  kindLocked,
  onSelectKind,
}: {
  title: string;
  selectedKind: TaskModalContentKind;
  /** Existing task: show selection only (no switching workflow here). */
  kindLocked: boolean;
  onSelectKind?: (kind: TaskModalContentKind) => void;
}) {
  return (
    <DialogHeader className="shrink-0 space-y-0 border-b px-6 py-4 text-left">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <DialogTitle className="m-0 min-w-0 shrink text-xl font-semibold tracking-tight">{title}</DialogTitle>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
          {WORKFLOW_KINDS.map((kind) => {
            const isSelected = kind === selectedKind;
            const disabled = kindLocked && !isSelected;
            return (
              <Button
                key={kind}
                type="button"
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                disabled={disabled}
                title={
                  kindLocked
                    ? isSelected
                      ? 'Workflow for this task'
                      : 'Cannot switch workflow for an existing task'
                    : `Create as ${kind}`
                }
                className={cn('h-8 px-2 text-xs', disabled && 'cursor-not-allowed opacity-50')}
                onClick={() => {
                  if (kindLocked) return;
                  onSelectKind?.(kind);
                }}
              >
                {kind}
              </Button>
            );
          })}
          <DialogClose
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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

/** Skip individual ClientAPI fetches when the parent already loaded the same datasets (e.g. full `allTasks` must match `getAllTasks()` scope for parent pickers). */
export type TaskModalPrefetchedData = Partial<{
  allTasks: Task[];
  items: Item[];
  sites: Site[];
  characters: any[];
}>;

interface TaskModalProps {
  task?: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (task: Task) => Promise<void>;
  onComplete?: () => void;
  allTasksForOrder?: Task[];
  isRecurrentModal?: boolean;
  prefetchedData?: TaskModalPrefetchedData;
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
  prefetchedData,
}: TaskModalProps) {
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [allSites, setAllSites] = useState<Site[]>([]);
  const [allCharacters, setAllCharacters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  /** New-task only: override Mission | Recurrent | Automation (null = use isRecurrentModal default). */
  const [createKindChoice, setCreateKindChoice] = useState<TaskModalContentKind | null>(null);

  useEffect(() => {
    if (!open) setCreateKindChoice(null);
  }, [open]);

  useEffect(() => {
    if (open) {
      void loadData();
    }
  }, [open]);

  /**
   * One batch per modal open unless `prefetchedData` supplies lists (fewer HTTP routes).
   */
  const loadData = async () => {
    setIsLoading(true);
    const p = prefetchedData;
    try {
      const [tasks, items, sites, characters] = await Promise.all([
        p?.allTasks !== undefined ? Promise.resolve(p.allTasks) : ClientAPI.getAllTasks(),
        p?.items !== undefined ? Promise.resolve(p.items) : ClientAPI.getItems(),
        p?.sites !== undefined ? Promise.resolve(p.sites) : ClientAPI.getSites(),
        p?.characters !== undefined ? Promise.resolve(p.characters) : ClientAPI.getCharacters(),
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

  const contentKind: TaskModalContentKind = (() => {
    if (task) {
      if (task.type === TaskType.AUTOMATION) return 'Automation';
      if (isRecurrentTaskType(task.type)) return 'Recurrent';
      return 'Mission';
    }
    if (createKindChoice === 'Automation') return 'Automation';
    if (createKindChoice === 'Recurrent' || (createKindChoice === null && isRecurrentModal)) return 'Recurrent';
    return 'Mission';
  })();

  const showAutomation = contentKind === 'Automation';
  const showRecurrent = contentKind === 'Recurrent';

  const modalTitle = task
    ? 'Edit Task'
    : showAutomation
      ? 'New automation task'
      : showRecurrent
        ? 'Create New Recurrent Task'
        : 'Create New Task';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        zIndexLayer="MODALS"
        hideClose
        className="flex h-[90vh] w-full max-w-7xl flex-col gap-0 overflow-hidden p-0"
      >
        <TaskModalHeader
          title={modalTitle}
          selectedKind={contentKind}
          kindLocked={!!task}
          onSelectKind={task ? undefined : setCreateKindChoice}
        />
        {showAutomation ? (
          <AutomationTaskModalContent onOpenChange={onOpenChange} />
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
            isLoading={isLoading}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
