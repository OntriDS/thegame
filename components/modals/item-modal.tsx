'use client';

import { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import NumericInput from '@/components/ui/numeric-input';
import { getZIndexClass } from '@/lib/utils/z-index-utils';
import { LinksSubModal } from './submodals/links-submodal';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { ItemNameField } from '@/components/ui/item-name-field';
import { Item, StockPoint } from '@/types/entities';
import { ItemType, ItemStatus, Collection, EntityType, STATION_CATEGORIES } from '@/types/enums';
import { getSubTypesForItemType } from '@/lib/utils/item-utils';
import { getCategoryForItemType, createStationCategoryOptions, getStationFromCombined, getCategoryFromCombined, createItemTypeSubTypeOptions, getItemTypeFromCombined, getSubTypeFromCombined } from '@/lib/utils/searchable-select-utils';
import { getAreaForStation } from '@/lib/utils/business-structure-utils';
import type { Station, SubItemType } from '@/types/type-aliases';
import { CM_TO_M2_CONVERSION, PRICE_STEP, YEAR_MIN, YEAR_MAX } from '@/lib/constants/app-constants';
import { v4 as uuid } from 'uuid';
import { createSiteOptionsWithCategories } from '@/lib/utils/site-options-utils';
import { Package, Trash2, User } from 'lucide-react';
import { ClientAPI } from '@/lib/client-api';
import MoveItemsModal from './submodals/move-items-submodal';
import DeleteModal from './submodals/delete-submodal';
import { FileReference } from '@/types/entities';
import EntityRelationshipsModal from './submodals/entity-relationships-submodal';
import CharacterSelectorModal from './submodals/character-selector-submodal';
import { useUserPreferences } from '@/lib/hooks/use-user-preferences';
import { dispatchEntityUpdated } from '@/lib/ui/ui-events';

interface ItemModalProps {
  item?: Item;
  defaultItemType?: ItemType;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (item: Item) => void;
}

export default function ItemModal({ item, defaultItemType, open, onOpenChange, onSave }: ItemModalProps) {
  const { getPreference, setPreference } = useUserPreferences();
  
  const getLastUsedStation = (): Station => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lastUsedStation');
      return (saved as Station) || ('Strategy' as Station);
    }
    return 'Strategy' as Station;
  };

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ItemType>(defaultItemType || ItemType.STICKER);
  const [station, setStation] = useState<Station>(getLastUsedStation());

  const [stationCategory, setStationCategory] = useState<string>('ADMIN:Strategy');
  const [subItemType, setSubItemType] = useState<SubItemType | ''>('');
  const [itemTypeSubType, setItemTypeSubType] = useState<string>(`${defaultItemType || ItemType.STICKER}:`);
  const [collection, setCollection] = useState<Collection | 'none'>(Collection.NO_COLLECTION);
  const [status, setStatus] = useState<ItemStatus>(ItemStatus.FOR_SALE);
  const [quantity, setQuantity] = useState(0);
  const [unitCost, setUnitCost] = useState(0);
  const [price, setPrice] = useState(0);
  const [year, setYear] = useState(new Date().getFullYear());
  const [imageUrl, setImageUrl] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [size, setSize] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [site, setSite] = useState<string>('Home');
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showMoreFields, setShowMoreFields] = useState(false);
  const [showLinksModal, setShowLinksModal] = useState(false);
  const [showCharacterSelector, setShowCharacterSelector] = useState(false);
  const [itemLinks, setItemLinks] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [ownerCharacterId, setOwnerCharacterId] = useState<string | null>(null);
  const [ownerCharacterName, setOwnerCharacterName] = useState<string>('');
  
  // Item selection states for compound field
  const [isNewItem, setIsNewItem] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [existingItems, setExistingItems] = useState<Item[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [statusModalConfig, setStatusModalConfig] = useState<{
    title: string;
    message: string;
    options: { label: string; action: () => void; variant?: 'default' | 'outline' }[];
  } | null>(null);

  // File attachment states
  const [originalFiles, setOriginalFiles] = useState('');
  const [accessoryFiles, setAccessoryFiles] = useState('');

  // Save form data to localStorage when modal closes
  const saveFormDataToStorage = useCallback(() => {
    if (!item) { // Only save for new items, not when editing existing items
      const formData = {
        name,
        description,
        type,
        station,
        stationCategory,
        subItemType,
        collection,
        status,
        quantity,
        unitCost,
        price,
        year,
        imageUrl,
        width,
        height,
        size,
        targetAmount,
        site,
        originalFiles,
        accessoryFiles
      };
      localStorage.setItem('itemModalFormData', JSON.stringify(formData));
    }
  }, [item, name, description, type, station, stationCategory, subItemType, collection, status, quantity, unitCost, price, year, imageUrl, width, height, size, targetAmount, site, originalFiles, accessoryFiles]);

  // Load form data from localStorage when modal opens
  const loadFormDataFromStorage = useCallback(() => {
    if (!item) { // Only load for new items
      const savedData = localStorage.getItem('itemModalFormData');
      if (savedData) {
        try {
          const formData = JSON.parse(savedData);
          setName(formData.name || '');
          setDescription(formData.description || '');
          setType(formData.type || defaultItemType || ItemType.STICKER);
          setStation(formData.station || 'ADMIN');
          setSubItemType(formData.subItemType || '');
          setCollection(formData.collection || Collection.NO_COLLECTION);
          setStatus(formData.status || ItemStatus.FOR_SALE);
          setQuantity(formData.quantity || 0);
          setUnitCost(formData.unitCost || 0);
          setPrice(formData.price || 0);
          setYear(formData.year || new Date().getFullYear());
          setImageUrl(formData.imageUrl || '');
          setWidth(formData.width || '');
          setHeight(formData.height || '');
          setSize(formData.size || '');
          setTargetAmount(formData.targetAmount || '');
          setSite(formData.site || 'Home');
          setOriginalFiles(formData.originalFiles || '');
          setAccessoryFiles(formData.accessoryFiles || '');
        } catch (error) {
          console.error('Error loading form data from storage:', error);
        }
      }
    }
  }, [item, defaultItemType]);

  // Save form data when modal closes
  useEffect(() => {
    if (!open) {
      saveFormDataToStorage();
    }
  }, [open, saveFormDataToStorage]);

  // Load form data when modal opens for new items
  useEffect(() => {
    if (open && !item) {
      loadFormDataFromStorage();
    }
  }, [open, item, loadFormDataFromStorage]);

  const handleStationCategoryChange = (newStationCategory: string) => {
    const newStation = getStationFromCombined(newStationCategory) as Station;
    
    setStationCategory(newStationCategory);
    setStation(newStation);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastUsedStation', newStation);
    }
  };

  const handleItemTypeSubTypeChange = (newItemTypeSubType: string) => {
    const newItemType = getItemTypeFromCombined(newItemTypeSubType) as ItemType;
    const newSubType = getSubTypeFromCombined(newItemTypeSubType) as SubItemType;
    
    setItemTypeSubType(newItemTypeSubType);
    setType(newItemType);
    setSubItemType(newSubType || '');
    
    // Save to user preferences
    const prefKey = `item-modal-last-subtype-${newItemType}`;
    setPreference(prefKey, newItemTypeSubType);
  };

  // Load links for the current item
  const loadItemLinks = useCallback(async () => {
    if (item) {
      try {
        const links = await ClientAPI.getLinksFor({ type: EntityType.ITEM, id: item.id });
        setItemLinks(links);
      } catch (error) {
        console.error('Failed to load item links:', error);
        setItemLinks([]);
      }
    }
  }, [item]);

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

  // Effect to reset and populate state when the item prop changes
  useEffect(() => {
    setName(item?.name || '');
    setDescription(item?.description || '');
    const itemType = item?.type || defaultItemType || ItemType.STICKER;
    const itemSubType = item?.subItemType || '';
    setType(itemType);
    setSubItemType(itemSubType);
    setItemTypeSubType(`${itemType}:${itemSubType}`);
    
    const itemStation = item?.station || 'Strategy';
    setStation(itemStation);
    const area = getAreaForStation(itemStation);
    setStationCategory(`${area || 'ADMIN'}:${itemStation}`);
    setCollection(item?.collection || Collection.NO_COLLECTION);
    setStatus(item?.status || ItemStatus.FOR_SALE);
    setQuantity(item ? (item.stock?.reduce((s, stock) => s + stock.quantity, 0) || 0) : 0);
    setUnitCost(item?.unitCost || 0);
    setPrice(item?.price || 0);
    setYear(item?.year || new Date().getFullYear());
    setImageUrl(item?.imageUrl || '');
    setWidth(item?.dimensions?.width?.toString() || '');
    setHeight(item?.dimensions?.height?.toString() || '');
    setSize(item?.size || '');
    setTargetAmount(item?.targetAmount?.toString() || '');
    // Handle both old (site name) and new (site UUID) references
    const itemSiteId = item?.stock?.[0]?.siteId || 'Home';
    setSite(itemSiteId);
    
    // Parse file attachments for display
    const formatFileReferences = (files?: FileReference[]): string => {
      if (!files || files.length === 0) return '';
      return files.map(f => `${f.url || 'symbolic'}:${f.type}`).join(';');
    };
    
    setOriginalFiles(formatFileReferences(item?.originalFiles));
    setAccessoryFiles(formatFileReferences(item?.accessoryFiles));
    
    // Set owner character ID
    setOwnerCharacterId(item?.ownerCharacterId || null);
    
    // Load links for existing item
    if (item) {
      loadItemLinks();
    } else {
      setItemLinks([]);
    }
  }, [item, defaultItemType, loadItemLinks]);

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

  // Load owner character name when ownerCharacterId changes
  useEffect(() => {
    const loadOwnerCharacter = async () => {
      if (ownerCharacterId) {
        try {
          const characters = await ClientAPI.getCharacters();
          const owner = characters.find(c => c.id === ownerCharacterId);
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
  }, [ownerCharacterId]);

  // Handle setting owner character
  const handleSetOwner = (characterId: string | null) => {
    setOwnerCharacterId(characterId);
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
        setStation(selectedItem.station || 'ADMIN');
        setSubItemType(selectedItem.subItemType || '');
        setCollection(selectedItem.collection || Collection.NO_COLLECTION);
        setStatus(selectedItem.status || ItemStatus.FOR_SALE);
        // Calculate total quantity from stock points
        const totalQuantity = selectedItem.stock?.reduce((sum, stockPoint) => sum + stockPoint.quantity, 0) || 0;
        setQuantity(totalQuantity);
        setUnitCost(selectedItem.unitCost || 0);
        setPrice(selectedItem.price || 0);
        setYear(selectedItem.year || new Date().getFullYear());
        setImageUrl(selectedItem.imageUrl || '');
        // Extract dimensions
        setWidth(selectedItem.dimensions?.width?.toString() || '');
        setHeight(selectedItem.dimensions?.height?.toString() || '');
        setSize(selectedItem.size || '');
        setTargetAmount(selectedItem.targetAmount?.toString() || '');
        // Get first stock point site or default
        setSite(selectedItem.stock?.[0]?.siteId || 'Home');
        // Handle file references
        setOriginalFiles(Array.isArray(selectedItem.originalFiles) ? selectedItem.originalFiles.map(f => f.url || '').join(', ') : '');
        setAccessoryFiles(Array.isArray(selectedItem.accessoryFiles) ? selectedItem.accessoryFiles.map(f => f.url || '').join(', ') : '');
        setOwnerCharacterId(selectedItem.ownerCharacterId || null);
      }
    }
  };

  const handleSave = () => {
    if (isSaving) return;
    setIsSaving(true);
    
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
        const existingStockIndex = updatedStock.findIndex(stock => stock.siteId === site);
        
        if (existingStockIndex >= 0) {
          // Update existing quantity at this site (replace, don't add)
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
    } else {
      // Creating new item - single stock point
      updatedStock = [{
        siteId: site,
        quantity: quantity || 0
      }];
    }

    // Parse file attachments
    const parseFileReferences = (field: string): FileReference[] => {
      if (!field || field.trim() === '') return [];
      
      return field.split(';').map(fileRef => {
        const parts = fileRef.split(':');
        if (parts.length >= 2) {
          return {
            url: parts[0] === 'symbolic' ? undefined : parts[0],
            type: parts[1]
          };
        }
        return { type: fileRef.trim() }; // Fallback for simple types
      });
    };

    const parsedOriginalFiles = parseFileReferences(originalFiles);
    const parsedAccessoryFiles = parseFileReferences(accessoryFiles);

    const newItem: Item = {
      id: item?.id || selectedItemId || uuid(),
      name,
      description,
      type,
      subItemType: subItemType || undefined,
      collection: collection === Collection.NO_COLLECTION ? undefined : collection as Collection,
      status,
      station,
      unitCost: unitCost || 0,
      additionalCost: 0, // Default value
      price: price || 0,
      value: 0, // Default value
      quantitySold: 0, // Default value
      targetAmount: targetAmount ? parseInt(targetAmount) : undefined,
      stock: updatedStock,
      dimensions,
      size: parsedSize,
      year: year || undefined,
      imageUrl: imageUrl || undefined,
      originalFiles: parsedOriginalFiles.length > 0 ? parsedOriginalFiles : undefined,
      accessoryFiles: parsedAccessoryFiles.length > 0 ? parsedAccessoryFiles : undefined,
      sourceTaskId: (item || existingItems.find(i => i.id === selectedItemId))?.sourceTaskId || null,      // Preserve source task if exists
      sourceRecordId: (item || existingItems.find(i => i.id === selectedItemId))?.sourceRecordId || null,  // Preserve source record if exists
      ownerCharacterId: ownerCharacterId,            // Ambassador: Character who owns this item
      createdAt: (item || existingItems.find(i => i.id === selectedItemId))?.createdAt || new Date(),
      updatedAt: new Date(),
      isCollected: (item || existingItems.find(i => i.id === selectedItemId))?.isCollected || false,        // Preserve collection status
      links: (item || existingItems.find(i => i.id === selectedItemId))?.links || [],  // Preserve links for Rosetta Stone
    };

    // Clear saved form data when item is successfully saved (only for truly new items)
    if (!item && !selectedItemId) {
      localStorage.removeItem('itemModalFormData');
    }

    // Emit pure item entity - Links System handles all relationships automatically
    onSave(newItem);
    
    // Refresh links after save (Links are created by Ribosome)
    setTimeout(async () => {
      try {
        const links = await ClientAPI.getLinksFor({ type: EntityType.ITEM, id: newItem.id });
        setItemLinks(links);
        setIsSaving(false);
      } catch (error) {
        console.error('Failed to refresh links after save:', error);
        setIsSaving(false);
      }
    }, 100); // Small delay to ensure Ribosome has processed the entity
    
    // Dispatch UI update events for immediate feedback
    dispatchEntityUpdated('item');
    
    onOpenChange(false);
  };

  const getSubItemTypeOptions = () => {
    return getSubTypesForItemType(type);
  };

  const showSubItemType = getSubTypesForItemType(type).length > 0;
  const showDimensions = type === ItemType.PRINT || type === ItemType.ARTWORK || type === ItemType.STICKER || type === ItemType.MATERIAL;
  const showModelSize = type === ItemType.PRINT || type === ItemType.ARTWORK || type === ItemType.MERCH;
  const showImageUrl = true; // Always show Image URL field for all item types
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
              <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">🧬 NATIVE</h3>
            <div>
              <ItemNameField
                value={name}
                onChange={setName}
                placeholder="Item name"
                items={existingItems}
                selectedItemId={selectedItemId}
                onItemSelect={handleItemSelect}
                isNewItem={isNewItem}
                onNewItemToggle={setIsNewItem}
                label="Item Name"
              />
            </div>
            
            <div>
              <Label htmlFor="station-category" className="text-xs">Station & Category</Label>
              <SearchableSelect
                value={stationCategory}
                onValueChange={handleStationCategoryChange}
                options={createStationCategoryOptions()}
                autoGroupByCategory={true}
                placeholder="Select station and category..."
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
              <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">🧬 NATIVE</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="quantity" className="text-xs">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                  min="0"
                  className="h-8 text-sm mt-1"
                />
                {item && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Current stock at {site}: {item.stock?.find(stock => stock.siteId === site)?.quantity || 0} units
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="targetAmount" className="text-xs">Target Q</Label>
                <Input
                  id="targetAmount"
                  type="number"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  min="0"
                  placeholder="Target"
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
                <Label htmlFor="collection" className="text-xs">Collection</Label>
                <Select value={collection} onValueChange={(value) => setCollection(value as Collection | 'none')}>
                  <SelectTrigger className="h-8 text-sm mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={Collection.NO_COLLECTION}>None</SelectItem>
                    {Object.values(Collection).filter(c => c !== Collection.NO_COLLECTION).map(collection => (
                      <SelectItem key={collection} value={collection}>{collection}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="year" className="text-xs">Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
                  min={YEAR_MIN}
                  max={YEAR_MAX}
                  className="h-8 text-sm mt-1"
                  placeholder={new Date().getFullYear().toString()}
                />
              </div>
            </div>
          </div>

            {/* Column 3 - AMBASSADOR (Site References) */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">🏛️ AMBASSADOR</h3>
            
            <div>
              <Label htmlFor="site" className="text-xs">Site</Label>
              <SearchableSelect
                value={site}
                onValueChange={(value) => setSite(value)}
                placeholder="Select site"
                options={createSiteOptionsWithCategories(sites)}
                autoGroupByCategory={true}
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>

        {/* More Fields (Collapsible) */}
        <div className="border-t pt-3 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMoreFields(!showMoreFields)}
            className="h-7 text-xs"
          >
            {showMoreFields ? 'Hide' : 'Show'} Extra Fields
          </Button>
          
          {showMoreFields && (
            <div className="grid grid-cols-4 gap-4 mt-4">
              <div>
                <Label htmlFor="description" className="text-xs">Description</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Item description"
                  className="h-8 text-sm mt-1"
                />
              </div>

              <div>
                <Label htmlFor="imageUrl" className="text-xs">Image URL</Label>
                <Input
                  id="imageUrl"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="URL to item image"
                  className="h-8 text-sm mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="originalFiles" className="text-xs">Original Files</Label>
                <Input
                  id="originalFiles"
                  value={originalFiles}
                  onChange={(e) => setOriginalFiles(e.target.value)}
                  placeholder="url:type;url:type"
                  className="h-8 text-sm mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="accessoryFiles" className="text-xs">Accessory Files</Label>
                <Input
                  id="accessoryFiles"
                  value={accessoryFiles}
                  onChange={(e) => setAccessoryFiles(e.target.value)}
                  placeholder="url:type;url:type"
                  className="h-8 text-sm mt-1"
                />
              </div>

              {showDimensions && (
                <>
                  <div>
                    <Label htmlFor="width" className="text-xs">Width (cm)</Label>
                    <Input
                      id="width"
                      type="number"
                      value={width}
                      onChange={(e) => setWidth(e.target.value)}
                      min="0"
                      step="0.1"
                      className="h-8 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="height" className="text-xs">Height (cm)</Label>
                    <Input
                      id="height"
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      min="0"
                      step="0.1"
                      className="h-8 text-sm mt-1"
                    />
                  </div>
                </>
              )}

              {showModelSize && (
                <div>
                  <Label htmlFor="size" className="text-xs">Model Size</Label>
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
        </div>

        <DialogFooter className="flex justify-between items-center pt-4 border-t">
          <div className="flex gap-2">
            {item && ( // Show DELETE/VIEW LINKS/MOVE/SET OWNER for existing items
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 h-8 text-xs"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={async () => {
                    if (item) {
                      try {
                        const links = await ClientAPI.getLinksFor({ type: EntityType.ITEM, id: item.id });
                        setItemLinks(links);
                        setShowLinksModal(true);
                      } catch (error) {
                        console.error('Failed to fetch links:', error);
                        setItemLinks([]);
                        setShowLinksModal(true);
                      }
                    }
                  }}
                  className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300 h-8 text-xs"
                >
                  🔗 View Links ({itemLinks.length})
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowMoveModal(true)}
                  className="flex items-center gap-2 h-8 text-xs"
                >
                  <Package className="h-3 w-3" />
                  Move
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowCharacterSelector(true)}
                  className="flex items-center gap-2 h-8 text-xs"
                >
                  <User className="h-3 w-3" />
                  {ownerCharacterId ? `Owner: ${ownerCharacterName}` : 'Set Owner'}
                </Button>
              </>
            )}
          </div>

          <div className="flex gap-2 items-center">
            {/* Status in footer */}
            <div className="flex items-center gap-2">
              <Label htmlFor="status-footer" className="text-xs whitespace-nowrap">Status:</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as ItemStatus)}>
                <SelectTrigger className="h-8 text-sm w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ItemStatus).map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
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

    {/* MOVE Modal */}
    <MoveItemsModal
      open={showMoveModal}
      onOpenChange={setShowMoveModal}
      items={(item || (selectedItemId && existingItems.find(i => i.id === selectedItemId))) ? [item || existingItems.find(i => i.id === selectedItemId)!] : []}
      sites={sites}
      onComplete={() => {
        setShowMoveModal(false);
        onOpenChange(false); // Close the modal after moving
      }}
      onStatusCheck={(item, isMovingToSold) => {
        // Handle status check from move operation
        if (isMovingToSold) {
          // Item is being moved to a sold item - emit to parent for handling
          const updatedItem = { ...item, status: ItemStatus.SOLD };
          onSave(updatedItem);
        }
        // Close the move modal after status check
        setShowMoveModal(false);
        onOpenChange(false);
      }}
    />
    
    {/* DELETE Modal */}
    <DeleteModal
      open={showDeleteModal}
      onOpenChange={setShowDeleteModal}
      entityType="item"
      entities={(item || (selectedItemId && existingItems.find(i => i.id === selectedItemId))) ? [item || existingItems.find(i => i.id === selectedItemId)!] : []}
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
            setIsNewItem(true);
          }
        } catch (error) {
          console.error('Failed to reload items after deletion:', error);
        }
        onOpenChange(false); // Close the modal after deleting
      }}
    />

    {/* Status Modal */}
    {showStatusModal && statusModalConfig && (
      <div className={`fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 ${getZIndexClass('MODALS')}`}>
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
          <h3 className="text-lg font-semibold mb-2">{statusModalConfig.title}</h3>
          <p className="text-sm mb-4">{statusModalConfig.message}</p>
          <div className="flex justify-end gap-2">
            {statusModalConfig.options.map((option, index) => (
              <Button
                key={index}
                variant={option.variant}
                onClick={option.action}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    )}

    {/* Links SubModal */}
    <LinksSubModal
      open={showLinksModal}
      onOpenChange={setShowLinksModal}
      entityType="item"
      entityId={item?.id || ''}
      entityName={item?.name || 'Item'}
      links={itemLinks}
    />
    
    {/* Character Selector Modal */}
    <CharacterSelectorModal
      open={showCharacterSelector}
      onOpenChange={setShowCharacterSelector}
      onSelect={handleSetOwner}
      currentOwnerId={ownerCharacterId}
    />
    </>
  );
}
