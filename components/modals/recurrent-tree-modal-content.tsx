// components/modals/recurrent-tree-modal-content.tsx
// Recurrent Tree Modal Content Component - Specialized form for Recurrent Templates
// Implements Shell/Core pattern - Core content for TaskModalShell

'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { NumericInput } from '@/components/ui/numeric-input';
import { SmartSchedulerSubmodal } from './submodals/smart-scheduler-submodal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Task } from '@/types/entities';
import { TaskType, TaskStatus, TaskPriority, RecurrentFrequency, FOUNDER_CHARACTER_ID } from '@/types/enums';
import { createStationCategoryOptions, getStationFromCombined, createTaskParentOptions, createCharacterOptions } from '@/lib/utils/searchable-select-utils';
import { getAreaForStation } from '@/lib/utils/business-structure-utils';
import type { Station } from '@/types/type-aliases';
import { v4 as uuid } from 'uuid';
import { ORDER_INCREMENT } from '@/lib/constants/app-constants';
import { computeNextSiblingOrder } from '@/lib/utils/task-order-utils';
import { Calendar as CalendarIcon, Repeat } from 'lucide-react';
import { useUserPreferences } from '@/lib/hooks/use-user-preferences';
import { format } from 'date-fns';
import { FrequencyConfig } from '@/components/ui/frequency-calendar';
import { validateFrequencyConfig } from '@/lib/utils/recurrent-date-utils';

