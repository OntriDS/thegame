'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import NumericInput from '@/components/ui/numeric-input';
import { getZIndexClass } from '@/lib/utils/z-index-utils';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { ItemNameField } from '@/components/ui/item-name-field';
import { Switch } from '@/components/ui/switch';
import { FileReference, Item, Link, Site, StockPoint, Sale, SaleLine } from '@/types/entities';
import { ItemType, ItemStatus, Collection, EntityType, STATION_CATEGORIES, SaleType, SaleStatus, PaymentMethod, Currency } from '@/types/enums';
import { getItemStatusLabel } from '@/lib/constants/status-display-labels';
import { getSubTypesForItemType } from '@/lib/utils/item-utils';
import { getCategoryForItemType, createStationCategoryOptions, getStationFromCombined, getCategoryFromCombined, createItemTypeSubTypeOptions, getItemTypeFromCombined, getSubTypeFromCombined } from '@/lib/utils/searchable-select-utils';
import { getAreaForStation } from '@/lib/utils/business-structure-utils';
import type { Station, SubItemType } from '@/types/type-aliases';
import { CM_TO_M2_CONVERSION, PRICE_STEP, YEAR_MIN, YEAR_MAX } from '@/lib/constants/app-constants';
import { v4 as uuid } from 'uuid';
import { createSiteOptionsWithCategories } from '@/lib/utils/site-options-utils';
import { Package, Trash2, User, Network, CalendarIcon } from 'lucide-react';
import { getItemCharacterId } from '@/lib/item-character-id';
import { ClientAPI } from '@/lib/client-api';
import DeleteModal from './submodals/delete-submodal';
import LinksRelationshipsModal from './submodals/links-relationships-submodal';
import DatesSubmodal from './submodals/dates-submodal';
import { getUTCNow } from '@/lib/utils/utc-utils';
import { useUserPreferences } from '@/lib/hooks/use-user-preferences';
import OwnerSubmodal from './submodals/owner-submodal';
import { dispatchEntityUpdated, entityTypeToKind } from '@/lib/ui/ui-events';
import { LinkType } from '@/types/enums';
import { getCollectionLabel } from '@/lib/constants/collection-labels';
import ArchiveCollectionConfirmationModal from './submodals/archive-collection-confirmation-submodal';

interface ItemModalProps {
  item?: Item;
  defaultItemType?: ItemType;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (item: Item) => Promise<void>;
  initialSiteId?: string;
}

const DEFAULT_NEW_ITEM_STATION: Station = 'items';
const DEFAULT_NONE_SITE = 'None';

