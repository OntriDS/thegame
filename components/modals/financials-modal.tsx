'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import DeleteModal from './submodals/delete-submodal';
import LinksRelationshipsModal from './submodals/links-relationships-submodal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import NumericInput from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { ItemNameField } from '@/components/ui/item-name-field';
import { Network, User } from 'lucide-react';
import PlayerCharacterSelectorModal from './submodals/player-character-selector-submodal';
import { FinancialRecord, Item, Site } from '@/types/entities';
import {
  BUSINESS_STRUCTURE,
  FinancialStatus
} from '@/types/enums';
import { getCompanyAreas, getPersonalAreas, isCompanyStation, isPersonalStation, getAreaForStation } from '@/lib/utils/business-structure-utils';
import type { Station, SubItemType } from '@/types/type-aliases';
import { ItemType, Collection, CharacterRole, PLAYER_ONE_ID, EntityType } from '@/types/enums';
import { getSubTypesForItemType } from '@/lib/utils/item-utils';
import { getCategoryForItemType, createItemTypeOptionsWithCategories, createStationCategoryOptions, createCharacterOptions, createItemTypeSubTypeOptions, getItemTypeFromCombined, getCategoryFromCombined, getStationFromCombined } from '@/lib/utils/searchable-select-utils';
import { createSiteOptionsWithCategories } from '@/lib/utils/site-options-utils';
import { ClientAPI } from '@/lib/client-api';
import { dispatchEntityUpdated, entityTypeToKind } from '@/lib/ui/ui-events';
import { useUserPreferences } from '@/lib/hooks/use-user-preferences';
// Side effects handled by parent component via API calls
import { v4 as uuid } from 'uuid';
import { PRICE_STEP, QUANTITY_STEP, J$_TO_USD_RATE } from '@/lib/constants/app-constants';
import { formatMonthYear } from '@/lib/utils/date-utils';
import { ItemStatus } from '@/types/enums';
import { getZIndexClass } from '@/lib/utils/z-index-utils';
import { VALIDATION_CONSTANTS } from '@/lib/constants/financial-constants';
import ArchiveCollectionConfirmationModal from './submodals/archive-collection-confirmation-submodal';
import { MonthYearSelector } from '@/components/ui/month-year-selector';


// FinancialsModal: UI-only form for financial record data collection and validation
// Side effects and persistence handled by parent component


// Helper function to determine default item status (same as Task completion)
function getDefaultItemStatus(itemType: string, isSold: boolean = false): ItemStatus {
  if (isSold) {
    return ItemStatus.SOLD;
  }

  switch (itemType) {
    case 'Product':
    case 'Merch':
    case 'Print':
    case 'Sticker':
      return ItemStatus.FOR_SALE;
    case 'Material':
    case 'Supply':
      return ItemStatus.IDLE;
    case 'Equipment':
    case 'Tool':
      return ItemStatus.IDLE;
    default:
      return ItemStatus.FOR_SALE; // Default fallback
  }
}

interface FinancialsModalProps {
  record?: FinancialRecord | null;
  year: number;
  month: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (record: FinancialRecord) => Promise<void>;
  onDelete?: () => void;
}



