'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { DatePicker } from '@/components/ui/date-picker';
import NumericInput from '@/components/ui/numeric-input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sale, SaleLine, Item, Discount, Site, Character, Task, ItemSaleLine, BundleSaleLine, Business, Contract } from '@/types/entities';
import { getZIndexClass } from '@/lib/utils/z-index-utils';
import { SaleType, SaleStatus, PaymentMethod, Currency, ItemType, ItemStatus, TaskType, TaskPriority, Collection, STATION_CATEGORIES, CharacterRole, EntityType, PLAYER_ONE_ID } from '@/types/enums';
import { getSubTypesForItemType } from '@/lib/utils/item-utils';
import type { Station } from '@/types/type-aliases';
import { createSiteOptionsWithCategories } from '@/lib/utils/site-options-utils';
import { createCharacterOptions, createStationCategoryOptions, createTaskParentOptions, createItemTypeSubTypeOptions, getItemTypeFromCombined, createItemOptions, getCategoryFromCombined, getStationFromCombined } from '@/lib/utils/searchable-select-utils';
import { getAreaForStation, getSalesChannelFromSaleType } from '@/lib/utils/business-structure-utils';
import { ClientAPI } from '@/lib/client-api';
import { dispatchEntityUpdated, entityTypeToKind } from '@/lib/ui/ui-events';
import { useUserPreferences } from '@/lib/hooks/use-user-preferences';
import PlayerCharacterSelectorModal from './submodals/player-character-selector-submodal';
// Side effects handled by parent component via API calls
import { v4 as uuid } from 'uuid';
import { Plus, Trash2, Package, DollarSign, Network, ListPlus, Wallet, Gift, User, Store } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import DeleteModal from './submodals/delete-submodal';
import LinksRelationshipsModal from './submodals/links-relationships-submodal';
import SaleItemsSubModal, { SaleItemLine } from './submodals/sale-items-submodal';
import SalePaymentsSubModal, { SalePaymentLine } from './submodals/sale-payments-submodal';
import ItemEmissarySubModal, { ItemCreationData } from './submodals/item-emissary-submodal';
import PointsEmissarySubModal, { PointsData } from './submodals/points-emissary-submodal';
import ConfirmationModal from './submodals/confirmation-submodal';
import ArchiveCollectionConfirmationModal from './submodals/archive-collection-confirmation-submodal';
import BoothSalesView from './submodals/booth-sales-view';

interface SalesModalProps {
  sale?: Sale | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (sale: Sale) => Promise<void>;
  onDelete?: () => void; // Optional callback for when sale is deleted
}