export default function ItemModal({ item, defaultItemType, open, onOpenChange, onSave, initialSiteId }: ItemModalProps) {
  const { getPreference, setPreference } = useUserPreferences();

  // Memoized to prevent dependency changes on every render
  const getLastUsedStation = useCallback((): Station => {
    const saved = getPreference('item-modal-last-station');
    return (saved as Station) || DEFAULT_NEW_ITEM_STATION;
  }, [getPreference]);

  // Helper function to get the correct value format for SearchableSelect
  const getStationValue = (station: Station): string => {
    const area = getAreaForStation(station);
    return `${area}:${station}`;
  };

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ItemType>(defaultItemType || ItemType.STICKER);
  const [station, setStation] = useState<Station>(getLastUsedStation());

  // stationCategory state removed - derived from station via getStationValue
  const [subItemType, setSubItemType] = useState<SubItemType | ''>('');
  const [itemTypeSubType, setItemTypeSubType] = useState<string>(`${defaultItemType || ItemType.STICKER}:`);
  const [collection, setCollection] = useState<Collection | 'none'>(Collection.NO_COLLECTION);
  const [status, setStatus] = useState<ItemStatus>(ItemStatus.FOR_SALE);
  const [quantity, setQuantity] = useState(0);
  const [unitCost, setUnitCost] = useState(0);
  const [price, setPrice] = useState(0);
  const [keepInInventoryAfterSold, setKeepInInventoryAfterSold] = useState<boolean>(false);
  const [restockToTarget, setRestockToTarget] = useState<boolean>(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [mediaMain, setMediaMain] = useState('');
  const [mediaThumb, setMediaThumb] = useState('');
  const [mediaGallery, setMediaGallery] = useState(''); // semi-colon separated
  const [sourceFileUrl, setSourceFileUrl] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [size, setSize] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [quantitySold, setQuantitySold] = useState(0);
  const [site, setSite] = useState<string>(DEFAULT_NONE_SITE);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMoreFields, setShowMoreFields] = useState(false);
  const [showLinksModal, setShowLinksModal] = useState(false);
  const [showDatesModal, setShowDatesModal] = useState(false);
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [ownerCharacterName, setOwnerCharacterName] = useState<string>('');
  const [showQuickSellModal, setShowQuickSellModal] = useState(false);
  const [quickSellItem, setQuickSellItem] = useState<Item | null>(null);
  const [quickSellSiteId, setQuickSellSiteId] = useState<string>('');
  const [quickSellQuantity, setQuickSellQuantity] = useState<number>(1);
  const [quickSellMode, setQuickSellMode] = useState<'create-sale' | 'archive-only'>('create-sale');
  const [quickSellError, setQuickSellError] = useState<string>('');
  const [quickSellLoading, setQuickSellLoading] = useState(false);
  const [showSoldConfirmation, setShowSoldConfirmation] = useState(false);
  const [pendingSoldStatus, setPendingSoldStatus] = useState(false);
  const [localSoldAt, setLocalSoldAt] = useState<Date | undefined>(item?.soldAt ? new Date(item.soldAt) : undefined);

  // Item selection states for compound field
  const [isNameFieldNewItem, setIsNameFieldNewItem] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [existingItems, setExistingItems] = useState<Item[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const siteOptions = useMemo(
    () => {
      const options = createSiteOptionsWithCategories(sites);
      return options.some(option => option.value === DEFAULT_NONE_SITE)
        ? options
        : [{ value: DEFAULT_NONE_SITE, label: 'None', category: 'Other' }, ...options];
    },
    [sites]
  );

  // R2 helpers ---------------------------------------------------------------
  const [autoPrefixR2, setAutoPrefixR2] = useState<boolean>(() => {
    const saved = getPreference('item-modal-auto-prefix-r2');
    if (typeof saved === 'boolean') return saved;
    if (saved === 'true') return true;
    if (saved === 'false') return false;
    return true; // default ON
  });
  const [autoSuffixR2, setAutoSuffixR2] = useState<boolean>(() => {
    const saved = getPreference('item-modal-auto-suffix-r2');
    if (typeof saved === 'boolean') return saved;
    if (saved === 'true') return true;
    if (saved === 'false') return false;
    return true; // default ON
  });

  const toKebabCase = (value: string): string => {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const r2Prefix = useMemo(() => {
    const parts: string[] = [];
    if (station) parts.push(String(station));
    if (type) parts.push(String(type));
    if (subItemType) parts.push(String(subItemType));
    return parts.join('/');
  }, [station, type, subItemType]);

  const r2NameSlug = useMemo(() => toKebabCase(name) || 'item', [name]);
  const r2FileBySlug = useCallback(
    (suffix: string, extension: '.png' | '.jpg') => `${r2NameSlug}-${suffix}${extension}`,
    [r2NameSlug]
  );
  const buildR2AutoValue = useCallback(
    (suffix: string, extension: '.png' | '.jpg') => {
      if (!autoSuffixR2) {
        if (autoPrefixR2 && r2Prefix) return `${r2Prefix}/`;
        return '';
      }
      const filename = r2FileBySlug(suffix, extension);
      return autoPrefixR2 && r2Prefix ? `${r2Prefix}/${filename}` : filename;
    },
    [autoPrefixR2, autoSuffixR2, r2Prefix, r2FileBySlug]
  );

  const applyR2PrefixToValue = useCallback(
    (raw: string): string => {
      const trimmed = raw.trim();
      if (!trimmed) return '';
      if (!autoPrefixR2 || !r2Prefix) return trimmed;
      
      // If it already starts with the current prefix, we are good
      if (trimmed.startsWith(r2Prefix)) return trimmed;
      
      // Prevent double-prefixing if it looks like it already has a valid R2 station prefix.
      // We derive this list from the actual STATION_CATEGORIES defined in enums.ts
      const allStations = Object.values(STATION_CATEGORIES).flat() as string[];
      
      const firstPart = trimmed.split('/')[0].toLowerCase();
      if (allStations.includes(firstPart)) {
        // If it starts with a known station, assume it's already a full path
        return trimmed;
      }
      
      return `${r2Prefix}/${trimmed}`;
    },
    [autoPrefixR2, r2Prefix]
  );

  const applyR2SuffixToValue = useCallback(
    (raw: string, requiredSuffix: string, defaultExtension: '.png' | '.jpg'): string => {
      if (!raw) return '';
      const trimmed = raw.trim();
      if (!trimmed || !autoSuffixR2) return trimmed;
      const separatorIndex = trimmed.search(/[?#]/);
      const suffix = separatorIndex >= 0 ? trimmed.slice(separatorIndex) : '';
      const path = separatorIndex >= 0 ? trimmed.slice(0, separatorIndex) : trimmed;
      const parts = path.split('/');
      const filename = parts.pop() || '';
      if (!parts.length && !filename) return `${path}${suffix}`;

      if (!filename) return `${path}${suffix}`;
      const extensionMatch = filename.match(/\.[a-z0-9]{2,6}$/i);
      const extension = extensionMatch ? extensionMatch[0] : '';
      const baseName = extension ? filename.slice(0, -extension.length) : filename;
      const hasNamingSuffix = requiredSuffix.startsWith('gallery-')
        ? /-gallery-\d+$/i.test(baseName)
        : new RegExp(`-${requiredSuffix}$`, 'i').test(baseName);
      const normalizedBaseName = hasNamingSuffix ? baseName : `${baseName}-${requiredSuffix}`;
      const finalName = `${normalizedBaseName}${extension || defaultExtension}`;
      const prefix = parts.length > 0 ? `${parts.join('/')}/` : '';

      return `${prefix}${finalName}${suffix}`;
    },
    [autoSuffixR2]
  );

  const applyR2PrefixAndSuffixToValue = useCallback(
    (raw: string, requiredSuffix: string, defaultExtension: '.png' | '.jpg') => {
      const withPrefix = applyR2PrefixToValue(raw);
      return applyR2SuffixToValue(withPrefix, requiredSuffix, defaultExtension);
    },
    [applyR2PrefixToValue, applyR2SuffixToValue]
  );

  const makeR2ArrowFillHandler =
    (setter: (value: string) => void, mode: 'main' | 'thumb' | 'gallery') =>
    (event: any) => {
      if (event.key !== 'ArrowRight') return;
      if (!autoPrefixR2 && !autoSuffixR2) return;
      if (typeof event.currentTarget?.value !== 'string') return;
      const currentValue = event.currentTarget.value;

      if (mode === 'gallery') {
        const parts = currentValue
          .split(';')
          .map((part: string) => part.trim())
          .filter(Boolean);
        const nextIndex = parts.length + 1;
        if (nextIndex > 3) return;
        event.preventDefault();
        const nextGalleryValue = buildR2AutoValue(`gallery-${nextIndex}`, '.jpg');
        const nextValue = nextIndex === 1 ? nextGalleryValue : `${currentValue};${nextGalleryValue}`;
        setter(nextValue);
        return;
      }

      if (currentValue.trim() !== '') return;
      event.preventDefault();

      const suffix = mode;
      const extension = mode === 'main' ? '.png' : '.jpg';
      setter(buildR2AutoValue(suffix, extension));
    };

  const r2MainPlaceholder = `${autoPrefixR2 && r2Prefix ? `${r2Prefix}/` : ''}${r2FileBySlug('main', '.png')}`;
  const r2ThumbPlaceholder = `${autoPrefixR2 && r2Prefix ? `${r2Prefix}/` : ''}${r2FileBySlug('thumb', '.jpg')}`;
  const r2GalleryPlaceholder = `${autoPrefixR2 && r2Prefix ? `${r2Prefix}/` : ''}${r2FileBySlug('gallery-1', '.jpg')};${autoPrefixR2 && r2Prefix ? `${r2Prefix}/` : ''}${r2FileBySlug('gallery-2', '.jpg')};${autoPrefixR2 && r2Prefix ? `${r2Prefix}/` : ''}${r2FileBySlug('gallery-3', '.jpg')}`;


  const currentEditingItem = useMemo(() => {
    if (item) return item;
    if (selectedItemId) {
      return existingItems.find(existing => existing.id === selectedItemId) || null;
    }
    return null;
  }, [item, selectedItemId, existingItems]);


  // Identity Vault: Persist ID across renders to prevent duplicate creation on multiple saves
  const draftId = useRef(item?.id || uuid());

  const ownerEntityIdForLinks = item?.id || selectedItemId || draftId.current;
  const ownerEntityName = item?.name || currentEditingItem?.name || name || 'Item';
  const hasEditableItem = !!(item || selectedItemId);
  const isDraftItem = !hasEditableItem;

  const saveFormDataToStorage = useCallback(() => {
    if (!item) {
      if (!name.trim()) {
        return;
      }
      const formData = {
        name,
        description,
        type,
        station,
        subItemType,
        collection,
        status,
        quantity,
        unitCost,
        price,
        keepInInventoryAfterSold,
        restockToTarget,
        year,
        mediaMain,
        mediaThumb,
        mediaGallery,
        sourceFileUrl,
        width,
        height,
        size,
        targetAmount,
        site
      };
      setPreference('item-modal-form-data', JSON.stringify(formData));
    }
  }, [item, name, description, type, station, subItemType, collection, status, quantity, unitCost, price, keepInInventoryAfterSold, restockToTarget, year, mediaMain, mediaThumb, mediaGallery, sourceFileUrl, width, height, size, targetAmount, site, setPreference]);

  const initializeBlankNewItemForm = useCallback(() => {
    draftId.current = uuid();
    const baseType = defaultItemType || ItemType.STICKER;
    const lastStation = getLastUsedStation();
    setName('');
    setDescription('');
    setType(baseType);
    setStation(lastStation);
    setSubItemType('');
    setItemTypeSubType(`${baseType}:`);
    setCollection(Collection.NO_COLLECTION);
    setStatus(ItemStatus.FOR_SALE);
    setQuantity(0);
    setUnitCost(0);
    setPrice(0);
    setKeepInInventoryAfterSold(false);
    setRestockToTarget(false);
    setYear(new Date().getFullYear());
    setMediaMain('');
    setMediaThumb('');
    setMediaGallery('');
    setSourceFileUrl('');
    setWidth('');
    setHeight('');
    setSize('');
    setTargetAmount('');
    setQuantitySold(0);
    setSite(initialSiteId || DEFAULT_NONE_SITE);
    setLocalSoldAt(undefined);
    setSelectedItemId('');
    setOwnerId(null);
    setOwnerCharacterName('');
  }, [defaultItemType, getLastUsedStation, initialSiteId]);

  const prevModalSessionRef = useRef<{ open: boolean; hadItem: boolean }>({
    open: false,
    hadItem: false,
  });

  useEffect(() => {
    const targetAmountNum = parseFloat(targetAmount);
    if ((!targetAmount || isNaN(targetAmountNum) || targetAmountNum <= 0) && restockToTarget) {
      setRestockToTarget(false);
    }
  }, [targetAmount, restockToTarget]);

  // Load form data from preferences when modal opens
  const loadFormDataFromStorage = useCallback(() => {
    if (!item) { // Only load for new items
      const savedData = getPreference('item-modal-form-data');
      if (savedData) {
        try {
          const formData = JSON.parse(savedData);
          setName(formData.name || '');
          setDescription(formData.description || '');
          const loadedType = formData.type || defaultItemType || ItemType.STICKER;
          const loadedSub = formData.subItemType || '';
          setType(loadedType);
          setStation(formData.station || DEFAULT_NEW_ITEM_STATION);
          setSubItemType(loadedSub);
          setItemTypeSubType(`${loadedType}:${loadedSub}`);
          setCollection(formData.collection || Collection.NO_COLLECTION);
          setStatus(formData.status || ItemStatus.FOR_SALE);
          setQuantity(formData.quantity || 0);
          setUnitCost(formData.unitCost || 0);
          setPrice(formData.price || 0);
          setKeepInInventoryAfterSold(
            typeof formData.keepInInventoryAfterSold === 'boolean'
              ? formData.keepInInventoryAfterSold
              : false // Default to false for all item types
          );
          setRestockToTarget(
            typeof formData.restockToTarget === 'boolean'
              ? formData.restockToTarget
              : false // Default to false
          );
          setYear(formData.year || new Date().getFullYear());
          setMediaMain(formData.mediaMain || '');
          setMediaThumb(formData.mediaThumb || '');
          setMediaGallery(formData.mediaGallery || '');
          setSourceFileUrl(formData.sourceFileUrl || '');
          setWidth(formData.width || '');
          setHeight(formData.height || '');
          setSize(formData.size || '');
          setTargetAmount(formData.targetAmount || '');
          setSite(formData.site || DEFAULT_NONE_SITE);
        } catch (error) {
          console.error('Error loading form data from preferences:', error);
        }
      }
    }
  }, [item, defaultItemType, getPreference]);

  const openQuickSellFlow = useCallback((targetItem: Item) => {
    const availableStock = (targetItem.stock || []).filter(point => point.quantity > 0);
    if (availableStock.length === 0) {
      console.log('No stock available to sell');
      return;
    }
    const defaultSite = availableStock[0].siteId ?? '';
    setQuickSellItem(targetItem);
    setQuickSellSiteId(defaultSite);
    setQuickSellQuantity(availableStock[0].quantity);
    setQuickSellMode('create-sale');
    setQuickSellError('');
    setShowQuickSellModal(true);
  }, []);

  const handleStatusChange = useCallback((value: ItemStatus) => {
    if (value === ItemStatus.SOLD) {
      if (currentEditingItem) {
        // Check if this is a manual status change (not via QuickSell)
        const wasNotSold = currentEditingItem.status !== ItemStatus.SOLD;
        if (wasNotSold) {
          // Manual status change - show confirmation
          setPendingSoldStatus(true);
          setShowSoldConfirmation(true);
          return;
        }
        // Otherwise proceed with QuickSell flow (automatic)
        openQuickSellFlow(currentEditingItem);
        return;
      }
    }
    
    // Clear soldAt if moving away from SOLD status
    if (value !== ItemStatus.SOLD) {
      setLocalSoldAt(undefined);
    } else if (!localSoldAt) {
      // If manually setting to SOLD without a valid soldAt, set one now
      setLocalSoldAt(new Date());
    }
    
    setStatus(value);
  }, [currentEditingItem, openQuickSellFlow, localSoldAt]);

  const executeQuickSale = useCallback(async (targetItem: Item, siteId: string, quantity: number) => {
    const now = new Date();
    const unitPrice = targetItem.price ?? 0;
    const subtotal = unitPrice * quantity;
    const sale: Sale = {
      id: uuid(),
      name: `${targetItem.name} Quick Sale`,
      description: `Quick sale generated from item modal for ${targetItem.name}`,
      saleDate: now,
      type: SaleType.DIRECT,
      status: SaleStatus.CHARGED,
      siteId,
      counterpartyName: 'Quick Sale',
      lines: [
        {
          lineId: uuid(),
          kind: 'item',
          itemId: targetItem.id,
          quantity,
          unitPrice,
          description: `Quick sale of ${targetItem.name}`
        } as SaleLine
      ],
      payments: subtotal > 0 ? [{
        method: PaymentMethod.FIAT_USD,
        amount: subtotal,
        currency: Currency.USD,
        receivedAt: now
      }] : undefined,
      totals: {
        subtotal,
        discountTotal: 0,
        taxTotal: 0,
        totalRevenue: subtotal
      },
      isNotPaid: false,
      isNotCharged: false,
      createdAt: now,
      updatedAt: now,
      doneAt: now,
      isCollected: false,
      links: []
    };
    await ClientAPI.upsertSale(sale);
  }, []);

  const executeArchiveOnlySale = useCallback(async (targetItem: Item, siteId: string, quantity: number) => {
    const stockClone = (targetItem.stock || []).map(point => ({ ...point }));
    let remaining = quantity;

    const deductFromStockIndex = (index: number) => {
      if (index < 0 || index >= stockClone.length || remaining <= 0) return;
      const stockPoint = stockClone[index];
      const deduction = Math.min(stockPoint.quantity, remaining);
      stockClone[index] = { ...stockPoint, quantity: stockPoint.quantity - deduction };
      remaining -= deduction;
    };

    const preferredIndex = stockClone.findIndex(point => point.siteId === siteId);
    deductFromStockIndex(preferredIndex);
    for (let i = 0; i < stockClone.length && remaining > 0; i++) {
      if (i === preferredIndex) continue;
      deductFromStockIndex(i);
    }

    const filteredStock = stockClone.filter(point => point.quantity > 0);
    const totalRemaining = filteredStock.reduce((sum, point) => sum + point.quantity, 0);

    const updatedItem: Item = {
      ...targetItem,
      stock: filteredStock,
      quantitySold: (targetItem.quantitySold || 0) + quantity,
      status: totalRemaining <= 0 ? ItemStatus.SOLD : targetItem.status,
      updatedAt: new Date(),
      createdAt: targetItem.createdAt ? new Date(targetItem.createdAt) : new Date(),
      links: targetItem.links || []
    };

    await ClientAPI.upsertItem(updatedItem);

    const soldAt = new Date();
    const snapshotId = `${targetItem.id}:manual:${soldAt.getTime()}`;
    const snapshotPayload = {
      ...targetItem,
      id: snapshotId,
      stock: [{ siteId, quantity }],
      quantitySold: quantity,
      unitCost: targetItem.unitCost ?? 0,
      price: targetItem.price ?? 0,
      value: (targetItem.price ?? 0) * quantity,
      status: ItemStatus.SOLD,
      createdAt: soldAt,
      updatedAt: soldAt,
      keepInInventoryAfterSold: targetItem.keepInInventoryAfterSold ?? false,
      restockToTarget: targetItem.restockToTarget ?? false,
      links: [],
      metadata: {
        source: 'item-modal',
        mode: 'archive-only',
        siteId,
        quantity,
        unitPrice: targetItem.price ?? 0,
      },
    } as Item;

    try {
      const response = await fetch('/api/archive/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshot: snapshotPayload,
          soldAt: soldAt.toISOString(),
        }),
      });
      if (!response.ok) {
        console.error('Failed to archive manual sale snapshot:', await response.text());
      }
    } catch (error) {
      console.error('Archive-only snapshot request failed:', error);
    }
  }, []);



  const refreshItemAfterQuickSell = useCallback(async (itemId: string) => {
    try {
      const refreshed = await ClientAPI.getItemById(itemId);
      if (refreshed) {
        setExistingItems(prev => {
          const index = prev.findIndex(existing => existing.id === itemId);
          if (index === -1) return prev;
          const next = [...prev];
          next[index] = refreshed;
          return next;
        });

        const remainingQuantity = refreshed.stock?.reduce((sum, stockPoint) => sum + stockPoint.quantity, 0) || 0;
        setQuantity(remainingQuantity);
        setStatus(refreshed.status || ItemStatus.FOR_SALE);
        setPrice(refreshed.price || 0);
        setUnitCost(refreshed.unitCost || 0);
        setCollection(refreshed.collection || Collection.NO_COLLECTION);
        setKeepInInventoryAfterSold(
          typeof refreshed.keepInInventoryAfterSold === 'boolean'
            ? refreshed.keepInInventoryAfterSold
            : false // Default to false
        );
        setRestockToTarget(
          typeof refreshed.restockToTarget === 'boolean'
            ? refreshed.restockToTarget
            : false // Default to false
        );

      }
    } catch (error) {
      console.error('Failed to refresh item after quick sell:', error);
    }
  }, []);

  const handleQuickSellConfirm = useCallback(async () => {
    if (!quickSellItem) return;
    const availableStock = (quickSellItem.stock || []).find(point => point.siteId === quickSellSiteId);
    const totalAvailable = availableStock?.quantity || 0;
    if (!quickSellSiteId) {
      setQuickSellError('Choose the site where the stock should be deducted.');
      return;
    }
    if (quickSellQuantity <= 0) {
      setQuickSellError('Quantity must be greater than zero.');
      return;
    }
    if (quickSellQuantity > totalAvailable) {
      setQuickSellError(`Only ${totalAvailable} units available at this site.`);
      return;
    }
    setQuickSellLoading(true);
    setQuickSellError('');
    try {
      if (quickSellMode === 'create-sale') {
        await executeQuickSale(quickSellItem, quickSellSiteId, quickSellQuantity);
      } else {
        await executeArchiveOnlySale(quickSellItem, quickSellSiteId, quickSellQuantity);
      }
      await refreshItemAfterQuickSell(quickSellItem.id);
      dispatchEntityUpdated(entityTypeToKind(EntityType.ITEM));
      setShowQuickSellModal(false);
      setQuickSellItem(null);
    } catch (error) {
      console.error('Quick sell failed:', error);
      setQuickSellError(error instanceof Error ? error.message : 'Failed to process sale');
    } finally {
      setQuickSellLoading(false);
    }
  }, [
    executeArchiveOnlySale,
    executeQuickSale,
    quickSellItem,
    quickSellMode,
    quickSellQuantity,
    quickSellSiteId,
    refreshItemAfterQuickSell
  ]);
  const handleDatesUpdate = useCallback(async (updates: {
    createdAt?: Date;
    doneAt?: Date;
  }) => {
    if (updates.doneAt !== undefined) {
      setLocalSoldAt(updates.doneAt);
    }
  }, []);

  // Save form data when modal closes
  useEffect(() => {
    if (!open) {
      saveFormDataToStorage();
    }
  }, [open, saveFormDataToStorage]);

  // New items open blank; in the name field press F8 to load last-saved draft from preferences.
  useEffect(() => {
    const prev = prevModalSessionRef.current;
    const hadItem = !!item;
    const justOpenedForNew = open && !item && !prev.open;
    const switchedFromEditToNew = open && !item && prev.hadItem;

    if (justOpenedForNew || switchedFromEditToNew) {
      initializeBlankNewItemForm();
    }

    prevModalSessionRef.current = { open, hadItem };

    if (!open) {
      setOwnerId(null);
      setOwnerCharacterName('');
      setSelectedItemId('');
      setShowOwnerModal(false);
    }
  }, [open, item, initializeBlankNewItemForm]);

  const handleStationCategoryChange = (newStationCategory: string) => {
    const newStation = getStationFromCombined(newStationCategory) as Station;

    setStation(newStation);
    setPreference('item-modal-last-station', newStation);
  };

  const handleItemTypeSubTypeChange = (newItemTypeSubType: string) => {
    const newItemType = getItemTypeFromCombined(newItemTypeSubType) as ItemType;
    const newSubType = getSubTypeFromCombined(newItemTypeSubType) as SubItemType;

    setItemTypeSubType(newItemTypeSubType);
    setType(newItemType);
    setSubItemType(newSubType || '');

    if (!item && !selectedItemId) {
      setKeepInInventoryAfterSold(false); // Default to false for all item types
      setRestockToTarget(false); // Default to false for all item types
    }

    // Save to user preferences
    const prefKey = `item-modal-last-subtype-${newItemType}`;
    setPreference(prefKey, newItemTypeSubType);
  };

  // Load existing items and sites for selection
  useEffect(() => {
    const loadUIData = async () => {
      try {
        const [items, sitesData] = await Promise.all([
          ClientAPI.getItems(),
          ClientAPI.getSites()
        ]);
        setExistingItems(items);
        setSites(sitesData);
      } catch (error) {
        console.error('Failed to load UI data for item modal:', error);
        setExistingItems([]);
        setSites([]);
      }
    };
    loadUIData();
  }, []);

  // Effect to populate state when the item prop changes
  // Only resets when editing an existing item; new items initialize once
  useEffect(() => {
    if (item) {
      // Editing existing item - populate from item
      setName(item.name || '');
      setDescription(item.description || '');
      const itemType = item.type || defaultItemType || ItemType.STICKER;
      const itemSubType = item.subItemType || '';
      setType(itemType);
      setSubItemType(itemSubType);
      setItemTypeSubType(`${itemType}:${itemSubType}`);

      const itemStation = item.station || '';
      setStation(itemStation);
      setCollection(item.collection || Collection.NO_COLLECTION);
      setStatus(item.status || ItemStatus.FOR_SALE);
      const itemSiteId = initialSiteId || item.stock?.[0]?.siteId || '';
      setSite(itemSiteId);

      // Populate quantity based on specific site if provided, otherwise show total
      if (initialSiteId) {
        const specificStock = item.stock?.find((stockPoint) => stockPoint.siteId === initialSiteId);
        setQuantity(specificStock?.quantity || 0);
      } else {
        setQuantity(item.stock?.reduce((total: number, stockPoint) => total + stockPoint.quantity, 0) || 0);
      }

      setUnitCost(item.unitCost || 0);
      setPrice(item.price || 0);
      setKeepInInventoryAfterSold(
        typeof item.keepInInventoryAfterSold === 'boolean'
          ? item.keepInInventoryAfterSold
          : false // Default to false
      );
      setRestockToTarget(
        typeof item.restockToTarget === 'boolean'
          ? item.restockToTarget
          : false // Default to false
      );
      setYear(item.year || new Date().getFullYear());
      setMediaMain(item.media?.main || '');
      setMediaThumb(item.media?.thumb || '');
      setMediaGallery(item.media?.gallery?.join(';') || '');
      setSourceFileUrl(item.sourceFileUrl || '');
      setWidth(item.dimensions?.width?.toString() || '');
      setHeight(item.dimensions?.height?.toString() || '');
      setSize(item.size || '');
      setTargetAmount(item.targetAmount?.toString() || '');
      setQuantitySold(item.quantitySold || 0);

      setOwnerId(getItemCharacterId(item) || null);
      setOwnerCharacterName('');
    }
  }, [item, defaultItemType, initialSiteId]);

  // Effect to handle auto-select of subtype when modal opens for new items
  useEffect(() => {
    if (!item && open && defaultItemType) {
      // Load last used subtype for this ItemType
      const prefKey = `item-modal-last-subtype-${defaultItemType}`;
      const lastUsedSubtype = getPreference(prefKey);

      if (lastUsedSubtype) {
        // Use the last selected subtype
        setItemTypeSubType(lastUsedSubtype);
        setType(getItemTypeFromCombined(lastUsedSubtype) as ItemType);
        setSubItemType(getSubTypeFromCombined(lastUsedSubtype) as SubItemType);
      } else {
        // First time: select first subtype
        const subtypes = getSubTypesForItemType(defaultItemType);
        if (subtypes.length > 0) {
          const firstOption = `${defaultItemType}:${subtypes[0]}`;
          setItemTypeSubType(firstOption);
          setType(defaultItemType);
          setSubItemType(subtypes[0]);
        } else {
          // No subtypes available, just set type
          setItemTypeSubType(`${defaultItemType}:`);
          setType(defaultItemType);
          setSubItemType('');
        }
      }
    }
  }, [item, open, defaultItemType, getPreference]);

  // Load owner character name when ownerId changes
  useEffect(() => {
    const loadOwnerCharacter = async () => {
      if (ownerId) {
        try {
          const characters = await ClientAPI.getCharacters();
          const owner = characters.find(c => c.id === ownerId);
          setOwnerCharacterName(owner?.name || 'Unknown');
        } catch (error) {
          console.error('Failed to load owner character:', error);
          setOwnerCharacterName('Unknown');
        }
      } else {
        setOwnerCharacterName('');
      }
    };
    loadOwnerCharacter();
  }, [ownerId]);

  // Handle setting owner character
  const handleSetOwner = (characterId: string | null) => {
    setOwnerId(characterId);
  };

  // Handle item selection from SearchableSelect
  const handleItemSelect = (itemId: string) => {
    setSelectedItemId(itemId);
    if (itemId) {
      const selectedItem = existingItems.find(item => item.id === itemId);
      if (selectedItem) {
        setName(selectedItem.name);
        setDescription(selectedItem.description || '');
        setType(selectedItem.type);
        setStation(selectedItem.station || 'strategy');
        setSubItemType(selectedItem.subItemType || '');
        setCollection(selectedItem.collection || Collection.NO_COLLECTION);
        setStatus(selectedItem.status || ItemStatus.FOR_SALE);
        // Calculate quantity: use site-specific if initialSiteId is set, otherwise total
        if (initialSiteId) {
        const specificStock = selectedItem.stock?.find((stockPoint) => stockPoint.siteId === initialSiteId);
          setQuantity(specificStock?.quantity || 0);
          setSite(initialSiteId);
        } else {
          const totalQuantity = selectedItem.stock?.reduce((sum, stockPoint) => sum + stockPoint.quantity, 0) || 0;
          setQuantity(totalQuantity);
          setSite(selectedItem.stock?.[0]?.siteId || '');
        }

        setUnitCost(selectedItem.unitCost || 0);
        setPrice(selectedItem.price || 0);
        setKeepInInventoryAfterSold(
          typeof selectedItem.keepInInventoryAfterSold === 'boolean'
            ? selectedItem.keepInInventoryAfterSold
            : false // Default to false
        );
        setRestockToTarget(
          typeof selectedItem.restockToTarget === 'boolean'
            ? selectedItem.restockToTarget
            : false // Default to false
        );
        setYear(selectedItem.year || new Date().getFullYear());
        setMediaMain(selectedItem.media?.main || '');
        setMediaThumb(selectedItem.media?.thumb || '');
        setMediaGallery(selectedItem.media?.gallery?.join(';') || '');
        setSourceFileUrl(selectedItem.sourceFileUrl || '');
        // Extract dimensions
        setWidth(selectedItem.dimensions?.width?.toString() || '');
        setHeight(selectedItem.dimensions?.height?.toString() || '');
        setSize(selectedItem.size || '');
        setTargetAmount(selectedItem.targetAmount?.toString() || '');
        setQuantitySold(selectedItem.quantitySold || 0);
        setLocalSoldAt(selectedItem.soldAt ? new Date(selectedItem.soldAt) : undefined);
        setOwnerId(getItemCharacterId(selectedItem) || null);
      }
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    const isCreatingNewItem = !item && !selectedItemId;
    setIsSaving(true);
    setShowOwnerModal(false);

    try {
      const dimensions = width && height ? {
        width: parseFloat(width),
        height: parseFloat(height),
        area: parseFloat(width) * parseFloat(height) / CM_TO_M2_CONVERSION // Convert to m²
      } : undefined;

      // Parse size field
      const parsedSize = size.trim() || undefined;

      // Handle stock quantity - add to existing if item already exists at this site
      let updatedStock: StockPoint[] = [];

      // Determine if we're editing an existing item (either via prop or selectedItemId)
      const isEditingExistingItem = item || selectedItemId;

      if (isEditingExistingItem) {
        // Editing existing item - get the item data
        const existingItem = item || existingItems.find(i => i.id === selectedItemId);

        if (existingItem) {
          // Merge with existing stock
          updatedStock = [...(existingItem.stock || [])];

          // SMART UPDATE LOGIC:
          // If the item only has stock at ONE location (classic single-site item),
          // and the user changes the Site dropdown, they intend to MOVE the item to the new site.
          // We should update that single entry's siteId instead of creating a new one.
          if (updatedStock.length === 1) {
            updatedStock[0] = {
              siteId: site,
              quantity: quantity || 0
            };
          } else {
            // Multi-site item: Treat as "Edit Stock at [Site]"
            // If user selects a new site, they are adding/editing stock at THAT site.
            // We do NOT remove stock from other sites (safety first).
            const existingStockIndex = updatedStock.findIndex(stock => stock.siteId === site);

            if (existingStockIndex >= 0) {
              // Update existing quantity at this site
              updatedStock[existingStockIndex] = {
                siteId: site,
                quantity: quantity || 0
              };
              console.log(`📦 Updated stock at ${site}: ${quantity || 0} units`);
            } else {
              // Add new stock point at this site
              updatedStock.push({
                siteId: site,
                quantity: quantity || 0
              });
              console.log(`📦 Added new stock at ${site}: ${quantity || 0} units`);
            }
          }
        }
      } else {
        // Creating new item - single stock point
        updatedStock = [{
          siteId: site,
          quantity: quantity || 0
        }];
      }

      // Resolve final media values with optional R2 prefix/suffix handling
      const finalMediaMain = applyR2PrefixAndSuffixToValue(mediaMain, 'main', '.png');
      const finalMediaThumb = applyR2PrefixAndSuffixToValue(mediaThumb, 'thumb', '.jpg');
      const finalMediaGalleryString = mediaGallery
        .split(';')
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part, index) => applyR2PrefixAndSuffixToValue(part, `gallery-${index + 1}`, '.jpg'))
        .join(';');
      const finalMediaGalleryArray = finalMediaGalleryString
        ? finalMediaGalleryString.split(';').map((part: string) => part.trim()).filter(Boolean)
        : undefined;

      let finalId = item?.id;
      if (!finalId) {
        if (selectedItemId) {
          finalId = selectedItemId; // We are updating an existing item selected from dropdown
        } else {
          finalId = draftId.current; // Identity Vault: Use persistent ID
        }
      }

      const newItem: Item = {
        id: finalId,
        name,
        description,
        type,
        station,
        subItemType: subItemType || undefined,
        collection: collection as Collection,
        status,
        unitCost,
        additionalCost: 0,
        price,
        value: 0,
        keepInInventoryAfterSold,
        restockToTarget,
        quantitySold,
        year,
        media: {
          main: finalMediaMain,
          thumb: finalMediaThumb || undefined,
          gallery: finalMediaGalleryArray,
        },
        sourceFileUrl: sourceFileUrl || undefined,
        stock: updatedStock,
        dimensions,
        size: parsedSize,
        targetAmount: targetAmount && !isNaN(parseFloat(targetAmount)) ? parseFloat(targetAmount) : undefined,
        characterId: ownerId || null,
        // Preserve creation date if editing, otherwise new date
        createdAt: (item || existingItems.find(i => i.id === selectedItemId))?.createdAt || getUTCNow(),
        updatedAt: getUTCNow(),
        soldAt: status === ItemStatus.SOLD ? (localSoldAt ?? item?.soldAt ?? getUTCNow()) : undefined,
        links: (item || existingItems.find(i => i.id === selectedItemId))?.links || [],  // preserve embedded mirror
      };

      // Clear saved form data when item is successfully saved (only for truly new items)
      if (!item && !selectedItemId) {
        setPreference('item-modal-form-data', '');
      }

      // Emit pure item entity - Links System handles all relationships automatically
      await onSave(newItem);

      // Dispatch UI update events AFTER successful save
      dispatchEntityUpdated(entityTypeToKind(EntityType.ITEM));

      // Links are loaded on-demand when user clicks "View Links" button
      if (isCreatingNewItem) {
        setOwnerId(null);
        setOwnerCharacterName('');
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Save failed:', error);
      // Keep modal open on error
    } finally {
      setIsSaving(false);
    }
  };

  const getSubItemTypeOptions = () => {
    return getSubTypesForItemType(type);
  };

  const showSubItemType = getSubTypesForItemType(type).length > 0;
  const showDimensions = type === ItemType.PRINT || type === ItemType.ARTWORK || type === ItemType.STICKER || type === ItemType.MATERIAL;
  const showModelSize = type === ItemType.PRINT || type === ItemType.ARTWORK || type === ItemType.MERCH;
  const showYear = true; // Always show Year field

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent zIndexLayer={'MODALS'} className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-lg">{(item || selectedItemId) ? 'Edit Item' : 'Add New Item'}</DialogTitle>
          </DialogHeader>

          {/* Main Fields - 3 Columns */}
          <div className="grid grid-cols-3 gap-6">
            {/* Column 1 - NATIVE (Item Basics) */}
            <div className="space-y-3">
              {/* <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">🧬 NATIVE</h3>*/}
              <div>
                <ItemNameField
                  value={name}
                  onChange={setName}
                  placeholder="Item name"
                  items={existingItems}
                  selectedItemId={selectedItemId}
                  onItemSelect={handleItemSelect}
                  isNewItem={isNameFieldNewItem}
                  onNewItemToggle={setIsNameFieldNewItem}
                  onLoadLastSavedForm={() => loadFormDataFromStorage()}
                  label="Item Name"
                  sites={sites}
                />
              </div>

              <div>
                <label htmlFor="station-category" className="text-xs">Station & Category</label>
                <SearchableSelect
                  value={getStationValue(station)}
                  onValueChange={handleStationCategoryChange}
                  options={createStationCategoryOptions()}
                  autoGroupByCategory={true}
                  getCategoryForValue={(value) => getCategoryFromCombined(value)}
                  placeholder="Select station..."
                  className="h-8 text-sm mt-1"
                  persistentCollapsible={true}
                  instanceId="item-modal-station-category"
                />
              </div>

              <div>
                <Label htmlFor="item-type-subtype" className="text-xs">Type & Subtype *</Label>
                <SearchableSelect
                  value={itemTypeSubType}
                  onValueChange={handleItemTypeSubTypeChange}
                  options={createItemTypeSubTypeOptions()}
                  autoGroupByCategory={true}
                  placeholder="Select item type and subtype..."
                  className="h-8 text-sm mt-1"
                  persistentCollapsible={true}
                  instanceId="item-modal-item-type"
                />
              </div>
            </div>

            {/* Column 2 - NATIVE (Item Data) */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="quantity" className="text-xs">Quantity *</Label>
                  <NumericInput
                    id="quantity"
                    value={quantity}
                    onChange={(value) => setQuantity(value)}
                    min={0}
                    className="h-8 text-sm mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="quantitySold" className="text-xs">Sold Q</Label>
                  <NumericInput
                    id="quantitySold"
                    value={quantitySold}
                    onChange={(value) => setQuantitySold(value)}
                    min={0}
                    placeholder="Sold"
                    className="h-8 text-sm mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="unitCost" className="text-xs">Unit Cost</Label>
                  <NumericInput
                    id="unitCost"
                    value={unitCost}
                    onChange={setUnitCost}
                    className="h-8 text-sm mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="price" className="text-xs">Price</Label>
                  <NumericInput
                    id="price"
                    value={price}
                    onChange={setPrice}
                    className="h-8 text-sm mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="targetAmount" className="text-xs">Target Q</Label>
                  <NumericInput
                    id="targetAmount"
                    value={targetAmount ? parseFloat(targetAmount) : 0}
                    onChange={(value) => setTargetAmount(value.toString())}
                    min={0}
                    placeholder="Target"
                    className="h-8 text-sm mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="year" className="text-xs">Year</Label>
                  <NumericInput
                    id="year"
                    value={year}
                    onChange={(value) => setYear(Math.max(YEAR_MIN, Math.min(YEAR_MAX, Math.floor(value))))}
                    min={YEAR_MIN}
                    className="h-8 text-sm mt-1"
                    placeholder={new Date().getFullYear().toString()}
                  />
                </div>
              </div>
            </div>

            {/* Column 3 - AMBASSADOR (Site References) */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="site" className="text-xs">Site</Label>
                <SearchableSelect
                  value={site}
                  onValueChange={(value) => setSite(value)}
                  placeholder="Select site"
                  options={siteOptions}
                  autoGroupByCategory={true}
                  className="h-8 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="collection" className="text-xs">Collection</Label>
                <Select value={collection} onValueChange={(value) => setCollection(value as Collection)}>
                  <SelectTrigger className="h-8 text-sm mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={Collection.NO_COLLECTION}>No Collection</SelectItem>
                    {Object.values(Collection).filter(c => c !== Collection.NO_COLLECTION).map(col => (
                      <SelectItem key={col} value={col}>{getCollectionLabel(col)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Switch
                  id="keepInInventoryAfterSold"
                  checked={keepInInventoryAfterSold}
                  onCheckedChange={(checked) => setKeepInInventoryAfterSold(checked)}
                />
                <Label htmlFor="keepInInventoryAfterSold" className="text-xs">
                  Keep Item in Inventory after Sold?
                </Label>
              </div>

            <div className="flex items-center gap-3 pt-1">
                <Switch
                  id="restockToTarget"
                  checked={restockToTarget}
                  onCheckedChange={(checked) => setRestockToTarget(checked)}
                disabled={!targetAmount || parseFloat(targetAmount) <= 0}
                />
                <Label htmlFor="restockToTarget" className="text-xs">
                Restock when Sold?
                {(!targetAmount || parseFloat(targetAmount) <= 0) && (
                    <span className="text-muted-foreground ml-2">
                      {(!targetAmount || parseFloat(targetAmount) <= 0) && "(requires Target Amount > 0)"}
                    </span>
                  )}
                </Label>
              <Button
                variant="outline"
                size="sm"
                className="h-6"
                disabled={!targetAmount || parseFloat(targetAmount) <= 0}
                onClick={() => {
                  const parsedTarget = parseFloat(targetAmount);
                  if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
                    return;
                  }
                  setQuantity(parsedTarget);
                }}
              >
                Restock
              </Button>
              </div>
            </div>
          </div>

          {/* More Fields (Collapsible) */}
          <div className="border-t pt-3 mt-4">
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMoreFields(!showMoreFields)}
                className="h-7 text-xs"
              >
                {showMoreFields ? 'Hide' : 'Show'} Extra Fields
              </Button>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <Switch
                    id="autoPrefixR2"
                    checked={autoPrefixR2}
                    onCheckedChange={(checked) => {
                      setAutoPrefixR2(checked);
                      void setPreference('item-modal-auto-prefix-r2', checked);
                    }}
                  />
                  <Label htmlFor="autoPrefixR2" className="text-xs cursor-pointer select-none">
                    Prefix r2
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="autoSuffixR2"
                    checked={autoSuffixR2}
                    onCheckedChange={(checked) => {
                      setAutoSuffixR2(checked);
                      void setPreference('item-modal-auto-suffix-r2', checked);
                    }}
                  />
                  <Label htmlFor="autoSuffixR2" className="text-xs cursor-pointer select-none">
                    Suffix r2
                  </Label>
                </div>
              </div>
            </div>

            {showMoreFields && (
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-3 gap-4">
                  {/* Left: R2 keys + source URL */}
                  <div className="col-span-2 space-y-3">
                    <div>
                      <Label htmlFor="mediaMain" className="text-xs">
                        Main r2 key (.png)
                      </Label>
                      <Input
                        id="mediaMain"
                        value={mediaMain}
                        onChange={(e) => setMediaMain(e.target.value)}
                        placeholder={r2MainPlaceholder}
                        className="h-8 text-sm mt-1 ring-1 ring-primary/20"
                        onKeyDown={makeR2ArrowFillHandler(setMediaMain, 'main')}
                      />
                    </div>

                    <div>
                      <Label htmlFor="mediaGallery" className="text-xs">
                        Gallery r2 key (.jpg ; separate semicolon)
                      </Label>
                      <Input
                        id="mediaGallery"
                        value={mediaGallery}
                        onChange={(e) => setMediaGallery(e.target.value)}
                        placeholder={r2GalleryPlaceholder}
                        className="h-8 text-sm mt-1"
                        onKeyDown={makeR2ArrowFillHandler(setMediaGallery, 'gallery')}
                      />
                    </div>

                    <div>
                      <Label htmlFor="mediaThumb" className="text-xs">
                        Thumb r2 key (.jpg)
                      </Label>
                      <Input
                        id="mediaThumb"
                        value={mediaThumb}
                        onChange={(e) => setMediaThumb(e.target.value)}
                        placeholder={r2ThumbPlaceholder}
                        className="h-8 text-sm mt-1"
                        onKeyDown={makeR2ArrowFillHandler(setMediaThumb, 'thumb')}
                      />
                    </div>
                  </div>

                  {/* Right: description + dimensions/model size row + source URL */}
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="description" className="text-xs">
                        Description
                      </Label>
                      <Input
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Item description"
                        className="h-8 text-sm mt-1"
                      />
                    </div>

                    {(showDimensions || showModelSize) && (
                      <div
                        className={
                          showDimensions && showModelSize
                            ? 'grid grid-cols-3 gap-2'
                            : showDimensions
                              ? 'grid grid-cols-2 gap-2'
                              : 'grid grid-cols-1 gap-2'
                        }
                      >
                        {showDimensions && (
                          <>
                            <div>
                              <Label htmlFor="width" className="text-xs">
                                Width (cm)
                              </Label>
                              <NumericInput
                                id="width"
                                value={width ? parseFloat(width) : 0}
                                onChange={(value) => setWidth(value.toString())}
                                min={0}
                                step={0.1}
                                className="h-8 text-sm mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor="height" className="text-xs">
                                Height (cm)
                              </Label>
                              <NumericInput
                                id="height"
                                value={height ? parseFloat(height) : 0}
                                onChange={(value) => setHeight(value.toString())}
                                min={0}
                                step={0.1}
                                className="h-8 text-sm mt-1"
                              />
                            </div>
                          </>
                        )}
                        {showModelSize && (
                          <div>
                            <Label htmlFor="size" className="text-xs">
                              Model Size
                            </Label>
                            <Input
                              id="size"
                              value={size}
                              onChange={(e) => setSize(e.target.value)}
                              placeholder="M, L, XL, 7.5"
                              className="h-8 text-sm mt-1"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <Label htmlFor="sourceFileUrl" className="text-xs">
                        Source file url
                      </Label>
                      <Input
                        id="sourceFileUrl"
                        value={sourceFileUrl}
                        onChange={(e) => setSourceFileUrl(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        className="h-8 text-sm mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-between flex-wrap gap-4 items-center pt-4 border-t">
            <div className="flex gap-2 flex-wrap items-center">
              {hasEditableItem && ( // Show DELETE/VIEW LINKS/MOVE for existing items
                <>
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteModal(true)}
                    className="h-8 text-xs text-destructive hover:bg-destructive/10 border-destructive/20 mr-4"
                  >
                    Delete
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setShowDatesModal(true)}
                    className="h-8 text-xs bg-secondary/50"
                  >
                    <CalendarIcon className="w-3 h-3 mr-2" />
                    Timeline
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setShowLinksModal(true)}
                    className="h-8 text-xs bg-secondary/50"
                  >
                    <Network className="w-3 h-3 mr-2" />
                    Links
                  </Button>
                </>
              )}

              {/* Owner button - available for both creating and editing */}
              <Button
                variant="outline"
                onClick={() => setShowOwnerModal(true)}
                className="h-8 text-xs"
              >
                <User className="w-3 h-3 mr-1" />
                {ownerId ? `Owner: ${ownerCharacterName}` : 'Set Owner'}
              </Button>
            </div>

            <div className="flex gap-2 items-center">
              {/* Status in footer */}
              <div className="flex items-center gap-2">
                <Label htmlFor="status-footer" className="text-xs whitespace-nowrap">Status:</Label>
                <Select value={status} onValueChange={(value) => handleStatusChange(value as ItemStatus)}>
                  <SelectTrigger className="h-8 text-sm w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ItemStatus).map(status => (
                      <SelectItem key={status} value={status}>{getItemStatusLabel(status)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="h-6 w-px bg-border mx-2"></div>

              <Button variant="outline" onClick={() => onOpenChange(false)} className="h-8 text-xs" disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!name.trim() || isSaving} className="h-8 text-xs">
                {isSaving ? 'Saving...' : ((item || selectedItemId) ? 'Update' : 'Create')} Item
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {/* DELETE Modal */}
      <DeleteModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        entityType={EntityType.ITEM}
        entities={currentEditingItem ? [currentEditingItem] : []}
        onComplete={async () => {
          setShowDeleteModal(false);
          // Reload existing items to update SearchableSelect
          try {
            const updatedItems = await ClientAPI.getItems();
            setExistingItems(updatedItems);

            // Clear selectedItemId if the deleted item was selected
            const deletedItem = item || (selectedItemId && existingItems.find(i => i.id === selectedItemId));
            if (deletedItem && selectedItemId === deletedItem.id) {
              setSelectedItemId('');
              setName('');
              // Reset form to create mode
              setIsNameFieldNewItem(true);
            }
          } catch (error) {
            console.error('Failed to reload items after deletion:', error);
          }
          onOpenChange(false); // Close the modal after deleting
        }}
      />

      {/* Quick Sell Modal */}
      <Dialog open={showQuickSellModal} onOpenChange={(open) => {
        setShowQuickSellModal(open);
        if (!open) {
          setQuickSellError('');
          setQuickSellItem(null);
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Quick Sell {quickSellItem?.name || ''}</DialogTitle>
            <DialogDescription>
              Choose how many units to sell and whether to generate a Sale record or archive only.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Available Stock</Label>
              <p className="text-xs text-muted-foreground mt-1">
                {(quickSellItem?.stock || [])
                  .filter(point => point.quantity > 0)
                  .map(point => `${point.siteId || '—'}: ${point.quantity}`)
                  .join(' • ') || 'No stock available'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Site</Label>
                <Select value={quickSellSiteId} onValueChange={(value) => setQuickSellSiteId(value)}>
                  <SelectTrigger className="h-8 text-sm mt-1">
                    <SelectValue placeholder="Select site" />
                  </SelectTrigger>
                  <SelectContent>
                    {(quickSellItem?.stock || [])
                      .filter(point => point.quantity > 0)
                      .map(point => (
                        <SelectItem key={point.siteId || 'unknown'} value={point.siteId || ''}>
                          {(point.siteId || 'Unknown')} ({point.quantity})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Quantity</Label>
                <NumericInput
                  value={quickSellQuantity}
                  onChange={(value) => setQuickSellQuantity(value ?? 0)}
                  min={1}
                  className="h-8 text-sm mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Flow</Label>
              <Select value={quickSellMode} onValueChange={(value) => setQuickSellMode(value as 'create-sale' | 'archive-only')}>
                <SelectTrigger className="h-8 text-sm mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="create-sale">Create Sale (recommended)</SelectItem>
                  <SelectItem value="archive-only">Archive Only (no sale)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {quickSellMode === 'create-sale'
                  ? 'Generates a Sale record, adjusts inventory, and archives the sold snapshot automatically.'
                  : 'Reduces stock and logs the sale without creating a Sale record.'}
              </p>
            </div>

            {quickSellError && (
              <p className="text-xs text-destructive">{quickSellError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuickSellModal(false)} disabled={quickSellLoading}>
              Cancel
            </Button>
            <Button onClick={handleQuickSellConfirm} disabled={quickSellLoading}>
              {quickSellLoading ? 'Processing...' : quickSellMode === 'create-sale' ? 'Create Sale' : 'Archive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Links Relationships Modal */}
      {item && (
        <LinksRelationshipsModal
          entity={{ type: EntityType.ITEM, id: item.id, name: item.name }}
          open={showLinksModal}
          onClose={() => setShowLinksModal(false)}
        />
      )}

      {/* Owner Submodal */}
      {open && (
        <OwnerSubmodal
          open={showOwnerModal}
          onOpenChange={setShowOwnerModal}
          entityType={EntityType.ITEM}
          entityId={ownerEntityIdForLinks}
          entityName={ownerEntityName}
          linkType={LinkType.ITEM_CHARACTER}
          isDraft={isDraftItem}
          currentOwnerId={ownerId}
          onDraftOwnerChange={(ownerId) => {
            setOwnerId(ownerId);
            if (ownerId) {
              ClientAPI.getCharacters().then((characters) => {
                const owner = characters.find(c => c.id === ownerId);
                setOwnerCharacterName(owner?.name || 'Unknown');
              }).catch(() => setOwnerCharacterName('Unknown'));
            } else {
              setOwnerCharacterName('');
            }
          }}
          onOwnersChanged={isDraftItem ? undefined : () => {
            // Refresh owner display
            const loadOwner = async () => {
              const links = await ClientAPI.getLinksFor({ type: EntityType.ITEM, id: ownerEntityIdForLinks });
              const ownerLink = links.find((link: Link) => {
                if (link.linkType !== LinkType.ITEM_CHARACTER) return false;
                const isCanonical = link.source.type === EntityType.ITEM && link.source.id === ownerEntityIdForLinks && link.target.type === EntityType.CHARACTER;
                const isReverse = link.target.type === EntityType.ITEM && link.target.id === ownerEntityIdForLinks && link.source.type === EntityType.CHARACTER;
                return isCanonical || isReverse;
              });
              const nextOwnerId = ownerLink?.source.type === EntityType.CHARACTER
                ? ownerLink.source.id
                : ownerLink?.target.type === EntityType.CHARACTER
                  ? ownerLink.target.id
                  : null;
              if (nextOwnerId) {
                setOwnerId(nextOwnerId);
                const characters = await ClientAPI.getCharacters();
                const owner = characters.find(c => c.id === nextOwnerId);
                setOwnerCharacterName(owner?.name || 'Unknown');
              } else {
                setOwnerId(null);
                setOwnerCharacterName('');
              }
            };
            loadOwner();
            dispatchEntityUpdated(entityTypeToKind(EntityType.ITEM));
          }}
        />
      )}

      {/* Archive Collection Confirmation Modal for manual SOLD status */}
      {pendingSoldStatus && currentEditingItem && (
        <ArchiveCollectionConfirmationModal
          open={showSoldConfirmation}
          onOpenChange={setShowSoldConfirmation}
          entityType="item"
          entityName={currentEditingItem.name || 'Untitled Item'}
          onConfirm={() => {
            setLocalSoldAt(new Date());
            setStatus(ItemStatus.SOLD);
            setShowSoldConfirmation(false);
            setPendingSoldStatus(false);
          }}
          onCancel={() => {
            setPendingSoldStatus(false);
            setShowSoldConfirmation(false);
          }}
        />
      )}

      {/* Dates & Timeline Submodal */}
      {hasEditableItem && currentEditingItem && (
        <DatesSubmodal
          open={showDatesModal}
          onOpenChange={setShowDatesModal}
          entityMode="item"
          entityId={currentEditingItem?.id ? `data:item:${currentEditingItem.id}` : undefined}
          createdAt={currentEditingItem?.createdAt ? new Date(currentEditingItem.createdAt) : undefined}
          doneAt={localSoldAt}
          currentStatus={status}
          onDatesChange={handleDatesUpdate}
        />
      )}
    </>
  );
}
