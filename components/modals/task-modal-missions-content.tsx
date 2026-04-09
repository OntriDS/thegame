// components/modals/task-modal-missions-content.tsx — Mission workflow body (chrome from task-modal.tsx)

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import NumericInput from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { ItemNameField } from '@/components/ui/item-name-field';
import { SmartSchedulerSubmodal } from './submodals/smart-scheduler-submodal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Task, Item, Site } from '@/types/entities';
import { getPointsMetadata } from '@/lib/utils/points-utils';
import { TaskType, TaskStatus, TaskPriority, ItemType, ItemStatus, FOUNDER_CHARACTER_ID, EntityType, CharacterRole } from '@/types/enums';
import { getStationFromCombined, createTaskParentOptions, createItemTypeSubTypeOptions, getItemTypeFromCombined, getSubTypeFromCombined, createCharacterOptions, createStationCategoryOptions, getCategoryFromCombined } from '@/lib/utils/searchable-select-utils';
import { createSiteOptionsWithCategories } from '@/lib/utils/site-options-utils';
import { getStationSelectValue } from '@/lib/utils/business-structure-utils';
import type { Station, SubItemType } from '@/types/type-aliases';
import { v4 as uuid } from 'uuid';
import { ORDER_INCREMENT, PROGRESS_MAX, PROGRESS_STEP, PRICE_STEP } from '@/lib/constants/app-constants';
import { computeNextSiblingOrder } from '@/lib/utils/task-order-utils';
import { Calendar as CalendarIcon, Network, User } from 'lucide-react';
import PlayerCharacterSelectorModal from './submodals/player-character-selector-submodal';
import DeleteModal from './submodals/delete-submodal';
import LinksRelationshipsModal from './submodals/links-relationships-submodal';
import DatesSubmodal from './submodals/dates-submodal';
import ArchiveCollectionConfirmationModal from './submodals/archive-collection-confirmation-submodal';
import ConfirmationModal from './submodals/confirmation-submodal';
import { useUserPreferences } from '@/lib/hooks/use-user-preferences';
// UTC STANDARDIZATION: Using new UTC utilities
import { format } from 'date-fns'; // Keeping for time formatting (HH:mm)
import { formatForDisplay, formatDayMonth } from '@/lib/utils/date-display-utils';
import { getUTCNow } from '@/lib/utils/utc-utils';
import { TaskModalFooter } from './task-modal';
import { dispatchEntityUpdated, entityTypeToKind } from '@/lib/ui/ui-events';

interface MissionTreeModalContentProps {
  task?: Task | null;
  open: boolean;
  allTasks?: Task[];
  allItems?: Item[];
  allSites?: Site[];
  allCharacters?: any[];
  allTasksForOrder?: Task[];
  onSave: (task: Task) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  onDeleteComplete?: () => void;
  isLoading?: boolean;
}

/**
 * Mission Tree Modal Content Component
 * Specialized form for Mission Tasks (MISSION_GROUP, MISSION, MILESTONE, GOAL, ASSIGNMENT)
 *
 * STRICT BOUNDARIES:
 * - NO frequencyConfig state or UI elements
 * - NO recurrent task type awareness
 * - NO recurrent-specific validation
 * - Standard date/time picker only (no recurrence configuration)
 * - Only mission task types allowed
 *
 * Benefits:
 * - Clean separation of mission vs. recurrent concerns
 * - Simpler state management (mission fields only)
 * - Easier to maintain and test
 */