export default function SalesModal({
  sale,
  open,
  onOpenChange,
  onSave,
  onDelete,
}: SalesModalProps) {
  const { getPreference, setPreference } = useUserPreferences();

  // Helper function to get the correct value format for SearchableSelect
  const getStationValue = (station: Station): string => {
    const area = getAreaForStation(station);
    return `${station}:${area}`;
  };

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saleDate, setSaleDate] = useState<Date>(new Date());
  const [type, setType] = useState<SaleType>(SaleType.DIRECT);
  const [status, setStatus] = useState<SaleStatus>(SaleStatus.CHARGED);
  const [siteId, setSiteId] = useState<string>('');
  const [counterpartyName, setCounterpartyName] = useState('');
  const [isNotPaid, setIsNotPaid] = useState(false); // Default: Paid = true (not not paid)
  const [isNotCharged, setIsNotCharged] = useState(false); // Default: Charged = true (not not charged)
  const [overallDiscount, setOverallDiscount] = useState<Discount>({});
  const [lines, setLines] = useState<SaleLine[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  // Diplomatic Fields State for PRODUCT/ONE
  const [customerId, setCustomerId] = useState<string | null>('');
  const [isNewCustomer, setIsNewCustomer] = useState(true);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [selectedItemQuantity, setSelectedItemQuantity] = useState<number>(1);
  const [selectedItemPrice, setSelectedItemPrice] = useState<number>(0);
  const [playerPoints, setPlayerPoints] = useState({ xp: 0, rp: 0, fp: 0, hp: 0 });
  const [cost, setCost] = useState<number>(0);
  const [revenue, setRevenue] = useState<number>(0);

  // Diplomatic Fields State for SERVICE/ONE
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [taskName, setTaskName] = useState<string>('');
  const [taskType, setTaskType] = useState<TaskType>(TaskType.ASSIGNMENT);
  const [taskParentId, setTaskParentId] = useState<string>('');

  // Note: Sales don't create items directly - they pass data to Tasks via mini-submodals
  const [emissaryColumnExpanded, setEmissaryColumnExpanded] = useState(false);

  // UI-only helpers
  const [whatKind, setWhatKind] = useState<'product' | 'service'>('product');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRelationshipsModal, setShowRelationshipsModal] = useState(false);
  const [playerCharacterId, setPlayerCharacterId] = useState<string | null>(null);
  const [showPlayerCharacterSelector, setShowPlayerCharacterSelector] = useState(false);
  const [isCollected, setIsCollected] = useState(false);
  const [showArchiveCollectionModal, setShowArchiveCollectionModal] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    status: SaleStatus;
    onConfirm: () => void;
    onCancel: () => void;
  } | null>(null);
  const [showItemsSubModal, setShowItemsSubModal] = useState(false);
  const [showPaymentsSubModal, setShowPaymentsSubModal] = useState(false);
  const [paymentsModalMode, setPaymentsModalMode] = useState<'payments' | 'other-methods'>('payments');
  const [selectedItems, setSelectedItems] = useState<SaleItemLine[]>([]);
  const [recordedPayments, setRecordedPayments] = useState<SalePaymentLine[]>([]);
  const [taskDueDate, setTaskDueDate] = useState<Date | undefined>(undefined);
  const [oneItemMultiple, setOneItemMultiple] = useState<'one' | 'multiple'>('one');
  const [taskStation, setTaskStation] = useState<Station>('SALES' as Station);
  const [salesChannel, setSalesChannel] = useState<Station | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [showClearLinesModal, setShowClearLinesModal] = useState(false);

  // Mini-submodal states for Task data
  const [showTaskItemSubModal, setShowTaskItemSubModal] = useState(false);
  const [showTaskPointsSubModal, setShowTaskPointsSubModal] = useState(false);
  const [taskItemData, setTaskItemData] = useState<ItemCreationData>({
    outputItemType: '',
    outputItemSubType: '',
    outputItemQuantity: 1,
    outputItemName: '',
    outputUnitCost: 0,
    outputItemCollection: '',
    outputItemPrice: 0,
    targetSite: '',
    outputItemStatus: ItemStatus.FOR_SALE,
    existingItemId: null,
    isNewItem: true,
  });
  const [taskPointsData, setTaskPointsData] = useState<PointsData>({
    points: { xp: 0, rp: 0, fp: 0, hp: 0 },
  });
  const [taskCost, setTaskCost] = useState<number>(0);
  const [taskRevenue, setTaskRevenue] = useState<number>(0);
  const [taskTargetSiteId, setTaskTargetSiteId] = useState<string>('');

  // UX state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [manualLines, setManualLines] = useState(false);

  // Guard for one-time initialization of new sales
  const didInitRef = useRef(false);

  const toggleAdvanced = () => {
    const newValue = !showAdvanced;
    setShowAdvanced(newValue);
    setPreference('sales-modal-advanced-expanded', String(newValue));
  };

  const toggleEmissary = () => {
    const newValue = !emissaryColumnExpanded;
    setEmissaryColumnExpanded(newValue);
    setPreference('sales-modal-emissary-expanded', String(newValue));
  };

  // Update Sale Status based on Charged Status (only IsNotCharged affects Sale Status)
  const updateSaleStatus = (isNotCharged: boolean) => {
    if (isNotCharged) {
      setStatus(SaleStatus.PENDING); // "PENDING" (Not Charged)
    } else {
      setStatus(SaleStatus.CHARGED); // "CHARGED" (Is Charged)
      // Magic: When charged, automatically set as paid too
      setIsNotPaid(false);
    }
  };

  // Quick Count rows (template-first capture)
  type QuickRow = { id: string; itemType: ItemType; quantity: number; unitPrice: number };
  const [quickRows, setQuickRows] = useState<QuickRow[]>([]);

  // UI state
  const [items, setItems] = useState<Item[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Load data on mount
  useEffect(() => {
    if (open) {
      loadItems();
      loadSites();
      loadCharacters();
      loadTasks();
      loadBusinesses();
      loadContracts();
    }
  }, [open]);

  useEffect(() => {
    setSelectedItems((prev) =>
      prev.map((item) => ({
        ...item,
        siteId: siteId || '',
      }))
    );
  }, [siteId]);

  // Initialize form when sale changes
  useEffect(() => {
    if (sale) {
      setName(sale.name);
      setDescription(sale.description || '');
      setSaleDate(new Date(sale.saleDate));
      setType(sale.type);
      setStatus(sale.status);
      setSiteId(sale.siteId);
      setCounterpartyName(sale.counterpartyName || '');
      setCustomerId(sale.customerId || '');
      setIsNewCustomer(!sale.customerId); // Toggle to "Existing" if customer exists
      setNewCustomerName(''); // Clear new customer name
      setIsNotPaid(sale.isNotPaid || false);
      setIsNotCharged(sale.isNotCharged || false);
      setIsCollected(sale.isCollected || false);
      setOverallDiscount(sale.overallDiscount || {});
      setLines(sale.lines || []);
      setPayments(sale.payments || []);
      setSalesChannel(sale.salesChannel || getSalesChannelFromSaleType(sale.type) || null);
      setQuickRows([]);

      // Determine if sale is product or service based on lines
      const hasServiceLines = sale.lines?.some(line => line.kind === 'service');
      setWhatKind(hasServiceLines ? 'service' : 'product');

      // Initialize mini-submodal data from service lines
      if (hasServiceLines && sale.lines) {
        const serviceLine = sale.lines.find(line => line.kind === 'service');
        if (serviceLine) {
          // Initialize task item data from service line
          setTaskItemData({
            outputItemType: serviceLine.outputItemType || '',
            outputItemSubType: serviceLine.outputItemSubType || '',
            outputItemQuantity: serviceLine.outputItemQuantity || 1,
            outputItemName: serviceLine.outputItemName || '',
            outputUnitCost: serviceLine.outputUnitCost || 0,
            outputItemCollection: serviceLine.outputItemCollection || '',
            outputItemPrice: serviceLine.outputItemPrice || 0,
            targetSite: serviceLine.taskTargetSiteId || '',
            outputItemStatus: serviceLine.isSold ? ItemStatus.SOLD : ItemStatus.FOR_SALE,
            existingItemId: serviceLine.outputItemId || null,
            isNewItem: serviceLine.isNewItem ?? !serviceLine.outputItemId,
          });

          // Initialize task points data from service line
          setTaskPointsData({
            points: serviceLine.taskRewards || { xp: 0, rp: 0, fp: 0, hp: 0 },
          });
        }
      }

      // Initialize player character
      setPlayerCharacterId(sale.playerCharacterId || PLAYER_ONE_ID);

      // Reset init guard when editing
      didInitRef.current = false;
    } else {
      // New sale - always reset form when sale is null/undefined
      resetForm();
      // Initialize player character for new sale
      setPlayerCharacterId(PLAYER_ONE_ID);
      // Mark as initialized
      didInitRef.current = true;
    }
  }, [sale]);

  useEffect(() => {
    if (!sale || didInitRef.current) {
      return;
    }

    const saleLines = sale.lines ?? [];
    const itemLines = saleLines.filter(
      (line): line is ItemSaleLine => line.kind === 'item'
    );
    const bundleLines = saleLines.filter(
      (line): line is BundleSaleLine => line.kind === 'bundle'
    );
    const hasServiceLines = saleLines.some(line => line.kind === 'service');

    const getItemName = (line: ItemSaleLine) => {
      const itemEntity = items.find(item => item.id === line.itemId);
      if (itemEntity?.name) {
        return itemEntity.name;
      }
      if (line.description) {
        return line.description.replace(/^Sale of\s+/i, '').trim();
      }
      return line.itemId;
    };

    if (hasServiceLines) {
      setWhatKind('service');
      setOneItemMultiple('one');
      didInitRef.current = true;
      return;
    }

    if (itemLines.length === 1 && bundleLines.length === 0) {
      const [line] = itemLines;
      setWhatKind('product');
      setOneItemMultiple('one');
      setSelectedItemId(line.itemId);
      setSelectedItemQuantity(line.quantity || 1);
      setSelectedItemPrice(line.unitPrice || 0);
      setSelectedItems([]);
      setManualLines(false);
    } else if (itemLines.length > 0) {
      setWhatKind('product');
      setOneItemMultiple('multiple');
      setManualLines(false);
      const mappedItems = itemLines.map(line => ({
        id: line.lineId || line.itemId,
        itemId: line.itemId,
        itemName: getItemName(line),
        siteId: sale.siteId || '',
        quantity: line.quantity || 0,
        unitPrice: line.unitPrice || 0,
        total: (line.quantity || 0) * (line.unitPrice || 0),
      }));
      setSelectedItems(mappedItems);
      setSelectedItemId('');
    } else if (bundleLines.length > 0) {
      setWhatKind('product');
      setOneItemMultiple('multiple');
      setManualLines(true);
    } else {
      setSelectedItems([]);
    }

    didInitRef.current = true;
  }, [sale, items]);

  // Load preferences after hydration to prevent SSR mismatches
  useEffect(() => {
    const savedEmissary = getPreference('sales-modal-emissary-expanded');
    if (savedEmissary === 'true') {
      setEmissaryColumnExpanded(true);
    }

    const savedAdvanced = getPreference('sales-modal-advanced-expanded');
    if (savedAdvanced === 'true') {
      setShowAdvanced(true);
    }
  }, [getPreference]);

  const loadItems = async () => {
    try {
      const itemsData = await ClientAPI.getItems();
      setItems(itemsData);
    } catch (error) {
      console.error('Failed to load items:', error);
    }
  };

  const loadSites = async () => {
    try {
      const sitesData = await ClientAPI.getSites();
      setSites(sitesData);
    } catch (error) {
      console.error('Failed to load sites:', error);
    }
  };

  const loadCharacters = async () => {
    try {
      const charactersData = await ClientAPI.getCharacters();
      setCharacters(charactersData);
    } catch (error) {
      console.error('Failed to load characters:', error);
    }
  };

  const loadBusinesses = async () => {
    try {
      const businessesData = await ClientAPI.getBusinesses();
      setBusinesses(businessesData);
    } catch (error) {
      console.error('Failed to load businesses:', error);
    }
  };

  const loadContracts = async () => {
    try {
      const contractsData = await ClientAPI.getContracts();
      setContracts(contractsData);
    } catch (error) {
      console.error('Failed to load contracts:', error);
    }
  };

  const loadTasks = async () => {
    try {
      const tasksData = await ClientAPI.getTasks();
      setTasks(tasksData);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setSaleDate(new Date());
    setType(SaleType.DIRECT);
    setStatus(SaleStatus.CHARGED);
    setSiteId('');
    setCounterpartyName('');
    setSalesChannel(getSalesChannelFromSaleType(SaleType.DIRECT) || null);
    setIsNotPaid(false);
    setIsNotCharged(false);
    setOverallDiscount({});
    setLines([]);
    setPayments([]);
    setWhatKind('product');

    // Reset mini-submodal data
    setTaskItemData({
      outputItemType: '',
      outputItemSubType: '',
      outputItemQuantity: 1,
      outputItemName: '',
      outputUnitCost: 0,
      outputItemCollection: '',
      outputItemPrice: 0,
      targetSite: '',
      outputItemStatus: ItemStatus.FOR_SALE,
      existingItemId: null,
      isNewItem: true,
    });
    setTaskPointsData({
      points: { xp: 0, rp: 0, fp: 0, hp: 0 },
    });
  };

  const handleSave = async (overrideSale?: Sale) => {
    if (isSaving) return;

    // Handle Override (e.g. from BoothSalesView)
    if (overrideSale) {
      setIsSaving(true);
      try {
        await onSave(overrideSale);
        // Dispatch events AFTER successful save
        dispatchEntityUpdated(entityTypeToKind(EntityType.SALE));
        onOpenChange(false);
      } catch (error) {
        console.error('Save failed:', error);
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // Check if status is being changed to COLLECTED - show confirmation modal
    const isBecomingCollected = status === SaleStatus.COLLECTED && sale?.status !== SaleStatus.COLLECTED;
    if (isBecomingCollected) {
      setShowArchiveCollectionModal(true);
      return;
    }

    setIsSaving(true);

    // Validation: Sales must have either product (item) OR service (task)
    const hasProductLines = lines.some(line => line.kind === 'item' || line.kind === 'bundle');
    const hasServiceLines = lines.some(line => line.kind === 'service');
    const hasServiceFieldInput =
      whatKind === 'service' &&
      oneItemMultiple === 'one' &&
      !manualLines &&
      (
        Boolean(selectedTaskId) ||
        Boolean(taskName?.trim()) ||
        (Number.isFinite(taskRevenue) && taskRevenue > 0) ||
        (Number.isFinite(taskCost) && taskCost > 0) ||
        Boolean(taskItemData.outputItemType) ||
        Boolean(taskItemData.outputItemName?.trim()) ||
        (taskPointsData?.points
          ? Object.values(taskPointsData.points).some(value => Number.isFinite(value) && value > 0)
          : false)
      );
    const hasServiceSelection = hasServiceLines || hasServiceFieldInput;
    const hasProductFields = Boolean(selectedItemId) || quickRows.some(r => r.quantity > 0);
    const hasSelectedItems = selectedItems.length > 0;
    const hasAnyProductSelection = hasProductLines || hasProductFields || hasSelectedItems;

    if (!hasAnyProductSelection && !hasServiceSelection) {
      showValidationError('Please add at least one product (item) or service (task) to the sale.', true);
      return;
    }


    // Validate: Check for conflicting data (product fields filled while service lines exist, or vice versa)

    if (hasServiceSelection && (hasProductFields || hasSelectedItems)) {
      showValidationError('Conflicting data detected! You have service lines but also product fields filled. Please clear one before saving.', true);
      return;
    }

    if (hasAnyProductSelection && whatKind === 'service' && !hasServiceSelection) {
      showValidationError('Conflicting data detected! You have product lines but are in Service mode. Please clear the product lines or switch to Product mode.', true);
      return;
    }

    // Handle PRODUCT/ONE - create sale line from selected item
    let effectiveLines: SaleLine[] = lines;
    if (whatKind === 'product' && oneItemMultiple === 'one' && selectedItemId) {
      const selectedItem = getSelectedItem();
      if (selectedItem) {
        effectiveLines = [{
          lineId: uuid(),
          kind: 'item',
          itemId: selectedItemId,
          quantity: selectedItemQuantity,
          unitPrice: selectedItemPrice,
          description: `Sale of ${selectedItem.name}`
        } as SaleLine];
      }
    } else if (whatKind === 'product' && oneItemMultiple === 'multiple' && selectedItems.length > 0) {
      // Handle PRODUCT/MULTIPLE - create sale lines from items submodal
      effectiveLines = selectedItems.map(item => ({
        lineId: uuid(),
        kind: 'item',
        itemId: item.itemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        description: `Sale of ${item.itemName}`,
        taxAmount: 0,
      } as SaleLine));
    } else if (whatKind === 'service' && oneItemMultiple === 'one') {
      // Handle SERVICE/ONE - create service line from task fields
      effectiveLines = [{
        lineId: uuid(),
        kind: 'service',
        station: taskStation,
        revenue: taskRevenue, // This is the SALE revenue for SALE_FINREC
        description: taskName || 'Service',
        taxAmount: 0,
        createTask: true,  // Always create task for SERVICE/ONE
        taskId: selectedTaskId || undefined,
        taskType: taskType,
        taskParentId: taskParentId || undefined,
        taskDueDate: taskDueDate,
        taskTargetSiteId: taskTargetSiteId || undefined,
        taskRewards: taskPointsData.points, // These are for the Task being created
        taskCost: taskCost,
        // Task item creation data from mini-submodal
        outputItemType: taskItemData.outputItemType || undefined,
        outputItemSubType: taskItemData.outputItemSubType || undefined,
        outputItemQuantity: taskItemData.outputItemQuantity || undefined,
        outputItemName: taskItemData.outputItemName || undefined,
        outputUnitCost: taskItemData.outputUnitCost || undefined,
        outputItemCollection: taskItemData.outputItemCollection || undefined,
        outputItemPrice: taskItemData.outputItemPrice || undefined,
        targetSite: taskItemData.targetSite || undefined,
        outputItemStatus: taskItemData.outputItemStatus || undefined,
        outputItemId: taskItemData.isNewItem ? undefined : (taskItemData.existingItemId || undefined),
        isNewItem: taskItemData.isNewItem,
        isNewOutputItem: taskItemData.isNewItem,
        isSold: taskItemData.outputItemStatus === ItemStatus.SOLD,
      } as any];

    } else if (!manualLines && quickRows.length > 0) {
      // If user is using Quick Count (manualLines=false), materialize lines from quickRows
      effectiveLines = quickRows
        .filter(r => r.quantity > 0)
        .map(r => ({
          lineId: uuid(),
          kind: 'bundle',
          itemType: r.itemType,
          siteId: siteId || '',
          quantity: r.quantity,
          unitPrice: r.unitPrice,
          description: '',
          itemsPerBundle: 100 // Default bundle size, should be configurable
        }) as SaleLine);
      setLines(effectiveLines);
    }

    if (effectiveLines.length === 0 && status === SaleStatus.ON_HOLD) {
      showValidationError('Posting requires at least one sale line. Use Quick Count or Manual Lines.', true);
      return;
    }

    // Calculate totals
    const subtotal = effectiveLines.reduce((total, line) => {
      if (line.kind === 'item' || line.kind === 'bundle') {
        return total + (line.quantity * line.unitPrice);
      } else if (line.kind === 'service') {
        return total + line.revenue;
      }
      return total;
    }, 0);

    // Calculate overall discount
    let discountAmount = 0;
    if (overallDiscount.amount) {
      discountAmount = overallDiscount.amount;
    } else if (overallDiscount.percent) {
      discountAmount = subtotal * (overallDiscount.percent / 100);
    }

    // Calculate line discounts
    const lineDiscountTotal = effectiveLines.reduce((total, line) => {
      if (line.discount) {
        const lineSubtotal = line.kind === 'service' ? line.revenue : (line.quantity * line.unitPrice);
        if (line.discount.amount) {
          return total + line.discount.amount;
        } else if (line.discount.percent) {
          return total + (lineSubtotal * (line.discount.percent / 100));
        }
      }
      return total;
    }, 0);

    const totalDiscount = discountAmount + lineDiscountTotal;
    const taxTotal = lines.reduce((total, line) => total + (line.taxAmount || 0), 0);
    const totalRevenue = subtotal - totalDiscount + taxTotal;

    // Convert recordedPayments (SalePaymentLine[]) to Payment[] format
    const effectivePayments = recordedPayments.length > 0
      ? recordedPayments.map(p => ({
        method: p.method,
        amount: p.amount,
        currency: p.currency,
        receivedAt: p.date,
        notes: p.notes,
        exchangeDescription: p.exchangeDescription,
        exchangeCategory: p.exchangeCategory
      }))
      : payments.length > 0 ? payments : undefined;

    const saleData: Sale = {
      id: sale?.id || uuid(),
      name: (name?.trim() || `${type} @ ${siteId} ${saleDate.toISOString().slice(0, 10)}`),
      description: description.trim() || undefined,
      saleDate,
      type,
      status,
      siteId,
      counterpartyName: counterpartyName.trim() || undefined,
      customerId: isNewCustomer ? null : customerId,  // Ambassador: Existing customer
      newCustomerName: isNewCustomer ? newCustomerName : undefined,  // EMISSARY: Name for new customer character creation
      playerCharacterId: playerCharacterId,
      salesChannel: salesChannel || getSalesChannelFromSaleType(type) || null,
      isNotPaid,
      isNotCharged,
      overallDiscount: Object.keys(overallDiscount).length > 0 ? overallDiscount : undefined,
      lines: effectiveLines,
      payments: effectivePayments,
      totals: {
        subtotal,
        discountTotal: totalDiscount,
        taxTotal,
        totalRevenue,
      },
      postedAt: sale?.postedAt,
      doneAt: sale?.doneAt,
      cancelledAt: sale?.cancelledAt,
      requiresReconciliation: sale?.requiresReconciliation,
      reconciliationTaskId: sale?.reconciliationTaskId,
      requiresRestock: sale?.requiresRestock,
      restockTaskId: sale?.restockTaskId,
      createdTaskId: sale?.createdTaskId,
      createdAt: sale?.createdAt || new Date(),
      updatedAt: new Date(),
      isCollected: status === SaleStatus.COLLECTED || isCollected,
      links: sale?.links || [],  // NEW: Initialize links for Rosetta Stone
    };

    try {
      // Emit pure sale entity - Links System handles all relationships automatically
      await onSave(saleData);

      // Dispatch events AFTER successful save
      dispatchEntityUpdated(entityTypeToKind(EntityType.SALE));

      onOpenChange(false);
    } catch (error) {
      console.error('Save failed:', error);
      // Keep modal open on error
    } finally {
      setIsSaving(false);
    }
  };

  // Validation: Check if sale can have the specified line type
  const canAddLineType = (lineKind: 'item' | 'bundle' | 'service') => {
    if (lines.length === 0) return true; // First line can be anything

    const existingKinds = new Set(lines.map(line => line.kind));

    // If it's a product line (item/bundle), check if there are no service lines
    if (lineKind === 'item' || lineKind === 'bundle') {
      return !existingKinds.has('service');
    }

    // If it's a service line, check if there are no product lines
    if (lineKind === 'service') {
      return !existingKinds.has('item') && !existingKinds.has('bundle');
    }

    return true;
  };

  const addItemLine = () => {
    if (!canAddLineType('item')) {
      showValidationError('Cannot mix product and service lines in the same sale. Please clear existing lines first.');
      return;
    }

    const newLine: SaleLine = {
      lineId: uuid(),
      kind: 'item',
      itemId: '',
      quantity: 1,
      unitPrice: 0,
      description: '',
      taxAmount: 0,
    };
    setLines([...lines, newLine]);
  };

  // Quick Count helpers
  const addQuickRow = () => {
    setQuickRows(prev => ([...prev, { id: uuid(), itemType: ItemType.BUNDLE, quantity: 1, unitPrice: 0 }]));
  };
  const updateQuickRow = (id: string, patch: Partial<QuickRow>) => {
    setQuickRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  };
  const removeQuickRow = (id: string) => {
    setQuickRows(prev => prev.filter(r => r.id !== id));
  };

  const showValidationError = (message: string, resetSaving: boolean = false) => {
    if (resetSaving) {
      setIsSaving(false);
    }
    setValidationMessage(message);
    setShowValidationModal(true);
  };

  const applyQuickRowsToLines = () => {
    const materialized: SaleLine[] = quickRows
      .filter(r => r.quantity > 0)
      .map(r => ({
        lineId: uuid(),
        kind: 'bundle',
        itemType: r.itemType,
        siteId: siteId || '',
        quantity: r.quantity,
        unitPrice: r.unitPrice,
        description: '',
        itemsPerBundle: 100 // Default bundle size, should be configurable
      }) as SaleLine);
    setLines(materialized);
  };

  // Money-First helpers
  const getDefaultMethodForType = (t: SaleType): PaymentMethod => {
    switch (t) {
      case SaleType.ONLINE: return PaymentMethod.PAYPAL;
      case SaleType.NFT: return PaymentMethod.BTC;
      case SaleType.NETWORK: return PaymentMethod.SINPE;
      case SaleType.DIRECT: return PaymentMethod.FIAT_USD;
      default: return PaymentMethod.FIAT_USD;
    }
  };

  const paidInFull = () => {
    const total = lines.length > 0
      ? lines.reduce((acc, l) => acc + (l.kind === 'service' ? l.revenue : (l.quantity * l.unitPrice)), 0)
      : quickRows.reduce((acc, r) => acc + (r.quantity * r.unitPrice), 0);
    const method = getDefaultMethodForType(type);
    const currency = method === PaymentMethod.FIAT_CRC || method === PaymentMethod.SINPE ? Currency.CRC : Currency.USD;
    setPayments([{ method: method as string, amount: total, currency: currency as string, receivedAt: new Date() }]);
  };

  const addBundleLine = () => {
    if (!canAddLineType('bundle')) {
      showValidationError('Cannot mix product and service lines in the same sale. Please clear existing lines first.');
      return;
    }

    const newLine: SaleLine = {
      lineId: uuid(),
      kind: 'bundle',
      itemType: ItemType.BUNDLE,
      siteId: siteId || '',
      quantity: 1,
      unitPrice: 0,
      description: '',
      taxAmount: 0,
      itemsPerBundle: 100, // Default bundle size, should be configurable
    };
    setLines([...lines, newLine]);
  };

  const addServiceLine = () => {
    if (!canAddLineType('service')) {
      showValidationError('Cannot mix product and service lines in the same sale. Please clear existing lines first.');
      return;
    }

    const newLine: SaleLine = {
      lineId: uuid(),
      kind: 'service',
      station: 'Digital Art',
      revenue: 0,
      description: '',
      taxAmount: 0,
      createTask: false,
    };
    setLines([...lines, newLine]);
  };

  const updateLine = (index: number, updatedLine: SaleLine) => {
    const newLines = [...lines];
    newLines[index] = updatedLine;
    setLines(newLines);
  };

  const removeLine = (index: number) => {
    const newLines = lines.filter((_, i) => i !== index);
    setLines(newLines);
  };

  const clearAllLines = () => {
    if (lines.length === 0) return;
    setShowClearLinesModal(true);
  };

  const handleConfirmClearLines = () => {
    setLines([]);
    setShowClearLinesModal(false);
  };


  const addPayment = () => {
    const newPayment = {
      method: PaymentMethod.FIAT_USD as string,
      amount: 0,
      currency: Currency.USD as string,
      receivedAt: new Date(),
    };
    setPayments([...payments, newPayment]);
  };

  const updatePayment = (index: number, updatedPayment: any) => {
    const newPayments = [...payments];
    newPayments[index] = updatedPayment;
    setPayments(newPayments);
  };

  const removePayment = (index: number) => {
    const newPayments = payments.filter((_, i) => i !== index);
    setPayments(newPayments);
  };

  const getAvailableItems = () => {
    return items.filter(item => item.status === ItemStatus.FOR_SALE);
  };

  const getCharacterOptions = () => {
    return createCharacterOptions(characters);
  };

  const getItemOptions = () => {
    return createItemOptions(items, true, true, sites);
  };

  const getSelectedItem = () => {
    return items.find(item => item.id === selectedItemId);
  };

  const getTaskOptions = () => {
    return tasks
      .filter(task => task.id !== selectedTaskId)
      .map(task => ({
        value: task.id,
        label: task.name,
        group: task.type
      }));
  };

  const getParentTaskOptions = () => {
    return [
      { value: '', label: 'No Parent', group: 'None' },
      ...tasks
        .filter(task => task.id !== selectedTaskId)
        .map(task => ({
          value: task.id,
          label: task.name,
          group: task.type
        }))
    ];
  };

  // Auto-calculate revenue when item is selected
  const handleItemSelection = (itemId: string) => {
    setSelectedItemId(itemId);
    if (itemId) {
      const selectedItem = items.find(item => item.id === itemId);
      if (selectedItem) {
        setSelectedItemQuantity(1); // Reset to 1 when new item selected
        setSelectedItemPrice(selectedItem.price);
        setRevenue(selectedItem.price);
      }
    } else {
      setSelectedItemQuantity(1);
      setSelectedItemPrice(0);
      setRevenue(0);
    }
  };


  // Other Methods handlers
  const handleGiftApplied = (amount: number) => {
    // Create a gift payment
    const giftPayment: SalePaymentLine = {
      id: uuid(),
      method: PaymentMethod.GIFT,
      amount: amount,
      currency: Currency.USD,
      date: new Date(),
      notes: 'Gift payment'
    };

    // Add to recorded payments
    setRecordedPayments([...recordedPayments, giftPayment]);

    // Reduce revenue by gift amount
    if (whatKind === 'product') {
      if (oneItemMultiple === 'one') {
        // Adjust selected item price
        setSelectedItemPrice(Math.max(0, selectedItemPrice - amount));
      } else {
        // For multiple items, this would need more complex logic
        // For now, just reduce the total revenue
        setRevenue(Math.max(0, revenue - amount));
      }
    } else {
      // Service: reduce revenue
      setRevenue(Math.max(0, revenue - amount));
    }

    // Set category to Other Sales
    setTaskStation(STATION_CATEGORIES.SALES[7] as Station); // 'Other Sales'
  };

  const handleExchangeApplied = (description: string, value: number, category?: string) => {
    // Create an exchange payment with exchange-specific fields
    const exchangePayment: SalePaymentLine = {
      id: uuid(),
      method: PaymentMethod.EXCHANGE,
      amount: value,
      currency: Currency.USD,
      date: new Date(),
      notes: `Exchanged for: ${description}`,
      // Store exchange details for workflow processing
      exchangeDescription: description,
      exchangeCategory: category
    };

    // Add to recorded payments
    setRecordedPayments([...recordedPayments, exchangePayment]);

    // Set category based on exchange category if provided, otherwise default to "Other Sales"
    if (category) {
      setTaskStation(category as Station);
    } else {
      setTaskStation(STATION_CATEGORIES.SALES[7] as Station); // 'Other Sales'
    }
  };

  const handleOtherMethodApplied = (methodName: string, amount: number) => {
    // Create a custom payment
    const otherPayment: SalePaymentLine = {
      id: uuid(),
      method: PaymentMethod.OTHER,
      amount: amount,
      currency: Currency.USD,
      date: new Date(),
      notes: `Custom method: ${methodName}`
    };

    // Add to recorded payments
    setRecordedPayments([...recordedPayments, otherPayment]);
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent zIndexLayer={'MODALS'} className="w-full max-w-7xl h-[90vh]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle>{sale ? 'Edit Sale' : 'New Sale'}</DialogTitle>
              {/* Metadata below title */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                <span>Type: <span className="font-medium text-foreground">{String(type)}</span></span>
                <span>Area: <span className="font-medium text-foreground">SALES</span></span>
                <div className="flex items-center gap-1">
                  <span>Station:</span>
                  <SearchableSelect
                    value={salesChannel ? getStationValue(salesChannel) : ''}
                    onValueChange={(value) => {
                      const station = getStationFromCombined(value);
                      setSalesChannel(station as Station);
                    }}
                    placeholder="Station"
                    options={createStationCategoryOptions()}
                    autoGroupByCategory={true}
                    getCategoryForValue={(value) => getCategoryFromCombined(value)}
                    className="w-32 h-6 text-xs"
                    persistentCollapsible={true}
                    instanceId="sales-modal-header-station"
                  />
                </div>
              </div>

            </div>

          </div>
          {/* Sale SubType Selector - Always Visible */}
          <div className="px-1 border-b pb-1 mt-4">
            <div className="flex items-center gap-2">
              {type !== SaleType.BOOTH && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (sale?.id) return; // Don't allow changes for existing sales

                      const newKind = whatKind === 'product' ? 'service' : 'product';

                      // Check if we can switch to the new kind
                      if (lines.length > 0) {
                        const existingKinds = new Set(lines.map(line => line.kind));

                        if (newKind === 'product' && existingKinds.has('service')) {
                          showValidationError('Cannot switch to Product mode. This sale already has service lines. Please clear all lines first.');
                          return;
                        }

                        if (newKind === 'service' && (existingKinds.has('item') || existingKinds.has('bundle'))) {
                          showValidationError('Cannot switch to Service mode. This sale already has product lines. Please clear all lines first.');
                          return;
                        }
                      }

                      setWhatKind(newKind);
                    }}
                    className={`min-w-[110px] ${sale?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!!sale?.id}
                    title={sale?.id ? 'Product/Service type cannot be changed after creation' : 'Toggle between Product and Service'}
                  >
                    {whatKind === 'product' ? 'Product' : 'Service'}
                  </Button>
                  {whatKind === 'product' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setOneItemMultiple(prev => prev === 'one' ? 'multiple' : 'one')}
                      className="min-w-[120px]"
                      title="Toggle between one item or multiple items"
                    >
                      {oneItemMultiple === 'one' ? 'One' : 'Multiple'}
                    </Button>
                  )}
                </>
              )}

              {/* Sale Type Selectors - ONE ROW */}
              <div className="ml-auto flex items-center gap-2">
                {Object.values(SaleType).map(t => {
                  // Disable type changes for existing sales (except product->multiple)
                  const isExistingSale = sale?.id;
                  const isProductToMultiple = type === SaleType.DIRECT && t === SaleType.NETWORK;
                  const isDisabled = isExistingSale && !isProductToMultiple;

                  return (
                    <Button
                      key={t}
                      variant={t === type ? 'default' : 'outline'}
                      size="sm"
                      disabled={!!isDisabled}
                      onClick={() => {
                        if (isDisabled) return;
                        setType(t as SaleType);
                        // Auto-set salesChannel based on Sale Type
                        const channel = getSalesChannelFromSaleType(t);
                        if (channel) {
                          setSalesChannel(channel);
                        }
                      }}
                      className={`h-8 text-xs px-2 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={isDisabled ? 'Sale type cannot be changed after creation' : ''}
                    >
                      {t === SaleType.BOOTH ? 'BOOTH' : t}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Content Area - Fixed Height with Internal Scroll */}
        {type === SaleType.BOOTH ? (
          <BoothSalesView
            sale={sale || undefined}
            sites={sites}
            characters={characters}
            items={items}
            businesses={businesses}
            contracts={contracts}
            saleDate={saleDate}
            setSaleDate={setSaleDate}
            lines={lines}
            setLines={setLines}
            siteId={siteId}
            setSiteId={setSiteId}
            onSave={handleSave}
            onCancel={() => onOpenChange(false)}
            isSaving={isSaving}
            status={status}
            setStatus={setStatus}
            isNotPaid={isNotPaid}
            setIsNotPaid={setIsNotPaid}
            isNotCharged={isNotCharged}
            setIsNotCharged={(val) => {
              setIsNotCharged(val);
              updateSaleStatus(val);
            }}
            onDelete={sale?.id ? (() => setShowDeleteModal(true)) : undefined}
          />
        ) : (
          <div className="px-6 overflow-y-auto space-y-4" style={{ maxHeight: 'calc(90vh - 280px)' }}>
            {/* Row 1: Date and Total Amount */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Date:</span>
                <div className="min-w-[220px]">
                  <DatePicker
                    value={saleDate}
                    onChange={(date) => setSaleDate(date || new Date())}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Total Amount:</span>
                <div className="min-w-[120px] text-lg font-bold text-foreground">
                  ${whatKind === 'product'
                    ? (oneItemMultiple === 'one'
                      ? ((selectedItemQuantity * selectedItemPrice) - cost - (overallDiscount.amount || 0)).toFixed(2)
                      : (selectedItems.reduce((sum, item) => sum + item.total, 0) - cost - (overallDiscount.amount || 0)).toFixed(2)
                    )
                    : (revenue - cost - (overallDiscount.amount || 0)).toFixed(2)
                  }
                </div>
              </div>
            </div>

            {/* Diplomatic Fields Layout - Only for PRODUCT/ONE */}
            {whatKind === 'product' && oneItemMultiple === 'one' && (
              <>
                {/* Column Headers */}


                <div className={`grid gap-4 ${emissaryColumnExpanded ? 'grid-cols-4' : 'grid-cols-3'}`}>
                  {/* Column 1: Ambassadors - Site & Customer */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="site" className="text-xs">Site</Label>
                      <SearchableSelect
                        value={siteId}
                        onValueChange={setSiteId}
                        options={createSiteOptionsWithCategories(sites)}
                        autoGroupByCategory={true}
                        placeholder="Select site..."
                        className="h-8 text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="customer" className="text-xs">Customer</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsNewCustomer(!isNewCustomer)}
                          className="h-6 text-xs px-2"
                        >
                          {isNewCustomer ? 'Existing' : 'New'}
                        </Button>
                      </div>
                      {isNewCustomer ? (
                        <Input
                          id="customer"
                          value={newCustomerName}
                          onChange={(e) => setNewCustomerName(e.target.value)}
                          placeholder="New customer name"
                          className="h-8 text-sm"
                        />
                      ) : (
                        <SearchableSelect
                          value={customerId || ''}
                          onValueChange={setCustomerId}
                          options={createCharacterOptions(characters)}
                          autoGroupByCategory={true}
                          placeholder="Select customer"
                          className="h-8 text-sm"
                        />
                      )}
                    </div>
                  </div>

                  {/* Column 2: Ambassadors - Item */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="item" className="text-xs">Item</Label>
                      <SearchableSelect
                        value={selectedItemId}
                        onValueChange={handleItemSelection}
                        options={getItemOptions()}
                        autoGroupByCategory={true}
                        placeholder="Select item..."
                        className="h-8 text-sm"
                      />
                    </div>

                    {/* Show item fields when item is selected */}
                    {selectedItemId && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="itemQuantity" className="text-xs">Quantity</Label>
                          <NumericInput
                            id="itemQuantity"
                            value={selectedItemQuantity}
                            onChange={(value) => setSelectedItemQuantity(value)}
                            min={1}
                            step={1}
                            className="h-8 text-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="itemPrice" className="text-xs">Price</Label>
                          <NumericInput
                            id="itemPrice"
                            value={selectedItemPrice}
                            onChange={(value) => {
                              setSelectedItemPrice(value);
                              setRevenue(value);
                            }}
                            min={0}
                            step={1}
                            placeholder="0.00"
                            className="h-8 text-sm"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Column 3: Financial Ambassador Fields (like TaskModal) */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Cost & Revenue</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label htmlFor="cost" className="text-xs">Cost</Label>
                          <NumericInput
                            id="cost"
                            value={cost}
                            onChange={setCost}
                            min={0}
                            step={1}
                            placeholder="0.00"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="revenue" className="text-xs">Revenue</Label>
                          <div className="h-8 text-sm bg-muted px-3 py-2 rounded-md border flex items-center">
                            {(selectedItemQuantity * selectedItemPrice) % 1 === 0
                              ? (selectedItemQuantity * selectedItemPrice).toString()
                              : (selectedItemQuantity * selectedItemPrice).toFixed(1)
                            }
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Payment Status</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsNotPaid(!isNotPaid)}
                          className={`h-8 text-xs ${isNotPaid ? 'border-orange-500 text-orange-600' : ''}`}
                        >
                          {isNotPaid ? "⚠ Not Paid" : "✓ Paid"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const newIsNotCharged = !isNotCharged;
                            setIsNotCharged(newIsNotCharged);
                            updateSaleStatus(newIsNotCharged);
                          }}
                          className={`h-8 text-xs ${isNotCharged ? 'border-orange-500 text-orange-600' : ''}`}
                        >
                          {isNotCharged ? "⚠ Not Charged" : "✓ Charged"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Column 4: Emissaries - Player Points (only when expanded) */}
                  {emissaryColumnExpanded && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Point Rewards</Label>
                        <div className="grid grid-cols-4 gap-2">
                          <div><Label htmlFor="reward-xp" className="text-xs">XP</Label><NumericInput id="reward-xp" value={playerPoints.xp} onChange={(value) => setPlayerPoints({ ...playerPoints, xp: value })} min={0} step={1} className="h-8 text-sm" /></div>
                          <div><Label htmlFor="reward-rp" className="text-xs">RP</Label><NumericInput id="reward-rp" value={playerPoints.rp} onChange={(value) => setPlayerPoints({ ...playerPoints, rp: value })} min={0} step={1} className="h-8 text-sm" /></div>
                          <div><Label htmlFor="reward-fp" className="text-xs">FP</Label><NumericInput id="reward-fp" value={playerPoints.fp} onChange={(value) => setPlayerPoints({ ...playerPoints, fp: value })} min={0} step={1} className="h-8 text-sm" /></div>
                          <div><Label htmlFor="reward-hp" className="text-xs">HP</Label><NumericInput id="reward-hp" value={playerPoints.hp} onChange={(value) => setPlayerPoints({ ...playerPoints, hp: value })} min={0} step={1} className="h-8 text-sm" /></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Diplomatic Fields Layout - Only for PRODUCT/MULTIPLE */}
            {whatKind === 'product' && oneItemMultiple === 'multiple' && (
              <>
                {/* Column Headers */}
                <div className={`grid gap-4 ${emissaryColumnExpanded ? 'grid-cols-4' : 'grid-cols-3'} mb-2`}>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ambassadors</div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ambassadors</div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ambassadors</div>
                  {emissaryColumnExpanded && (
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Emissaries</div>
                  )}
                </div>

                <div className={`grid gap-4 ${emissaryColumnExpanded ? 'grid-cols-4' : 'grid-cols-3'}`}>
                  {/* Column 1: Ambassadors - Site & Customer */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="site" className="text-xs">Site</Label>
                      <SearchableSelect
                        value={siteId}
                        onValueChange={setSiteId}
                        options={createSiteOptionsWithCategories(sites)}
                        autoGroupByCategory={true}
                        placeholder="Select site"
                        className="h-8 text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="customer" className="text-xs">Customer</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsNewCustomer(!isNewCustomer)}
                          className="h-6 text-xs px-2"
                        >
                          {isNewCustomer ? 'Existing' : 'New'}
                        </Button>
                      </div>
                      {isNewCustomer ? (
                        <Input
                          id="customer"
                          value={newCustomerName}
                          onChange={(e) => setNewCustomerName(e.target.value)}
                          placeholder="New customer name"
                          className="h-8 text-sm"
                        />
                      ) : (
                        <SearchableSelect
                          value={customerId || ''}
                          onValueChange={setCustomerId}
                          options={createCharacterOptions(characters)}
                          autoGroupByCategory={true}
                          placeholder="Select customer"
                          className="h-8 text-sm"
                        />
                      )}
                    </div>
                  </div>

                  {/* Column 2: Items Array */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Selected Items</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowItemsSubModal(true)}
                        className="w-full h-10 text-xs"
                      >
                        <ListPlus className="w-4 h-4 mr-2" />
                        {selectedItems.length > 0 ? `Edit Items (${selectedItems.length})` : 'Add Items'}
                      </Button>
                    </div>

                    {/* Display selected items summary */}
                    {selectedItems.length > 0 && (
                      <div className="space-y-2">
                        <div className="max-h-32 overflow-y-auto space-y-1 p-2 bg-muted/30 rounded-md border">
                          {selectedItems.map((item) => (
                            <div key={item.id} className="text-xs flex justify-between items-center">
                              <span className="truncate flex-1">{item.itemName}</span>
                              <span className="text-muted-foreground ml-2">Ã—{item.quantity}</span>
                              <span className="font-medium ml-2">${item.total.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Calculation Fields */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-2">
                            <Label className="text-xs">Total Qty</Label>
                            <div className="h-8 text-sm bg-muted px-3 py-2 rounded-md border flex items-center font-medium">
                              {selectedItems.reduce((sum, item) => sum + item.quantity, 0)}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Total Price</Label>
                            <div className="h-8 text-sm bg-muted px-3 py-2 rounded-md border flex items-center font-medium">
                              ${selectedItems.reduce((sum, item) => sum + item.total, 0).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Column 3: Financial Ambassador Fields */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Cost & Revenue</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label htmlFor="cost" className="text-xs">Cost</Label>
                          <NumericInput
                            id="cost"
                            value={cost}
                            onChange={setCost}
                            min={0}
                            step={1}
                            placeholder="0.00"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="revenue" className="text-xs">Revenue</Label>
                          <NumericInput
                            id="revenue"
                            value={revenue}
                            onChange={setRevenue}
                            min={0}
                            step={1}
                            placeholder="0.00"
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Payment Status</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsNotPaid(!isNotPaid)}
                          className={`h-8 text-xs ${isNotPaid ? 'border-orange-500 text-orange-600' : ''}`}
                        >
                          {isNotPaid ? "⚠ Not Paid" : "✓ Paid"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const newIsNotCharged = !isNotCharged;
                            setIsNotCharged(newIsNotCharged);
                            updateSaleStatus(newIsNotCharged);
                          }}
                          className={`h-8 text-xs ${isNotCharged ? 'border-orange-500 text-orange-600' : ''}`}
                        >
                          {isNotCharged ? "⚠ Not Charged" : "✓ Charged"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Column 4: Emissaries - Player Points (only when expanded) */}
                  {emissaryColumnExpanded && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Point Rewards</Label>
                        <div className="grid grid-cols-4 gap-2">
                          <div><Label htmlFor="multiple-reward-xp" className="text-xs">XP</Label><NumericInput id="multiple-reward-xp" value={playerPoints.xp} onChange={(value) => setPlayerPoints({ ...playerPoints, xp: value })} min={0} step={1} className="h-8 text-sm" /></div>
                          <div><Label htmlFor="multiple-reward-rp" className="text-xs">RP</Label><NumericInput id="multiple-reward-rp" value={playerPoints.rp} onChange={(value) => setPlayerPoints({ ...playerPoints, rp: value })} min={0} step={1} className="h-8 text-sm" /></div>
                          <div><Label htmlFor="multiple-reward-fp" className="text-xs">FP</Label><NumericInput id="multiple-reward-fp" value={playerPoints.fp} onChange={(value) => setPlayerPoints({ ...playerPoints, fp: value })} min={0} step={1} className="h-8 text-sm" /></div>
                          <div><Label htmlFor="multiple-reward-hp" className="text-xs">HP</Label><NumericInput id="multiple-reward-hp" value={playerPoints.hp} onChange={(value) => setPlayerPoints({ ...playerPoints, hp: value })} min={0} step={1} className="h-8 text-sm" /></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Diplomatic Fields Layout - Only for SERVICE/ONE */}
            {whatKind === 'service' && oneItemMultiple === 'one' && (
              <>
                {/* Column Headers */}
                <div className={`grid gap-4 ${emissaryColumnExpanded ? 'grid-cols-4' : 'grid-cols-3'} mb-2`}>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ambassadors</div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ambassadors</div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ambassadors</div>
                  {emissaryColumnExpanded && (
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Emissaries</div>
                  )}
                </div>

                <div className={`grid gap-4 ${emissaryColumnExpanded ? 'grid-cols-4' : 'grid-cols-3'}`}>
                  {/* Column 1: Ambassadors - Site & Customer */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="site" className="text-xs">Site</Label>
                      <SearchableSelect
                        value={siteId}
                        onValueChange={setSiteId}
                        options={createSiteOptionsWithCategories(sites)}
                        autoGroupByCategory={true}
                        placeholder="Select site"
                        className="h-8 text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="customer" className="text-xs">Customer</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsNewCustomer(!isNewCustomer)}
                          className="h-6 text-xs px-2"
                        >
                          {isNewCustomer ? 'Existing' : 'New'}
                        </Button>
                      </div>
                      {isNewCustomer ? (
                        <Input
                          id="customer"
                          value={newCustomerName}
                          onChange={(e) => setNewCustomerName(e.target.value)}
                          placeholder="New customer name"
                          className="h-8 text-sm"
                        />
                      ) : (
                        <SearchableSelect
                          value={customerId || ''}
                          onValueChange={setCustomerId}
                          options={createCharacterOptions(characters)}
                          autoGroupByCategory={true}
                          placeholder="Select customer"
                          className="h-8 text-sm"
                        />
                      )}
                    </div>
                  </div>

                  {/* Column 2: Ambassadors - Task */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="taskName" className="text-xs">Task Name</Label>
                      <Input
                        id="taskName"
                        value={taskName}
                        onChange={(e) => setTaskName(e.target.value)}
                        placeholder="Task name"
                        className="h-8 text-sm"
                      />
                    </div>

                    <div>
                      <Label htmlFor="taskStation" className="text-xs">Station</Label>
                      <SearchableSelect
                        value={getStationValue(taskStation)}
                        onValueChange={(value) => {
                          const station = getStationFromCombined(value);
                          setTaskStation(station as Station);
                        }}
                        placeholder="Select station..."
                        options={createStationCategoryOptions()}
                        autoGroupByCategory={true}
                        getCategoryForValue={(value) => getCategoryFromCombined(value)}
                        className="h-8 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="taskType" className="text-xs">Type</Label>
                        <Select value={taskType} onValueChange={(value) => setTaskType(value as TaskType)}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(TaskType).map(type => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="taskParent" className="text-xs">Parent</Label>
                        <SearchableSelect
                          value={taskParentId}
                          onValueChange={setTaskParentId}
                          placeholder="No Parent"
                          options={createTaskParentOptions(tasks, taskParentId)}
                          autoGroupByCategory={true}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>

                    {/* Mini-submodal buttons for Task data */}
                    <div className="flex justify-center gap-4 mt-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowTaskItemSubModal(true)}
                        className="flex items-center gap-2"
                      >
                        <Package className="h-4 w-4" />
                        Task Item
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowTaskPointsSubModal(true)}
                        className="flex items-center gap-2"
                      >
                        <Gift className="h-4 w-4" />
                        Task Rewards
                      </Button>
                    </div>
                  </div>

                  {/* Column 3: Financial Ambassador Fields (like TaskModal) */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Cost & Revenue</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label htmlFor="cost" className="text-xs">Cost</Label>
                          <NumericInput
                            id="cost"
                            value={cost}
                            onChange={setCost}
                            min={0}
                            step={1}
                            placeholder="0.00"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="revenue" className="text-xs">Revenue</Label>
                          <NumericInput
                            id="revenue"
                            value={revenue}
                            onChange={setRevenue}
                            min={0}
                            step={1}
                            placeholder="0.00"
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Payment Status</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsNotPaid(!isNotPaid)}
                          className={`h-8 text-xs ${isNotPaid ? 'border-orange-500 text-orange-600' : ''}`}
                        >
                          {isNotPaid ? "⚠ Not Paid" : "✓ Paid"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const newIsNotCharged = !isNotCharged;
                            setIsNotCharged(newIsNotCharged);
                            updateSaleStatus(newIsNotCharged);
                          }}
                          className={`h-8 text-xs ${isNotCharged ? 'border-orange-500 text-orange-600' : ''}`}
                        >
                          {isNotCharged ? "⚠ Not Charged" : "✓ Charged"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Column 4: Emissaries - Player Points (SALE_PLAYER links) */}
                  {emissaryColumnExpanded && (
                    <div className="space-y-4">
                      {/* Sale Player Points - for SALE_PLAYER links */}
                      <div className="space-y-2">
                        <Label className="text-xs">Sale Player Points (SALE_PLAYER)</Label>
                        <div className="grid grid-cols-4 gap-2">
                          <div><Label htmlFor="service-reward-xp" className="text-xs">XP</Label><NumericInput id="service-reward-xp" value={playerPoints.xp} onChange={(value) => setPlayerPoints({ ...playerPoints, xp: value })} min={0} step={1} className="h-8 text-sm" /></div>
                          <div><Label htmlFor="service-reward-rp" className="text-xs">RP</Label><NumericInput id="service-reward-rp" value={playerPoints.rp} onChange={(value) => setPlayerPoints({ ...playerPoints, rp: value })} min={0} step={1} className="h-8 text-sm" /></div>
                          <div><Label htmlFor="service-reward-fp" className="text-xs">FP</Label><NumericInput id="service-reward-fp" value={playerPoints.fp} onChange={(value) => setPlayerPoints({ ...playerPoints, fp: value })} min={0} step={1} className="h-8 text-sm" /></div>
                          <div><Label htmlFor="service-reward-hp" className="text-xs">HP</Label><NumericInput id="service-reward-hp" value={playerPoints.hp} onChange={(value) => setPlayerPoints({ ...playerPoints, hp: value })} min={0} step={1} className="h-8 text-sm" /></div>
                        </div>
                      </div>

                      {/* Note: Item creation is now handled via "Configure Task Item" button below */}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* MULTIPLE MODE Layout (for both PRODUCT and SERVICE) */}
            {!(whatKind === 'product' && oneItemMultiple === 'one') && !(whatKind === 'service' && oneItemMultiple === 'one') && (
              <>
                {/* Row 2: Where (Target Site, Station, Station) - Site is in diplomatic fields */}
                <div className="grid grid-cols-4 gap-4">
                  {whatKind === 'service' && (
                    <div className="space-y-2">
                      <Label htmlFor="targetSite">Target Site (Task Site)</Label>
                      <SearchableSelect
                        value={taskTargetSiteId}
                        onValueChange={setTaskTargetSiteId}
                        options={createSiteOptionsWithCategories(sites)}
                        autoGroupByCategory={true}
                        placeholder="Select target site"
                        className="h-8 text-sm"
                      />
                    </div>
                  )}
                  {whatKind === 'service' && (
                    <div className="space-y-2">
                      <Label htmlFor="taskStation">Station</Label>
                      <SearchableSelect
                        value={getStationValue(taskStation)}
                        onValueChange={(value) => {
                          const station = getStationFromCombined(value);
                          setTaskStation(station as Station);
                        }}
                        placeholder="Select station..."
                        options={createStationCategoryOptions()}
                        autoGroupByCategory={true}
                        getCategoryForValue={(value) => getCategoryFromCombined(value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  )}
                </div>

                {/* Row 3: How Much - Client is in diplomatic fields */}
                <div className="grid grid-cols-4 gap-4">
                  {whatKind === 'service' && (
                    <div className="space-y-2">
                      <Label htmlFor="taskCost">Cost</Label>
                      <NumericInput id="taskCost" value={taskCost} onChange={setTaskCost} placeholder="0.00" />
                    </div>
                  )}
                  {whatKind === 'service' && (
                    <div className="space-y-2">
                      <Label htmlFor="taskRevenue">Revenue</Label>
                      <NumericInput id="taskRevenue" value={taskRevenue} onChange={setTaskRevenue} placeholder="0.00" />
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Advanced Section - Always visible after diplomatic fields */}
            <div className="mt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={toggleAdvanced}
                className={`h-8 text-xs ${showAdvanced ? 'bg-transparent text-white' : 'bg-muted text-muted-foreground'}`}
              >
                Advanced
              </Button>

              {showAdvanced && (
                <div className="mt-3 space-y-4">
                  {/* Native Section Header */}
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Native</div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-xs">Description</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Additional sale details..."
                        className="h-16 text-sm resize-none"
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="discountAmount" className="text-xs">Discount Amount</Label>
                      <NumericInput
                        id="discountAmount"
                        value={overallDiscount.amount || 0}
                        onChange={(value) => setOverallDiscount({
                          ...overallDiscount,
                          amount: value > 0 ? value : undefined,
                          percent: value > 0 ? undefined : overallDiscount.percent
                        })}
                        min={0}
                        step={1}
                        placeholder="0.00"
                        className="h-8 text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="discountPercent" className="text-xs">Discount Percent (%)</Label>
                      <NumericInput
                        id="discountPercent"
                        value={overallDiscount.percent || 0}
                        onChange={(value) => setOverallDiscount({
                          ...overallDiscount,
                          percent: value > 0 && value <= 100 ? value : undefined,
                          amount: value > 0 ? undefined : overallDiscount.amount
                        })}
                        min={0}
                        step={1}
                        placeholder="0"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {type !== SaleType.BOOTH && (
          <DialogFooter className="flex items-center justify-between py-2 border-t px-6">
            <div className="flex items-center gap-4">
              {sale && (
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
              {/* Emissaries toggle - show for all modes */}
              <Button
                variant="outline"
                onClick={toggleEmissary}
                className={`h-8 text-xs ${emissaryColumnExpanded ? 'bg-transparent text-white' : 'bg-muted text-muted-foreground'}`}
              >
                Emissaries
              </Button>

              {/* Payments button */}
              <Button
                variant="outline"
                onClick={() => {
                  setShowPaymentsSubModal(true);
                  setPaymentsModalMode('payments');
                }}
                className="h-8 text-xs"
              >
                <Wallet className="w-3 h-3 mr-1" />
                Payments {recordedPayments.length > 0 && `(${recordedPayments.length})`}
              </Button>

              {/* Other Methods button */}
              <Button
                variant="outline"
                onClick={() => {
                  setShowPaymentsSubModal(true);
                  setPaymentsModalMode('other-methods');
                }}
                className="h-8 text-xs"
              >
                <Gift className="w-3 h-3 mr-1" />
                Other Methods
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="hidden sm:block">
                  <Label className="text-xs">Status</Label>
                </div>
                <Select value={status} onValueChange={(value) => {
                  const newStatus = value as SaleStatus;

                  // Show confirmation for COLLECTED status
                  if (newStatus === SaleStatus.COLLECTED && status !== SaleStatus.COLLECTED) {
                    setPendingStatusChange({
                      status: newStatus,
                      onConfirm: () => {
                        setStatus(newStatus);
                        setShowArchiveCollectionModal(false);
                        setPendingStatusChange(null);
                      },
                      onCancel: () => {
                        setShowArchiveCollectionModal(false);
                        setPendingStatusChange(null);
                      }
                    });
                    setShowArchiveCollectionModal(true);
                    return;
                  }

                  setStatus(newStatus);
                }}>
                  <SelectTrigger className="h-8 text-sm w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(SaleStatus).map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => onOpenChange(false)} className="h-8 text-xs" disabled={isSaving}>
                  Cancel
                </Button>
                <Button onClick={() => handleSave()} className="h-8 text-xs" disabled={isSaving}>
                  {isSaving ? 'Saving...' : (sale ? 'Update' : 'Create')} Sale
                </Button>
              </div>

              {/* Booth Sales Lozenge - Footer Placement */}
            </div>
          </DialogFooter>
        )}

        {/* Delete Modal */}
        {showDeleteModal && (
          <DeleteModal
            open={showDeleteModal}
            onOpenChange={setShowDeleteModal}
            entityType={EntityType.SALE}
            entities={sale ? [sale] : []}
            onComplete={() => {
              setShowDeleteModal(false);
              onOpenChange(false);
              // Call the onDelete callback to trigger UI refresh
              if (onDelete) {
                onDelete();
              }
            }}
          />
        )}

        {/* Links Relationships Modal */}
        {sale && showRelationshipsModal && (
          <LinksRelationshipsModal
            entity={{ type: EntityType.SALE, id: sale.id, name: sale.name }}
            open={showRelationshipsModal}
            onClose={() => setShowRelationshipsModal(false)}
          />
        )}

        {/* Player Character Selector Modal */}
        <PlayerCharacterSelectorModal
          open={showPlayerCharacterSelector}
          onOpenChange={setShowPlayerCharacterSelector}
          onSelect={setPlayerCharacterId}
          currentPlayerCharacterId={playerCharacterId}
        />

        {/* Items SubModal */}
        <SaleItemsSubModal
          open={showItemsSubModal}
          onOpenChange={setShowItemsSubModal}
          onSave={setSelectedItems}
          initialItems={selectedItems}
          defaultSiteId={siteId}
        />

        {/* Payments SubModal */}
        <SalePaymentsSubModal
          open={showPaymentsSubModal}
          onOpenChange={setShowPaymentsSubModal}
          onSave={setRecordedPayments}
          initialPayments={recordedPayments}
          mode={paymentsModalMode}
          onGiftApplied={handleGiftApplied}
          onExchangeApplied={handleExchangeApplied}
          onOtherMethodApplied={handleOtherMethodApplied}
          totalDue={whatKind === 'product'
            ? (oneItemMultiple === 'one'
              ? (selectedItemQuantity * selectedItemPrice)
              : selectedItems.reduce((sum, item) => sum + item.total, 0)
            )
            : revenue
          }
        />

        {/* Task Item Mini-SubModal */}
        <ItemEmissarySubModal
          open={showTaskItemSubModal}
          onOpenChange={setShowTaskItemSubModal}
          onSave={setTaskItemData}
          initialData={taskItemData}
          entityCost={taskCost}
          entityRevenue={taskRevenue}
        />

        {/* Task Points Mini-SubModal */}
        <PointsEmissarySubModal
          open={showTaskPointsSubModal}
          onOpenChange={setShowTaskPointsSubModal}
          onSave={setTaskPointsData}
          initialData={taskPointsData}
        />

      </DialogContent>

      {/* Validation Modal */}
      <Dialog open={showValidationModal} onOpenChange={setShowValidationModal}>
        <DialogContent zIndexLayer={'MODALS'} className="max-w-md">
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

      {/* Clear Lines Confirmation */}
      <ConfirmationModal
        open={showClearLinesModal}
        onOpenChange={setShowClearLinesModal}
        title="Clear Sale Lines"
        description={`Are you sure you want to clear all ${lines.length} line(s)? This action cannot be undone.`}
        confirmText="Clear Lines"
        cancelText="Keep Lines"
        variant="destructive"
        onConfirm={handleConfirmClearLines}
        onCancel={() => setShowClearLinesModal(false)}
      />

      {/* Archive Collection Confirmation Modal for status selector */}
      {pendingStatusChange && (
        <ArchiveCollectionConfirmationModal
          open={showArchiveCollectionModal}
          onOpenChange={setShowArchiveCollectionModal}
          entityType="sale"
          entityName={counterpartyName || 'Untitled Sale'}
          totalRevenue={(() => {
            const subtotal = lines.reduce((sum, line) => {
              if (line.kind === 'service') return sum + (line.revenue || 0);
              return sum + ((line.quantity || 0) * (line.unitPrice || 0));
            }, 0);
            const discountAmount = overallDiscount.amount || 0;
            const discountPercent = overallDiscount.percent ? subtotal * (overallDiscount.percent / 100) : 0;
            const totalDiscount = discountAmount + discountPercent;
            const taxTotal = lines.reduce((sum, line) => sum + (line.taxAmount || 0), 0);
            return subtotal - totalDiscount + taxTotal;
          })()}
          onConfirm={pendingStatusChange.onConfirm}
          onCancel={pendingStatusChange.onCancel}
        />
      )}
    </Dialog>
  );
}
