// components/modals/mission-tree-modal-content.tsx
// Mission Tree Modal Content Component - Specialized form for Mission Tasks
// Implements Shell/Core pattern - Core content for TaskModalShell

'use client';

import React, { useState, useCallback, useRef } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Task, Item, Site } from '@/types/entities';
import { getPointsMetadata } from '@/lib/utils/points-utils';
import { TaskType, TaskStatus, TaskPriority, ItemType, ItemStatus, FOUNDER_CHARACTER_ID } from '@/types/enums';
import { createStationCategoryOptions, getStationFromCombined, createTaskParentOptions, createItemTypeSubTypeOptions, getItemTypeFromCombined, getSubTypeFromCombined, createCharacterOptions } from '@/lib/utils/searchable-select-utils';
import { createSiteOptionsWithCategories } from '@/lib/utils/site-options-utils';
import { getAreaForStation } from '@/lib/utils/business-structure-utils';
import type { Station, SubItemType } from '@/types/type-aliases';
import { v4 as uuid } from 'uuid';
import { ORDER_INCREMENT } from '@/lib/constants/app-constants';
import { computeNextSiblingOrder } from '@/lib/utils/task-order-utils';
import { Calendar as CalendarIcon } from 'lucide-react';
import CharacterSelectorSubmodal from './submodals/character-selector-submodal';
import PlayerCharacterSelectorModal from './submodals/player-character-selector-submodal';
import { useUserPreferences } from '@/lib/hooks/use-user-preferences';
import { format } from 'date-fns';

interface MissionTreeModalContentProps {
  task?: Task | null;
  allTasks?: Task[];
  allItems?: Item[];
  allSites?: Site[];
  allCharacters?: any[];
  allTasksForOrder?: Task[];
  onSave: (task: Task) => Promise<void>;
  onCancel: () => void;
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
  allTasks = [],
  allItems = [],
  allSites = [],
  allCharacters = [],
  allTasksForOrder,
  onSave,
  onCancel,
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
  const [costString, setCostString] = useState('0');
  const [revenue, setRevenue] = useState(0);
  const [revenueString, setRevenueString] = useState('0');
  const [isNotPaid, setIsNotPaid] = useState(false);
  const [isNotCharged, setIsNotCharged] = useState(false);
  const [isCollected, setIsCollected] = useState(false);

  // Collapsible Emissary Column state - persisted in preferences
  const [emissaryColumnExpanded, setEmissaryColumnExpanded] = useState(false);

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
  const [rewardsStrings, setRewardsStrings] = useState({
    points: { xp: '0', rp: '0', fp: '0', hp: '0' }
  });
  const [parentId, setParentId] = useState<string | null>(null);
  const [customerCharacterId, setCustomerCharacterId] = useState<string | null>(null);
  const [customerCharacterName, setCustomerCharacterName] = useState<string>('');
  const [playerCharacterId, setPlayerCharacterId] = useState<string | null>(FOUNDER_CHARACTER_ID);
  const [showCharacterSelector, setShowCharacterSelector] = useState(false);
  const [showPlayerCharacterSelector, setShowPlayerCharacterSelector] = useState(false);
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

  const toggleEmissaryColumn = () => {
    const newValue = !emissaryColumnExpanded;
    setEmissaryColumnExpanded(newValue);
    setPreference('task-modal-emissary-expanded', String(newValue));
  };

  const getLastUsedStation = useCallback((): Station => {
    const saved = getPreference('task-modal-last-station');
    return (saved as Station) || ('Strategy' as Station);
  }, [getPreference]);

  const getLastUsedType = useCallback((): TaskType => {
    const saved = getPreference('task-modal-last-type');
    return (saved as TaskType) || TaskType.MISSION;
  }, [getPreference]);

