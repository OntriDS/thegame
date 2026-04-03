// components/modals/task-modal-recurrents-content.tsx
// Recurrent task modal — Content region (Header/Footer shared; field layout aligned with legacy task-modal recurrent branch)

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import NumericInput from '@/components/ui/numeric-input';
import { SmartSchedulerSubmodal } from './submodals/smart-scheduler-submodal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { ItemNameField } from '@/components/ui/item-name-field';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Task, Item, Site } from '@/types/entities';
import { getPointsMetadata } from '@/lib/utils/points-utils';
import { TaskType, TaskStatus, TaskPriority, RecurrentFrequency, FOUNDER_CHARACTER_ID, EntityType, ItemType, ItemStatus } from '@/types/enums';
import {
  getStationFromCombined,
  createTaskParentOptions,
  createStationCategoryOptions,
  getCategoryFromCombined,
  createItemTypeSubTypeOptions,
  getItemTypeFromCombined,
  getSubTypeFromCombined,
} from '@/lib/utils/searchable-select-utils';
import { createSiteOptionsWithCategories } from '@/lib/utils/site-options-utils';
import { getAreaForStation } from '@/lib/utils/business-structure-utils';
import type { Station, SubItemType } from '@/types/type-aliases';
import { v4 as uuid } from 'uuid';
import { ORDER_INCREMENT, PROGRESS_MAX, PROGRESS_STEP, PRICE_STEP } from '@/lib/constants/app-constants';
import { computeNextSiblingOrder } from '@/lib/utils/task-order-utils';
import { Calendar as CalendarIcon, Repeat, Network, User } from 'lucide-react';
import { useUserPreferences } from '@/lib/hooks/use-user-preferences';
import { format } from 'date-fns';
import { FrequencyConfig } from '@/components/ui/frequency-calendar';
import { validateFrequencyConfig } from '@/lib/utils/recurrent-date-utils';
import DeleteModal from './submodals/delete-submodal';
import LinksRelationshipsModal from './submodals/links-relationships-submodal';
import DatesSubmodal from './submodals/dates-submodal';
import ArchiveCollectionConfirmationModal from './submodals/archive-collection-confirmation-submodal';
import ConfirmationModal from './submodals/confirmation-submodal';
import CascadeStatusConfirmationModal from './submodals/cascade-status-confirmation-submodal';
import CharacterSelectorSubmodal from './submodals/character-selector-submodal';
import PlayerCharacterSelectorModal from './submodals/player-character-selector-submodal';
import { TaskModalHeader, TaskModalFooter, type TaskModalContentKind } from './task-modal';
import { ClientAPI } from '@/lib/client-api';
import { dispatchEntityUpdated, entityTypeToKind } from '@/lib/ui/ui-events';

interface RecurrentTreeModalContentProps {
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
  modalTitle: string;
  contentKind: TaskModalContentKind;
  isLoading?: boolean;
}

