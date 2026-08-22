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
import {
  ModalToggleTooltip,
  MODAL_TOGGLE_TOOLTIP_COPY,
} from '@/components/ui/modal-toggle-tooltip';
import { Task, Item, Site } from '@/types/entities';
import { getPointsMetadata } from '@/lib/utils/points-utils';
import { TaskType, TaskStatus, TaskPriority, ItemType, ItemStatus, EntityType, CharacterRole, RecurrentFrequency } from '@/types/enums';
import { getTaskFrequencyConfig, getTaskIsRecurrentGroup, getTaskIsTemplate, getTaskOwnerIds, getTaskProgress, getTaskScheduledEnd, getTaskScheduledStart } from '@/lib/compatibility/task-selectors';
import { getItemStatusLabel, getTaskStatusLabel } from '@/lib/constants/status-display-labels';
import { getTaskPriorityLabel, getTaskTypeLabel } from '@/lib/constants/task-taxonomy-labels';
import {
  getStationFromCombined,
  createTaskParentOptions,
  createStationCategoryOptions,
  getCategoryFromCombined,
  createItemTypeSubTypeOptions,
  getItemTypeFromCombined,
  getSubTypeFromCombined,
  createCharacterOptions,
} from '@/lib/utils/searchable-select-utils';
import { createSiteOptionsWithCategories } from '@/lib/utils/site-options-utils';
import { getSiteTypeLabel } from '@/lib/constants/site-taxonomy-labels';
import { getStationSelectValue } from '@/lib/utils/business-structure-utils';
import type { Station, SubItemType } from '@/types/type-aliases';
import { v4 as uuid } from 'uuid';
import { ORDER_INCREMENT, PROGRESS_MAX, PROGRESS_STEP, PRICE_STEP } from '@/lib/constants/app-constants';
import { computeNextSiblingOrder } from '@/lib/utils/task-order-utils';
import { Calendar as CalendarIcon, Repeat, Network, User } from 'lucide-react';
import { useUserPreferences } from '@/lib/hooks/use-user-preferences';
import { format } from 'date-fns';
import { extractMoneyValue, toMoney } from '@/lib/utils/financial-utils';
import { FrequencyConfig } from '@/components/ui/frequency-calendar';
// UTC STANDARDIZATION: Using new UTC utilities
import { validateFrequencyConfig } from '@/lib/utils/recurrent-validation';;
import { getUTCNow } from '@/lib/utils/utc-utils';
import { getLinkedCharacterSelection } from '@/lib/utils/entity-link-selectors';
import { formatForDisplay } from '@/lib/utils/date-display-utils';
import DeleteModal from './submodals/delete-submodal';
import LinksRelationshipsModal from './submodals/links-relationships-submodal';
import DatesSubmodal from './submodals/dates-submodal';
import ArchiveCollectionConfirmationModal from './submodals/archive-collection-confirmation-submodal';
import ConfirmationModal from './submodals/confirmation-submodal';
import CascadeStatusConfirmationModal from './submodals/cascade-status-confirmation-submodal';
import OwnerSelectorModal from './submodals/owner-selector-submodal';
import { useAuth } from '@/lib/hooks/use-auth';
import { TaskModalFooter } from './task-modal';
import { ClientAPI } from '@/lib/client-api';
import { dispatchEntityUpdated, entityTypeToKind } from '@/lib/ui/ui-events';
import { ensureCounterpartyRole } from '@/lib/utils/character-role-sync';
import { hasNonZeroTaskPoints, hasPositiveTaskPoints } from '@/lib/task-reward-validation';

const normalizeTaskCounterpartyRole = (role: unknown): CharacterRole =>
  typeof role === 'string' && role.trim().toLowerCase() === CharacterRole.BENEFICIARY
    ? CharacterRole.BENEFICIARY
    : CharacterRole.CUSTOMER;

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
  isLoading?: boolean;
}

