'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import NumericInput from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { ItemNameField } from '@/components/ui/item-name-field';
import { DatePicker } from '@/components/ui/date-picker';
import { FrequencyCalendar, FrequencyConfig } from '@/components/ui/frequency-calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import DeleteModal from './submodals/delete-submodal';
import LinksRelationshipsModal from './submodals/links-relationships-submodal';
import { Task, Item, Site } from '@/types/entities';
import { getZIndexClass } from '@/lib/utils/z-index-utils';
import { getPointsMetadata } from '@/lib/utils/points-utils';
import { TaskType, TaskStatus, TaskPriority, STATION_CATEGORIES, ItemType, RecurrentFrequency, Collection, ItemStatus, CharacterRole, PLAYER_ONE_ID, EntityType } from '@/types/enums';
import { getSubTypesForItemType } from '@/lib/utils/item-utils';
import { getCategoryForItemType, getCategoryForTaskType, createStationCategoryOptions, getStationFromCombined, getCategoryFromCombined, createTaskParentOptions, createItemTypeSubTypeOptions, getItemTypeFromCombined, getSubTypeFromCombined, createCharacterOptions } from '@/lib/utils/searchable-select-utils';
import { getAreaForStation } from '@/lib/utils/business-structure-utils';
import { createSiteOptionsWithCategories, getSiteNameFromId } from '@/lib/utils/site-options-utils';
import type { Station, SubItemType } from '@/types/type-aliases';
import { v4 as uuid } from 'uuid';
import { PROGRESS_MAX, PROGRESS_STEP, PRICE_STEP } from '@/lib/constants/app-constants';
import { Network, User, Calendar as CalendarIcon } from 'lucide-react';
import { getEmissaryFields } from '@/types/diplomatic-fields';
import CascadeStatusConfirmationModal from './submodals/cascade-status-confirmation-submodal';
import ArchiveCollectionConfirmationModal from './submodals/archive-collection-confirmation-submodal';
import { ClientAPI } from '@/lib/client-api';
import CharacterSelectorSubmodal from './submodals/character-selector-submodal';
import PlayerCharacterSelectorModal from './submodals/player-character-selector-submodal';
import { dispatchEntityUpdated, entityTypeToKind } from '@/lib/ui/ui-events';
import { useUserPreferences } from '@/lib/hooks/use-user-preferences';
import { format } from 'date-fns';

interface TaskModalProps {
  task?: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (task: Task) => Promise<void>;
  onComplete?: () => void;
  isRecurrentModal?: boolean;
}


// TaskModal: UI-only form for task data collection and validation
// Side effects and persistence handled by parent component
//
// DIPLOMATIC FIELDS PATTERN:
// - NATIVE fields: Always displayed (name, status, priority, etc.)
// - AMBASSADOR fields: Always displayed (cost, revenue, siteId, etc.)
// - EMISSARY fields: Collapsible via vertical toggle button
//   - showEmissaryFields=true: Show toggle button, user can expand/collapse (default)
//   - showEmissaryFields=false: Hide toggle button completely (for future contexts)
//   - User can toggle Item Creation fields on/off as needed
//
// Why collapsible Emissaries?
// - Emissary fields are CONDITIONALLY PRESENT (only when creating items)
// - Most tasks don't create items, so default collapsed = cleaner UI
// - Advanced users can expand when needed
// - Default behavior: Show toggle button in all contexts (Control Room, etc.)