interface RecurrentTreeModalContentProps {
  task?: Task | null;
  allTasks?: Task[];
  allCharacters?: any[];
  allTasksForOrder?: Task[];
  onSave: (task: Task) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * Recurrent Tree Modal Content Component
 * Specialized form for Recurrent Templates (RECURRENT_GROUP, RECURRENT_TEMPLATE, RECURRENT_INSTANCE)
 *
 * STRICT BOUNDARIES:
 * - NO standard dueDate or time-based scheduling (uses frequencyConfig only)
 * - NO financial fields (cost, revenue, payments)
 * - NO rewards points
 * - NO emissary fields (customer, item creation)
 * - Only recurrent task types allowed
 * - Frequency configuration via SmartSchedulerSubmodal
 *
 * Benefits:
 * - Clean separation of recurrent vs. mission concerns
 * - Simpler state management (recurrent fields only)
 * - Enforces proper recurrent template behavior
 */
export default function RecurrentTreeModalContent({
  task,
  allTasks = [],
  allCharacters = [],
  allTasksForOrder,
  onSave,
  onCancel,
  isLoading = false,
}: RecurrentTreeModalContentProps) {
  const { getPreference, setPreference } = useUserPreferences();

  // Recurrent-specific state (NO standard dueDate, NO financials)
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.CREATED);
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.NORMAL);
  const [type, setType] = useState<TaskType>(TaskType.RECURRENT_TEMPLATE);
  const [station, setStation] = useState<Station>('Strategy' as Station);
  const [progress, setProgress] = useState(0);
  const [frequencyConfig, setFrequencyConfig] = useState<FrequencyConfig | undefined>(
    task?.frequencyConfig || {
      type: RecurrentFrequency.ONCE,
      interval: 1,
      repeatMode: 'periodically',
    }
  );
  const [parentId, setParentId] = useState<string | null>(null);
  const [playerCharacterId, setPlayerCharacterId] = useState<string | null>(FOUNDER_CHARACTER_ID);
  const [showScheduler, setShowScheduler] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');

  // Utility functions
  const draftId = useRef(uuid());

  const getInitialStationCategory = (): string => {
    const lastStation = getPreference('task-modal-last-station');
    const area = getAreaForStation(lastStation);
    return `${lastStation}:${area || 'ADMIN'}`;
  };
  const [stationCategory, setStationCategory] = useState<string>(getInitialStationCategory());

  const getLastUsedStation = useCallback((): Station => {
    const saved = getPreference('task-modal-last-station');
    return (saved as Station) || ('Strategy' as Station);
  }, [getPreference]);

  const getLastUsedType = useCallback((): TaskType => {
    const saved = getPreference('task-modal-last-recurrent-type');
    return (saved as TaskType) || TaskType.RECURRENT_TEMPLATE;
  }, [getPreference]);

  // Helper function to build task from form state
  const buildTaskFromForm = () => {
    const editingExisting = !!task;

    // Determine order
    const determineOrder = (): number => {
      if (allTasksForOrder && allTasksForOrder.length > 0) {
        return computeNextSiblingOrder(allTasksForOrder, parentId, draftId.current);
      }
      if (editingExisting && task!.order != null && !Number.isNaN(Number(task!.order))) {
        return Number(task!.order);
      }
      return ORDER_INCREMENT;
    };

    // Determine final status based on progress
    const determineFinalStatus = () => {
      if (progress === 100) {
        return TaskStatus.DONE;
      }
      return status;
    };

    return {
      id: editingExisting ? task!.id : uuid(),
      name: name.trim(),
      description: description.trim(),
      status: determineFinalStatus(),
      priority,
      type,
      station,
      progress,
      frequencyConfig: (type === TaskType.RECURRENT_GROUP || type === TaskType.RECURRENT_TEMPLATE) ? frequencyConfig : undefined,
      parentId,
      playerCharacterId,
      order: determineOrder(),
      links: task?.links || [],
    } as Task;
  };

  const handleSave = async () => {
    if (isLoading) return;

    // Basic validation
    if (!name.trim()) {
      setValidationMessage('Task name is required');
      setShowValidationModal(true);
      return;
    }

    // Recurrent Template validation
    if (type === TaskType.RECURRENT_TEMPLATE) {
      const freq = frequencyConfig;

      // Allow ONCE frequency without restrictions
      if (freq?.type === RecurrentFrequency.ONCE) {
        // ONCE is always allowed
      } else {
        // For other frequencies, check if there's a stop condition
        const hasStopCondition = freq?.stopsAfter &&
          (freq.stopsAfter.type === 'times' || freq.stopsAfter.type === 'date');

        if (!hasStopCondition) {
          setValidationMessage(
            'Recurrent templates with repeat frequencies must have a stop condition (times or date) to prevent infinite instance creation.'
          );
          setShowValidationModal(true);
          return;
        }

        // Validate frequency config structure
        const validation = validateFrequencyConfig(freq);
        if (!validation.isValid) {
          setValidationMessage(validation.error || 'Invalid frequency configuration');
          setShowValidationModal(true);
          return;
        }
      }
    }

    const newTask = buildTaskFromForm();
    await onSave(newTask);
  };

  const handleTypeChange = (newType: string) => {
    const casted = newType as TaskType;
    setType(casted);
    const key = 'task-modal-last-recurrent-type';
    setPreference(key, casted);
  };

  const handleStationCategoryChange = (value: string) => {
    setStationCategory(value);
    const newStation = getStationFromCombined(value) as Station;
    setStation(newStation);
    setPreference('task-modal-last-station', newStation);
  };

  const handleOpenScheduler = () => {
    setShowScheduler(true);
  };

  const handleStatusChange = (newStatus: string) => {
    const casted = newStatus as TaskStatus;
    setStatus(casted);
    if (casted === TaskStatus.DONE && progress < 100) {
      setProgress(100);
    }
  };

  const getCharacterOptions = () => {
    return createCharacterOptions(allCharacters);
  };

  // Render the form
  return (
    <>
      <div className="px-6">
        <div className="flex gap-4">
          {/* Main columns container */}
          <div className="flex-1 grid gap-4 grid-cols-3">

            {/* Column 1: NATIVE (Basic Info) */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="task-name" className="text-xs">Name *</Label>
                <Input
                  id="task-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Template name"
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-description" className="text-xs">Description</Label>
                <Textarea
                  id="task-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Template description"
                  className="h-16 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-type" className="text-xs">Type</Label>
                <Select value={String(type)} onValueChange={handleTypeChange}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select task type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(TaskType)
                      .filter((taskType) => {
                        // Only recurrent types allowed
                        return taskType === TaskType.RECURRENT_GROUP ||
                          taskType === TaskType.RECURRENT_TEMPLATE ||
                          taskType === TaskType.RECURRENT_INSTANCE;
                      })
                      .map((taskType) => (
                        <SelectItem key={taskType} value={String(taskType)}>
                          {taskType}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-priority" className="text-xs">Priority</Label>
                <Select value={String(priority)} onValueChange={(val) => setPriority(val as TaskPriority)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(TaskPriority).map((p) => (
                      <SelectItem key={p} value={String(p)}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-status" className="text-xs">Status</Label>
                <Select value={String(status)} onValueChange={handleStatusChange}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(TaskStatus).map((s) => (
                      <SelectItem key={s} value={String(s)}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-progress" className="text-xs">Progress</Label>
                <div className="flex items-center gap-2">
                  <NumericInput
                    id="task-progress"
                    value={progress}
                    onChange={(val) => {
                      const newProgress = Math.min(Math.max(val, 0), 100);
                      setProgress(newProgress);
                      if (newProgress === 100 && status !== TaskStatus.DONE) {
                        setStatus(TaskStatus.DONE);
                      }
                    }}
                    min={0}
                    max={100}
                    className="h-8 text-sm flex-1"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>
            </div>

            {/* Column 2: AMBASSADOR (Core Details) */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="task-station" className="text-xs">Station</Label>
                <SearchableSelect
                  value={stationCategory}
                  onValueChange={handleStationCategoryChange}
                  placeholder="Select station"
                  options={createStationCategoryOptions()}
                  autoGroupByCategory={true}
                  getCategoryForValue={(value) => {
                    if (value === 'none:') return 'None';
                    return getStationFromCombined(value) || 'None';
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-parent" className="text-xs">Parent Task</Label>
                <SearchableSelect
                  value={parentId || ''}
                  onValueChange={(val) => setParentId(val || null)}
                  placeholder="No Parent"
                  options={createTaskParentOptions(allTasks, task?.id, true, type)}
                  autoGroupByCategory={true}
                  className="h-8 text-sm"
                  persistentCollapsible={true}
                  instanceId="recurrent-template-form-parent"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Recurrence Pattern</Label>
                <Button
                  type="button"
                  variant="outline"
                  className={`w-full justify-start text-left font-normal h-auto py-2 px-3 ${!frequencyConfig ? "text-muted-foreground" : ""}`}
                  onClick={handleOpenScheduler}
                >
                  <Repeat className="mr-2 h-4 w-4 shrink-0" />
                  <div className="flex flex-col items-start gap-0.5 overflow-hidden">
                    <span className="text-sm truncate w-full">
                      {(() => {
                        if (!frequencyConfig) return 'Set Recurrence Pattern';
                        const freqStr = frequencyConfig.type === RecurrentFrequency.ONCE
                          ? 'One-time'
                          : `${frequencyConfig.interval} ${frequencyConfig.type.toLowerCase()}`;
                        return freqStr;
                      })()}
                    </span>
                    {frequencyConfig && frequencyConfig.type !== RecurrentFrequency.ONCE && (
                      <span className="text-[10px] text-muted-foreground">
                        {frequencyConfig.repeatMode === 'after_done' ? 'After completion' : 'Periodically'}
                      </span>
                    )}
                  </div>
                </Button>
              </div>
            </div>

            {/* Column 3: EMISSARY (Minimal for templates) */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="player-character" className="text-xs">Player Character</Label>
                <Select value={String(playerCharacterId)} onValueChange={(val) => setPlayerCharacterId(val)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getCharacterOptions().map((opt) => (
                      <SelectItem key={opt.value} value={String(opt.value)}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="text-xs text-muted-foreground">
                <div className="p-3 bg-muted/50 rounded-md">
                  <p className="font-medium mb-1">Template Notes:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Templates define recurrence patterns</li>
                    <li>Instances are spawned on demand</li>
                    <li>No costs, revenue, or rewards</li>
                    <li>No item creation</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Scheduler Submodal */}
      <SmartSchedulerSubmodal
        open={showScheduler}
        onOpenChange={setShowScheduler}
        value={{
          frequencyConfig: (type === TaskType.RECURRENT_GROUP || type === TaskType.RECURRENT_TEMPLATE) ? frequencyConfig : undefined
        }}
        onChange={(val) => {
          if (val.frequencyConfig) {
            setFrequencyConfig(val.frequencyConfig);
          } else {
            setFrequencyConfig(undefined);
          }
        }}
        isRecurrent={type === TaskType.RECURRENT_GROUP || type === TaskType.RECURRENT_TEMPLATE}
      />

      {/* Validation Modal */}
      <Dialog open={showValidationModal} onOpenChange={setShowValidationModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Validation Required</DialogTitle>
            <DialogDescription>
              {validationMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowValidationModal(false)}>Okay</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