  // Helper function to build task from form state
  const buildTaskFromForm = () => {
    const editingExisting = !!task;

    // Scheduled start/end logic
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

    return {
      id: editingExisting ? task!.id : uuid(),
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
      outputItemName: outputItemName.trim(),
      rewards,
      parentId,
      customerCharacterId,
      playerCharacterId,
      order: determineOrder(),
      isCollected,
      outputItemId: isNewItem ? null : (selectedItemId || task?.outputItemId || null),
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

    const newTask = buildTaskFromForm();
    await onSave(newTask);
  };

  const handleTypeChange = (newType: string) => {
    const casted = newType as TaskType;
    setType(casted);
    const key = 'task-modal-last-type';
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

  // Auto-calculate unit cost and price from total cost/revenue and quantity
  const handleAutoCalculateUnitCost = () => {
    if (outputQuantity > 0) {
      const unitCost = Math.round((cost / outputQuantity) * 100) / 100;
      setOutputUnitCost(unitCost);
      setOutputUnitCostString(unitCost.toString());
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

  const handleCustomerCharacterSelect = (characterId: string | null) => {
    setCustomerCharacterId(characterId);
    // Find character name from allCharacters
    if (characterId) {
      const character = allCharacters.find(c => c.id === characterId);
      setCustomerCharacterName(character?.name || '');
    } else {
      setCustomerCharacterName('');
    }
    setShowCharacterSelector(false);
  };

  const handlePlayerCharacterSelect = (characterId: string | null) => {
    if (characterId) {
      setPlayerCharacterId(characterId);
    }
    setShowPlayerCharacterSelector(false);
  };

  const handleOutputItemTypeSubTypeChange = (value: string) => {
    setOutputItemTypeSubType(value);
    const newItemType = getItemTypeFromCombined(value) as ItemType;
    const newSubType = getSubTypeFromCombined(value) as SubItemType;
    setOutputItemType(newItemType);
    setOutputItemSubType(newSubType);

    // Set default item name based on type/subtype if not already set
    if (!outputItemName) {
      const defaultName = `${newItemType} ${newSubType}`;
      setOutputItemName(defaultName);
    }
  };

  const formatSmartDecimal = (num: number): string => {
    const rounded = Math.round(num * 10) / 10;
    return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1);
  };

  const handleRewardChange = (type: 'xp' | 'rp' | 'fp' | 'hp', value: string) => {
    const numValue = parseFloat(value) || 0;
    setRewardsStrings(prev => ({
      ...prev,
      points: {
        ...prev.points,
        [type]: value
      }
    }));
    setRewards(prev => ({
      ...prev,
      points: {
        ...prev.points,
        [type]: numValue
      }
    }));
  };

  const getCharacterOptions = () => {
    return createCharacterOptions(allCharacters);
  };

  const handleStatusChange = (newStatus: string) => {
    const casted = newStatus as TaskStatus;
    setStatus(casted);
    if (casted === TaskStatus.DONE && progress < 100) {
      setProgress(100);
    }
  };

  // Render the form
  return (
    <>
      <div className="px-6">
        <div className="flex gap-4">
          {/* Main columns container */}
          <div className={`flex-1 grid gap-4 ${emissaryColumnExpanded ? 'grid-cols-4' : 'grid-cols-3'}`}>

            {/* Column 1: NATIVE (Basic Info) */}
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

              <div className="space-y-2">
                <Label htmlFor="task-type" className="text-xs">Type</Label>
                <Select value={String(type)} onValueChange={handleTypeChange}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select task type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(TaskType)
                      .filter((taskType) => {
                        // Only mission types allowed
                        return taskType === TaskType.MISSION_GROUP ||
                          taskType === TaskType.MISSION ||
                          taskType === TaskType.MILESTONE ||
                          taskType === TaskType.GOAL ||
                          taskType === TaskType.ASSIGNMENT;
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
                      if (newProgress === 100 && status !== TaskStatus.DONE && status !== TaskStatus.COLLECTED) {
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
                  options={createTaskParentOptions(allTasks, task?.id, false, type)}
                  autoGroupByCategory={true}
                  className="h-8 text-sm"
                  persistentCollapsible={true}
                  instanceId="mission-task-form-parent"
                />
              </div>

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

              <div className="space-y-2">
                <Label className="text-xs">Schedule</Label>
                <Button
                  type="button"
                  variant="outline"
                  className={`w-full justify-start text-left font-normal h-auto py-2 px-3 ${!dueDate && !scheduledStartDate ? "text-muted-foreground" : ""}`}
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
                  <Label htmlFor="task-cost" className="text-xs">Cost ($)</Label>
                  <NumericInput
                    id="task-cost"
                    value={cost}
                    onChange={(val) => {
                      setCost(val);
                      setCostString(val.toString());
                    }}
                    min={0}
                    step={0.01}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-revenue" className="text-xs">Revenue ($)</Label>
                  <NumericInput
                    id="task-revenue"
                    value={revenue}
                    onChange={(val) => {
                      setRevenue(val);
                      setRevenueString(val.toString());
                    }}
                    min={0}
                    step={0.01}
                    className="h-8 text-sm"
                  />
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
                    onChange={() => handleNotPaidChange(!isNotPaid)}
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
                    onChange={() => handleNotChargedChange(!isNotCharged)}
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
                      <Label htmlFor={`reward-${pointType.key.toLowerCase()}`} className="text-xs">{pointType.label}</Label>
                      <NumericInput
                        id={`reward-${pointType.key.toLowerCase()}`}
                        value={rewards.points[pointType.key.toLowerCase() as keyof typeof rewards.points]}
                        onChange={(val) => handleRewardChange(pointType.key.toLowerCase() as keyof typeof rewards.points, val.toString())}
                        min={0}
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Column 3: EMISSARY (Optional) */}
            <div className="space-y-3">

              {/* Customer Character - Emissary field for service tasks */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="customer-character" className="text-xs">Customer</Label>
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

              {/* Player Character */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="player-character" className="text-xs">Player Character</Label>
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
                  {allCharacters.find(c => c.id === playerCharacterId)?.name || 'No player character'}
                </div>
              </div>

              {/* Item Creation Toggle */}
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
                  {/* Item Type/Subtype */}
                  <div className="space-y-2">
                    <Label htmlFor="output-item-type" className="text-xs">Item Type</Label>
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

                  {/* Row 1: Quantity, Unit Cost, Price, Auto */}
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
                        step={0.01}
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

                  {/* Row 2: Target Site, Item Status */}
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

                  {/* Item Name */}
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

            {/* Column 4: Expanded Emissary Content */}
            {emissaryColumnExpanded && (
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground">
                  Additional emissary fields placeholder
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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

      {/* Character Selector Submodal */}
      <CharacterSelectorSubmodal
        open={showCharacterSelector}
        onOpenChange={setShowCharacterSelector}
        onSelect={handleCustomerCharacterSelect}
        currentOwnerId={customerCharacterId}
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
        <DialogContent>
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
function getCategoryForStationType(value: string): string {
  return getStationFromCombined(value) || 'None';
}

function getCategoryForSiteId(value: string, sites: Site[]): string {
  const site = sites.find(s => s.id === value);
  if (!site) return 'None';
  return site.metadata.type || 'Uncategorized';
}