export default function TaskModal({
  task,
  open,
  onOpenChange,
  onSave,
  onComplete,
  isRecurrentModal = false,
}: TaskModalProps) {
  const { getPreference, setPreference } = useUserPreferences();

  // Collapsible Emissary Column state - persisted in preferences
  const [emissaryColumnExpanded, setEmissaryColumnExpanded] = useState(false); // Default to false

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
    if (isRecurrentModal) {
      const saved = getPreference('task-modal-last-recurrent-type');
      return (saved as TaskType) || TaskType.RECURRENT_GROUP;
    }
    const saved = getPreference('task-modal-last-type');
    return (saved as TaskType) || TaskType.MISSION;
  }, [isRecurrentModal, getPreference]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.CREATED);
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.NORMAL);
  const [type, setType] = useState<TaskType>(getLastUsedType());
  const [station, setStation] = useState<Station>('Strategy' as Station);
  const getInitialStationCategory = (): string => {
    const lastStation = getLastUsedStation();
    const area = getAreaForStation(lastStation);
    return `${lastStation}:${area || 'ADMIN'}`;
  };
  const [stationCategory, setStationCategory] = useState<string>(getInitialStationCategory());
  const [progress, setProgress] = useState(0);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [scheduledStartDate, setScheduledStartDate] = useState<Date | undefined>(undefined);
  const [scheduledStartTime, setScheduledStartTime] = useState<string>('');
  const [scheduledEndDate, setScheduledEndDate] = useState<Date | undefined>(undefined);
  const [scheduledEndTime, setScheduledEndTime] = useState<string>('');
  const [frequencyConfig, setFrequencyConfig] = useState<FrequencyConfig | undefined>(
    task?.frequencyConfig || {
      type: RecurrentFrequency.ONCE,
      interval: 1,
      repeatMode: 'periodically',
    }
  );
  const [cost, setCost] = useState(0);
  const [costString, setCostString] = useState('0');
  const [revenue, setRevenue] = useState(0);
  const [revenueString, setRevenueString] = useState('0');
  const [isNotPaid, setIsNotPaid] = useState(false);
  const [isNotCharged, setIsNotCharged] = useState(false);
  const [isRecurrentGroup, setIsRecurrentGroup] = useState(false);
  const [isTemplate, setIsTemplate] = useState(false);
  const [isCollected, setIsCollected] = useState(false);

  // Cascade confirmation modal state
  const [showCascadeModal, setShowCascadeModal] = useState(false);
  const [cascadeData, setCascadeData] = useState<{
    newStatus: TaskStatus;
    oldStatus: TaskStatus;
    affectedCount: number;
    isReversal: boolean;
  } | null>(null);

  // Archive collection confirmation modal state (for status selector only)
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
  const [isNewCustomer, setIsNewCustomer] = useState(true);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [playerCharacterId, setPlayerCharacterId] = useState<string | null>(PLAYER_ONE_ID);
  const [showCharacterSelector, setShowCharacterSelector] = useState(false);
  const [showPlayerCharacterSelector, setShowPlayerCharacterSelector] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRelationshipsModal, setShowRelationshipsModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');

  // Archive Collection Confirmation Modal state (for status change)
  const [showArchiveCollectionModal, setShowArchiveCollectionModal] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    status: TaskStatus;
    onConfirm: () => void;
    onCancel: () => void;
  } | null>(null);

  // UI data loading for form functionality
  const [items, setItems] = useState<Item[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [characters, setCharacters] = useState<any[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  const hasInitializedRef = useRef(false);
  const initializedTaskIdRef = useRef<string | null>(null);

  // Load UI data for form dropdowns
  useEffect(() => {
    const loadUIData = async () => {
      try {
        const [itemsData, tasksData, charactersData, sitesData] = await Promise.all([
          ClientAPI.getItems(),
          ClientAPI.getTasks(),
          ClientAPI.getCharacters(),
          ClientAPI.getSites()
        ]);
        setItems(itemsData);
        setTasks(tasksData);
        setCharacters(charactersData);
        setSites(sitesData);
        setDataLoaded(true);
      } catch (error) {
        console.error('Failed to load task modal UI data:', error);
      }
    };
    loadUIData();
  }, []);

  // Load preferences after hydration to prevent SSR mismatches
  useEffect(() => {
    const savedEmissary = getPreference('task-modal-emissary-expanded');
    if (savedEmissary === 'true') {
      setEmissaryColumnExpanded(true);
    } else if (savedEmissary === 'false') {
      setEmissaryColumnExpanded(false);
    }
    // If savedEmissary is null, keep default (false)

    // Initialize station from preferences (fixes persistence issue)
  }, [getPreference]);
  const computeStationCategoryValue = useCallback((stationValue: Station | null): string => {
    if (!stationValue) {
      return 'none:';
    }
    const area = getAreaForStation(stationValue);
    return `${stationValue}:${area || 'ADMIN'}`;
  }, []);

  const initializeFromTask = useCallback((existingTask: Task) => {
    setName(existingTask.name);
    setDescription(existingTask.description || '');
    setStatus(existingTask.status);
    setPriority(existingTask.priority);
    setType(existingTask.type);
    setStation(existingTask.station);
    setStationCategory(computeStationCategoryValue(existingTask.station));
    setProgress(existingTask.progress);
    setDueDate(existingTask.dueDate ? new Date(existingTask.dueDate) : undefined);

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

    setFrequencyConfig(existingTask.frequencyConfig || undefined);
    setCost(existingTask.cost);
    setCostString(existingTask.cost.toString());
    setRevenue(existingTask.revenue);
    setRevenueString(existingTask.revenue.toString());
    setIsNotPaid(existingTask.isNotPaid || false);
    setIsNotCharged(existingTask.isNotCharged || false);
    setIsRecurrentGroup(existingTask.isRecurrentGroup || false);
    setIsTemplate(existingTask.isTemplate || false);
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
    setOutputQuantityString((existingTask.outputQuantity || 1).toString());
    setOutputUnitCost(existingTask.outputUnitCost || 0);
    setOutputUnitCostString((existingTask.outputUnitCost || 0).toString());
    setOutputItemName(existingTask.outputItemName || '');
    setOutputItemPrice(existingTask.outputItemPrice || 0);
    setOutputItemPriceString((existingTask.outputItemPrice || 0).toString());
    setIsNewItem(existingTask.isNewItem || false);
    setIsSold(existingTask.isSold || false);
    setOutputItemStatus(existingTask.outputItemStatus || ItemStatus.FOR_SALE);
    setSelectedItemId(existingTask.outputItemId || '');
    setCustomerCharacterId(existingTask.customerCharacterId || null);
    const isUsingExistingCustomer = Boolean(existingTask.customerCharacterId);
    setIsNewCustomer(!isUsingExistingCustomer);
    setNewCustomerName(existingTask.newCustomerName || '');
    setPlayerCharacterId(existingTask.playerCharacterId || PLAYER_ONE_ID);
    setRewards({
      points: {
        xp: existingTask.rewards?.points?.xp || 0,
        rp: existingTask.rewards?.points?.rp || 0,
        fp: existingTask.rewards?.points?.fp || 0,
        hp: existingTask.rewards?.points?.hp || 0,
      },
    });
    setRewardsStrings({
      points: {
        xp: (existingTask.rewards?.points?.xp || 0).toString(),
        rp: (existingTask.rewards?.points?.rp || 0).toString(),
        fp: (existingTask.rewards?.points?.fp || 0).toString(),
        hp: (existingTask.rewards?.points?.hp || 0).toString(),
      },
    });
    setParentId(existingTask.parentId || null);
  }, [computeStationCategoryValue]);

  const initializeForNewTask = useCallback(() => {
    setName('');
    setDescription('');
    setStatus(TaskStatus.CREATED);
    setPriority(TaskPriority.NORMAL);
    const defaultType = getLastUsedType();
    setType(defaultType);
    const lastStation = getLastUsedStation();
    setStation(lastStation);
    setStationCategory(computeStationCategoryValue(lastStation));
    setProgress(0);
    setDueDate(undefined);
    setScheduledStartDate(undefined);
    setScheduledStartTime('');
    setScheduledEndDate(undefined);
    setScheduledEndTime('');
    setFrequencyConfig(isRecurrentModal ? {
      type: RecurrentFrequency.ONCE,
      interval: 1,
      repeatMode: 'periodically',
    } : undefined);
    setCost(0);
    setCostString('0');
    setRevenue(0);
    setRevenueString('0');
    setIsNotPaid(false);
    setIsNotCharged(false);
    setIsRecurrentGroup(false);
    setIsTemplate(false);
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
    setIsNewCustomer(true);
    setNewCustomerName('');
    setPlayerCharacterId(null);
    setRewards({ points: { xp: 0, rp: 0, fp: 0, hp: 0 } });
    setRewardsStrings({ points: { xp: '0', rp: '0', fp: '0', hp: '0' } });
    setParentId(null);
  }, [computeStationCategoryValue, getLastUsedStation, getLastUsedType, isRecurrentModal]);

  useEffect(() => {
    if (!open) {
      hasInitializedRef.current = false;
      initializedTaskIdRef.current = null;
      return;
    }

    const currentTaskId = task?.id || null;
    const alreadyInitialized = hasInitializedRef.current && initializedTaskIdRef.current === currentTaskId;
    if (alreadyInitialized) {
      return;
    }

    if (task && task.id) {
      initializeFromTask(task);
    } else {
      initializeForNewTask();
    }

    hasInitializedRef.current = true;
    initializedTaskIdRef.current = currentTaskId;
  }, [open, task, initializeForNewTask, initializeFromTask]);

  // Load customer character name when customerCharacterId changes
  useEffect(() => {
    const loadCustomerCharacter = async () => {
      if (customerCharacterId) {
        try {
          const characters = await ClientAPI.getCharacters();
          const customer = characters.find(c => c.id === customerCharacterId);
          setCustomerCharacterName(customer?.name || 'Unknown');
        } catch (error) {
          console.error('Failed to load customer character:', error);
          setCustomerCharacterName('Unknown');
        }
      } else {
        setCustomerCharacterName('');
      }
    };
    loadCustomerCharacter();
  }, [customerCharacterId]);

  // Handle setting customer character
  const handleSetCustomer = (characterId: string | null) => {
    setCustomerCharacterId(characterId);
  };

  const getCharacterOptions = () => {
    return createCharacterOptions(characters);
  };

  // Helper function to build task from form state - eliminates duplication
  const buildTaskFromForm = (statusOverride?: TaskStatus): Task => {
    const finalPlayerCharacterId = playerCharacterId || PLAYER_ONE_ID;
    const finalStatus = statusOverride !== undefined ? statusOverride : status;

    let finalScheduledStart: Date | undefined = undefined;
    if (scheduledStartDate && scheduledStartTime) {
      const [hours, minutes] = scheduledStartTime.split(':').map(Number);
      finalScheduledStart = new Date(scheduledStartDate);
      finalScheduledStart.setHours(hours, minutes);
    }

    let finalScheduledEnd: Date | undefined = undefined;
    if (scheduledEndDate && scheduledEndTime) {
      const [hours, minutes] = scheduledEndTime.split(':').map(Number);
      finalScheduledEnd = new Date(scheduledEndDate);
      finalScheduledEnd.setHours(hours, minutes);
    }

    return {
      id: task?.id || uuid(),
      name,
      description,
      status: finalStatus,
      priority,
      type,
      station,
      progress,
      dueDate,
      scheduledStart: finalScheduledStart,
      scheduledEnd: finalScheduledEnd,
      frequencyConfig: (type === TaskType.RECURRENT_GROUP || type === TaskType.RECURRENT_TEMPLATE) ? frequencyConfig : undefined,
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
      outputItemName: outputItemName || undefined,
      outputItemPrice,
      isNewItem,
      isSold,
      outputItemStatus,
      customerCharacterId: isNewCustomer ? null : customerCharacterId,  // Ambassador: Existing customer
      newCustomerName: isNewCustomer ? newCustomerName : undefined,  // EMISSARY: Name for new customer character creation
      playerCharacterId: finalPlayerCharacterId,  // AMBASSADOR: Player character who owns this task
      rewards: {
        points: {
          xp: rewards.points.xp,
          rp: rewards.points.rp,
          fp: rewards.points.fp,
          hp: rewards.points.hp,
        },
      },
      createdAt: task?.createdAt || new Date(),
      updatedAt: new Date(),
      isCollected: status === TaskStatus.COLLECTED || isCollected,
      order: task?.order || Date.now(),
      parentId,
      isRecurrentGroup,
      isTemplate,
      outputItemId: isNewItem ? null : (selectedItemId || task?.outputItemId || null),
      links: task?.links || [],  // Initialize links for Rosetta Stone
    };
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);

    // Validation for Recurrent Template
    if (type === TaskType.RECURRENT_TEMPLATE) {
      const freq = frequencyConfig;

      // Allow ONCE frequency without any restrictions (it's just one instance, no infinite loop risk)
      if (freq?.type === RecurrentFrequency.ONCE) {
        // ONCE is always allowed - no validation needed
      } else {
        // For other frequencies, check if there's a stop condition
        const hasStopCondition = freq?.stopsAfter &&
          (freq.stopsAfter.type === 'times' || freq.stopsAfter.type === 'date');

        // Only require dueDate if there's no stop condition (infinite loop risk)
        if (!hasStopCondition && !dueDate) {
          setValidationMessage('Recurrent Templates require a Due Date to set the safety limit for instance creation when "Stops After" is set to "Never".');
          setShowValidationModal(true);
          setIsSaving(false);
          return;
        }

        // Validate frequency is set (but ONCE is already handled above)
        const isUnsetFrequency = !freq ||
          (freq.type === RecurrentFrequency.CUSTOM && (!freq.customDays || freq.customDays.length === 0));
        if (isUnsetFrequency) {
          setValidationMessage('Please select a Frequency for this template (e.g., Once, Daily, Weekly, Monthly, or fill Custom days).');
          setShowValidationModal(true);
          setIsSaving(false);
          return;
        }
      }
    }


    // Build task entity from form data
    const newTask = buildTaskFromForm();

    // Check for cascade status change for Recurrent Templates
    if (type === TaskType.RECURRENT_TEMPLATE && task && task.status !== status) {
      try {
        const affectedCount = await ClientAPI.getUndoneInstancesCount(task.id, status);

        if (affectedCount > 0) {
          const isReversal = task.status === 'Done' && status !== 'Done';

          setCascadeData({
            newStatus: status,
            oldStatus: task.status,
            affectedCount,
            isReversal
          });
          setShowCascadeModal(true);
          setIsSaving(false);
          return;
        }
      } catch (error) {
        console.error('Failed to check cascade status:', error);
        // Continue with save if cascade check fails
      }
    }

    // Save user preferences
    setPreference('task-modal-last-station', newTask.station as any);

    try {
      // Emit pure task entity - Links System handles all relationships automatically
      await onSave(newTask);

      // Dispatch UI update events AFTER successful save
      dispatchEntityUpdated(entityTypeToKind(EntityType.TASK));

      onOpenChange(false);
    } catch (error) {
      console.error('Save failed:', error);
      // Keep modal open on error
    } finally {
      setIsSaving(false);
    }
  };

  // Cascade confirmation handlers
  const handleCascadeConfirm = async () => {
    if (!cascadeData || !task) return;

    try {
      // Build task with status override - workflow will handle cascading automatically
      const newTask = buildTaskFromForm(cascadeData.newStatus);

      // Workflow will automatically cascade the status change
      await onSave(newTask);
      dispatchEntityUpdated('task');
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
    // Save the template without cascading (use _skipCascade metadata)
    setShowCascadeModal(false);

    if (!cascadeData || !task) {
      setCascadeData(null);
      handleSave();
      return;
    }

    try {
      // Build task with status override and skip cascade flag
      const newTask = {
        ...buildTaskFromForm(cascadeData.newStatus),
        _skipCascade: true, // Tell workflow to skip cascading
      } as Task & { _skipCascade?: boolean };

      await onSave(newTask as Task);
      dispatchEntityUpdated('task');
      onOpenChange(false);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setCascadeData(null);
      setIsSaving(false);
    }
  };

  const handleStationChange = (newStation: Station) => {
    setStation(newStation);
    setPreference('task-modal-last-station', newStation);
  };

  // Helper function to get the correct value format for SearchableSelect
  const getStationValue = (station: Station): string => {
    const area = getAreaForStation(station);
    return `${station}:${area}`;
  };

  const handleStationCategoryChange = (newStationCategory: string) => {
    const newStation = getStationFromCombined(newStationCategory) as Station;

    setStationCategory(newStationCategory);
    setStation(newStation);
    setPreference('task-modal-last-station', newStation);
  };

  const handleTypeChange = (newType: string) => {
    const casted = newType as TaskType;
    setType(casted);
    const key = isRecurrentModal ? 'task-modal-last-recurrent-type' : 'task-modal-last-type';
    setPreference(key, casted);
  };

  const handleItemTypeChange = (newItemType: ItemType | '') => {
    setOutputItemType(newItemType);
  };

  const handleOutputItemTypeSubTypeChange = (newItemTypeSubType: string) => {
    if (newItemTypeSubType === 'none:') {
      setOutputItemTypeSubType('none:');
      setOutputItemType('');
      setOutputItemSubType('');
    } else {
      const newItemType = getItemTypeFromCombined(newItemTypeSubType) as ItemType;
      const newSubType = getSubTypeFromCombined(newItemTypeSubType) as SubItemType;

      setOutputItemTypeSubType(newItemTypeSubType);
      setOutputItemType(newItemType);
      setOutputItemSubType(newSubType || '');
    }
  };

  const handleNewItemChange = (checked: boolean) => {
    setIsNewItem(checked);
    if (checked) {
      setSelectedItemId('');
      setOutputItemName('');
    } else {
      setOutputItemName('');
    }
  };

  // Handle item selection from SearchableSelect
  const handleItemSelect = (itemId: string) => {
    setSelectedItemId(itemId);
    if (itemId) {
      const selectedItem = items.find(item => item.id === itemId);
      if (selectedItem) {
        setIsNewItem(false);
        setOutputItemName(selectedItem.name);
        setOutputItemType(selectedItem.type);
        setOutputItemSubType(''); // Items don't have subType property
        setOutputUnitCost(selectedItem.unitCost);
        setOutputItemPrice(selectedItem.price);
      }
    } else {
      setOutputItemName('');
    }
  };

  // Helper function to format number with smart decimal display
  const formatSmartDecimal = (num: number): string => {
    const rounded = Math.round(num * 10) / 10; // Round to 1 decimal place
    return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1);
  };

  // Auto-calculate unit cost and price from total cost/revenue and quantity
  const handleAutoCalculateUnitCost = () => {
    if (outputQuantity > 0) {
      // Calculate unit cost if cost is available
      if (cost > 0) {
        const calculatedUnitCost = cost / outputQuantity;
        setOutputUnitCost(calculatedUnitCost);
        setOutputUnitCostString(formatSmartDecimal(calculatedUnitCost));
      }

      // Calculate price if revenue is available (check both revenue state and revenueString)
      const currentRevenue = revenue || parseFloat(revenueString) || 0;
      if (currentRevenue > 0) {
        const calculatedPrice = currentRevenue / outputQuantity;
        setOutputItemPrice(calculatedPrice);
        setOutputItemPriceString(formatSmartDecimal(calculatedPrice));
      }
    }
  };

  // Handle checkbox changes and log financial effects when unchecked
  const handleNotPaidChange = async (checked: boolean) => {
    setIsNotPaid(checked);

    // If checking (marking as not paid) and task is COLLECTED, change to DONE
    if (checked && status === TaskStatus.COLLECTED) {
      setStatus(TaskStatus.DONE);
    }

    // NOTE: Financial logging will be handled when user saves the modal
    // Removed inline financial logging to follow clean pattern
  };

  const handleNotChargedChange = async (checked: boolean) => {
    setIsNotCharged(checked);

    // If checking (marking as not charged) and task is COLLECTED, change to DONE
    if (checked && status === TaskStatus.COLLECTED) {
      setStatus(TaskStatus.DONE);
    }

    // NOTE: Financial logging will be handled when user saves the modal
    // Removed inline financial logging to follow clean pattern
  };


  // NOTE: Financial logging removed from modal
  // Now handled by completion workflow to follow clean pattern
  const logFinancialEffectForTask = async (task: Task, type: 'cost' | 'revenue') => {
    // Function stub - financial logging now handled by completion workflow
    return;
  };

  const handleDescriptionInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 160)}px`;
  };

  // Number field handlers for zero deletion/replacement
  const handleNumberFieldChange = (value: string, setString: (value: string) => void, setNumber: (value: number) => void, min: number = 0) => {
    setString(value);
    // Only update number if it's a valid number
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= min) {
      setNumber(numValue);
    }
  };

  const handleNumberFieldBlur = (value: string, setString: (value: string) => void, setNumber: (value: number) => void, min: number = 0) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < min) {
      // Reset to minimum value if invalid
      setString(min.toString());
      setNumber(min);
    } else {
      // Ensure string matches the valid number
      setString(numValue.toString());
      setNumber(numValue);
    }
  };

  // Specialized handlers for rewards
  const handleRewardChange = (field: 'xp' | 'rp' | 'fp' | 'hp', value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setRewards({
        ...rewards,
        points: { ...rewards.points, [field]: numValue }
      });
      setRewardsStrings({
        ...rewardsStrings,
        points: { ...rewardsStrings.points, [field]: value }
      });
    } else {
      // Update string only, don't update number until blur
      setRewardsStrings({
        ...rewardsStrings,
        points: { ...rewardsStrings.points, [field]: value }
      });
    }
  };

  const handleRewardBlur = (field: 'xp' | 'rp' | 'fp' | 'hp', value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) {
      // Reset to 0 if invalid
      setRewards({
        ...rewards,
        points: { ...rewards.points, [field]: 0 }
      });
      setRewardsStrings({
        ...rewardsStrings,
        points: { ...rewardsStrings.points, [field]: '0' }
      });
    } else {
      // Ensure string matches the valid number
      setRewardsStrings({
        ...rewardsStrings,
        points: { ...rewardsStrings.points, [field]: numValue.toString() }
      });
    }
  };

  return (
    <React.Fragment>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent zIndexLayer={'MODALS'} className="w-full max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{task ? 'Edit Task' : (isRecurrentModal ? 'Create New Recurrent Task' : 'Create New Task')}</DialogTitle>
            <DialogDescription>
              {task ? 'Modify the task details below' : (isRecurrentModal ? 'Set up a new recurring task pattern' : 'Fill in the task information to create a new task')}
            </DialogDescription>
          </DialogHeader>

          {/* Content */}
          <div className="px-6">
            <div className="flex gap-4">
              {/* Main columns container */}
              <div className={`flex-1 grid gap-4 ${emissaryColumnExpanded ? 'grid-cols-4' : 'grid-cols-3'}`}>
                {/* Column 1: NATIVE (Basic Info) */}
                <div className="space-y-3">
                  {/* <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">🧬 NATIVE</h3>*/}
                  <div className="space-y-2">
                    <Label htmlFor="task-name" className="text-xs">Name *</Label>
                    <Input
                      id="task-name"
                      value={name}
                      onChange={(e) => setName(e.currentTarget.value)}
                      placeholder="Enter task name..."
                      className="h-8 text-sm"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="task-description" className="text-xs">Description</Label>
                    <Textarea
                      id="task-description"
                      placeholder="Describe the task objectives..."
                      value={description}
                      onChange={(e) => setDescription(e.currentTarget.value)}
                      className="h-16 text-sm resize-none"
                      onInput={handleDescriptionInput}
                    />
                  </div>

                  {/* Schedule Section - Compact */}
                  <div className="space-y-2">
                    <Label className="text-xs">Schedule</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Start</Label>
                        <div className="flex gap-1">
                          <DatePicker
                            value={scheduledStartDate}
                            onChange={setScheduledStartDate}
                            placeholder="Date"
                            className="h-8 text-sm"
                          />
                          <Input
                            type="time"
                            value={scheduledStartTime}
                            onChange={(e) => setScheduledStartTime(e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">End</Label>
                        <div className="flex gap-1">
                          <DatePicker
                            value={scheduledEndDate}
                            onChange={(date) => {
                              setScheduledEndDate(date);
                              setDueDate(date);
                            }}
                            placeholder="Date"
                            className="h-8 text-sm"
                          />
                          <Input
                            type="time"
                            value={scheduledEndTime}
                            onChange={(e) => setScheduledEndTime(e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="task-priority" className="text-xs">Priority</Label>
                    <Select value={String(priority)} onValueChange={(val) => setPriority(val as TaskPriority)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(TaskPriority).map((taskPriority) => (
                          <SelectItem key={taskPriority} value={String(taskPriority)}>
                            {String(taskPriority)}
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
                      min="0"
                      max={PROGRESS_MAX}
                      step={PROGRESS_STEP}
                      value={progress}
                      onChange={(e) => {
                        const newProgress = Number(e.currentTarget.value);
                        setProgress(newProgress);

                        // Progress-to-status mechanic
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

              {/* Column 2: NATIVE (Structure) */}
              <div className="space-y-3">
                {/* <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">🧬 NATIVE</h3>*/}

                <div className="space-y-2">
                  <Label htmlFor="task-station-category" className="text-xs">Station</Label>
                  <SearchableSelect
                    value={getStationValue(station)}
                    onValueChange={handleStationCategoryChange}
                    options={createStationCategoryOptions()}
                    autoGroupByCategory={true}
                    getCategoryForValue={(value) => getCategoryFromCombined(value)}
                    placeholder="Select station..."
                    className="h-8 text-sm"
                    persistentCollapsible={true}
                    instanceId="task-modal-station-category"
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
                          if (isRecurrentModal) {
                            return taskType === TaskType.RECURRENT_GROUP ||
                              taskType === TaskType.RECURRENT_TEMPLATE ||
                              taskType === TaskType.RECURRENT_INSTANCE;
                          } else {
                            return taskType === TaskType.MISSION ||
                              taskType === TaskType.MILESTONE ||
                              taskType === TaskType.GOAL ||
                              taskType === TaskType.ASSIGNMENT;
                          }
                        })
                        .map((taskType) => (
                          <SelectItem key={taskType} value={String(taskType)}>
                            {String(taskType)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parent-task" className="text-xs">Parent</Label>
                  {dataLoaded ? (
                    <SearchableSelect
                      value={parentId || ''}
                      onValueChange={(val) => setParentId(val || null)}
                      placeholder="No Parent"
                      options={createTaskParentOptions(tasks, task?.id, isRecurrentModal, type)}
                      autoGroupByCategory={true}
                      className="h-8 text-sm"
                      persistentCollapsible={true}
                      instanceId="task-modal-parent-task"
                    />
                  ) : (
                    <div className="h-8 text-sm text-muted-foreground flex items-center px-3 py-2 border rounded-md">
                      Loading tasks...
                    </div>
                  )}
                </div>

                {(type === TaskType.RECURRENT_GROUP || type === TaskType.RECURRENT_TEMPLATE) && (
                  <div className="space-y-2">
                    <Label htmlFor="task-frequency" className="text-xs">Frequency</Label>
                    <FrequencyCalendar
                      value={frequencyConfig}
                      onChange={setFrequencyConfig}
                      allowAlways={type === TaskType.RECURRENT_GROUP}
                    />
                  </div>
                )}
              </div>

              {/* Column 3: AMBASSADORS */}
              <div className="space-y-3">
                {/* <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">🏛️ AMBASSADORS</h3>*/}
                <div className="space-y-2">
                  <Label htmlFor="site" className="text-xs">Site</Label>
                  <SearchableSelect
                    value={formData.site}
                    onValueChange={(v) => setFormData({ ...formData, site: v })}
                    placeholder="Select site..."
                    options={createSiteOptionsWithCategories(sites)}
                    autoGroupByCategory={true}
                    className="h-8 text-sm"
                    persistentCollapsible={true}
                    instanceId="task-modal-site"
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
                    {isNotPaid ? "⚠ Not Paid" : "✓ Paid"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleNotChargedChange(!isNotCharged)}
                    className={`h-8 text-xs ${isNotCharged ? 'border-orange-500 text-orange-600 hover:bg-orange-50' : ''}`}
                  >
                    {isNotCharged ? "⚠ Not Charged" : "✓ Charged"}
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
                          onChange={(value) => setRewards({
                            ...rewards,
                            points: {
                              ...rewards.points,
                              [pointType.key.toLowerCase()]: value
                            }
                          })}
                          min={0}
                          step={1}
                          className="h-8 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Column 4: EMISSARIES (Collapsible) */}
              {emissaryColumnExpanded && (
                <div className="space-y-3">
                  {/* <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">📡 EMISSARIES</h3>*/}

                  {/* Customer Character - Emissary field for service tasks */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="customer-character" className="text-xs">Customer</Label>
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
                                disabled={true}
                              >
                                <User className="h-3 w-3 mr-2" />
                                {customerCharacterId ? customerCharacterName : 'Customer from Sale'}
                              </Button>
                            ) : isNewCustomer ? (
                              <Input
                                id="customer-character"
                                value={newCustomerName}
                                onChange={(e) => setNewCustomerName(e.target.value)}
                                placeholder="New customer name"
                                className="h-8 text-sm"
                              />
                            ) : (
                              <SearchableSelect
                                value={customerCharacterId || ''}
                                onValueChange={(value) => setCustomerCharacterId(value || null)}
                                options={getCharacterOptions()}
                                placeholder="Select customer"
                                autoGroupByCategory={true}
                                className="h-8 text-sm"
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
                        ...createItemTypeSubTypeOptions()
                      ]}
                      className="h-8 text-sm"
                      autoGroupByCategory={true}
                      getCategoryForValue={(value) => {
                        if (value === 'none:') return 'None';
                        return getItemTypeFromCombined(value);
                      }}
                    />
                  </div>

                  {!!outputItemType && (
                    <>
                      {/* Row 1: Quantity, Unit Cost, Price, Auto */}
                      <div className="grid grid-cols-4 gap-2">
                        <div className="space-y-2">
                          <Label htmlFor="output-quantity" className="text-xs">Quantity</Label>
                          <NumericInput
                            id="output-quantity"
                            value={outputQuantity}
                            onChange={setOutputQuantity}
                            min={1}
                            step={1}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="output-unit-cost" className="text-xs">U Cost $</Label>
                          <NumericInput
                            id="output-unit-cost"
                            value={outputUnitCost}
                            onChange={setOutputUnitCost}
                            min={0}
                            step={PRICE_STEP}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="output-item-price" className="text-xs">Price $</Label>
                          <NumericInput
                            id="output-item-price"
                            value={outputItemPrice}
                            onChange={setOutputItemPrice}
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
                            className="h-8 px-4 text-xs"
                            title="Auto-calculate Unit Cost from Cost/Quantity and Price from Revenue/Quantity"
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
                          options={createSiteOptionsWithCategories(sites)}
                          autoGroupByCategory={true}
                          className="h-8 text-sm"
                          persistentCollapsible={true}
                          instanceId="task-modal-target-site"
                        />
                        <Select
                          value={outputItemStatus}
                          onValueChange={(value) => setOutputItemStatus(value as ItemStatus)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(ItemStatus).map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <ItemNameField
                          value={outputItemName}
                          onChange={setOutputItemName}
                          placeholder="Item name"
                          items={items}
                          selectedItemId={selectedItemId}
                          onItemSelect={handleItemSelect}
                          isNewItem={isNewItem}
                          onNewItemToggle={setIsNewItem}
                          label="Item Name"
                          sites={sites}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>


          <DialogFooter className="flex items-center justify-between pt-4 border-t px-6 pb-6">
            <div className="flex items-center gap-4">
              {task && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteModal(true)}
                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Delete
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowRelationshipsModal(true)}
                    className="h-8 text-xs"
                  >
                    <Network className="w-3 h-3 mr-1" />
                    Links
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                onClick={() => setShowPlayerCharacterSelector(true)}
                className="h-8 text-xs"
              >
                <User className="w-3 h-3 mr-1" />
                Player
              </Button>
              <Button
                variant="outline"
                onClick={toggleEmissaryColumn}
                className={`h-8 text-xs ${emissaryColumnExpanded ? 'bg-transparent text-white' : 'bg-muted text-muted-foreground'}`}
              >
                Emissaries
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="task-status-footer" className="text-xs text-muted-foreground">Status:</Label>
              <Select value={String(status)} onValueChange={(val) => {
                const newStatus = val as TaskStatus;

                // Show confirmation for COLLECTED status
                if (newStatus === TaskStatus.COLLECTED && status !== TaskStatus.COLLECTED) {
                  const originalStatus = status;

                  setPendingStatusChange({
                    status: newStatus,
                    onConfirm: () => {
                      setStatus(newStatus);
                      setProgress(100);
                      setShowArchiveCollectionModal(false);
                      setPendingStatusChange(null);
                    },
                    onCancel: () => {
                      // Keep original status
                      setShowArchiveCollectionModal(false);
                      setPendingStatusChange(null);
                    }
                  });
                  setShowArchiveCollectionModal(true);
                  return;
                }

                setStatus(newStatus);

                // Status-to-progress mechanic
                if (newStatus === TaskStatus.CREATED || newStatus === TaskStatus.ON_HOLD) {
                  setProgress(0);
                } else if (newStatus === TaskStatus.IN_PROGRESS) {
                  setProgress(25);
                } else if (newStatus === TaskStatus.FINISHING) {
                  setProgress(75);
                } else if (newStatus === TaskStatus.DONE) {
                  setProgress(100);
                }
              }}>
                <SelectTrigger id="task-status-footer" className="h-8 w-36 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TaskStatus)
                    .filter((taskStatus) => {
                      if (taskStatus === TaskStatus.COLLECTED && (isNotPaid || isNotCharged)) {
                        return false;
                      }
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
              <Button variant="outline" onClick={() => onOpenChange(false)} className="h-8 text-xs" disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="h-8 text-xs" disabled={!name.trim() || isSaving}>
                {isSaving ? 'Saving...' : (task ? 'Update' : 'Create')} Task
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>

        <DeleteModal
          open={showDeleteModal}
          onOpenChange={setShowDeleteModal}
          entityType={EntityType.TASK}
          entities={task ? [task] : []}
          onComplete={() => {
            setShowDeleteModal(false);
            onOpenChange(false);
            onComplete?.();
          }}
        />

        {/* Validation Modal */}
        <Dialog open={showValidationModal} onOpenChange={setShowValidationModal}>
          <DialogContent zIndexLayer={'MODALS'}>
            <DialogHeader>
              <DialogTitle>Missing Required Information</DialogTitle>
              <DialogDescription>
                {validationMessage}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowValidationModal(false)}
                className="h-8 text-xs"
              >
                Okay
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Links Relationships Modal */}
        {
          task && (
            <LinksRelationshipsModal
              entity={{ type: EntityType.TASK, id: task.id, name: task.name }}
              open={showRelationshipsModal}
              onClose={() => setShowRelationshipsModal(false)}
            />
          )
        }

        {/* Character Selector Submodal */}
        <CharacterSelectorSubmodal
          open={showCharacterSelector}
          onOpenChange={setShowCharacterSelector}
          onSelect={handleSetCustomer}
          currentOwnerId={customerCharacterId}
        />

        {/* Player Character Selector Modal */}
        <PlayerCharacterSelectorModal
          open={showPlayerCharacterSelector}
          onOpenChange={setShowPlayerCharacterSelector}
          onSelect={setPlayerCharacterId}
          currentPlayerCharacterId={playerCharacterId}
        />

        {/* Cascade Status Confirmation Modal */}
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

        {/* Archive Collection Confirmation Modal */}
        {pendingStatusChange && (
          <ArchiveCollectionConfirmationModal
            open={showArchiveCollectionModal}
            onOpenChange={setShowArchiveCollectionModal}
            entityType="task"
            entityName={name}
            pointsValue={rewards?.points || { xp: 0, rp: 0, fp: 0, hp: 0 }}
            totalRevenue={revenue || 0}
            onConfirm={pendingStatusChange.onConfirm}
            onCancel={pendingStatusChange.onCancel}
          />
        )}

      </Dialog>
    </React.Fragment>
  );
}