export default function MissionTreeModalContent({
  task,
  open,
  allTasks = [],
  allItems = [],
  allSites = [],
  allCharacters = [],
  allTasksForOrder,
  onSave,
  onOpenChange,
  onDeleteComplete,
  isLoading = false,
}: MissionTreeModalContentProps) {
  const { getPreference, setPreference } = useUserPreferences();

  // Mission-specific state (NO frequencyConfig)
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.CREATED);
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.NORMAL);
  const [type, setType] = useState<TaskType>(TaskType.MISSION);
  const [station, setStation] = useState<Station>('Strategy' as Station);
  const [progress, setProgress] = useState(0);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [localDoneAt, setLocalDoneAt] = useState<Date | undefined>(undefined);
  const [localCollectedAt, setLocalCollectedAt] = useState<Date | undefined>(undefined);
  const [scheduledStartDate, setScheduledStartDate] = useState<Date | undefined>(undefined);
  const [scheduledStartTime, setScheduledStartTime] = useState<string>('');
  const [scheduledEndDate, setScheduledEndDate] = useState<Date | undefined>(undefined);
  const [scheduledEndTime, setScheduledEndTime] = useState<string>('');
  const [cost, setCost] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [isNotPaid, setIsNotPaid] = useState(false);
  const [isNotCharged, setIsNotCharged] = useState(false);
  const [isCollected, setIsCollected] = useState(false);

  // Emissary fields
  const [formData, setFormData] = useState({
    site: 'none' as string,
    targetSite: 'none' as string,
  });
  const [outputItemType, setOutputItemType] = useState<ItemType | ''>('');
  const [outputItemSubType, setOutputItemSubType] = useState<SubItemType | ''>('');
  const [outputItemTypeSubType, setOutputItemTypeSubType] = useState<string>('none:');
  const [outputQuantity, setOutputQuantity] = useState(1);
  const [outputQuantityString, setOutputQuantityString] = useState('1');
  const [outputUnitCost, setOutputUnitCost] = useState(0);
  const [outputUnitCostString, setOutputUnitCostString] = useState('0');
  const [outputItemName, setOutputItemName] = useState('');
  const [isNewItem, setIsNewItem] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [outputItemPrice, setOutputItemPrice] = useState(0);
  const [outputItemPriceString, setOutputItemPriceString] = useState('0');
  const [isSold, setIsSold] = useState(false);
  const [outputItemStatus, setOutputItemStatus] = useState<ItemStatus>(ItemStatus.FOR_SALE);
  const [rewards, setRewards] = useState({ points: { xp: 0, rp: 0, fp: 0, hp: 0 } });
  const [parentId, setParentId] = useState<string | null>(null);
  const [customerCharacterId, setCustomerCharacterId] = useState<string | null>(null);
  const [customerCharacterName, setCustomerCharacterName] = useState<string>('');
  const [isNewCustomer, setIsNewCustomer] = useState(true);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [customerCharacterRole, setCustomerCharacterRole] = useState<CharacterRole>(CharacterRole.CUSTOMER);
  const [playerCharacterId, setPlayerCharacterId] = useState<string | null>(FOUNDER_CHARACTER_ID);
  const [showPlayerCharacterSelector, setShowPlayerCharacterSelector] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDatesModal, setShowDatesModal] = useState(false);
  const [showRelationshipsModal, setShowRelationshipsModal] = useState(false);
  const [showArchiveCollectionModal, setShowArchiveCollectionModal] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    status: TaskStatus;
    onConfirm: () => void;
    onCancel: () => void;
  } | null>(null);
  const [showNotDoneConfirmation, setShowNotDoneConfirmation] = useState(false);
  const [pendingNotDoneStatus, setPendingNotDoneStatus] = useState<TaskStatus | null>(null);

  const hasInitializedRef = useRef(false);
  const initializedTaskIdRef = useRef<string | null>(null);
  const draftId = useRef(task?.id || uuid());

  const getLastUsedStation = useCallback((): Station => {
    const saved = getPreference('task-modal-last-station');
    return (saved as Station) || ('Strategy' as Station);
  }, [getPreference]);

  const getLastUsedType = useCallback((): TaskType => {
    const saved = getPreference('task-modal-last-type');
    return (saved as TaskType) || TaskType.MISSION;
  }, [getPreference]);

  const initializeFromTask = useCallback(
    (existingTask: Task) => {
      draftId.current = existingTask.id;
      setName(existingTask.name);
      setDescription(existingTask.description || '');
      setStatus(existingTask.status);
      setPriority(existingTask.priority);
      setType(existingTask.type);
      const rawStation =
        existingTask.station != null && String(existingTask.station).trim() !== ''
          ? existingTask.station
          : (((getPreference('task-modal-last-station') as Station) || 'Strategy') as Station);
      setStation(rawStation);
      setProgress(existingTask.progress);
      // Dates are now stored as UTC, use directly
      setDueDate(existingTask.dueDate ? new Date(existingTask.dueDate) : undefined);
      setLocalDoneAt(existingTask.doneAt ? new Date(existingTask.doneAt) : undefined);
      setLocalCollectedAt(existingTask.collectedAt ? new Date(existingTask.collectedAt) : undefined);

      if (existingTask.scheduledStart) {
        const start = new Date(existingTask.scheduledStart);
        setScheduledStartDate(start);
        setScheduledStartTime(format(start, 'HH:mm'));
      } else {
        setScheduledStartDate(undefined);
        setScheduledStartTime('');
      }
      if (existingTask.scheduledEnd) {
        const end = new Date(existingTask.scheduledEnd);
        setScheduledEndDate(end);
        setScheduledEndTime(format(end, 'HH:mm'));
      } else {
        setScheduledEndDate(undefined);
        setScheduledEndTime('');
      }

      setCost(existingTask.cost ?? 0);
      setRevenue(existingTask.revenue ?? 0);
      setIsNotPaid(existingTask.isNotPaid || false);
      setIsNotCharged(existingTask.isNotCharged || false);
      setIsCollected(existingTask.isCollected || false);
      setFormData({
        site: existingTask.siteId || 'none',
        targetSite: existingTask.targetSiteId || 'none',
      });
      const taskItemType = (existingTask.outputItemType as ItemType) || '';
      const taskSubType = existingTask.outputItemSubType || '';
      setOutputItemType(taskItemType);
      setOutputItemSubType(taskSubType);
      setOutputItemTypeSubType(taskItemType ? `${taskItemType}:${taskSubType}` : 'none:');
      setOutputQuantity(existingTask.outputQuantity || 1);
      setOutputQuantityString(String(existingTask.outputQuantity || 1));
      setOutputUnitCost(existingTask.outputUnitCost || 0);
      setOutputUnitCostString(String(existingTask.outputUnitCost || 0));
      setOutputItemName(existingTask.outputItemName || '');
      setOutputItemPrice(existingTask.outputItemPrice || 0);
      setOutputItemPriceString(String(existingTask.outputItemPrice || 0));
      setIsNewItem(existingTask.isNewItem || false);
      setIsSold(existingTask.isSold || false);
      setOutputItemStatus(existingTask.outputItemStatus || ItemStatus.FOR_SALE);
      setSelectedItemId(existingTask.outputItemId || '');
      setCustomerCharacterId(existingTask.customerCharacterId || null);
      setIsNewCustomer(!Boolean(existingTask.customerCharacterId));
      setNewCustomerName(existingTask.newCustomerName || '');
      setCustomerCharacterRole(existingTask.customerCharacterRole || CharacterRole.CUSTOMER);
      setPlayerCharacterId(existingTask.playerCharacterId || FOUNDER_CHARACTER_ID);
      setRewards({
        points: {
          xp: existingTask.rewards?.points?.xp || 0,
          rp: existingTask.rewards?.points?.rp || 0,
          fp: existingTask.rewards?.points?.fp || 0,
          hp: existingTask.rewards?.points?.hp || 0,
        },
      });
      setParentId(existingTask.parentId || null);
    },
    [getPreference]
  );

  const initializeForNewTask = useCallback(() => {
    draftId.current = uuid();
    setName('');
    setDescription('');
    setStatus(TaskStatus.CREATED);
    setPriority(TaskPriority.NORMAL);
    setType(getLastUsedType());
    const lastStation = getLastUsedStation();
    setStation(lastStation);
    setProgress(0);
    setDueDate(undefined);
    setLocalDoneAt(undefined);
    setLocalCollectedAt(undefined);
    setScheduledStartDate(undefined);
    setScheduledStartTime('');
    setScheduledEndDate(undefined);
    setScheduledEndTime('');
    setCost(0);
    setRevenue(0);
    setIsNotPaid(false);
    setIsNotCharged(false);
    setIsCollected(false);
    setFormData({ site: 'none', targetSite: 'none' });
    setOutputItemType('');
    setOutputItemSubType('');
    setOutputItemTypeSubType('none:');
    setOutputQuantity(1);
    setOutputQuantityString('1');
    setOutputUnitCost(0);
    setOutputUnitCostString('0');
    setOutputItemName('');
    setOutputItemPrice(0);
    setOutputItemPriceString('0');
    setIsNewItem(false);
    setIsSold(false);
    setOutputItemStatus(ItemStatus.FOR_SALE);
    setSelectedItemId('');
    setCustomerCharacterId(null);
    setCustomerCharacterName('');
    setIsNewCustomer(true);
    setNewCustomerName('');
    setCustomerCharacterRole(CharacterRole.CUSTOMER);
    setPlayerCharacterId(FOUNDER_CHARACTER_ID);
    setRewards({ points: { xp: 0, rp: 0, fp: 0, hp: 0 } });
    setParentId(null);
  }, [getLastUsedStation, getLastUsedType]);

  useEffect(() => {
    if (!open) {
      hasInitializedRef.current = false;
      initializedTaskIdRef.current = null;
      return;
    }
    const hydrateKey = task?.id
      ? `${task.id}\u0001${String((task as Task).station ?? '')}\u0001${(task as Task).updatedAt instanceof Date ? (task as Task).updatedAt!.toISOString() : String((task as Task).updatedAt ?? '')}`
      : 'new';
    const alreadyInitialized = hasInitializedRef.current && initializedTaskIdRef.current === hydrateKey;
    if (alreadyInitialized) return;
    if (task?.id) {
      initializeFromTask(task);
    } else {
      initializeForNewTask();
    }
    hasInitializedRef.current = true;
    initializedTaskIdRef.current = hydrateKey;
  }, [open, task, initializeForNewTask, initializeFromTask]);

  useEffect(() => {
    if (customerCharacterId) {
      const c = allCharacters.find((x) => x.id === customerCharacterId);
      setCustomerCharacterName(c?.name || '');
    } else {
      setCustomerCharacterName('');
    }
  }, [customerCharacterId, allCharacters]);

  // Helper function to build task from form state
  const buildTaskFromForm = () => {
    const editingExisting = !!task;

    // Scheduled start/end logic - create UTC dates from local date + time
    let finalScheduledStart: Date | undefined = undefined;
    let finalScheduledEnd: Date | undefined = undefined;

    if (scheduledStartDate && scheduledStartTime) {
      const [hours, minutes] = scheduledStartTime.split(':').map(Number);
      // Create UTC date from the local date components
      const startDateTime = new Date(Date.UTC(
        scheduledStartDate.getFullYear(),
        scheduledStartDate.getMonth(),
        scheduledStartDate.getDate(),
        hours,
        minutes,
        0,
        0
      ));
      finalScheduledStart = startDateTime;
    }

    if (scheduledEndDate && scheduledEndTime) {
      const [hours, minutes] = scheduledEndTime.split(':').map(Number);
      // Create UTC date from the local date components
      const endDateTime = new Date(Date.UTC(
        scheduledEndDate.getFullYear(),
        scheduledEndDate.getMonth(),
        scheduledEndDate.getDate(),
        hours,
        minutes,
        0,
        0
      ));
      finalScheduledEnd = endDateTime;
    }

    /** Same as reference modal: keep stable order when parent unchanged; avoid Date.now()-like order values. */
    const TIMESTAMP_LIKE_ORDER_THRESHOLD = 1_000_000_000_000;
    const determineOrder = (): number => {
      const parentUnchanged =
        editingExisting && (parentId ?? null) === (task?.parentId ?? null);
      if (editingExisting && parentUnchanged && task!.order != null && !Number.isNaN(Number(task!.order))) {
        const o = Number(task!.order);
        if (o < TIMESTAMP_LIKE_ORDER_THRESHOLD) {
          return o;
        }
      }
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
      if (editingExisting && task?.status === TaskStatus.COLLECTED) {
        return TaskStatus.COLLECTED; // Keep COLLECTED status if already collected
      }
      if (editingExisting && task?.status === TaskStatus.DONE && progress === 100) {
        return TaskStatus.DONE; // Keep DONE status if task is complete and progress is 100%
      }
      if (progress === 100) {
        return TaskStatus.DONE; // Progress 100% => DONE
      }
      if (status === TaskStatus.COLLECTED) {
        return TaskStatus.COLLECTED; // Allow explicit COLLECTED status
      }
      return status;
    };

    const finalPlayerCharacterId = playerCharacterId || FOUNDER_CHARACTER_ID;

    return {
      id: draftId.current,
      name: name.trim(),
      description: description.trim(),
      status: determineFinalStatus(),
      priority,
      type,
      station,
      progress,
      dueDate,
      doneAt: localDoneAt,
      collectedAt: localCollectedAt,
      scheduledStart: finalScheduledStart,
      scheduledEnd: finalScheduledEnd,
      cost,
      revenue,
      isNotPaid,
      isNotCharged,
      siteId: formData.site && formData.site !== 'none' ? formData.site : null,
      targetSiteId: formData.targetSite && formData.targetSite !== 'none' ? formData.targetSite : null,
      outputItemType: (outputItemType || undefined) as ItemType | undefined,
      outputItemSubType: (outputItemSubType || undefined) as SubItemType | undefined,
      outputQuantity,
      outputUnitCost,
      outputItemPrice,
      outputItemStatus,
      outputItemName: outputItemName.trim() || undefined,
      rewards: {
        points: {
          xp: rewards.points.xp,
          rp: rewards.points.rp,
          fp: rewards.points.fp,
          hp: rewards.points.hp,
        },
      },
      parentId,
      customerCharacterId: isNewCustomer ? null : customerCharacterId,
      newCustomerName: isNewCustomer ? newCustomerName.trim() || undefined : undefined,
      customerCharacterRole,
      playerCharacterId: finalPlayerCharacterId,
      order: determineOrder(),
      isCollected: status === TaskStatus.COLLECTED || isCollected,
      isNewItem,
      isSold,
      outputItemId: isNewItem ? null : (selectedItemId || task?.outputItemId || null),
      isRecurrentGroup: task?.isRecurrentGroup ?? false,
      isTemplate: task?.isTemplate ?? false,
      sourceSaleId: task?.sourceSaleId ?? undefined,
      links: task?.links || [],
      createdAt: task?.createdAt || getUTCNow(),
      updatedAt: getUTCNow(),
    } as Task;
  };

  const handleSave = async () => {
    if (isLoading || isSaving) return;
    if (!name.trim()) {
      setValidationMessage('Task name is required');
      setShowValidationModal(true);
      return;
    }
    setIsSaving(true);
    try {
      const newTask = buildTaskFromForm();
      await onSave(newTask);
      dispatchEntityUpdated(entityTypeToKind(EntityType.TASK));
      onOpenChange(false);
    } catch (error) {
      console.error('[MissionTaskModal] Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDatesUpdate = (newDates: { createdAt?: Date; doneAt?: Date; collectedAt?: Date }) => {
    setLocalDoneAt(newDates.doneAt);
    setLocalCollectedAt(newDates.collectedAt);
  };

  const handleTypeChange = (newType: string) => {
    const casted = newType as TaskType;
    setType(casted);
    const key = 'task-modal-last-type';
    setPreference(key, casted);
  };

  const handleStationCategoryChange = (value: string) => {
    const newStation = getStationFromCombined(value) as Station;
    setStation(newStation);
    setPreference('task-modal-last-station', newStation);
  };

  const handleOpenScheduler = () => {
    setShowScheduler(true);
  };

  // Auto-calculate unit cost and price from total cost/revenue and quantity
  const handleAutoCalculateUnitCost = () => {
    if (outputQuantity > 0) {
      const unitCost = Math.round((cost / outputQuantity) * 100) / 100;
      setOutputUnitCost(unitCost);
      setOutputUnitCostString(unitCost.toString());
    }
  };

  const handleOutputItemTypeSubTypeChange = (value: string) => {
    if (value === 'none:') {
      setOutputItemTypeSubType('none:');
      setOutputItemType('');
      setOutputItemSubType('');
      return;
    }
    setOutputItemTypeSubType(value);
    const newItemType = getItemTypeFromCombined(value) as ItemType;
    const newSubType = getSubTypeFromCombined(value) as SubItemType;
    setOutputItemType(newItemType);
    setOutputItemSubType(newSubType);
    if (!outputItemName) {
      setOutputItemName(`${newItemType} ${newSubType}`);
    }
  };

  const handleNotPaidChange = (newValue: boolean) => {
    setIsNotPaid(newValue);
    if (newValue) {
      setIsNotPaid(true);
    }
  };

  const handleNotChargedChange = (newValue: boolean) => {
    setIsNotCharged(newValue);
    if (newValue) {
      setIsNotCharged(true);
    }
  };

  const handlePlayerCharacterSelect = (characterId: string | null) => {
    if (characterId) {
      setPlayerCharacterId(characterId);
    }
    setShowPlayerCharacterSelector(false);
  };

  const getCharacterOptions = () => {
    return createCharacterOptions(allCharacters);
  };

  const handleCounterpartyRoleToggle = () => {
    const nextRole =
      customerCharacterRole === CharacterRole.CUSTOMER
        ? CharacterRole.BENEFICIARY
        : CharacterRole.CUSTOMER;
    setCustomerCharacterRole(nextRole);
  };

  // Render the form
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        <div className="flex gap-4">
          {/* Main columns container */}
          <div className="flex-1 grid grid-cols-4 gap-4">

            {/* Column 1: Name, Description, Schedule, Priority + Progress */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="task-name" className="text-xs">Name *</Label>
                <Input
                  id="task-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Task name"
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-description" className="text-xs">Description</Label>
                <Textarea
                  id="task-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Task description"
                  className="h-16 text-sm"
                />
              </div>

              <div className="space-y-2 border-t pt-2 mt-2">
                <Label className="text-xs font-semibold">Schedule</Label>
                <Button
                  type="button"
                  variant="outline"
                  className={`w-full justify-start text-left font-normal h-auto py-2 px-3 ${!dueDate && !scheduledStartDate ? 'text-muted-foreground' : ''}`}
                  onClick={handleOpenScheduler}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                  <div className="flex flex-col items-start gap-0.5 overflow-hidden">
                    <span className="text-sm truncate w-full">
                      {(() => {
                        if (!dueDate && !scheduledStartDate) return 'Set Schedule';
                        const dateStr = scheduledStartDate
                          ? format(scheduledStartDate, 'MMM d')
                          : (dueDate ? format(dueDate, 'MMM d') : '');
                        const timeStr = scheduledStartDate
                          ? `${format(scheduledStartDate, 'h:mm a')} - ${scheduledEndDate ? format(scheduledEndDate, 'h:mm a') : '...'}`
                          : '';
                        return `${dateStr} ${timeStr}`;
                      })()}
                    </span>
                  </div>
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
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
                  <Label htmlFor="task-progress" className="text-xs">Progress: {progress}%</Label>
                  <input
                    id="task-progress"
                    type="range"
                    min={0}
                    max={PROGRESS_MAX}
                    step={PROGRESS_STEP}
                    value={progress}
                    onChange={(e) => {
                      const newProgress = Number(e.currentTarget.value);
                      setProgress(newProgress);
                      if (newProgress === 0) {
                        setStatus(TaskStatus.CREATED);
                      } else if (newProgress === 25 || newProgress === 50) {
                        setStatus(TaskStatus.IN_PROGRESS);
                      } else if (newProgress === 75) {
                        setStatus(TaskStatus.FINISHING);
                      } else if (newProgress === 100) {
                        setStatus(TaskStatus.DONE);
                      }
                    }}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Column 2: Station, Type, Parent */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">Station</Label>
                <SearchableSelect
                  value={getStationSelectValue(station)}
                  onValueChange={handleStationCategoryChange}
                  options={createStationCategoryOptions()}
                  autoGroupByCategory={true}
                  getCategoryForValue={(value) => getCategoryFromCombined(value)}
                  placeholder="Select station..."
                  className="h-8 text-sm"
                  persistentCollapsible={true}
                  instanceId="mission-task-modal-station-body"
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
                      .filter(
                        (taskType) =>
                          taskType === TaskType.MISSION_GROUP ||
                          taskType === TaskType.MISSION ||
                          taskType === TaskType.MILESTONE ||
                          taskType === TaskType.GOAL ||
                          taskType === TaskType.ASSIGNMENT
                      )
                      .map((taskType) => (
                        <SelectItem key={taskType} value={String(taskType)}>
                          {taskType}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-parent" className="text-xs">Parent Task</Label>
                <SearchableSelect
                  value={parentId || ''}
                  onValueChange={(val) => setParentId(val || null)}
                  placeholder="No Parent"
                  options={createTaskParentOptions(allTasks, task?.id, false, type)}
                  autoGroupByCategory={true}
                  className="h-8 text-sm"
                  persistentCollapsible={true}
                  instanceId="mission-task-form-parent"
                />
              </div>
            </div>

            {/* Column 3: Site, financials, Paid/Charged, points */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="task-site" className="text-xs">Site</Label>
                <SearchableSelect
                  value={formData.site}
                  onValueChange={(v) => setFormData({ ...formData, site: v })}
                  placeholder="No Site"
                  options={createSiteOptionsWithCategories(allSites)}
                  autoGroupByCategory={true}
                  getCategoryForValue={(value) => {
                    if (value === 'none:') return 'None';
                    return getCategoryForSiteId(value, allSites);
                  }}
                  className="h-8 text-sm"
                  persistentCollapsible={true}
                  instanceId="mission-task-form-site"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="task-cost" className="text-xs">Cost ($)</Label>
                  <NumericInput
                    id="task-cost"
                    value={cost}
                    onChange={setCost}
                    min={0}
                    step={PRICE_STEP}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-revenue" className="text-xs">Revenue ($)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="relative">
                          <NumericInput
                            id="task-revenue"
                            value={revenue}
                            onChange={setRevenue}
                            min={0}
                            step={PRICE_STEP}
                            className="h-8 text-sm"
                            disabled={!!task?.sourceSaleId}
                          />
                        </div>
                      </TooltipTrigger>
                      {task?.sourceSaleId && (
                        <TooltipContent>
                          <p>Revenue is managed by the source Sale - cannot edit here</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleNotPaidChange(!isNotPaid)}
                  className={`h-8 text-xs ${isNotPaid ? 'border-orange-500 text-orange-600 hover:bg-orange-50' : ''}`}
                >
                  {isNotPaid ? '⚠ Not Paid' : '✓ Paid'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleNotChargedChange(!isNotCharged)}
                  className={`h-8 text-xs ${isNotCharged ? 'border-orange-500 text-orange-600 hover:bg-orange-50' : ''}`}
                >
                  {isNotCharged ? '⚠ Not Charged' : '✓ Charged'}
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Point Rewards</Label>
                <div className="grid grid-cols-4 gap-2">
                  {getPointsMetadata().map((pointType) => {
                    const k = pointType.key.toLowerCase() as 'xp' | 'rp' | 'fp' | 'hp';
                    return (
                      <div key={pointType.key}>
                        <Label htmlFor={`reward-${k}`} className="text-xs">{pointType.label}</Label>
                        <NumericInput
                          id={`reward-${k}`}
                          value={rewards.points[k]}
                          onChange={(value) =>
                            setRewards({
                              ...rewards,
                              points: { ...rewards.points, [k]: value },
                            })
                          }
                          allowDecimals={false}
                          min={0}
                          step={1}
                          className="h-8 text-sm"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Column 4: Customer, item output */}
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="customer-character" className="text-xs">{customerCharacterRole}</Label>
                    {!task?.sourceSaleId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCounterpartyRoleToggle}
                        className="h-6 text-xs px-2"
                      >
                        {customerCharacterRole === CharacterRole.CUSTOMER ? 'Beneficiary' : 'Customer'}
                      </Button>
                    )}
                  </div>
                  {!task?.sourceSaleId && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsNewCustomer(!isNewCustomer)}
                      className="h-6 text-xs px-2"
                    >
                      {isNewCustomer ? 'Existing' : 'New'}
                    </Button>
                  )}
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        {task?.sourceSaleId ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full h-8 text-xs justify-start"
                            disabled
                          >
                            <User className="h-3 w-3 mr-2" />
                            {customerCharacterId ? customerCharacterName : `${customerCharacterRole} from Sale`}
                          </Button>
                        ) : isNewCustomer ? (
                          <Input
                            id="customer-character"
                            value={newCustomerName}
                            onChange={(e) => setNewCustomerName(e.target.value)}
                            placeholder={customerCharacterRole === CharacterRole.CUSTOMER ? 'New customer name' : 'New beneficiary name'}
                            className="h-8 text-sm"
                          />
                        ) : (
                          <SearchableSelect
                            value={customerCharacterId || ''}
                            onValueChange={(value) => setCustomerCharacterId(value || null)}
                            options={getCharacterOptions()}
                            placeholder={customerCharacterRole === CharacterRole.CUSTOMER ? 'Select customer' : 'Select beneficiary'}
                            autoGroupByCategory={true}
                            className="h-8 text-sm"
                            instanceId="mission-task-customer"
                          />
                        )}
                      </div>
                    </TooltipTrigger>
                    {task?.sourceSaleId && (
                      <TooltipContent>
                        <p>Customer is managed by the source Sale - cannot edit here</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="space-y-2">
                <Label htmlFor="output-item-type-subtype" className="text-xs">Item Type & SubType</Label>
                <SearchableSelect
                  value={outputItemTypeSubType}
                  onValueChange={handleOutputItemTypeSubTypeChange}
                  placeholder="No Item Output"
                  options={[
                    { value: 'none:', label: 'No Item Output', category: 'None' },
                    ...createItemTypeSubTypeOptions(),
                  ]}
                  className="h-8 text-sm"
                  autoGroupByCategory={true}
                  getCategoryForValue={(value) => {
                    if (value === 'none:') return 'None';
                    return getItemTypeFromCombined(value);
                  }}
                  instanceId="mission-task-output-item-type"
                />
              </div>

              {!!outputItemType && (
                <>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="output-quantity" className="text-xs">Quantity</Label>
                      <NumericInput
                        id="output-quantity"
                        value={outputQuantity}
                        onChange={(val) => {
                          setOutputQuantity(val);
                          setOutputQuantityString(val.toString());
                        }}
                        min={1}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="output-unit-cost" className="text-xs">Unit Cost</Label>
                      <NumericInput
                        id="output-unit-cost"
                        value={outputUnitCost}
                        onChange={(val) => {
                          setOutputUnitCost(val);
                          setOutputUnitCostString(val.toString());
                        }}
                        min={0}
                        step={PRICE_STEP}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="output-price" className="text-xs">Price</Label>
                      <NumericInput
                        id="output-price"
                        value={outputItemPrice}
                        onChange={(val) => {
                          setOutputItemPrice(val);
                          setOutputItemPriceString(val.toString());
                        }}
                        min={0}
                        step={PRICE_STEP}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="flex justify-center items-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAutoCalculateUnitCost}
                        className="h-8 text-xs"
                      >
                        Auto
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <SearchableSelect
                      value={formData.targetSite}
                      onValueChange={(v) => setFormData({ ...formData, targetSite: v })}
                      placeholder="Target Site"
                      options={createSiteOptionsWithCategories(allSites)}
                      autoGroupByCategory={true}
                      getCategoryForValue={(value) => {
                        if (value === 'none:') return 'None';
                        return getCategoryForSiteId(value, allSites);
                      }}
                      className="h-8 text-sm"
                      persistentCollapsible={true}
                      instanceId="mission-task-form-target-site"
                    />
                    <Select value={String(outputItemStatus)} onValueChange={(val) => setOutputItemStatus(val as ItemStatus)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(ItemStatus).map((s) => (
                          <SelectItem key={s} value={String(s)}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="output-item-name" className="text-xs">Item Name</Label>
                    <ItemNameField
                      value={outputItemName}
                      onChange={setOutputItemName}
                      placeholder="Enter item name"
                      className="h-8 text-sm"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <TaskModalFooter>
        <div className="flex flex-wrap items-center gap-2">
          {task && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteModal(true)}
              className="h-8 text-xs text-destructive hover:bg-destructive/10 border-destructive/20 mr-4"
            >
              Delete
            </Button>
          )}
          {task && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDatesModal(true)}
                className="h-8 text-xs bg-secondary/50"
              >
                <CalendarIcon className="w-3 h-3 mr-2" />
                Timeline
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRelationshipsModal(true)}
                className="h-8 text-xs bg-secondary/50"
              >
                <Network className="w-3 h-3 mr-2" />
                Links
              </Button>
            </>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowPlayerCharacterSelector(true)}
            className="h-8 text-xs"
          >
            <User className="w-3 h-3 mr-1" />
            Player
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="task-status-footer" className="text-xs text-muted-foreground">
              Status:
            </Label>
            <Select
              value={String(status)}
              onValueChange={(val) => {
                const newStatus = val as TaskStatus;
                if (newStatus === TaskStatus.COLLECTED && status !== TaskStatus.DONE && status !== TaskStatus.COLLECTED) {
                  setPendingNotDoneStatus(newStatus);
                  setShowNotDoneConfirmation(true);
                  return;
                }
                if (newStatus === TaskStatus.COLLECTED && status === TaskStatus.DONE) {
                  setPendingStatusChange({
                    status: newStatus,
                    onConfirm: () => {
                      setStatus(newStatus);
                      setProgress(100);
                      setShowArchiveCollectionModal(false);
                      setPendingStatusChange(null);
                    },
                    onCancel: () => {
                      setShowArchiveCollectionModal(false);
                      setPendingStatusChange(null);
                    },
                  });
                  setShowArchiveCollectionModal(true);
                  return;
                }
                setStatus(newStatus);
                if (newStatus === TaskStatus.CREATED || newStatus === TaskStatus.ON_HOLD) {
                  setProgress(0);
                } else if (newStatus === TaskStatus.IN_PROGRESS) {
                  setProgress(25);
                } else if (newStatus === TaskStatus.FINISHING) {
                  setProgress(75);
                } else if (newStatus === TaskStatus.DONE) {
                  setProgress(100);
                }
              }}
            >
              <SelectTrigger id="task-status-footer" className="h-8 w-36 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(TaskStatus)
                  .filter((taskStatus) => {
                    if (taskStatus === TaskStatus.COLLECTED && (isNotPaid || isNotCharged)) return false;
                    return true;
                  })
                  .map((taskStatus) => (
                    <SelectItem key={taskStatus} value={String(taskStatus)}>
                      {String(taskStatus).replace('_', ' ')}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} className="h-8 text-xs" disabled={!name.trim() || isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </TaskModalFooter>

      <DeleteModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        entityType={EntityType.TASK}
        entities={task ? [task] : []}
        onComplete={() => {
          setShowDeleteModal(false);
          onOpenChange(false);
          onDeleteComplete?.();
        }}
      />

      <DatesSubmodal
        open={showDatesModal}
        onOpenChange={setShowDatesModal}
        entityId={task?.id ? `data:task:${task.id}` : undefined}
        createdAt={task?.createdAt}
        doneAt={localDoneAt}
        collectedAt={localCollectedAt}
        currentStatus={status}
        onDatesChange={handleDatesUpdate}
      />

      {task && (
        <LinksRelationshipsModal
          entity={{ type: EntityType.TASK, id: task.id, name: task.name }}
          open={showRelationshipsModal}
          onClose={() => setShowRelationshipsModal(false)}
        />
      )}

      {pendingStatusChange && (
        <ArchiveCollectionConfirmationModal
          open={showArchiveCollectionModal}
          onOpenChange={setShowArchiveCollectionModal}
          entityType="task"
          entityName={name}
          pointsValue={rewards.points}
          totalRevenue={revenue}
          onConfirm={pendingStatusChange.onConfirm}
          onCancel={pendingStatusChange.onCancel}
        />
      )}

      <ConfirmationModal
        open={showNotDoneConfirmation}
        onOpenChange={setShowNotDoneConfirmation}
        title="Task Not Done"
        description="To collect a task you must set it Done first. Do you want to do both?"
        confirmText="Yes, Done & Collect"
        onConfirm={() => {
          if (pendingNotDoneStatus) {
            setStatus(pendingNotDoneStatus);
            setProgress(100);
          }
          setShowNotDoneConfirmation(false);
          setPendingNotDoneStatus(null);
        }}
        onCancel={() => {
          setShowNotDoneConfirmation(false);
          setPendingNotDoneStatus(null);
        }}
      />

      {/* Smart Scheduler Submodal */}
      <SmartSchedulerSubmodal
        open={showScheduler}
        onOpenChange={setShowScheduler}
        value={{
          dueDate,
          scheduledStart: scheduledStartDate,
          scheduledEnd: scheduledEndDate,
        }}
        onChange={(val) => {
          setDueDate(val.dueDate);
          setScheduledStartDate(val.scheduledStart);
          setScheduledStartTime(val.scheduledStart ? format(val.scheduledStart, 'HH:mm') : '');
          setScheduledEndDate(val.scheduledEnd);
          setScheduledEndTime(val.scheduledEnd ? format(val.scheduledEnd, 'HH:mm') : '');
        }}
        isRecurrent={false}
      />

      {/* Player Character Selector Modal */}
      <PlayerCharacterSelectorModal
        open={showPlayerCharacterSelector}
        onOpenChange={setShowPlayerCharacterSelector}
        onSelect={handlePlayerCharacterSelect}
        currentPlayerCharacterId={playerCharacterId}
      />

      {/* Validation Modal */}
      <Dialog open={showValidationModal} onOpenChange={setShowValidationModal}>
        <DialogContent zIndexLayer="MODALS">
          <DialogHeader>
            <DialogTitle>Missing Required Information</DialogTitle>
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

// Helper functions
function getCategoryForSiteId(value: string, sites: Site[]): string {
  const site = sites.find(s => s.id === value);
  if (!site) return 'None';
  return site.metadata.type || 'Uncategorized';
}