/** Recurrent task types only; same ambassador/emissary fields as legacy unified task modal when editing recurrent tasks. */
export default function RecurrentTreeModalContent({
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
}: RecurrentTreeModalContentProps) {
  const { getPreference, setPreference } = useUserPreferences();
  const { user: authUser } = useAuth();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.CREATED);
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.NORMAL);
  const [type, setType] = useState<TaskType>(TaskType.RECURRENT_TEMPLATE);
  const [station, setStation] = useState<Station>('strategy' as Station);
  const [progress, setProgress] = useState(0);
  const [localDoneAt, setLocalDoneAt] = useState<Date | undefined>(undefined);
  const [localCollectedAt, setLocalCollectedAt] = useState<Date | undefined>(undefined);
  const [frequencyConfig, setFrequencyConfig] = useState<FrequencyConfig | undefined>(
    (task ? getTaskFrequencyConfig(task) : undefined) || {
      type: RecurrentFrequency.ONCE,
      interval: 1,
      repeatMode: 'periodically',
    }
  );
  const [recurrenceStart, setRecurrenceStart] = useState<Date | undefined>(undefined);
  const [recurrenceEnd, setRecurrenceEnd] = useState<Date | undefined>(undefined);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [scheduledStartDate, setScheduledStartDate] = useState<Date | undefined>(undefined);
  const [scheduledStartTime, setScheduledStartTime] = useState<string>('');
  const [scheduledEndDate, setScheduledEndDate] = useState<Date | undefined>(undefined);
  const [scheduledEndTime, setScheduledEndTime] = useState<string>('');
  const [cost, setCost] = useState(0);
  const [revenue, setRevenue] = useState(0);
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
  const [isNewCustomer, setIsNewCustomer] = useState(true);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [customerCharacterRole, setCustomerCharacterRole] = useState<CharacterRole>(CharacterRole.CUSTOMER);
  const [showScheduler, setShowScheduler] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [showFailedPointsModal, setShowFailedPointsModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDatesModal, setShowDatesModal] = useState(false);
  const [showRelationshipsModal, setShowRelationshipsModal] = useState(false);
  const [ownerId, setOwnerId] = useState<string | string[] | null>(null);
  const [showOwnerSelector, setShowOwnerSelector] = useState(false);

  useEffect(() => {
    if (!open || !authUser?.characterId) return;
    setOwnerId((current) => {
      const hasOwner = Array.isArray(current) ? current.length > 0 : Boolean(current);
      return hasOwner ? current : authUser.characterId!;
    });
  }, [open, authUser?.characterId]);
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

  const getLastUsedStation = useCallback((): Station => {
    const saved = getPreference('task-modal-last-station');
    return (saved as Station) || ('strategy' as Station);
  }, [getPreference]);

  const getLastUsedType = useCallback((): TaskType => {
    const saved = getPreference('task-modal-last-recurrent-type');
    return (saved as TaskType) || TaskType.RECURRENT_TEMPLATE;
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
          : (((getPreference('task-modal-last-station') as Station) || 'strategy') as Station);
      setStation(rawStation);
      setProgress(getTaskProgress(existingTask));
      // Convert UTC midnight dates back to local for display
      const execTask = existingTask as any;
      setDueDate(execTask.schedule?.dueDate ? new Date(execTask.schedule.dueDate) : execTask.dueDate ? new Date(execTask.dueDate) : undefined);
      setLocalDoneAt(execTask.doneAt ? new Date(execTask.doneAt) : undefined);
      setLocalCollectedAt(execTask.collectedAt ? new Date(execTask.collectedAt) : undefined);
      const existingStart = getTaskScheduledStart(existingTask);
      if (existingStart) {
        const start = new Date(existingStart);
        setScheduledStartDate(start);
        setScheduledStartTime(format(start, 'HH:mm'));
      } else {
        setScheduledStartDate(undefined);
        setScheduledStartTime('');
      }

      const existingEnd = getTaskScheduledEnd(existingTask);
      if (existingEnd) {
        const end = new Date(existingEnd);
        setScheduledEndDate(end);
        setScheduledEndTime(format(end, 'HH:mm'));
      } else {
        setScheduledEndDate(undefined);
        setScheduledEndTime('');
      }
      const fi = existingTask.context?.financialIntent;
      setCost(fi?.costIntent ? extractMoneyValue(fi.costIntent) : execTask.cost ?? 0);
      setRevenue(fi?.revenueIntent ? extractMoneyValue(fi.revenueIntent) : execTask.revenue ?? 0);
      setFormData({
        site: existingTask.siteId || 'none',
        targetSite: existingTask.targetSiteId || 'none',
      });
      const pp = existingTask.context?.productionPlan;
      const taskItemType = (pp?.outputItemType as ItemType) || (execTask.outputItemType as ItemType) || '';
      const taskSubType = pp?.outputItemSubType || execTask.outputItemSubType || '';
      setOutputItemType(taskItemType);
      setOutputItemSubType(taskSubType);
      setOutputItemTypeSubType(taskItemType ? `${taskItemType}:${taskSubType}` : 'none:');
      setOutputQuantity(pp?.outputQuantity || execTask.outputQuantity || 1);
      setOutputUnitCost(pp?.outputUnitCost ? extractMoneyValue(pp.outputUnitCost) : execTask.outputUnitCost || 0);
      setOutputItemName(pp?.outputItemName || execTask.outputItemName || '');
      setOutputItemPrice(pp?.outputItemPrice ? extractMoneyValue(pp.outputItemPrice) : execTask.outputItemPrice || 0);
      setIsNewItem(pp?.isNewItem ?? execTask.isNewItem ?? !Boolean(existingTask.outputItemId));
      setIsSold(pp?.isSold ?? execTask.isSold ?? false);
      setOutputItemStatus(
        pp?.outputItemStatus ||
        execTask.outputItemStatus ||
        (existingTask.status === TaskStatus.IN_PROGRESS || existingTask.status === TaskStatus.FINISHING
          ? ItemStatus.IN_PROGRESS
          : ItemStatus.FOR_SALE)
      );
      setSelectedItemId(existingTask.outputItemId || '');
      const existingTaskCounterpartyId =
        existingTask.context?.counterparty?.counterpartyId ??
        // Read-only migration fallback for tasks saved before TASK_CHARACTER
        // became the authority. The next save uses __counterparty and removes
        // these legacy root fields.
        (existingTask as any).counterpartyCharacterId ??
        execTask.characterId ??
        null;
      const existingTaskCounterpartyRole =
        existingTask.context?.counterparty?.role ??
        (existingTask as any).counterpartyRole ??
        execTask.customerCharacterRole;
      setCustomerCharacterId(existingTaskCounterpartyId);
      setIsNewCustomer(!Boolean(existingTaskCounterpartyId));
      setNewCustomerName(execTask.newCustomerName || '');
      setCustomerCharacterRole(normalizeTaskCounterpartyRole(existingTaskCounterpartyRole));
      setOwnerId(getTaskOwnerIds(existingTask)[0] || null);
      setRewards({
        points: {
          xp: existingTask.context?.rewardIntent?.points?.xp || 0,
          rp: existingTask.context?.rewardIntent?.points?.rp || 0,
          fp: existingTask.context?.rewardIntent?.points?.fp || 0,
          hp: existingTask.context?.rewardIntent?.points?.hp || 0,
        },
      });
      setFrequencyConfig(
        getTaskFrequencyConfig(existingTask) || {
          type: RecurrentFrequency.ONCE,
          interval: 1,
          repeatMode: 'periodically',
        }
      );
      const rec = existingTask.context?.recurrence;
      setRecurrenceStart(rec?.recurrenceStart ? new Date(rec.recurrenceStart) : execTask.recurrenceStart ? new Date(execTask.recurrenceStart) : undefined);
      setRecurrenceEnd(rec?.recurrenceEnd ? new Date(rec.recurrenceEnd) : execTask.recurrenceEnd ? new Date(execTask.recurrenceEnd) : undefined);
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
    setIsNewCustomer(true);
    setNewCustomerName('');
    setCustomerCharacterRole(CharacterRole.CUSTOMER);
    setOwnerId(null);
    setRewards({ points: { xp: 0, rp: 0, fp: 0, hp: 0 } });
    setFrequencyConfig({
      type: RecurrentFrequency.ONCE,
      interval: 1,
      repeatMode: 'periodically',
    });
    setRecurrenceStart(undefined);
    setRecurrenceEnd(undefined);
    setParentId(null);
  }, [getLastUsedStation, getLastUsedType]);

  useEffect(() => {
    if (status === TaskStatus.NONE) {
      setOwnerId(null);
    }
  }, [status]);

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
    if (!open || !task?.id) return;
    let cancelled = false;
    void ClientAPI.getLinksFor({ type: EntityType.TASK, id: task.id }).then((links) => {
      if (cancelled) return;
      const ownerId = links
        .filter((link: any) => link.linkType === 'TASK_CHARACTER' && link.relationship === 'owner' && link.target?.type === 'character')
        .map((link: any) => link.target.id)[0];
      if (ownerId) setOwnerId(ownerId);
      const counterparty = getLinkedCharacterSelection(links, 'TASK_CHARACTER');
      if (counterparty) {
        setCustomerCharacterId(counterparty.id);
        setCustomerCharacterRole(normalizeTaskCounterpartyRole(counterparty.role));
        setIsNewCustomer(false);
        setNewCustomerName('');
      }
      const siteLinks = links.filter((link: any) => link.linkType === 'TASK_SITE' && link.target?.type === 'site');
      const siteId = siteLinks.find((l: any) => l.relationship === 'performed-at')?.target.id;
      const targetSiteId = siteLinks.find((l: any) => l.relationship === 'target')?.target.id;
      if (siteId || targetSiteId) {
        setFormData(prev => ({
          ...prev,
          ...(siteId ? { site: siteId } : {}),
          ...(targetSiteId ? { targetSite: targetSiteId } : {})
        }));
      }
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [open, task?.id, task?.updatedAt]);

  useEffect(() => {
    if (customerCharacterId) {
      const c = allCharacters.find((x) => x.id === customerCharacterId);
      setCustomerCharacterName(c?.name || '');
    } else {
      setCustomerCharacterName('');
    }
  }, [customerCharacterId, allCharacters]);

  // Helper function to build task from form state
  const buildTaskFromForm = (statusOverride?: TaskStatus, pointsOverride = rewards.points) => {
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

    const determineFinalStatus = () => {
      if (status === TaskStatus.FAILED) return TaskStatus.FAILED;
      if (status === TaskStatus.COLLECTED) return TaskStatus.COLLECTED;
      if (editingExisting && task?.status === TaskStatus.DONE && progress === 100) return TaskStatus.DONE;
      if (progress === 100) return TaskStatus.DONE;
      return status;
    };

    const finalStatus = statusOverride !== undefined ? statusOverride : determineFinalStatus();
    const hasCounterparty = Boolean((!isNewCustomer && customerCharacterId) || (isNewCustomer && newCustomerName.trim()));
    const hasProductionIntent = Boolean(outputItemType || outputItemName.trim() || selectedItemId);
    const hasRewards = hasNonZeroTaskPoints(pointsOverride);
    const effectiveOwnerIds = Array.isArray(ownerId)
      ? ownerId
      : (ownerId ? [ownerId] : (authUser?.characterId ? [authUser.characterId] : []));

    return {
      id: draftId.current,
      name: name.trim(),
      description: description.trim(),
      status: finalStatus,
      priority,
      type,
      station,
      progress,
      doneAt:
        finalStatus === TaskStatus.DONE || finalStatus === TaskStatus.FAILED || finalStatus === TaskStatus.COLLECTED
          ? localDoneAt
          : undefined,
      collectedAt: finalStatus === TaskStatus.COLLECTED ? localCollectedAt : undefined,
      schedule: dueDate || finalScheduledStart || finalScheduledEnd
        ? {
            ...(dueDate ? { dueDate: dueDate.toISOString() } : {}),
            ...(finalScheduledStart ? { scheduledStart: finalScheduledStart.toISOString() } : {}),
            ...(finalScheduledEnd ? { scheduledEnd: finalScheduledEnd.toISOString() } : {}),
          }
        : undefined,
      siteId: formData.site && formData.site !== 'none' ? formData.site : null,
      targetSiteId: formData.targetSite && formData.targetSite !== 'none' ? formData.targetSite : null,
      parentId,
      context: {
        ...(task as any)?.context,
        recurrence: {
          ...(task as any)?.context?.recurrence,
          isRecurrentGroup: type === TaskType.RECURRENT_GROUP,
          isTemplate: type === TaskType.RECURRENT_TEMPLATE,
          frequencyConfig: (
            type === TaskType.RECURRENT_GROUP ||
            type === TaskType.RECURRENT_TEMPLATE
          ) ? frequencyConfig : undefined,
          recurrenceStart: recurrenceStart?.toISOString(),
          recurrenceEnd: recurrenceEnd?.toISOString(),
        },
        ...(isNewCustomer && newCustomerName.trim() ? { newCustomerName: newCustomerName.trim() } : {}),
        financialIntent: cost || revenue
          ? { costIntent: toMoney(cost), revenueIntent: toMoney(revenue) }
          : undefined,
        rewardIntent: hasRewards
          ? {
              points: pointsOverride,
            }
          : undefined,
        productionPlan: hasProductionIntent
          ? {
              ...(task as any)?.context?.productionPlan,
              outputItemType: outputItemType || undefined,
              outputItemSubType: outputItemSubType || undefined,
              outputQuantity,
              outputUnitCost: toMoney(outputUnitCost),
              outputItemName: outputItemName.trim() || undefined,
              outputItemPrice: toMoney(outputItemPrice),
              isNewItem,
              isSold,
              outputItemStatus,
            }
          : undefined,
      },
      // Relationship command only; TASK_CHARACTER is the persisted authority.
      __counterparty: hasCounterparty
        ? {
            id: !isNewCustomer && customerCharacterId ? customerCharacterId : null,
            role: customerCharacterRole,
          }
        : null,
      ownerIds: effectiveOwnerIds,
      order: determineOrder(),
      
      ...(!isNewItem && (selectedItemId || task?.outputItemId)
        ? { outputItemId: selectedItemId || task?.outputItemId }
        : {}),
      ...((task as any)?.sourceSaleId ? { sourceSaleId: (task as any).sourceSaleId } : {}),
      createdAt: task?.createdAt || getUTCNow(),
      updatedAt: getUTCNow(),
    } as unknown as Task;
  };

  const handleSave = async () => {
    if (isLoading || isSaving) return;

    if (!name.trim()) {
      setValidationMessage('Task name is required');
      setShowValidationModal(true);
      return;
    }
    const hasPointReward = hasPositiveTaskPoints(rewards.points);
    const hasOwner = (Array.isArray(ownerId) ? ownerId.length > 0 : Boolean(ownerId)) || Boolean(authUser?.characterId);
    if (hasPointReward && !hasOwner) {
      setValidationMessage('Assign an owner before adding point rewards');
      setShowValidationModal(true);
      return;
    }

    if (type === TaskType.RECURRENT_TEMPLATE) {
      const freq = frequencyConfig;
      if (freq?.type === RecurrentFrequency.ONCE) {
        // ok
      } else {
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
          const isReversal =
            task.status === TaskStatus.DONE &&
            status !== TaskStatus.DONE &&
            status !== TaskStatus.COLLECTED &&
            status !== TaskStatus.FAILED;
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

    const candidate = buildTaskFromForm();
    if (candidate.status === TaskStatus.FAILED && hasPositiveTaskPoints(candidate.context?.rewardIntent?.points)) {
      setShowFailedPointsModal(true);
      return;
    }
    setIsSaving(true);
    try {
      await onSave(candidate);
      await ensureCounterpartyRole((candidate as any).__counterparty?.id || null, (candidate as any).__counterparty?.role || null);
      dispatchEntityUpdated(entityTypeToKind(EntityType.TASK));
      onOpenChange(false);
    } catch (error) {
      console.error('[RecurrentTaskModal] Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveFailedWithZeroPoints = async () => {
    const zeroPoints = { xp: 0, rp: 0, fp: 0, hp: 0 };
    setShowFailedPointsModal(false);
    setRewards({ points: zeroPoints });
    setIsSaving(true);
    try {
      const newTask = buildTaskFromForm(undefined, zeroPoints);
      await onSave(newTask);
      await ensureCounterpartyRole((newTask as any).__counterparty?.id || null, (newTask as any).__counterparty?.role || null);
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
      await ensureCounterpartyRole((newTask as any).__counterparty?.id || null, (newTask as any).__counterparty?.role || null);
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
      await ensureCounterpartyRole((newTask as any).__counterparty?.id || null, (newTask as any).__counterparty?.role || null);
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

  const handleAutoCalculateUnitCost = () => {
    if (outputQuantity > 0) {
      const unitCost = Math.round((cost / outputQuantity) * 100) / 100;
      setOutputUnitCost(unitCost);
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

  const setCounterpartyRole = (role: CharacterRole) => {
    setCustomerCharacterRole(role);
  };

  const getCounterpartyCharacterOptions = () => {
    return createCharacterOptions(allCharacters);
  };

  const handleTypeChange = (newType: string) => {
    const casted = newType as TaskType;
    setType(casted);
    const key = 'task-modal-last-recurrent-type';
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

  const getOwnerName = () => {
    if (!ownerId) return 'Owner';
    const ids = Array.isArray(ownerId) ? ownerId : [ownerId as string];
    if (ids.length === 0) return 'Owner';
    const owners = allCharacters.filter(c => ids.includes(c.id));
    if (owners.length === 0) return 'Owner';
    if (owners.length === 1) return owners[0].name;
    return `${owners[0].name} +${owners.length - 1}`;
  };


  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        <div className="flex gap-4">
          <div className="flex-1 grid grid-cols-4 gap-4">
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
                        if (!dueDate && !scheduledStartDate) {
                          return frequencyConfig ? 'Recurring schedule' : 'Set Schedule';
                        }
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
                        {recurrenceStart || recurrenceEnd ? 'Bounded Recurrence' : 'Recurring'}
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
                          {getTaskPriorityLabel(p)}
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
                  value={getStationSelectValue(station)}
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
                          {getTaskTypeLabel(taskType)}
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
                    step={PRICE_STEP}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recurrent-task-revenue" className="text-xs">Revenue ($)</Label>
                  <div
                    className="relative"
                    title={
                      task?.sourceSaleId
                        ? 'Revenue is managed by the source Sale - cannot edit here'
                        : undefined
                    }
                  >
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
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Point Rewards</Label>
                <div className="grid grid-cols-4 gap-2">
                  {getPointsMetadata().map((pointType) => {
                    const k = pointType.key.toLowerCase() as 'xp' | 'rp' | 'fp' | 'hp';
                    return (
                      <div key={pointType.key}>
                        <Label htmlFor={`recurrent-reward-${k}`} className="text-xs">
                          {pointType.label}
                        </Label>
                        <NumericInput
                          id={`recurrent-reward-${k}`}
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

            <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="recurrent-customer-character" className="text-xs">Counterparty</Label>
                  {!task?.sourceSaleId && (
                    <div className="flex items-center justify-between">
                      <ModalToggleTooltip content={MODAL_TOGGLE_TOOLTIP_COPY.counterpartyRole}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCounterpartyRole(customerCharacterRole === CharacterRole.CUSTOMER ? CharacterRole.BENEFICIARY : CharacterRole.CUSTOMER)}
                          className="h-6 text-xs px-2"
                        >
                          {customerCharacterRole}
                        </Button>
                      </ModalToggleTooltip>
                      <ModalToggleTooltip content={MODAL_TOGGLE_TOOLTIP_COPY.newExistingCustomer}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsNewCustomer(!isNewCustomer)}
                          className="h-6 text-xs px-2"
                        >
                          {isNewCustomer ? 'New' : 'Existing'}
                        </Button>
                      </ModalToggleTooltip>
                    </div>
                  )}
                  <div>
                    {task?.sourceSaleId ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-xs justify-start"
                        disabled
                        title="Customer is managed by the source Sale - cannot edit here"
                      >
                        <User className="h-3 w-3 mr-2" />
                        {customerCharacterId ? customerCharacterName : `${customerCharacterRole} from Sale`}
                      </Button>
                    ) : isNewCustomer ? (
                      <Input
                        id="recurrent-customer-character"
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        placeholder={customerCharacterRole === CharacterRole.CUSTOMER ? 'New customer name' : 'New beneficiary name'}
                        className="h-8 text-sm"
                      />
                    ) : (
                      <SearchableSelect
                        value={customerCharacterId || ''}
                        onValueChange={(value) => setCustomerCharacterId(value || null)}
                        options={getCounterpartyCharacterOptions()}
                        placeholder={customerCharacterRole === CharacterRole.CUSTOMER ? 'Select customer' : 'Select beneficiary'}
                        autoGroupByCategory={true}
                        className="h-8 text-sm"
                        instanceId="recurrent-task-customer"
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recurrent-output-item-type-subtype" className="text-xs">Item Type & SubType</Label>
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
                    instanceId="recurrent-task-output-item-type"
                  />
                </div>

                {!!outputItemType && (
                  <>
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
                          step={PRICE_STEP}
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
                        instanceId="recurrent-task-form-target-site"
                      />
                      <Select value={String(outputItemStatus)} onValueChange={(val) => setOutputItemStatus(val as ItemStatus)}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(ItemStatus).map((s) => (
                            <SelectItem key={s} value={String(s)}>
                              {getItemStatusLabel(s)}
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
                          isNewItem={isNewItem}
                          onNewItemToggle={setIsNewItem}
                          selectedItemId={selectedItemId}
                          items={allItems}
                          onItemSelect={setSelectedItemId}
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
            onClick={() => setShowOwnerSelector(true)}
            className="h-8 text-xs"
            disabled={!task && type === TaskType.RECURRENT_INSTANCE}
          >
            <User className="w-3 h-3 mr-1" />
            {getOwnerName()}
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
                    },
                    onCancel: () => {
                    },
                  });
                  setShowArchiveCollectionModal(true);
                  return;
                }
                setStatus(newStatus);
                if (newStatus === TaskStatus.FAILED) {
                  setLocalCollectedAt(undefined);
                }
                if (
                  newStatus === TaskStatus.CREATED ||
                  newStatus === TaskStatus.ON_HOLD ||
                  newStatus === TaskStatus.IN_PROGRESS ||
                  newStatus === TaskStatus.FINISHING
                ) {
                  setLocalDoneAt(undefined);
                  setLocalCollectedAt(undefined);
                }
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
                    if (status === TaskStatus.FAILED && taskStatus === TaskStatus.COLLECTED) return false;
                    return true;
                  })
                  .map((taskStatus) => (
                    <SelectItem key={taskStatus} value={String(taskStatus)}>
                      {getTaskStatusLabel(taskStatus)}
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

      <OwnerSelectorModal
        open={showOwnerSelector}
        onOpenChange={setShowOwnerSelector}
        onMultiSelect={setOwnerId as any}
        multiSelect={true}
        currentOwnerIds={Array.isArray(ownerId) ? ownerId : (ownerId ? [ownerId as string] : [])}
      />

      <SmartSchedulerSubmodal
        open={showScheduler}
        onOpenChange={setShowScheduler}
        value={{
          dueDate,
          scheduledStart: scheduledStartDate,
          scheduledEnd: scheduledEndDate,
          recurrenceStart,
          recurrenceEnd,
          frequencyConfig:
            type === TaskType.RECURRENT_GROUP ||
            type === TaskType.RECURRENT_TEMPLATE ||
            type === TaskType.RECURRENT_INSTANCE
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
          setRecurrenceStart(val.recurrenceStart);
          setRecurrenceEnd(val.recurrenceEnd);
          if (
            type === TaskType.RECURRENT_GROUP ||
            type === TaskType.RECURRENT_TEMPLATE ||
            type === TaskType.RECURRENT_INSTANCE
          ) {
            setFrequencyConfig(val.frequencyConfig);
          }
        }}
        isRecurrent={
          type === TaskType.RECURRENT_GROUP ||
          type === TaskType.RECURRENT_TEMPLATE ||
          type === TaskType.RECURRENT_INSTANCE
        }
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
      <Dialog open={showFailedPointsModal} onOpenChange={setShowFailedPointsModal}>
        <DialogContent zIndexLayer="MODALS">
          <DialogHeader>
            <DialogTitle>Failed task points</DialogTitle>
            <DialogDescription>
              A failed task cannot award positive points. Set the points to zero, or close this message and enter a negative value as a penalty.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFailedPointsModal(false)}>Edit points</Button>
            <Button onClick={handleSaveFailedWithZeroPoints}>Set to zero and save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function getCategoryForSiteId(value: string, sites: Site[]): string {
  const site = sites.find((s) => s.id === value);
  if (!site) return 'None';
  const siteType = site.type || site.metadata?.type;
  return siteType ? getSiteTypeLabel(siteType) : 'Uncategorized';
}