/** Recurrent task types only; same ambassador/emissary fields as legacy unified task modal when editing recurrent tasks. */
export default function RecurrentTreeModalContent({
  task,
  open,
  allTasks = [],
  allItems: _allItems = [],
  allSites = [],
  allCharacters = [],
  allTasksForOrder,
  onSave,
  onOpenChange,
  onDeleteComplete,
  modalTitle,
  contentKind,
  isLoading = false,
}: RecurrentTreeModalContentProps) {
  void _allItems;
  const { getPreference, setPreference } = useUserPreferences();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.CREATED);
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.NORMAL);
  const [type, setType] = useState<TaskType>(TaskType.RECURRENT_TEMPLATE);
  const [station, setStation] = useState<Station>('Strategy' as Station);
  const [progress, setProgress] = useState(0);
  const [localDoneAt, setLocalDoneAt] = useState<Date | undefined>(undefined);
  const [localCollectedAt, setLocalCollectedAt] = useState<Date | undefined>(undefined);
  const [frequencyConfig, setFrequencyConfig] = useState<FrequencyConfig | undefined>(
    task?.frequencyConfig || {
      type: RecurrentFrequency.ONCE,
      interval: 1,
      repeatMode: 'periodically',
    }
  );
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [scheduledStartDate, setScheduledStartDate] = useState<Date | undefined>(undefined);
  const [scheduledStartTime, setScheduledStartTime] = useState<string>('');
  const [scheduledEndDate, setScheduledEndDate] = useState<Date | undefined>(undefined);
  const [scheduledEndTime, setScheduledEndTime] = useState<string>('');
  const [cost, setCost] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [isNotPaid, setIsNotPaid] = useState(false);
  const [isNotCharged, setIsNotCharged] = useState(false);
  const [isCollected, setIsCollected] = useState(false);
  const [formData, setFormData] = useState({ site: 'none' as string, targetSite: 'none' as string });
  const [outputItemType, setOutputItemType] = useState<ItemType | ''>('');
  const [outputItemSubType, setOutputItemSubType] = useState<SubItemType | ''>('');
  const [outputItemTypeSubType, setOutputItemTypeSubType] = useState<string>('none:');
  const [outputQuantity, setOutputQuantity] = useState(1);
  const [outputUnitCost, setOutputUnitCost] = useState(0);
  const [outputItemName, setOutputItemName] = useState('');
  const [outputItemPrice, setOutputItemPrice] = useState(0);
  const [isNewItem, setIsNewItem] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [isSold, setIsSold] = useState(false);
  const [outputItemStatus, setOutputItemStatus] = useState<ItemStatus>(ItemStatus.FOR_SALE);
  const [rewards, setRewards] = useState({ points: { xp: 0, rp: 0, fp: 0, hp: 0 } });
  const [parentId, setParentId] = useState<string | null>(null);
  const [customerCharacterId, setCustomerCharacterId] = useState<string | null>(null);
  const [customerCharacterName, setCustomerCharacterName] = useState<string>('');
  const [playerCharacterId, setPlayerCharacterId] = useState<string | null>(FOUNDER_CHARACTER_ID);
  const [showCharacterSelector, setShowCharacterSelector] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDatesModal, setShowDatesModal] = useState(false);
  const [showRelationshipsModal, setShowRelationshipsModal] = useState(false);
  const [showPlayerCharacterSelector, setShowPlayerCharacterSelector] = useState(false);
  const [emissaryColumnExpanded, setEmissaryColumnExpanded] = useState(false);
  const [showArchiveCollectionModal, setShowArchiveCollectionModal] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    status: TaskStatus;
    onConfirm: () => void;
    onCancel: () => void;
  } | null>(null);
  const [showNotDoneConfirmation, setShowNotDoneConfirmation] = useState(false);
  const [pendingNotDoneStatus, setPendingNotDoneStatus] = useState<TaskStatus | null>(null);
  const [showCascadeModal, setShowCascadeModal] = useState(false);
  const [cascadeData, setCascadeData] = useState<{
    newStatus: TaskStatus;
    oldStatus: TaskStatus;
    affectedCount: number;
    isReversal: boolean;
  } | null>(null);

  const hasInitializedRef = useRef(false);
  const initializedTaskIdRef = useRef<string | null>(null);
  const draftId = useRef(task?.id || uuid());

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

  const toggleEmissaryColumn = () => {
    const newValue = !emissaryColumnExpanded;
    setEmissaryColumnExpanded(newValue);
    setPreference('task-modal-emissary-expanded', String(newValue));
  };

  const computeStationCategoryValue = useCallback((stationValue: Station | null): string => {
    if (!stationValue) return 'none:';
    const area = getAreaForStation(stationValue);
    return `${stationValue}:${area || 'ADMIN'}`;
  }, []);

  const initializeFromTask = useCallback(
    (existingTask: Task) => {
      draftId.current = existingTask.id;
      setName(existingTask.name);
      setDescription(existingTask.description || '');
      setStatus(existingTask.status);
      setPriority(existingTask.priority);
      setType(existingTask.type);
      setStation(existingTask.station);
      setStationCategory(computeStationCategoryValue(existingTask.station));
      setProgress(existingTask.progress);
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
      setOutputUnitCost(existingTask.outputUnitCost || 0);
      setOutputItemName(existingTask.outputItemName || '');
      setOutputItemPrice(existingTask.outputItemPrice || 0);
      setIsNewItem(existingTask.isNewItem || false);
      setIsSold(existingTask.isSold || false);
      setOutputItemStatus(existingTask.outputItemStatus || ItemStatus.FOR_SALE);
      setSelectedItemId(existingTask.outputItemId || '');
      setCustomerCharacterId(existingTask.customerCharacterId || null);
      setPlayerCharacterId(existingTask.playerCharacterId || FOUNDER_CHARACTER_ID);
      setRewards({
        points: {
          xp: existingTask.rewards?.points?.xp || 0,
          rp: existingTask.rewards?.points?.rp || 0,
          fp: existingTask.rewards?.points?.fp || 0,
          hp: existingTask.rewards?.points?.hp || 0,
        },
      });
      setFrequencyConfig(
        existingTask.frequencyConfig || {
          type: RecurrentFrequency.ONCE,
          interval: 1,
          repeatMode: 'periodically',
        }
      );
      setParentId(existingTask.parentId || null);
    },
    [computeStationCategoryValue]
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
    setStationCategory(computeStationCategoryValue(lastStation));
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
    setOutputUnitCost(0);
    setOutputItemName('');
    setOutputItemPrice(0);
    setIsNewItem(false);
    setIsSold(false);
    setOutputItemStatus(ItemStatus.FOR_SALE);
    setSelectedItemId('');
    setCustomerCharacterId(null);
    setCustomerCharacterName('');
    setPlayerCharacterId(FOUNDER_CHARACTER_ID);
    setRewards({ points: { xp: 0, rp: 0, fp: 0, hp: 0 } });
    setFrequencyConfig({
      type: RecurrentFrequency.ONCE,
      interval: 1,
      repeatMode: 'periodically',
    });
    setParentId(null);
  }, [computeStationCategoryValue, getLastUsedStation, getLastUsedType]);

  useEffect(() => {
    if (!open) {
      hasInitializedRef.current = false;
      initializedTaskIdRef.current = null;
      return;
    }
    const currentTaskId = task?.id || null;
    const alreadyInitialized = hasInitializedRef.current && initializedTaskIdRef.current === currentTaskId;
    if (alreadyInitialized) return;
    if (task?.id) {
      initializeFromTask(task);
    } else {
      initializeForNewTask();
    }
    hasInitializedRef.current = true;
    initializedTaskIdRef.current = currentTaskId;
  }, [open, task, initializeForNewTask, initializeFromTask]);

  useEffect(() => {
    const savedEmissary = getPreference('task-modal-emissary-expanded');
    if (savedEmissary === 'true') setEmissaryColumnExpanded(true);
    else if (savedEmissary === 'false') setEmissaryColumnExpanded(false);
  }, [open, getPreference]);

  useEffect(() => {
    if (customerCharacterId) {
      const c = allCharacters.find((x) => x.id === customerCharacterId);
      setCustomerCharacterName(c?.name || '');
    } else {
      setCustomerCharacterName('');
    }
  }, [customerCharacterId, allCharacters]);

  // Helper function to build task from form state
  const buildTaskFromForm = (statusOverride?: TaskStatus) => {
    const editingExisting = !!task;

    let finalScheduledStart: Date | undefined = undefined;
    let finalScheduledEnd: Date | undefined = undefined;

    if (scheduledStartDate && scheduledStartTime) {
      const [hours, minutes] = scheduledStartTime.split(':').map(Number);
      const startDateTime = new Date(scheduledStartDate);
      startDateTime.setHours(hours, minutes, 0, 0);
      finalScheduledStart = startDateTime;
    }

    if (scheduledEndDate && scheduledEndTime) {
      const [hours, minutes] = scheduledEndTime.split(':').map(Number);
      const endDateTime = new Date(scheduledEndDate);
      endDateTime.setHours(hours, minutes, 0, 0);
      finalScheduledEnd = endDateTime;
    }

    const determineOrder = (): number => {
      if (allTasksForOrder && allTasksForOrder.length > 0) {
        return computeNextSiblingOrder(allTasksForOrder, parentId, draftId.current);
      }
      if (editingExisting && task!.order != null && !Number.isNaN(Number(task!.order))) {
        return Number(task!.order);
      }
      return ORDER_INCREMENT;
    };

    const determineFinalStatus = () => {
      if (editingExisting && task?.status === TaskStatus.COLLECTED) return TaskStatus.COLLECTED;
      if (editingExisting && task?.status === TaskStatus.DONE && progress === 100) return TaskStatus.DONE;
      if (progress === 100) return TaskStatus.DONE;
      if (status === TaskStatus.COLLECTED) return TaskStatus.COLLECTED;
      return status;
    };

    const finalStatus = statusOverride !== undefined ? statusOverride : determineFinalStatus();

    return {
      id: draftId.current,
      name: name.trim(),
      description: description.trim(),
      status: finalStatus,
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
      outputItemName: outputItemName.trim(),
      rewards,
      parentId,
      customerCharacterId,
      playerCharacterId,
      order: determineOrder(),
      isCollected,
      isNewItem,
      isSold,
      outputItemId: isNewItem ? null : (selectedItemId || task?.outputItemId || null),
      frequencyConfig: (type === TaskType.RECURRENT_GROUP || type === TaskType.RECURRENT_TEMPLATE) ? frequencyConfig : undefined,
      links: task?.links || [],
      createdAt: task?.createdAt || new Date(),
      updatedAt: new Date(),
    } as Task;
  };

  const handleSave = async () => {
    if (isLoading || isSaving) return;

    if (!name.trim()) {
      setValidationMessage('Task name is required');
      setShowValidationModal(true);
      return;
    }

    if (type === TaskType.RECURRENT_TEMPLATE) {
      const freq = frequencyConfig;
      if (freq?.type === RecurrentFrequency.ONCE) {
        // ok
      } else {
        const hasStopCondition =
          freq?.stopsAfter && (freq.stopsAfter.type === 'times' || freq.stopsAfter.type === 'date');
        if (!hasStopCondition) {
          setValidationMessage(
            'Recurrent templates with repeat frequencies must have a stop condition (times or date) to prevent infinite instance creation.'
          );
          setShowValidationModal(true);
          return;
        }
        const validation = validateFrequencyConfig(freq);
        if (!validation.isValid) {
          setValidationMessage(validation.error || 'Invalid frequency configuration');
          setShowValidationModal(true);
          return;
        }
      }
    }

    if (type === TaskType.RECURRENT_TEMPLATE && task && task.status !== status) {
      try {
        const affectedCount = await ClientAPI.getUndoneInstancesCount(task.id, status);
        if (affectedCount > 0) {
          const isReversal = task.status === TaskStatus.DONE && status !== TaskStatus.DONE;
          setCascadeData({
            newStatus: status,
            oldStatus: task.status,
            affectedCount,
            isReversal,
          });
          setShowCascadeModal(true);
          return;
        }
      } catch (error) {
        console.error('Failed to check cascade status:', error);
      }
    }

    setIsSaving(true);
    try {
      const newTask = buildTaskFromForm();
      await onSave(newTask);
      dispatchEntityUpdated(entityTypeToKind(EntityType.TASK));
      onOpenChange(false);
    } catch (error) {
      console.error('[RecurrentTaskModal] Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCascadeConfirm = async () => {
    if (!cascadeData || !task) return;
    setIsSaving(true);
    try {
      const newTask = buildTaskFromForm(cascadeData.newStatus);
      await onSave(newTask);
      dispatchEntityUpdated(entityTypeToKind(EntityType.TASK));
      onOpenChange(false);
    } catch (error) {
      console.error('Cascade save failed:', error);
    } finally {
      setShowCascadeModal(false);
      setCascadeData(null);
      setIsSaving(false);
    }
  };

  const handleCascadeCancel = async () => {
    setShowCascadeModal(false);
    if (!cascadeData || !task) {
      setCascadeData(null);
      return;
    }
    setIsSaving(true);
    try {
      const newTask = {
        ...buildTaskFromForm(cascadeData.newStatus),
        _skipCascade: true,
      } as Task & { _skipCascade?: boolean };
      await onSave(newTask as Task);
      dispatchEntityUpdated(entityTypeToKind(EntityType.TASK));
      onOpenChange(false);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setCascadeData(null);
      setIsSaving(false);
    }
  };

  const handleDatesUpdate = (newDates: { createdAt?: Date; doneAt?: Date; collectedAt?: Date }) => {
    setLocalDoneAt(newDates.doneAt);
    setLocalCollectedAt(newDates.collectedAt);
  };

  const handlePlayerCharacterSelect = (characterId: string | null) => {
    if (characterId) setPlayerCharacterId(characterId);
    setShowPlayerCharacterSelector(false);
  };

  const handleCustomerCharacterSelect = (characterId: string | null) => {
    setCustomerCharacterId(characterId);
    if (characterId) {
      const character = allCharacters.find((c) => c.id === characterId);
      setCustomerCharacterName(character?.name || '');
    } else {
      setCustomerCharacterName('');
    }
    setShowCharacterSelector(false);
  };

  const handleNotPaidChange = (newValue: boolean) => {
    setIsNotPaid(newValue);
  };

  const handleNotChargedChange = (newValue: boolean) => {
    setIsNotCharged(newValue);
  };

  const handleAutoCalculateUnitCost = () => {
    if (outputQuantity > 0) {
      const unitCost = Math.round((cost / outputQuantity) * 100) / 100;
      setOutputUnitCost(unitCost);
    }
  };

  const handleOutputItemTypeSubTypeChange = (value: string) => {
    setOutputItemTypeSubType(value);
    const newItemType = getItemTypeFromCombined(value) as ItemType;
    const newSubType = getSubTypeFromCombined(value) as SubItemType;
    setOutputItemType(newItemType);
    setOutputItemSubType(newSubType);
    if (!outputItemName) {
      setOutputItemName(`${newItemType} ${newSubType}`);
    }
  };

  const handleRewardChange = (type: 'xp' | 'rp' | 'fp' | 'hp', value: string) => {
    const numValue = parseFloat(value) || 0;
    setRewards((prev) => ({
      ...prev,
      points: { ...prev.points, [type]: numValue },
    }));
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

  return (
    <>
      <TaskModalHeader title={modalTitle} contentKind={contentKind} />

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        <div className="flex gap-4">
          <div className={`flex-1 grid gap-4 ${emissaryColumnExpanded ? 'grid-cols-4' : 'grid-cols-3'}`}>
            {/* Column 1: basics + schedule (legacy task-modal col1) */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="recurrent-task-name" className="text-xs">Name *</Label>
                <Input
                  id="recurrent-task-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Task name"
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recurrent-task-description" className="text-xs">Description</Label>
                <Textarea
                  id="recurrent-task-description"
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
                          : dueDate
                            ? format(dueDate, 'MMM d')
                            : '';
                        const timeStr = scheduledStartDate
                          ? `${format(scheduledStartDate, 'h:mm a')} - ${scheduledEndDate ? format(scheduledEndDate, 'h:mm a') : '...'}`
                          : '';
                        const freqStr =
                          (type === TaskType.RECURRENT_GROUP || type === TaskType.RECURRENT_TEMPLATE) && frequencyConfig
                            ? ' (Repeat)'
                            : '';
                        return `${dateStr} ${timeStr}${freqStr}`.trim();
                      })()}
                    </span>
                    {(type === TaskType.RECURRENT_GROUP || type === TaskType.RECURRENT_TEMPLATE) && frequencyConfig && (
                      <span className="text-[10px] text-muted-foreground flex items-center">
                        <Repeat className="w-3 h-3 mr-1" />
                        Recurring
                      </span>
                    )}
                  </div>
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="recurrent-task-priority" className="text-xs">Priority</Label>
                  <Select value={String(priority)} onValueChange={(val) => setPriority(val as TaskPriority)}>
                    <SelectTrigger id="recurrent-task-priority" className="h-8 text-sm">
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
                  <Label htmlFor="recurrent-task-progress" className="text-xs">Progress: {progress}%</Label>
                  <input
                    id="recurrent-task-progress"
                    type="range"
                    min={0}
                    max={PROGRESS_MAX}
                    step={PROGRESS_STEP}
                    value={progress}
                    onChange={(e) => {
                      const newProgress = Number(e.currentTarget.value);
                      setProgress(newProgress);
                      if (newProgress === 0) setStatus(TaskStatus.CREATED);
                      else if (newProgress === 25 || newProgress === 50) setStatus(TaskStatus.IN_PROGRESS);
                      else if (newProgress === 75) setStatus(TaskStatus.FINISHING);
                      else if (newProgress === 100) setStatus(TaskStatus.DONE);
                    }}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Column 2: Station, Type, Parent (legacy col2) */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">Station</Label>
                <SearchableSelect
                  value={stationCategory}
                  onValueChange={handleStationCategoryChange}
                  options={createStationCategoryOptions()}
                  autoGroupByCategory={true}
                  getCategoryForValue={(value) => getCategoryFromCombined(value)}
                  placeholder="Select station..."
                  className="h-8 text-sm"
                  persistentCollapsible={true}
                  instanceId="recurrent-task-modal-station-body"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recurrent-task-type" className="text-xs">Type</Label>
                <Select value={String(type)} onValueChange={handleTypeChange}>
                  <SelectTrigger id="recurrent-task-type" className="h-8 text-sm">
                    <SelectValue placeholder="Select task type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(TaskType)
                      .filter(
                        (taskType) =>
                          taskType === TaskType.RECURRENT_GROUP ||
                          taskType === TaskType.RECURRENT_TEMPLATE ||
                          taskType === TaskType.RECURRENT_INSTANCE
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
                <Label htmlFor="recurrent-task-parent" className="text-xs">Parent</Label>
                <SearchableSelect
                  value={parentId || ''}
                  onValueChange={(val) => setParentId(val || null)}
                  placeholder="No Parent"
                  options={createTaskParentOptions(allTasks, task?.id, true, type)}
                  autoGroupByCategory={true}
                  className="h-8 text-sm"
                  persistentCollapsible={true}
                  instanceId="recurrent-task-form-parent"
                />
              </div>
            </div>

            {/* Column 3: site + financials + rewards */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="recurrent-task-site" className="text-xs">Site</Label>
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
                  instanceId="recurrent-task-form-site"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="recurrent-task-cost" className="text-xs">Cost ($)</Label>
                  <NumericInput
                    id="recurrent-task-cost"
                    value={cost}
                    onChange={(val) => setCost(val)}
                    min={0}
                    step={0.01}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recurrent-task-revenue" className="text-xs">Revenue ($)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="relative">
                          <NumericInput
                            id="recurrent-task-revenue"
                            value={revenue}
                            onChange={(val) => setRevenue(val)}
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
                  className={`h-8 text-xs ${isNotPaid ? 'bg-destructive/10' : ''}`}
                >
                  <Checkbox
                    checked={isNotPaid}
                    onCheckedChange={(c) => setIsNotPaid(!!c)}
                    className="mr-2"
                  />
                  Not Paid
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleNotChargedChange(!isNotCharged)}
                  className={`h-8 text-xs ${isNotCharged ? 'bg-destructive/10' : ''}`}
                >
                  <Checkbox
                    checked={isNotCharged}
                    onCheckedChange={(c) => setIsNotCharged(!!c)}
                    className="mr-2"
                  />
                  Not Charged
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Point Rewards</Label>
                <div className="grid grid-cols-4 gap-2">
                  {getPointsMetadata().map((pointType) => (
                    <div key={pointType.key}>
                      <Label htmlFor={`recurrent-reward-${pointType.key.toLowerCase()}`} className="text-xs">
                        {pointType.label}
                      </Label>
                      <NumericInput
                        id={`recurrent-reward-${pointType.key.toLowerCase()}`}
                        value={rewards.points[pointType.key.toLowerCase() as keyof typeof rewards.points]}
                        onChange={(val) =>
                          handleRewardChange(pointType.key.toLowerCase() as 'xp' | 'rp' | 'fp' | 'hp', val.toString())
                        }
                        min={0}
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {emissaryColumnExpanded && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Customer</Label>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs"
                      onClick={() => setShowCharacterSelector(true)}
                    >
                      {customerCharacterId ? 'Change' : 'Select'}
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {customerCharacterName || 'No customer selected'}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Player Character</Label>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs"
                      onClick={() => setShowPlayerCharacterSelector(true)}
                    >
                      Change
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {allCharacters.find((c) => c.id === playerCharacterId)?.name || 'No player character'}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Creates Item?</Label>
                    <Checkbox
                      checked={!!outputItemType}
                      onCheckedChange={(checked) => {
                        if (!checked) {
                          setOutputItemType('');
                          setOutputItemSubType('');
                          setOutputItemTypeSubType('none:');
                        }
                      }}
                    />
                  </div>
                </div>

                {!!outputItemType && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="recurrent-output-item-type" className="text-xs">Item Type</Label>
                      <SearchableSelect
                        value={outputItemTypeSubType}
                        onValueChange={handleOutputItemTypeSubTypeChange}
                        placeholder="Select item type"
                        options={createItemTypeSubTypeOptions()}
                        autoGroupByCategory={true}
                        getCategoryForValue={(value) => {
                          if (value === 'none:') return 'None';
                          return getItemTypeFromCombined(value);
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="recurrent-output-quantity" className="text-xs">Quantity</Label>
                        <NumericInput
                          id="recurrent-output-quantity"
                          value={outputQuantity}
                          onChange={(val) => setOutputQuantity(val)}
                          min={1}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="recurrent-output-unit-cost" className="text-xs">Unit Cost</Label>
                        <NumericInput
                          id="recurrent-output-unit-cost"
                          value={outputUnitCost}
                          onChange={(val) => setOutputUnitCost(val)}
                          min={0}
                          step={0.01}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="recurrent-output-price" className="text-xs">Price</Label>
                        <NumericInput
                          id="recurrent-output-price"
                          value={outputItemPrice}
                          onChange={(val) => setOutputItemPrice(val)}
                          min={0}
                          step={0.01}
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
                        instanceId="recurrent-task-form-target-site"
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
                      <Label htmlFor="recurrent-output-item-name" className="text-xs">Item Name</Label>
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
            )}
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
          <Button
            type="button"
            variant="outline"
            onClick={toggleEmissaryColumn}
            className={`h-8 text-xs ${emissaryColumnExpanded ? 'bg-transparent text-white' : 'bg-muted text-muted-foreground'}`}
          >
            Emissaries
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="recurrent-task-status-footer" className="text-xs text-muted-foreground">
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
              <SelectTrigger id="recurrent-task-status-footer" className="h-8 w-36 text-sm">
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
              {isSaving ? 'Saving...' : task ? 'Update' : 'Create'} Task
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

      {cascadeData && (
        <CascadeStatusConfirmationModal
          open={showCascadeModal}
          onOpenChange={setShowCascadeModal}
          templateName={name}
          newStatus={cascadeData.newStatus}
          oldStatus={cascadeData.oldStatus}
          affectedInstancesCount={cascadeData.affectedCount}
          onConfirm={handleCascadeConfirm}
          onCancel={handleCascadeCancel}
          isReversal={cascadeData.isReversal}
        />
      )}

      <CharacterSelectorSubmodal
        open={showCharacterSelector}
        onOpenChange={setShowCharacterSelector}
        onSelect={handleCustomerCharacterSelect}
        currentOwnerId={customerCharacterId}
      />

      <PlayerCharacterSelectorModal
        open={showPlayerCharacterSelector}
        onOpenChange={setShowPlayerCharacterSelector}
        onSelect={handlePlayerCharacterSelect}
        currentPlayerCharacterId={playerCharacterId}
      />

      <SmartSchedulerSubmodal
        open={showScheduler}
        onOpenChange={setShowScheduler}
        value={{
          dueDate,
          scheduledStart: scheduledStartDate,
          scheduledEnd: scheduledEndDate,
          frequencyConfig:
            type === TaskType.RECURRENT_GROUP || type === TaskType.RECURRENT_TEMPLATE
              ? frequencyConfig
              : undefined,
        }}
        onChange={(val) => {
          setDueDate(val.dueDate);
          if (val.scheduledStart) {
            setScheduledStartDate(val.scheduledStart);
            setScheduledStartTime(format(val.scheduledStart, 'HH:mm'));
          } else {
            setScheduledStartDate(undefined);
            setScheduledStartTime('');
          }
          if (val.scheduledEnd) {
            setScheduledEndDate(val.scheduledEnd);
            setScheduledEndTime(format(val.scheduledEnd, 'HH:mm'));
          } else {
            setScheduledEndDate(undefined);
            setScheduledEndTime('');
          }
          if (type === TaskType.RECURRENT_GROUP || type === TaskType.RECURRENT_TEMPLATE) {
            setFrequencyConfig(val.frequencyConfig);
          }
        }}
        isRecurrent={type === TaskType.RECURRENT_GROUP || type === TaskType.RECURRENT_TEMPLATE}
      />

      {/* Validation Modal */}
      <Dialog open={showValidationModal} onOpenChange={setShowValidationModal}>
        <DialogContent zIndexLayer="MODALS">
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

function getCategoryForSiteId(value: string, sites: Site[]): string {
  const site = sites.find((s) => s.id === value);
  if (!site) return 'None';
  return site.metadata.type || 'Uncategorized';
}
