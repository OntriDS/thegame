'use client';

import React, { useEffect, useLayoutEffect, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { DatePicker } from '@/components/ui/date-picker';
import NumericInput from '@/components/ui/numeric-input';
import { Dialog, DialogContent, DialogClose, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sale, SaleLine, Item, Discount, Site, Character, Task, ItemSaleLine, ServiceLine, Business, Contract } from '@/types/entities';
import { normalizeSaleLines } from '@/lib/utils/sale-lines-normalize';
import { getZIndexClass } from '@/lib/utils/z-index-utils';
import { SaleType, SaleStatus, PaymentMethod, Currency, ItemType, ItemStatus, TaskType, TaskPriority, Collection, STATION_CATEGORIES, CharacterRole, EntityType, LinkType, FOUNDER_CHARACTER_ID } from '@/types/enums';
import { getSubTypesForItemType } from '@/lib/utils/item-utils';
import type { Station } from '@/types/type-aliases';
import { CurrencyExchangeRates } from '@/lib/constants/financial-constants';
import { createSiteOptionsWithCategories } from '@/lib/utils/site-options-utils';
import { buildAutoSaleName, resolveCanonicalSaleTimelineDate } from '@/lib/utils/sale-auto-name-utils';
import { createStationCategoryOptions, createTaskParentOptions, createItemTypeSubTypeOptions, getItemTypeFromCombined, getCategoryFromCombined, getStationFromCombined } from '@/lib/utils/searchable-select-utils';
import { getAreaForStation, getSalesChannelFromSaleType } from '@/lib/utils/business-structure-utils';
import { roundCurrency2 } from '@/lib/utils/financial-utils';
import { ClientAPI } from '@/lib/client-api';
import { dispatchEntityUpdated, entityTypeToKind } from '@/lib/ui/ui-events';
import { useUserPreferences } from '@/lib/hooks/use-user-preferences';
import PlayerCharacterSelectorModal from './submodals/player-character-selector-submodal';
// Side effects handled by parent component via API calls
import { v4 as uuid } from 'uuid';
import { Plus, Trash2, Package, DollarSign, Network, ListPlus, Wallet, Gift, User, Store, CalendarIcon, X, Pencil } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import DeleteModal from './submodals/delete-submodal';
import LinksRelationshipsModal from './submodals/links-relationships-submodal';
import SaleItemsSubModal, { SaleItemLine } from './submodals/sale-items-submodal';
import SalePaymentsSubModal, { SalePaymentLine } from './submodals/sale-payments-submodal';
import ItemEmissarySubModal, { ItemCreationData } from './submodals/item-emissary-submodal';
import PointsEmissarySubModal, { PointsData } from './submodals/points-emissary-submodal';
import ConfirmationModal from './submodals/confirmation-submodal';
import ArchiveCollectionConfirmationModal from './submodals/archive-collection-confirmation-submodal';
import BoothSalesView, { type BoothSalesViewHandle } from './submodals/booth-sales-view';
import DatesSubmodal from './submodals/dates-submodal';

/** Product lines only (legacy bundle rows normalized to item). */
function collectItemSaleLines(saleLines: SaleLine[]): ItemSaleLine[] {
  return normalizeSaleLines(saleLines).filter((l): l is ItemSaleLine => l.kind === 'item');
}

const UNKNOWN_SALE_ITEM_LABEL = 'Unknown item';

/** Read-only summary: type/subtype from catalog for `itemId`. */
function formatItemTypeSubtypeLabel(itemId: string, catalog: Item[]): string {
  const it = catalog.find((i) => i.id === itemId);
  if (!it) return '—';
  const sub =
    it.subItemType != null && String(it.subItemType).trim() !== ''
      ? String(it.subItemType)
      : '';
  return sub ? `${it.type} / ${sub}` : String(it.type);
}

function extractSaleItemTargetIds(links: unknown[]): string[] {
  if (!Array.isArray(links)) return [];
  const out: string[] = [];
  for (const raw of links) {
    const l = raw as { linkType?: string; target?: { type?: string; id?: string } };
    if (l?.linkType !== LinkType.SALE_ITEM) continue;
    const id = l.target?.id;
    if (typeof id !== 'string' || !id.trim()) continue;
    if (String(l.target?.type).toLowerCase() !== EntityType.ITEM) continue;
    out.push(id);
  }
  return out;
}

/**
 * Truth for multi-line / booth / submodal rows: each `SaleLine.itemId` maps to at most one Item row.
 * We do NOT scan SALE_ITEM links here — several links cannot be matched to rows without extra metadata.
 */
function resolveItemFromLineItemIdOnly(
  lineItemId: string | undefined,
  items: Item[]
): { resolvedId: string; isKnown: boolean } {
  const lid = lineItemId?.trim() ?? '';
  if (!lid) return { resolvedId: '', isKnown: false };
  if (items.some((i) => i.id === lid)) return { resolvedId: lid, isKnown: true };
  return { resolvedId: lid, isKnown: false };
}

function buildItemLinesFromSelection(items: SaleItemLine[]): SaleLine[] {
  return items.map(item => ({
    lineId: item.id || uuid(),
    kind: 'item',
    itemId: item.itemId,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    description: `Sale of ${item.itemName}`,
    taxAmount: 0,
  } as SaleLine));
}

interface SalesModalProps {
  sale?: Sale | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (sale: Sale, force?: boolean) => Promise<void>;
  onDelete?: () => void; // Optional callback for when sale is deleted
  exchangeRates?: CurrencyExchangeRates;
}

export default function SalesModal({
  sale,
  open,
  onOpenChange,
  onSave,
  onDelete,
  exchangeRates,
}: SalesModalProps) {
  const { getPreference, setPreference } = useUserPreferences();

  // Helper function to get the correct value format for SearchableSelect
  const getStationValue = (station: Station): string => {
    const area = getAreaForStation(station);
    return `${area}:${station}`;
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

  const [customerId, setCustomerId] = useState<string | null>('');
  const [isNewCustomer, setIsNewCustomer] = useState(true);
  const [newCustomerName, setNewCustomerName] = useState('');
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
  const [showDatesModal, setShowDatesModal] = useState(false);
  const [localDoneAt, setLocalDoneAt] = useState<Date | undefined>(sale?.doneAt ? new Date(sale.doneAt) : undefined);
  const [localCollectedAt, setLocalCollectedAt] = useState<Date | undefined>(sale?.collectedAt ? new Date(sale.collectedAt) : undefined);
  const [paymentsModalMode, setPaymentsModalMode] = useState<'payments' | 'other-methods'>('payments');
  const [selectedItems, setSelectedItems] = useState<SaleItemLine[]>([]);
  const [recordedPayments, setRecordedPayments] = useState<SalePaymentLine[]>([]);
  const [taskDueDate, setTaskDueDate] = useState<Date | undefined>(undefined);
  const [taskStation, setTaskStation] = useState<Station>('SALES' as Station);
  const [salesChannel, setSalesChannel] = useState<Station | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [showClearLinesModal, setShowClearLinesModal] = useState(false);
  const [showNameSubModal, setShowNameSubModal] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [isNameCustom, setIsNameCustom] = useState(false);

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
  /** After archive modal confirms COLLECTED, allow Save while `sale` prop is still CHARGED until parent refetches */
  const collectedArchiveAcknowledgedForSaleIdRef = useRef<string | null>(null);
  const boothSaveRef = useRef<BoothSalesViewHandle | null>(null);

  // Duplicate Prevention
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [pendingDuplicateSale, setPendingDuplicateSale] = useState<Sale | null>(null);
  const [duplicateErrorMessage, setDuplicateErrorMessage] = useState('');
  // Identity Vault: Persist ID across renders to prevent duplicate creation on multiple saves
  const draftId = useRef(sale?.id || uuid());

  /** Ensures siteId from the record is committed before passive effects (fixes auto-name overwriting with stale siteId). */
  const saleSiteHydrationKeyRef = useRef<string | null>(null);

  /** Auto-name effect must not run in the same flush as sale hydration — it reads stale type/siteId and overwrites `sale.name`. */
  const suppressAutoNameAfterSaleHydrationRef = useRef(false);

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

  const handleDatesUpdate = (newDates: { createdAt?: Date; doneAt?: Date; collectedAt?: Date }) => {
    if (newDates.collectedAt !== undefined) {
      setLocalCollectedAt(newDates.collectedAt);
    }
    if (newDates.doneAt !== undefined) {
      setLocalDoneAt(newDates.doneAt);
    }
  };

  // Quick Count rows (template-first capture) — materialized as kind: item (concrete itemId)
  type QuickRow = { id: string; itemType: ItemType; itemId?: string; quantity: number; unitPrice: number };
  const [quickRows, setQuickRows] = useState<QuickRow[]>([]);

  // UI state
  const [items, setItems] = useState<Item[]>([]);
  /** SALE_ITEM targets from API — used to repoint dead line.itemId when the row still exists in KV */
  const [saleItemLinkTargets, setSaleItemLinkTargets] = useState<string[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const getDefaultSaleName = useCallback(
    (nextType: SaleType, nextSiteId: string, nextDate: Date) =>
      buildAutoSaleName(nextType, nextSiteId, nextDate, sites),
    [sites]
  );

  /** doneAt → saleDate → createdAt (draft: form `saleDate` / now) — matches finrec + timeline. */
  const getTimelineDateForAutoName = useCallback((): Date => {
    const fallback =
      saleDate instanceof Date && Number.isFinite(saleDate.getTime()) ? saleDate : new Date();
    if (!sale?.id) return fallback;
    return resolveCanonicalSaleTimelineDate(
      {
        doneAt: localDoneAt ?? sale.doneAt,
        saleDate,
        createdAt: sale.createdAt,
      },
      fallback
    );
  }, [sale?.id, sale?.doneAt, sale?.createdAt, saleDate, localDoneAt]);

  useLayoutEffect(() => {
    if (!open) {
      saleSiteHydrationKeyRef.current = null;
      return;
    }
    if (!sale?.id) return;

    const key = `${sale.id}:${sale.siteId ?? ''}`;
    if (saleSiteHydrationKeyRef.current === key) return;

    saleSiteHydrationKeyRef.current = key;
    setSiteId(sale.siteId ?? '');
  }, [open, sale?.id, sale?.siteId]);

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
    if (!open || !sale?.id || sale.type === SaleType.BOOTH) {
      setSaleItemLinkTargets([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const links = await ClientAPI.getLinksFor({ type: EntityType.SALE, id: sale.id });
      if (cancelled) return;
      setSaleItemLinkTargets(extractSaleItemTargetIds(links));
    })();
    return () => {
      cancelled = true;
    };
  }, [open, sale?.id, sale?.type]);

  useLayoutEffect(() => {
    if (!open || !sale?.id || sale.type === SaleType.BOOTH) return;
    if (whatKind !== 'product') return;
    if (!saleItemLinkTargets.length || !items.length) return;

    const itemLines = collectItemSaleLines(lines);
    if (itemLines.length !== 1) return;
    const isl = itemLines[0];
    if (items.some((i) => i.id === isl.itemId)) return;
    const resolvedFromLinks = saleItemLinkTargets.filter((t) => items.some((i) => i.id === t));
    if (resolvedFromLinks.length !== 1) return;
    const fromLink = resolvedFromLinks[0];

    const nm = items.find((i) => i.id === fromLink)?.name ?? 'item';
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.kind === 'item');
      if (idx < 0) return prev;
      const cur = prev[idx] as ItemSaleLine;
      if (items.some((i) => i.id === cur.itemId)) return prev;
      const next = [...prev];
      next[idx] = { ...cur, itemId: fromLink, description: `Sale of ${nm}` };
      return next;
    });
    setSelectedItems((prev) => {
      if (prev.length !== 1) return prev;
      const row = prev[0];
      if (row.itemId === fromLink) return prev;
      const qty = row.quantity || 0;
      const unit = row.unitPrice || 0;
      return [{ ...row, itemId: fromLink, itemName: nm, total: qty * unit }];
    });
  }, [
    open,
    sale?.id,
    sale?.type,
    saleItemLinkTargets,
    items,
    whatKind,
    lines,
  ]);

  useEffect(() => {
    setSelectedItems((prev) =>
      prev.map((item) => ({
        ...item,
        siteId: siteId || '',
      }))
    );
  }, [siteId]);

  useEffect(() => {
    if (whatKind !== 'product') return;
    const productRevenue = selectedItems.reduce((sum, item) => sum + (item.total || 0), 0);
    setRevenue(roundCurrency2(productRevenue));
  }, [selectedItems, whatKind]);

  // Initialize form when sale changes
  useEffect(() => {
    if (sale) {
      suppressAutoNameAfterSaleHydrationRef.current = true;
      setSaleItemLinkTargets([]);
      setRecordedPayments([]);
      setSelectedItems([]);
      const timelineAt = resolveCanonicalSaleTimelineDate(
        {
          doneAt: sale.doneAt,
          saleDate: sale.saleDate,
          createdAt: sale.createdAt,
        },
        new Date()
      );
      const defaultName = buildAutoSaleName(sale.type, sale.siteId, timelineAt, sites);
      setName(sale.name);
      setIsNameCustom(Boolean(sale.name?.trim()) && sale.name.trim() !== defaultName);
      setDescription(sale.description || '');
      setSaleDate(timelineAt);
      setType(sale.type);
      setStatus(sale.status);
      setSiteId(sale.siteId ?? '');
      setCounterpartyName(sale.counterpartyName || '');
      setCustomerId(sale.customerId || '');
      setIsNewCustomer(!sale.customerId); // Toggle to "Existing" if customer exists
      setNewCustomerName(''); // Clear new customer name
      setIsNotPaid(sale.isNotPaid || false);
      setIsNotCharged(sale.isNotCharged || false);
      setIsCollected(sale.isCollected || false);
      setCost(roundCurrency2(sale.totals?.totalCost ?? 0));
      setRevenue(roundCurrency2(sale.totals?.totalRevenue ?? 0));
      setLocalDoneAt(sale.doneAt ? new Date(sale.doneAt) : undefined);
      setLocalCollectedAt(sale.collectedAt ? new Date(sale.collectedAt) : undefined);
      setOverallDiscount(sale.overallDiscount || {});
      setLines(sale.lines || []);
      setPayments(sale.payments || []);
      setSalesChannel(sale.salesChannel || getSalesChannelFromSaleType(sale.type) || null);
      setQuickRows([]);

      if (sale.type === SaleType.BOOTH) {
        setWhatKind('product');
        setSelectedTaskId('');
        setTaskName('');
        setTaskType(TaskType.ASSIGNMENT);
        setTaskParentId('');
        setTaskCost(0);
        setTaskRevenue(0);
        setTaskDueDate(undefined);
        setTaskTargetSiteId('');
        setTaskStation('SALES' as Station);
        setManualLines(false);
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
      } else {
        const hasServiceLines = sale.lines?.some(line => line.kind === 'service');
        setWhatKind(hasServiceLines ? 'service' : 'product');

        if (hasServiceLines && sale.lines) {
          const serviceLine = sale.lines.find(line => line.kind === 'service');
          if (serviceLine) {
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
            setTaskPointsData({
              points: serviceLine.taskRewards || { xp: 0, rp: 0, fp: 0, hp: 0 },
            });
          }
        }
      }

      // Initialize player character
      setPlayerCharacterId(sale.playerCharacterId || FOUNDER_CHARACTER_ID);

      const emissaryPts = sale.rewards?.points;
      setPlayerPoints({
        xp: emissaryPts?.xp ?? 0,
        rp: emissaryPts?.rp ?? 0,
        fp: emissaryPts?.fp ?? 0,
        hp: emissaryPts?.hp ?? 0,
      });

      // Reset init guard when editing
      didInitRef.current = false;
      collectedArchiveAcknowledgedForSaleIdRef.current = null;
      // Sync Vault with existing sale ID
      draftId.current = sale.id;
    } else {
      suppressAutoNameAfterSaleHydrationRef.current = false;
      // New sale - always reset form when sale is null/undefined
      resetForm();
      // Initialize player character for new sale
      setPlayerCharacterId(FOUNDER_CHARACTER_ID);
      // Mark as initialized
      didInitRef.current = true;
      // Generate new ID for new sale session
      draftId.current = uuid();
      collectedArchiveAcknowledgedForSaleIdRef.current = null;
      setLocalDoneAt(undefined);
      setLocalCollectedAt(undefined);
    }
  }, [sale]);

  useEffect(() => {
    if (!sale || didInitRef.current) {
      return;
    }

    if (sale.type === SaleType.BOOTH) {
      didInitRef.current = true;
      return;
    }

    const saleLines = sale.lines ?? [];
    const itemLines = collectItemSaleLines(saleLines);
    const hasServiceLines = saleLines.some(line => line.kind === 'service');

    const getItemName = (line: ItemSaleLine) => {
      const { isKnown, resolvedId } = resolveItemFromLineItemIdOnly(line.itemId, items);
      if (isKnown) {
        return items.find((item) => item.id === resolvedId)?.name ?? UNKNOWN_SALE_ITEM_LABEL;
      }
      return UNKNOWN_SALE_ITEM_LABEL;
    };

    if (hasServiceLines) {
      setWhatKind('service');
      didInitRef.current = true;
      return;
    }

    if (itemLines.length === 1) {
      const [line] = itemLines;
      setWhatKind('product');
      setManualLines(false);
      setSelectedItems([
        {
          id: line.lineId?.trim() || `${sale.id}-row-0`,
          itemId: line.itemId,
          itemName: getItemName(line),
          siteId: sale.siteId || '',
          quantity: line.quantity || 0,
          unitPrice: line.unitPrice || 0,
          total: (line.quantity || 0) * (line.unitPrice || 0),
        },
      ]);
    } else if (itemLines.length > 0) {
      setWhatKind('product');
      setManualLines(false);
      const mappedItems = itemLines.map((line, idx) => ({
        id: line.lineId?.trim() || `${sale.id}-row-${idx}`,
        itemId: line.itemId,
        itemName: getItemName(line),
        siteId: sale.siteId || '',
        quantity: line.quantity || 0,
        unitPrice: line.unitPrice || 0,
        total: (line.quantity || 0) * (line.unitPrice || 0),
      }));
      setSelectedItems(mappedItems);
    } else {
      setSelectedItems([]);
    }

    didInitRef.current = true;
  }, [sale, items]);

  useEffect(() => {
    if (!sale || whatKind !== 'product') return;
    setSelectedItems((prev) =>
      prev.map((row) => {
        const { isKnown, resolvedId } = resolveItemFromLineItemIdOnly(row.itemId, items);
        const name = isKnown
          ? items.find((i) => i.id === resolvedId)?.name ?? UNKNOWN_SALE_ITEM_LABEL
          : UNKNOWN_SALE_ITEM_LABEL;
        if (row.itemName === name) return row;
        return { ...row, itemName: name };
      })
    );
  }, [sale, items, whatKind]);

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
      // Fetch 'all' items natively so historic sold items trigger the map appropriately instead of 'Unknown Item'
      const itemsData = await ClientAPI.getItems(undefined, undefined, undefined, 'all');
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
    setPlayerPoints({ xp: 0, rp: 0, fp: 0, hp: 0 });
    setSelectedItems([]);
    setRecordedPayments([]);
    setManualLines(false);
    setQuickRows([]);
    setSelectedTaskId('');
    setTaskName('');
    setTaskType(TaskType.ASSIGNMENT);
    setTaskParentId('');
    setTaskCost(0);
    setTaskRevenue(0);
    setTaskDueDate(undefined);
    setTaskTargetSiteId('');
    setTaskStation('SALES' as Station);
    setIsNameCustom(false);
  };

  useEffect(() => {
    if (suppressAutoNameAfterSaleHydrationRef.current) {
      suppressAutoNameAfterSaleHydrationRef.current = false;
      return;
    }
    if (!open || isNameCustom) return;
    if (siteId == null) return;

    const at = getTimelineDateForAutoName();
    setName(getDefaultSaleName(type, siteId, at));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, siteId, isNameCustom, open, getDefaultSaleName, getTimelineDateForAutoName]);

  useEffect(() => {
    if (!open || !sale?.id) return;
    const at = resolveCanonicalSaleTimelineDate(
      { doneAt: sale.doneAt, saleDate: sale.saleDate, createdAt: sale.createdAt },
      new Date()
    );
    const defaultName = buildAutoSaleName(sale.type, sale.siteId, at, sites);
    setIsNameCustom(Boolean(sale.name?.trim()) && sale.name.trim() !== defaultName);
  }, [open, sale?.id, sale?.name, sale?.type, sale?.siteId, sale?.saleDate, sale?.doneAt, sale?.createdAt, sites]);

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

    const isBecomingCollected = status === SaleStatus.COLLECTED && sale?.status !== SaleStatus.COLLECTED;
    if (
      isBecomingCollected &&
      sale?.id &&
      collectedArchiveAcknowledgedForSaleIdRef.current !== sale.id
    ) {
      setShowArchiveCollectionModal(true);
      return;
    }

    // Booth sales are built inside BoothSalesView (metadata, payments, associate context).
    // The footer "Update Sale" must not run direct-sale validation (booth lines mix service + items).
    if (type === SaleType.BOOTH) {
      if (boothSaveRef.current) {
        boothSaveRef.current.submitBoothSave();
      } else {
        showValidationError('Booth save is not ready. Close and reopen the sale.', true);
      }
      return;
    }

    setIsSaving(true);

    // Validation: Sales must have either product (item) OR service (task)
    const hasProductLines = lines.some(line => line.kind === 'item');
    const hasServiceLines = lines.some(line => line.kind === 'service');
    const hasServiceFieldInput =
      whatKind === 'service' &&
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
    const hasProductFields = quickRows.some(r => r.quantity > 0);
    const hasSelectedItems = selectedItems.length > 0;
    const hasAnyProductSelection = hasProductLines || hasProductFields || hasSelectedItems;

    // Allow saving with no items/services for cleanup/testing flows.

    let effectiveLines: SaleLine[] = lines;
    if (whatKind === 'product' && selectedItems.length > 0) {
      // Reuse stable line ids so ensureSoldItemEntities idempotency + itemsSold summary stay correct on re-save
      effectiveLines = selectedItems.map(item => ({
        lineId: item.id || uuid(),
        kind: 'item',
        itemId: item.itemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        description: `Sale of ${item.itemName}`,
        taxAmount: 0,
      } as SaleLine));
    } else if (whatKind === 'service') {
      // Handle SERVICE/ONE - create service line from task fields
      const existingServiceLine = lines.find((l): l is ServiceLine => l.kind === 'service') as ServiceLine | undefined;
      effectiveLines = [{
        lineId: existingServiceLine?.lineId || uuid(),
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
      const existingItemLines = lines.filter((l): l is ItemSaleLine => l.kind === 'item');
      let idx = 0;
      const built: SaleLine[] = [];
      for (const r of quickRows.filter(row => row.quantity > 0)) {
        let resolvedId = r.itemId?.trim();
        if (!resolvedId) {
          const matches = items.filter(
            i =>
              i.type === r.itemType &&
              i.stock?.some(s => (!siteId || s.siteId === siteId) && s.quantity > 0)
          );
          if (matches.length > 1) {
            showValidationError(
              'Quick Count: several inventory rows match this type at this site — use Manual Lines to pick the exact item.',
              true
            );
            return;
          }
          resolvedId = matches[0]?.id;
        }
        if (!resolvedId) {
          showValidationError(
            'Quick Count: no inventory row found for a row (check site and item type), or use Manual Lines to pick items.',
            true
          );
          return;
        }
        const existing = existingItemLines[idx++];
        built.push({
          lineId: existing?.lineId || r.id || uuid(),
          kind: 'item',
          itemId: resolvedId,
          quantity: r.quantity,
          unitPrice: r.unitPrice,
          description: '',
          taxAmount: 0,
        } as SaleLine);
      }
      effectiveLines = built;
      setLines(effectiveLines);
    }

    if (effectiveLines.length === 0 && status === SaleStatus.ON_HOLD) {
      showValidationError('Posting requires at least one sale line. Use Quick Count or Manual Lines.', true);
      return;
    }

    // Calculate totals
    const subtotal = effectiveLines.reduce((total, line) => {
      if (line.kind === 'item') {
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
    const subtotalR = roundCurrency2(subtotal);
    const totalDiscountR = roundCurrency2(totalDiscount);
    const taxTotalR = roundCurrency2(taxTotal);
    const totalRevenue = roundCurrency2(subtotalR - totalDiscountR + taxTotalR);
    const totalCost = roundCurrency2(cost);

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

    const hasEmissarySalePoints =
      (playerPoints.xp || 0) > 0 ||
      (playerPoints.rp || 0) > 0 ||
      (playerPoints.fp || 0) > 0 ||
      (playerPoints.hp || 0) > 0;

    const normalizedSaleDate = saleDate instanceof Date ? saleDate : new Date(saleDate as unknown as string);
    const safeSaleDate = Number.isFinite(normalizedSaleDate.getTime()) ? normalizedSaleDate : new Date();

    const saleData: Sale = {
      id: draftId.current,
      name: (name?.trim() || buildAutoSaleName(type, siteId, getTimelineDateForAutoName(), sites)),
      description: description.trim() || undefined,
      saleDate: safeSaleDate,
      type,
      status,
      siteId,
      counterpartyName: counterpartyName.trim() || undefined,
      customerId: isNewCustomer ? null : customerId,  // Ambassador: Existing customer
      newCustomerName: isNewCustomer ? newCustomerName : undefined,  // EMISSARY: Name for new customer character creation
      playerCharacterId: playerCharacterId,
      rewards: hasEmissarySalePoints
        ? { points: { ...playerPoints } }
        : undefined,
      salesChannel: salesChannel || getSalesChannelFromSaleType(type) || null,
      isNotPaid,
      isNotCharged,
      overallDiscount: Object.keys(overallDiscount).length > 0 ? overallDiscount : undefined,
      lines: effectiveLines,
      payments: effectivePayments,
      totals: {
        subtotal: subtotalR,
        discountTotal: totalDiscountR,
        taxTotal: taxTotalR,
        totalRevenue,
        totalCost,
      },
      postedAt: sale?.postedAt,
      doneAt: localDoneAt,
      cancelledAt: sale?.cancelledAt,
      requiresReconciliation: sale?.requiresReconciliation,
      reconciliationTaskId: sale?.reconciliationTaskId,
      requiresRestock: sale?.requiresRestock,
      restockTaskId: sale?.restockTaskId,
      createdTaskId: sale?.createdTaskId,
      createdAt: sale?.createdAt || new Date(),
      updatedAt: new Date(),
      isCollected: status === SaleStatus.COLLECTED || isCollected,
      collectedAt: localCollectedAt,
      links: sale?.links || [],  // embedded mirror; registry is source of truth
    };

    try {
      // Emit pure sale entity - Links System handles all relationships automatically
      await onSave(saleData);

      // Dispatch events AFTER successful save
      dispatchEntityUpdated(entityTypeToKind(EntityType.SALE));

      onOpenChange(false);
    } catch (error) {
      console.error('Save failed:', error);
      if (error instanceof Error && error.message.includes('DUPLICATE_SALE_DETECTED')) {
        setPendingDuplicateSale(saleData);
        setDuplicateErrorMessage(error.message.replace('DUPLICATE_SALE_DETECTED: ', ''));
        setShowDuplicateModal(true);
      } else {
        // Fallback for other errors (validation, network, etc)
        showValidationError(error instanceof Error ? error.message : 'Failed to save sale', true);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Validation: Check if sale can have the specified line type
  const canAddLineType = (lineKind: 'item' | 'service') => {
    if (lines.length === 0) return true;

    const existingKinds = new Set(lines.map(line => line.kind));

    if (lineKind === 'item') {
      return !existingKinds.has('service');
    }

    if (lineKind === 'service') {
      return !existingKinds.has('item');
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
    setQuickRows(prev => ([...prev, { id: uuid(), itemType: ItemType.BUNDLE, itemId: '', quantity: 1, unitPrice: 0 }]));
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
    const materialized: SaleLine[] = [];
    for (const r of quickRows.filter(row => row.quantity > 0)) {
      let resolvedId = r.itemId?.trim();
      if (!resolvedId) {
        const match = items.find(
          i =>
            i.type === r.itemType &&
            i.stock?.some(s => (!siteId || s.siteId === siteId) && s.quantity > 0)
        );
        resolvedId = match?.id;
      }
      if (!resolvedId) {
        showValidationError('Quick Count: could not resolve an inventory item for every row (set site or pick types with stock).');
        return;
      }
      materialized.push({
        lineId: r.id || uuid(),
        kind: 'item',
        itemId: resolvedId,
        quantity: r.quantity,
        unitPrice: r.unitPrice,
        description: '',
        taxAmount: 0,
      } as SaleLine);
    }
    setLines(materialized);
  };

  // Money-First helpers
  const getDefaultMethodForType = (t: SaleType): PaymentMethod => {
    switch (t) {
      case SaleType.ONLINE: return PaymentMethod.CARD;
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

  const addServiceLine = () => {
    if (!canAddLineType('service')) {
      showValidationError('Cannot mix product and service lines in the same sale. Please clear existing lines first.');
      return;
    }

    const newLine: SaleLine = {
      lineId: uuid(),
      kind: 'service',
      station: 'Digital-Art',
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
      setRevenue(roundCurrency2(Math.max(0, revenue - amount)));
    } else {
      // Service: reduce revenue
      setRevenue(roundCurrency2(Math.max(0, revenue - amount)));
    }

    // Set category to Other-Sales
    setTaskStation(STATION_CATEGORIES.SALES[7] as Station); // 'Other-Sales'
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

    // Set category based on exchange category if provided, otherwise default to "Other-Sales"
    if (category) {
      setTaskStation(category as Station);
    } else {
      setTaskStation(STATION_CATEGORIES.SALES[7] as Station); // 'Other-Sales'
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

  const selectedItemsSubtotal = selectedItems.reduce((sum, item) => sum + (item.total || 0), 0);
  const handleCostChange = (value: number) => setCost(roundCurrency2(value));
  const handleRevenueChange = (value: number) => setRevenue(roundCurrency2(value));
  // SearchableSelect buckets by `group` when `getCategoryForValue` is not passed (see searchable-select.tsx).
  // Role = group header; label is name only (no redundant roles in the label text).
  const customerOptions = characters.map((char) => ({
    value: char.id,
    label: char.name,
    group: char.roles && char.roles.length > 0 ? char.roles[0] : 'Other',
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        zIndexLayer={'MODALS'}
        hideClose
        className="flex h-[90vh] w-full max-w-7xl flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="shrink-0 space-y-0 border-b px-6 py-4 text-left">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <DialogTitle className="m-0 shrink-0 text-xl font-semibold tracking-tight">
              {sale ? 'Edit Sale' : 'New Sale'}
            </DialogTitle>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Type: <span className="font-medium text-foreground">{String(type)}</span></span>
              <span>Area: <span className="font-medium text-foreground">SALES</span></span>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="shrink-0 text-xs text-muted-foreground">Station:</span>
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
                className="h-8 w-[160px] max-w-[200px] shrink-0 text-xs"
                persistentCollapsible={true}
                instanceId="sales-modal-header-station"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const liveCanonical = buildAutoSaleName(type, siteId, getTimelineDateForAutoName(), sites);
                  const serverTrim = sale?.name?.trim() ?? '';
                  const nameTrim = name.trim();
                  const formSyncedToServer = !sale?.id || nameTrim === serverTrim;
                  const useStoredCustom =
                    isNameCustom &&
                    formSyncedToServer &&
                    !!serverTrim &&
                    serverTrim !== liveCanonical;
                  setNameDraft(useStoredCustom ? serverTrim : liveCanonical);
                  setShowNameSubModal(true);
                }}
                className="h-8 shrink-0 px-2 text-xs"
              >
                <Pencil className="h-3 w-3 mr-1" />
                Name
              </Button>
              {type !== SaleType.BOOTH && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (sale?.id) return;

                    const newKind = whatKind === 'product' ? 'service' : 'product';

                    if (lines.length > 0) {
                      const existingKinds = new Set(lines.map(line => line.kind));

                      if (newKind === 'product' && existingKinds.has('service')) {
                        showValidationError('Cannot switch to Product mode. This sale already has service lines. Please clear all lines first.');
                        return;
                      }

                      if (newKind === 'service' && existingKinds.has('item')) {
                        showValidationError('Cannot switch to Service mode. This sale already has product lines. Please clear all lines first.');
                        return;
                      }
                    }

                    setWhatKind(newKind);
                  }}
                  className={`h-8 shrink-0 px-3 text-xs ${sale?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!!sale?.id}
                  title={sale?.id ? 'Product/Service type cannot be changed after creation' : 'Toggle between Product and Service'}
                >
                  {whatKind === 'product' ? 'Product' : 'Service'}
                </Button>
              )}
            </div>
            <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
              {Object.values(SaleType).map(t => {
                const isExistingSale = sale?.id;
                const isBidirectionalDirectNetwork =
                  (type === SaleType.DIRECT && t === SaleType.NETWORK) ||
                  (type === SaleType.NETWORK && t === SaleType.DIRECT);
                const isDisabled = isExistingSale && !isBidirectionalDirectNetwork;

                return (
                  <Button
                    key={t}
                    variant={t === type ? 'default' : 'outline'}
                    size="sm"
                    disabled={!!isDisabled}
                    onClick={() => {
                      if (isDisabled) return;
                      const nextType = t as SaleType;
                      setType(nextType);
                      if (!isNameCustom) {
                        setName(getDefaultSaleName(nextType, siteId, getTimelineDateForAutoName()));
                      }
                      const channel = getSalesChannelFromSaleType(t);
                      if (channel) {
                        setSalesChannel(channel);
                      }
                    }}
                    className={`h-8 px-2 text-xs ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={isDisabled ? 'Sale type cannot be changed after creation' : ''}
                  >
                    {t === SaleType.BOOTH ? 'BOOTH' : t}
                  </Button>
                );
              })}
              <DialogClose
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                type="button"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>
          </div>
        </DialogHeader>

        {type === SaleType.BOOTH ? (
          <div className="flex min-h-0 flex-1 flex-col border-b">
          <BoothSalesView
            key={sale?.id ?? 'new-booth'}
            ref={boothSaveRef}
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
            doneAt={localDoneAt}
            collectedAt={localCollectedAt}
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
            exchangeRate={exchangeRates?.colonesToUsd}
          />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-b border-border/80">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            {/* Row 1: Date */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Date:</span>
                <div className="min-w-[220px]">
                  <DatePicker
                    value={saleDate}
                    onChange={(date) => setSaleDate(date || new Date())}
                  />
                </div>
              </div>
            </div>

            {/* Diplomatic Fields Layout — product: items via submodal only */}
            {whatKind === 'product' && (
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
                          options={customerOptions}
                          autoGroupByCategory={true}
                          placeholder="Select customer"
                          className="h-8 text-sm"
                        />
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={toggleAdvanced}
                      className={`h-8 w-full text-xs ${showAdvanced ? 'bg-transparent text-white' : 'bg-muted text-muted-foreground'}`}
                    >
                      Advanced
                    </Button>
                  </div>

                  {/* Column 2: Items — submodal only */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Selected Items</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowItemsSubModal(true)}
                        className="h-12 w-full text-xs"
                      >
                        <ListPlus className="mr-2 h-4 w-4" />
                        {selectedItems.length > 0 ? `Edit Items (${selectedItems.length})` : 'Add Items'}
                      </Button>
                    </div>
                    {selectedItems.length > 0 && (
                      <div className="rounded-md border bg-muted/20 p-2">
                        <div
                          className="grid gap-x-2 gap-y-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                          style={{
                            gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1fr) auto auto auto',
                          }}
                        >
                          <div className="truncate">Item</div>
                          <div className="truncate">Type / Subtype</div>
                          <div className="text-right">Qty Sold</div>
                          <div className="text-right">Price</div>
                          <div className="text-right">Total</div>
                        </div>
                        <div className="mt-1 space-y-0.5 border-t border-border/60 pt-1">
                          {selectedItems.map((row) => (
                            <div
                              key={row.id}
                              className="grid gap-x-2 gap-y-0 text-[11px] text-foreground"
                              style={{
                                gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1fr) auto auto auto',
                              }}
                            >
                              <span className="min-w-0 truncate" title={row.itemName}>
                                {row.itemName || UNKNOWN_SALE_ITEM_LABEL}
                              </span>
                              <span className="min-w-0 truncate text-muted-foreground" title={formatItemTypeSubtypeLabel(row.itemId, items)}>
                                {formatItemTypeSubtypeLabel(row.itemId, items)}
                              </span>
                              <span className="text-right tabular-nums">{row.quantity ?? 0}</span>
                              <span className="text-right tabular-nums">${(row.unitPrice || 0).toFixed(2)}</span>
                              <span className="text-right font-medium tabular-nums">${(row.total || 0).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 flex items-center justify-end gap-2 border-t border-border/60 pt-2">
                          <span className="text-muted-foreground">Grand Total</span>
                          <span className="text-xl font-bold tabular-nums text-foreground">${selectedItemsSubtotal.toFixed(2)}</span>
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
                            onChange={handleCostChange}
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
                            onChange={handleRevenueChange}
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

                {showAdvanced && (
                  <div className="mt-4 space-y-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Native</div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="description" className="text-xs">Description</Label>
                        <Textarea
                          id="description"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Additional sale details..."
                          className="h-16 resize-none text-sm"
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
              </>
            )}

            {/* Diplomatic Fields Layout — service */}
            {whatKind === 'service' && (
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
                          options={customerOptions}
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
                          options={createTaskParentOptions(tasks, undefined)}
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
                            onChange={handleCostChange}
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
                            onChange={handleRevenueChange}
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

            {/* Advanced — service sales only (product uses control in first column) */}
            {whatKind === 'service' && (
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
            )}
          </div>
          </div>
        )}

        <DialogFooter className="mt-auto flex shrink-0 items-center justify-between gap-4 overflow-x-auto border-t bg-background px-6 py-4 flex-nowrap">
            <div className="flex items-center gap-2 flex-nowrap shrink-0">
              {sale && (
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteModal(true)}
                  className="h-8 text-xs text-destructive hover:bg-destructive/10 border-destructive/20 mr-4"
                >
                  Delete
                </Button>
              )}
              {sale && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setShowDatesModal(true)}
                    className="h-8 text-xs"
                  >
                    <CalendarIcon className="w-3 h-3 mr-1" />
                    Timeline
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

                  if (newStatus !== SaleStatus.COLLECTED) {
                    collectedArchiveAcknowledgedForSaleIdRef.current = null;
                  }

                  // Show confirmation for COLLECTED status
                  if (newStatus === SaleStatus.COLLECTED && status !== SaleStatus.COLLECTED) {
                    setPendingStatusChange({
                      status: newStatus,
                      onConfirm: () => {
                        if (sale?.id) {
                          collectedArchiveAcknowledgedForSaleIdRef.current = sale.id;
                        }
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
                  <SelectTrigger className="h-8 text-sm w-auto min-w-[110px]">
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

            </div>
          </DialogFooter>

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
          onSave={(items) => {
            setSelectedItems(items);
            if (whatKind === 'product' && !manualLines) {
              setLines(items.length > 0 ? buildItemLinesFromSelection(items) : []);
            }
          }}
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
            ? selectedItems.reduce((sum, item) => sum + item.total, 0)
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

      {/* Name SubModal */}
      <Dialog open={showNameSubModal} onOpenChange={setShowNameSubModal}>
        <DialogContent zIndexLayer={'MODALS'} className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Sale</DialogTitle>
            <DialogDescription>Set a custom sale name for this record.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="sale-name-draft" className="text-xs">Sale Name</Label>
            <Input
              id="sale-name-draft"
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              placeholder="Sale name"
              className="h-8 text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNameSubModal(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => {
                const normalized = nameDraft.trim();
                if (!normalized) {
                  return;
                }
                const defaultName = buildAutoSaleName(type, siteId, getTimelineDateForAutoName(), sites);
                setName(normalized);
                setIsNameCustom(normalized !== defaultName);
                setShowNameSubModal(false);
              }}
              className="h-8 text-xs"
              disabled={!nameDraft.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Duplicate Shield Confirmation */}
      <ConfirmationModal
        open={showDuplicateModal}
        onOpenChange={setShowDuplicateModal}
        title="Duplicate Sale Detected"
        description={`A very similar sale already exists (${duplicateErrorMessage}). Is this intentional?`}
        confirmText="Force Save"
        cancelText="Cancel"
        variant="destructive" // Orange in spirit, red in UI
        onConfirm={async () => {
          if (pendingDuplicateSale) {
            try {
              // Force Save
              await onSave(pendingDuplicateSale, true);
              dispatchEntityUpdated(entityTypeToKind(EntityType.SALE));
              setShowDuplicateModal(false);
              onOpenChange(false);
            } catch (error) {
              console.error('Force save failed:', error);
              showValidationError(error instanceof Error ? error.message : 'Force save failed');
            }
          }
        }}
        onCancel={() => setShowDuplicateModal(false)}
      />

      {/* --- Dates & Activity Submodal --- */}
      <DatesSubmodal
        open={showDatesModal}
        onOpenChange={setShowDatesModal}
        entityId={sale?.id ? `data:sale:${sale.id}` : undefined}
        entityMode="sale"
        createdAt={sale?.createdAt}
        doneAt={localDoneAt}
        collectedAt={localCollectedAt}
        currentStatus={status}
        onDatesChange={handleDatesUpdate}
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