export default function FinancialsModal({ record, year, month, open, onOpenChange, onSave, onDelete }: FinancialsModalProps) {
  const { getPreference, setPreference } = useUserPreferences();

  // User preference functions - memoized to prevent dependency changes
  const getLastUsedStation = useCallback((): Station => {
    const saved = getPreference('finrec-modal-last-station');
    return (saved as Station) || ('Strategy' as Station);
  }, [getPreference]);

  const getLastUsedCategory = useCallback((station: Station): Station => {
    const saved = getPreference(`finrec-modal-last-category-${station}`);
    if (saved) return saved as Station;
    const categories = BUSINESS_STRUCTURE[station as keyof typeof BUSINESS_STRUCTURE];
    return categories && categories.length > 0 ? categories[0] : categories[0] as Station;
  }, [getPreference]);


  // Helper function to get the correct value format for SearchableSelect
  const getStationValue = (station: Station): string => {
    const area = getAreaForStation(station);
    return `${area}:${station}`;
  };

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    station: getLastUsedStation(),
    cost: 0,
    costString: '0',
    revenue: 0,
    revenueString: '0',
    jungleCoins: 0,
    jungleCoinsString: '0',
    isNotPaid: false,        // Payment status
    isNotCharged: false,     // Payment status
    status: FinancialStatus.DONE as FinancialStatus,  // Status field with default
    site: 'Home',
    targetSite: 'Home',
    customerCharacterId: null as string | null,
    isNewCustomer: true,
    newCustomerName: '',
    points: { xp: 0, rp: 0, fp: 0, hp: 0 },
    pointsStrings: { xp: '0', rp: '0', fp: '0', hp: '0' },
    outputItemType: '' as ItemType | '',
    outputQuantity: 1,
    outputQuantityString: '1',
    outputUnitCost: 0,
    outputUnitCostString: '0',
    outputItemName: '',
    outputItemCollection: undefined as Collection | undefined,
    outputItemSubType: undefined as SubItemType | undefined,
    outputItemPrice: 0,
    outputItemPriceString: '0',
    isNewItem: false,
    isSold: false,
    outputItemId: null as string | null,
    year: year,
    month: month
  });

  const [items, setItems] = useState<Item[]>([]);
  const [existingItems, setExistingItems] = useState<Item[]>([]);
  const [characters, setCharacters] = useState<any[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [outputItemTypeSubType, setOutputItemTypeSubType] = useState<string>('none:');
  const [outputItemStatus, setOutputItemStatus] = useState<ItemStatus>(ItemStatus.FOR_SALE);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showRelationshipsModal, setShowRelationshipsModal] = useState(false);
  const [playerCharacterId, setPlayerCharacterId] = useState<string | null>(null);
  const [showPlayerCharacterSelector, setShowPlayerCharacterSelector] = useState(false);

  // Archive Collection Confirmation Modal state
  const [showArchiveCollectionModal, setShowArchiveCollectionModal] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    status: FinancialStatus;
    onConfirm: () => void;
    onCancel: () => void;
  } | null>(null);

  // Guard for one-time initialization of new records
  const didInitRef = useRef(false);

  // Emissary column expansion state with persistence
  const [emissaryColumnExpanded, setEmissaryColumnExpanded] = useState(false);

  const toggleEmissaryColumn = () => {
    const newValue = !emissaryColumnExpanded;
    setEmissaryColumnExpanded(newValue);
    setPreference('finrec-modal-emissary-expanded', String(newValue));
  };

  // Description expansion state with persistence
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const toggleDescription = () => {
    const newValue = !descriptionExpanded;
    setDescriptionExpanded(newValue);
    setPreference('finrec-modal-description-expanded', String(newValue));
  };

  // Load items on mount
  useEffect(() => {
    const loadUIData = async () => {
      try {
        const [itemsData, charactersData, sitesData] = await Promise.all([
          ClientAPI.getItems(),
          ClientAPI.getCharacters(),
          ClientAPI.getSites()
        ]);
        setItems(itemsData);
        setExistingItems(itemsData); // For item selection
        setCharacters(charactersData);
        setSites(sitesData);
        setDataLoaded(true);
      } catch (error) {
        console.error('Failed to load UI data for record modal:', error);
      }
    };
    loadUIData();
  }, []);

  // Load preferences after hydration to prevent SSR mismatches
  useEffect(() => {
    const savedEmissary = getPreference('finrec-modal-emissary-expanded');
    if (savedEmissary === 'true') {
      setEmissaryColumnExpanded(true);
    }

    const savedDescription = getPreference('finrec-modal-description-expanded');
    if (savedDescription === 'true') {
      setDescriptionExpanded(true);
    }
  }, [getPreference]);

  // Smart detection: Determine if this is Company or Personal based on station
  const isCompany = isCompanyStation(formData.station);
  const isPersonal = isPersonalStation(formData.station);

  useEffect(() => {
    if (!open) {
      didInitRef.current = false;
      return;
    }

    if (record && record.id) {
      setFormData({
        name: record.name,
        description: record.description || '',
        station: record.station as Station,
        cost: record.cost || 0,
        costString: (record.cost || 0).toString(),
        revenue: record.revenue || 0,
        revenueString: (record.revenue || 0).toString(),
        jungleCoins: record.jungleCoins || 0,
        jungleCoinsString: (record.jungleCoins || 0).toString(),
        isNotPaid: record.isNotPaid || false,
        isNotCharged: record.isNotCharged || false,
        status: record.status || FinancialStatus.DONE,  // Load existing status or default
        site: record.siteId || 'Home',
        targetSite: record.targetSiteId || 'Home',
        customerCharacterId: record.customerCharacterId || null,
        isNewCustomer: !record.customerCharacterId, // Toggle based on whether customer exists
        newCustomerName: '',
        points: {
          hp: record.rewards?.points?.hp || 0,
          fp: record.rewards?.points?.fp || 0,
          rp: record.rewards?.points?.rp || 0,
          xp: record.rewards?.points?.xp || 0
        },
        pointsStrings: {
          hp: (record.rewards?.points?.hp || 0).toString(),
          fp: (record.rewards?.points?.fp || 0).toString(),
          rp: (record.rewards?.points?.rp || 0).toString(),
          xp: (record.rewards?.points?.xp || 0).toString()
        },
        outputItemType: (record.outputItemType as ItemType) || '',
        outputQuantity: record.outputQuantity ?? 1,
        outputQuantityString: (record.outputQuantity ?? 1).toString(),
        outputUnitCost: record.outputUnitCost || 0,
        outputUnitCostString: (record.outputUnitCost || 0).toString(),
        outputItemName: record.outputItemName || '',
        outputItemCollection: record.outputItemCollection || undefined,
        outputItemSubType: (record.outputItemSubType ?? undefined) as SubItemType | undefined,
        outputItemPrice: record.outputItemPrice || 0,
        outputItemPriceString: (record.outputItemPrice || 0).toString(),
        isNewItem: record.isNewItem || false,
        isSold: record.isSold || false,
        outputItemId: record.outputItemId || null,
        year: record.year || year,
        month: record.month || month
      });

      // Initialize player character
      setPlayerCharacterId(record.playerCharacterId || PLAYER_ONE_ID);
      setSelectedItemId(record.outputItemId || '');

      // Initialize combined item type/subtype field
      if (record.outputItemType && record.outputItemSubType) {
        setOutputItemTypeSubType(`${record.outputItemType}:${record.outputItemSubType}`);
      } else if (record.outputItemType) {
        setOutputItemTypeSubType(`${record.outputItemType}:`);
      } else {
        setOutputItemTypeSubType('none:');
      }

      // Initialize item status
      setOutputItemStatus(record.isSold ? ItemStatus.SOLD : ItemStatus.FOR_SALE);

      // Reset init guard when editing
      didInitRef.current = false;
    } else if (!didInitRef.current) {
      // New record - initialize once only (don't reset again while user edits)
      didInitRef.current = true;
      setFormData({
        name: '',
        description: '',
        station: getLastUsedStation(),
        cost: 0,
        costString: '0',
        revenue: 0,
        revenueString: '0',
        jungleCoins: 0,
        jungleCoinsString: '0',
        isNotPaid: false,
        isNotCharged: false,
        status: FinancialStatus.DONE,  // Default status for new records
        site: 'Home',
        targetSite: 'Home',
        customerCharacterId: null,
        isNewCustomer: true,
        newCustomerName: '',
        points: { xp: 0, rp: 0, fp: 0, hp: 0 },
        pointsStrings: { xp: '0', rp: '0', fp: '0', hp: '0' },
        outputItemType: '',
        outputQuantity: 1,
        outputQuantityString: '1',
        outputUnitCost: 0,
        outputUnitCostString: '0',
        outputItemName: '',
        outputItemCollection: undefined,
        outputItemSubType: undefined,
        outputItemPrice: 0,
        outputItemPriceString: '0',
        isNewItem: false,
        isSold: false,
        outputItemId: null,
        year: year,
        month: month
      });

      // Initialize player character for new record
      setPlayerCharacterId(PLAYER_ONE_ID);

      // Initialize combined item type/subtype field for new record
      setOutputItemTypeSubType('none:');
      setOutputItemStatus(ItemStatus.FOR_SALE);
    }
  }, [record, getLastUsedStation, open, year, month]);

  // Sync year/month for new records when context changes (fixes stale date if filter changes while modal hidden)
  useEffect(() => {
    if (!record) {
      setFormData(prev => ({
        ...prev,
        year: year,
        month: month
      }));
    }
  }, [year, month, record]);

  // Auto-logic: Set status to PENDING when isNotPaid or isNotCharged is true
  useEffect(() => {
    if (formData.isNotPaid || formData.isNotCharged) {
      setFormData(prev => ({
        ...prev,
        status: FinancialStatus.PENDING
      }));
    } else if (formData.status === FinancialStatus.PENDING) {
      // Only auto-set to DONE if currently PENDING and both flags are false
      setFormData(prev => ({
        ...prev,
        status: FinancialStatus.DONE
      }));
    }
  }, [formData.isNotPaid, formData.isNotCharged, formData.status]);

  const handleStationChange = (newStation: Station) => {

    setFormData(prev => ({
      ...prev,
      station: newStation,
    }));
  };

  const handleItemTypeChange = (newItemType: ItemType | '') => {
    setFormData({ ...formData, outputItemType: newItemType });
  };

  const handleOutputItemTypeSubTypeChange = (newItemTypeSubType: string) => {
    if (newItemTypeSubType === 'none:') {
      setOutputItemTypeSubType('none:');
      setFormData({ ...formData, outputItemType: '', outputItemSubType: undefined });
    } else {
      setOutputItemTypeSubType(newItemTypeSubType);
      const [itemType, subType] = newItemTypeSubType.split(':');
      const typedSubType = subType ? (subType as SubItemType) : undefined;
      setFormData({
        ...formData,
        outputItemType: itemType as ItemType,
        outputItemSubType: typedSubType,
      });
    }
  };

  const handleNewItemChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, isNewItem: checked, outputItemId: checked ? null : prev.outputItemId }));
    if (!checked) {
      setFormData(prev => ({ ...prev, outputItemName: '' }));
    }
    if (checked) {
      setSelectedItemId('');
    }
  };

  // Handle item selection from SearchableSelect
  const handleItemSelect = (itemId: string) => {
    setSelectedItemId(itemId);
    if (itemId) {
      const selectedItem = existingItems.find(item => item.id === itemId);
      if (selectedItem) {
        setFormData(prev => ({
          ...prev,
          isNewItem: false,
          outputItemId: selectedItem.id,
          outputItemName: selectedItem.name,
          outputItemType: selectedItem.type,
          outputItemSubType: selectedItem.subItemType ?? undefined,
          outputUnitCost: selectedItem.unitCost,
          outputItemPrice: selectedItem.price,
          outputItemCollection: selectedItem.collection || undefined,
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, outputItemName: '', outputItemId: null, outputItemSubType: undefined }));
    }
  };

  // Helper function to format number with smart decimal display
  const formatSmartDecimal = (num: number): string => {
    const rounded = Math.round(num * 10) / 10; // Round to 1 decimal place
    return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1);
  };

  // Number field handlers for zero deletion/replacement (same as Task modal)
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

  // Auto-calculate unit cost and price from total cost/revenue and quantity
  const handleAutoCalculateUnitCost = () => {
    if (formData.outputQuantity > VALIDATION_CONSTANTS.MIN_QUANTITY) {
      let updates: any = {};

      // Calculate unit cost if cost is available
      if (formData.cost > VALIDATION_CONSTANTS.MIN_COST && formData.outputQuantity > VALIDATION_CONSTANTS.MIN_QUANTITY) {
        const calculatedUnitCost = formData.cost / formData.outputQuantity;
        updates.outputUnitCost = calculatedUnitCost;
        updates.outputUnitCostString = formatSmartDecimal(calculatedUnitCost);
      }

      // Calculate price if revenue is available (check both revenue state and revenueString)
      const currentRevenue = formData.revenue || parseFloat(formData.revenueString) || VALIDATION_CONSTANTS.DEFAULT_NUMERIC_VALUE;
      if (currentRevenue > VALIDATION_CONSTANTS.MIN_REVENUE && formData.outputQuantity > VALIDATION_CONSTANTS.MIN_QUANTITY) {
        const calculatedPrice = currentRevenue / formData.outputQuantity;
        updates.outputItemPrice = calculatedPrice;
        updates.outputItemPriceString = formatSmartDecimal(calculatedPrice);
      }

      if (Object.keys(updates).length > 0) {
        setFormData({
          ...formData,
          ...updates
        });
      }
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);

    const recordId = record?.id || uuid();
    const station = formData.station;

    const recordData: FinancialRecord = {
      id: recordId,
      name: formData.name || `${formData.station} - ${formatMonthYear(new Date(formData.year, formData.month - 1))}`,
      description: formData.description,
      createdAt: record?.createdAt || new Date(),
      updatedAt: new Date(),
      year: formData.year,
      month: formData.month,
      station: formData.station as Station,
      type: isCompany ? 'company' : 'personal',
      siteId: formData.site || null,
      targetSiteId: formData.targetSite || null,
      customerCharacterId: formData.isNewCustomer ? null : formData.customerCharacterId,  // Ambassador: Existing customer
      newCustomerName: formData.isNewCustomer ? formData.newCustomerName : undefined,  // EMISSARY: Name for new customer character creation
      playerCharacterId: playerCharacterId,
      cost: formData.cost,
      revenue: formData.revenue,
      jungleCoins: formData.jungleCoins,
      isNotPaid: formData.isNotPaid,
      isNotCharged: formData.isNotCharged,
      status: formData.status,  // Include status field
      isCollected: formData.status === FinancialStatus.COLLECTED || record?.isCollected || false,
      // Character points (only awarded if character has PLAYER role)
      rewards: {
        points: {
          hp: formData.points.hp,
          fp: formData.points.fp,
          rp: formData.points.rp,
          xp: formData.points.xp
        }
      },
      // Item output fields
      outputItemType: formData.outputItemType || undefined,
      outputQuantity: formData.outputQuantity || undefined,
      outputUnitCost: formData.outputUnitCost || undefined,
      outputItemName: formData.outputItemName || undefined,
      outputItemCollection: formData.outputItemCollection || undefined,
      outputItemSubType: formData.outputItemSubType || undefined,
      outputItemPrice: formData.outputItemPrice || undefined,
      outputItemId: formData.isNewItem ? null : (selectedItemId || formData.outputItemId || null),
      isNewItem: formData.isNewItem,
      isSold: outputItemStatus === ItemStatus.SOLD,
      netCashflow: formData.revenue - formData.cost,
      jungleCoinsValue: formData.jungleCoins * J$_TO_USD_RATE,
      links: record?.links || [],  // Initialize links for Rosetta Stone
    };

    // Save user preferences
    setPreference('finrec-modal-last-station', recordData.station as any);

    try {
      // Emit pure record entity - Links System handles all relationships automatically
      await onSave(recordData);

      // Dispatch UI update events AFTER successful save
      dispatchEntityUpdated(entityTypeToKind(EntityType.FINANCIAL));

      onOpenChange(false);
    } catch (error) {
      console.error('Save failed:', error);
      // Keep modal open on error
    } finally {
      setIsSaving(false);
    }
  };

  // Get available categories based on selected station
  const availableCategories = BUSINESS_STRUCTURE[formData.station as keyof typeof BUSINESS_STRUCTURE] || [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent zIndexLayer={'MODALS'} className="w-full max-w-7xl h-[90vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>
                  {record ? 'Edit Financial' : `Create New ${isCompany ? 'Company' : 'Personal'} Financial`}
                </DialogTitle>
                <DialogDescription>
                  {record
                    ? 'Modify financial details'
                    : `Create a new ${isCompany ? 'company' : 'personal'} financial for ${formData.year}-${formData.month.toString().padStart(2, '0')}`
                  }
                </DialogDescription>
              </div>
              <div className="text-sm font-medium text-muted-foreground">
                Financial Type: <span className="text-foreground">{isCompany ? 'Company' : 'Personal'}</span> |
                Station: <span className="text-foreground">{formData.station}</span>
              </div>
              <div className="mt-2">
                <div className="text-xs text-muted-foreground mb-1">Record Date</div>
                <MonthYearSelector
                  currentYear={formData.year}
                  currentMonth={formData.month}
                  onYearChange={(y) => setFormData(prev => ({ ...prev, year: y }))}
                  onMonthChange={(m) => setFormData(prev => ({ ...prev, month: m }))}
                />
              </div>
            </div>
          </DialogHeader>

          {/* Content */}
          <div className="px-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 220px)' }}>
            <div className={`grid gap-4 ${emissaryColumnExpanded ? 'grid-cols-4' : 'grid-cols-3'}`}>
              {/* Column 1: NATIVE (Basic Info) */}
              <div className="space-y-3">

                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Financial record name..."
                    className="h-8 text-sm"
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="description" className="text-xs">Description</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={toggleDescription}
                      className="h-6 px-2 text-xs"
                    >
                      {descriptionExpanded ? '▼' : '▶'}
                    </Button>
                  </div>
                  {descriptionExpanded && (
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Financial description..."
                      className="h-16 text-sm resize-none"
                      rows={3}
                    />
                  )}
                </div>

                <div>
                  <Label htmlFor="station" className="text-xs">Station</Label>
                  <SearchableSelect
                    value={getStationValue(formData.station)}
                    onValueChange={(value) => {
                      const station = getStationFromCombined(value);
                      setFormData({ ...formData, station: station as Station });
                      // Save last used station to preferences
                      setPreference('finrec-modal-last-station', station);
                    }}
                    placeholder="Select station..."
                    options={createStationCategoryOptions()}
                    autoGroupByCategory={true}
                    getCategoryForValue={(value) => getCategoryFromCombined(value)}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Financial Type</Label>
                  <div className="text-sm text-muted-foreground">
                    {isCompany ? 'Company' : 'Personal'}
                  </div>
                </div>
              </div>

              {/* Column 2: NATIVE (Financial Data) */}
              <div className="space-y-3">
                {/* <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">🧬 NATIVE</h3>*/}

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="cost" className="text-xs">Cost ($)</Label>
                    <NumericInput
                      id="cost"
                      value={formData.cost}
                      onChange={(value) => setFormData({ ...formData, cost: value })}
                      placeholder="0.00"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="revenue" className="text-xs">Revenue ($)</Label>
                    <NumericInput
                      id="revenue"
                      value={formData.revenue}
                      onChange={(value) => setFormData({ ...formData, revenue: value })}
                      placeholder="0.00"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={formData.isNotPaid ? "outline" : "outline"}
                    size="sm"
                    onClick={() => setFormData({ ...formData, isNotPaid: !formData.isNotPaid })}
                    className={`h-8 text-xs ${formData.isNotPaid ? 'border-orange-500 text-orange-600' : ''}`}
                  >
                    {formData.isNotPaid ? "⚠ Not Paid" : "✓ Paid"}
                  </Button>
                  <Button
                    type="button"
                    variant={formData.isNotCharged ? "outline" : "outline"}
                    size="sm"
                    onClick={() => setFormData({ ...formData, isNotCharged: !formData.isNotCharged })}
                    className={`h-8 text-xs ${formData.isNotCharged ? 'border-orange-500 text-orange-600' : ''}`}
                  >
                    {formData.isNotCharged ? "⚠ Not Charged" : "✓ Charged"}
                  </Button>
                </div>
              </div>

              {/* Column 3: AMBASSADORS */}
              <div className="space-y-3">
                {/* <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">🏛️ AMBASSADORS</h3>*/}

                <div>
                  <Label htmlFor="site" className="text-xs">Site</Label>
                  <SearchableSelect
                    value={formData.site}
                    onValueChange={(v) => setFormData({ ...formData, site: v })}
                    placeholder="Select site..."
                    options={createSiteOptionsWithCategories(sites)}
                    autoGroupByCategory={true}
                    className="h-8 text-sm"
                  />
                </div>


              </div>

              {/* Column 4: EMISSARIES (Collapsible) */}
              {emissaryColumnExpanded && (
                <div className="space-y-3">
                  {/* <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">📡 EMISSARIES</h3>*/}

                  {/* Customer Character - Emissary field for financial records */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="customer-character" className="text-xs">Customer</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setFormData({ ...formData, isNewCustomer: !formData.isNewCustomer })}
                        className="h-6 text-xs px-2"
                      >
                        {formData.isNewCustomer ? 'Existing' : 'New'}
                      </Button>
                    </div>
                    {formData.isNewCustomer ? (
                      <Input
                        id="customer-character"
                        value={formData.newCustomerName}
                        onChange={(e) => setFormData({ ...formData, newCustomerName: e.target.value })}
                        placeholder="New customer name"
                        className="h-8 text-sm"
                      />
                    ) : (
                      <SearchableSelect
                        value={formData.customerCharacterId || ''}
                        onValueChange={(value) => setFormData({ ...formData, customerCharacterId: value })}
                        options={createCharacterOptions(characters)}
                        placeholder="Select customer"
                        autoGroupByCategory={true}
                        className="h-8 text-sm"
                      />
                    )}
                  </div>

                  {/* Points Rewards - Above Item Creation */}
                  <div className="space-y-2">
                    <Label className="text-xs">Point Rewards</Label>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <Label htmlFor="reward-xp" className="text-xs">XP</Label>
                        <NumericInput
                          id="reward-xp"
                          value={formData.points.xp}
                          onChange={(value) => setFormData({ ...formData, points: { ...formData.points, xp: value } })}
                          min={0}
                          step={1}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="reward-rp" className="text-xs">RP</Label>
                        <NumericInput
                          id="reward-rp"
                          value={formData.points.rp}
                          onChange={(value) => setFormData({ ...formData, points: { ...formData.points, rp: value } })}
                          min={0}
                          step={1}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="reward-fp" className="text-xs">FP</Label>
                        <NumericInput
                          id="reward-fp"
                          value={formData.points.fp}
                          onChange={(value) => setFormData({ ...formData, points: { ...formData.points, fp: value } })}
                          min={0}
                          step={1}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="reward-hp" className="text-xs">HP</Label>
                        <NumericInput
                          id="reward-hp"
                          value={formData.points.hp}
                          onChange={(value) => setFormData({ ...formData, points: { ...formData.points, hp: value } })}
                          min={0}
                          step={1}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
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

                  {!!formData.outputItemType && (
                    <>

                      {/* Item Division - Row 1: Quantity, Unit Cost, Price, Auto */}
                      <div className="grid grid-cols-4 gap-2">
                        <div className="space-y-2">
                          <Label htmlFor="output-quantity" className="text-xs">Quantity</Label>
                          <NumericInput
                            id="output-quantity"
                            value={formData.outputQuantity}
                            onChange={(value) => setFormData({ ...formData, outputQuantity: value })}
                            min={1}
                            step={QUANTITY_STEP}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="output-unit-cost" className="text-xs">U. Cost $</Label>
                          <NumericInput
                            id="output-unit-cost"
                            value={formData.outputUnitCost}
                            onChange={(value) => setFormData({ ...formData, outputUnitCost: value })}
                            min={0}
                            step={PRICE_STEP}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="output-item-price" className="text-xs">Price $</Label>
                          <NumericInput
                            id="output-item-price"
                            value={formData.outputItemPrice}
                            onChange={(value) => setFormData({ ...formData, outputItemPrice: value })}
                            min={0}
                            step={PRICE_STEP}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAutoCalculateUnitCost}
                            className="h-8 px-4 text-xs w-full"
                            title="Auto-calculate Unit Cost from Cost/Quantity and Price from Revenue/Quantity"
                          >
                            Auto
                          </Button>
                        </div>
                      </div>

                      {/* Item Division - Row 2: Target Site, Item Status */}
                      <div className="grid grid-cols-2 gap-2">
                        <SearchableSelect
                          value={formData.targetSite}
                          onValueChange={(value) => setFormData({ ...formData, targetSite: value })}
                          placeholder="Target Site"
                          options={createSiteOptionsWithCategories(sites)}
                          autoGroupByCategory={true}
                          className="h-8 text-sm"
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
                          value={formData.outputItemName}
                          onChange={(value) => setFormData({ ...formData, outputItemName: value })}
                          placeholder="Item name"
                          items={existingItems}
                          selectedItemId={selectedItemId}
                          onItemSelect={handleItemSelect}
                          isNewItem={formData.isNewItem}
                          onNewItemToggle={handleNewItemChange}
                          label="Item Name"
                          sites={sites}
                        />
                        <div>
                          <Label htmlFor="output-item-collection" className="text-xs">Collection</Label>
                          <Select
                            value={formData.outputItemCollection || 'none'}
                            onValueChange={(value) => setFormData({ ...formData, outputItemCollection: value === 'none' ? undefined : value as Collection })}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Uncategorized" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Uncategorized</SelectItem>
                              {Object.values(Collection).map((collection) => (
                                <SelectItem key={collection} value={collection}>
                                  {collection}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between py-2 border-t px-6">
            <div className="flex items-center gap-4">
              {record && (
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
              {/* Status Selector */}
              <div className="flex items-center gap-2">
                <Label htmlFor="financial-status" className="text-xs">Status:</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => {
                    const newStatus = value as FinancialStatus;

                    // Show confirmation for COLLECTED status
                    if (newStatus === FinancialStatus.COLLECTED && formData.status !== FinancialStatus.COLLECTED) {
                      setPendingStatusChange({
                        status: newStatus,
                        onConfirm: () => {
                          setFormData(prev => ({ ...prev, status: newStatus }));
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

                    setFormData(prev => ({ ...prev, status: newStatus }));
                  }}
                >
                  <SelectTrigger className="h-8 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FinancialStatus.PENDING}>PENDING</SelectItem>
                    <SelectItem value={FinancialStatus.DONE}>DONE</SelectItem>
                    <SelectItem value={FinancialStatus.COLLECTED}>COLLECTED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                onClick={toggleEmissaryColumn}
                className={`h-8 text-xs ${emissaryColumnExpanded ? 'bg-transparent text-white' : 'bg-muted text-muted-foreground'}`}
              >
                Emissaries
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="h-8 text-xs" disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!formData.name.trim() || isSaving} className="h-8 text-xs">
                {isSaving ? 'Saving...' : (record ? 'Update' : 'Create')} Financial Record
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      {showDeleteModal && (
        <DeleteModal
          open={showDeleteModal}
          onOpenChange={setShowDeleteModal}
          entityType={EntityType.FINANCIAL}
          entities={record ? [record] : []}
          onComplete={() => {
            setShowDeleteModal(false);
            onOpenChange(false);
            onDelete?.();
          }}
        />
      )}

      {/* Links Relationships Modal */}
      {record && showRelationshipsModal && (
        <LinksRelationshipsModal
          entity={{ type: EntityType.FINANCIAL, id: record.id, name: record.name }}
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

      {/* Archive Collection Confirmation Modal */}
      {pendingStatusChange && (
        <ArchiveCollectionConfirmationModal
          open={showArchiveCollectionModal}
          onOpenChange={setShowArchiveCollectionModal}
          entityType="financial"
          entityName={formData.name}
          pointsValue={{
            xp: Math.floor((formData.revenue || 0) / 100),
            rp: Math.floor((formData.revenue || 0) / 200),
            fp: Math.floor((formData.revenue || 0) / 150),
            hp: Math.floor((formData.revenue || 0) / 300)
          }}
          totalRevenue={formData.revenue || 0}
          onConfirm={pendingStatusChange.onConfirm}
          onCancel={pendingStatusChange.onCancel}
        />
      )}
    </>
  );
}
