'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClientAPI } from '@/lib/client-api';
import { Item } from '@/types/entities';
import { useEntityUpdates } from '@/lib/hooks/use-entity-updates';
import { ItemType, ItemCategory, ItemStatus, InventoryTab } from '@/types/enums';
import { getItemCategory } from '@/lib/utils/item-utils';
import ItemModal from '@/components/modals/item-modal';
import BulkEditModal from '@/components/modals/submodals/bulk-edit-submodal';
import MoveItemsModal from '@/components/modals/submodals/move-items-submodal';
import InlineEditor from '@/components/control-room/inline-editor';
import { MapPin, Pencil, Package, Settings, Package2, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { Site } from '@/types/entities';
import { DEFAULT_YELLOW_THRESHOLD } from '@/lib/constants/app-constants';
import { getZIndexClass } from '@/lib/utils/z-index-utils';
import { useUserPreferences } from '@/lib/hooks/use-user-preferences';
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts';
import { getAreaForStation } from '@/lib/utils/business-structure-utils';


interface InventoryDisplayProps {
  sites: Site[];
  onRefresh?: () => void;
  selectedSite: string | 'all';
  selectedStatus: ItemStatus | 'all';
}

export function InventoryDisplay({ sites, onRefresh, selectedSite, selectedStatus }: InventoryDisplayProps) {
  const [items, setItems] = useState<Item[]>([]);
  const { getPreference, setPreference } = useUserPreferences();
  
  const [activeTab, setActiveTab] = useState<InventoryTab>(InventoryTab.STICKERS);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | undefined>(undefined);
  const [defaultItemType, setDefaultItemType] = useState<ItemType>(ItemType.STICKER);
  
  // Keyboard shortcuts for modal navigation
  useKeyboardShortcuts({
    onOpenItemModal: () => setShowItemModal(true),
  });

  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditItemType, setBulkEditItemType] = useState<ItemType>(ItemType.STICKER);
  const [editingField, setEditingField] = useState<{ itemId: string; field: string } | null>(null);

  const [stickersViewBy, setStickersViewBy] = useState<'collection' | 'subtype' | 'location' | 'model'>('collection');
  const [artworksViewBy, setArtworksViewBy] = useState<'collection' | 'subtype' | 'location'>('collection');
  const [merchViewBy, setMerchViewBy] = useState<'collection' | 'subtype' | 'location'>('subtype');
  const [printsViewBy, setPrintsViewBy] = useState<'collection' | 'subtype' | 'location'>('collection');
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [movingItem, setMovingItem] = useState<Item | undefined>(undefined);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusModalConfig, setStatusModalConfig] = useState<{
    title: string;
    message: string;
    options: { label: string; action: () => void; variant?: 'default' | 'outline' }[];
  } | null>(null);

  // Collapsible divisions state for Stickers Detailed view
  const [collapsedDivisions, setCollapsedDivisions] = useState<Set<string>>(new Set());
  const [allCollapsed, setAllCollapsed] = useState(true);
  
  // Multi-location selection for Model view - will be initialized with actual site IDs
  const [selectedLocationsForModel, setSelectedLocationsForModel] = useState<Set<string>>(new Set());
  const [showLocationSelectionModal, setShowLocationSelectionModal] = useState(false);
  
     // Thresholds for low stock warnings in Model view
   const [yellowThreshold, setYellowThreshold] = useState(DEFAULT_YELLOW_THRESHOLD);
   
   const [redThreshold, setRedThreshold] = useState(5);
   
   const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false); // Flag to prevent status modals during import
   
  // Column selection state for location modal
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set(['own', 'consignment']));
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  useEffect(() => {
    // Load items when component mounts
    loadItems();
    const handleItemsUpdated = () => loadItems();
    const handleImportStarted = () => setIsImporting(true);
    const handleImportComplete = () => setIsImporting(false);
    
    window.addEventListener('importStarted', handleImportStarted);
    window.addEventListener('importComplete', handleImportComplete);
    
    return () => {
      window.removeEventListener('importStarted', handleImportStarted);
      window.removeEventListener('importComplete', handleImportComplete);
    };
  }, []);

  // Save thresholds to preferences when they change (but not during initial load)
  useEffect(() => {
    if (preferencesLoaded) {
      setPreference('inventory-yellow-threshold', yellowThreshold.toString());
    }
  }, [yellowThreshold, setPreference, preferencesLoaded]);

  useEffect(() => {
    if (preferencesLoaded) {
      setPreference('inventory-red-threshold', redThreshold.toString());
    }
  }, [redThreshold, setPreference, preferencesLoaded]);

  // Save column selection to preferences when it changes (but not during initial load)
  useEffect(() => {
    if (preferencesLoaded) {
      setPreference('inventory-selected-columns', JSON.stringify(Array.from(selectedColumns)));
    }
  }, [selectedColumns, setPreference, preferencesLoaded]);

  // Load active tab ONCE on mount
  useEffect(() => {
    const savedActiveTab = getPreference('inventory-active-tab', InventoryTab.STICKERS);
    setActiveTab(savedActiveTab as InventoryTab);
  }, []); // ← SOLUTION: Empty array = runs once on mount only

  // Initialize selectedLocationsForModel with default sites when sites are loaded
  useEffect(() => {
    if (sites.length > 0 && selectedLocationsForModel.size === 0) {
      // Find common site names and convert to IDs
      const defaultSiteNames = ['Home', 'Feria Box', 'Akiles'];
      const defaultSiteIds = sites
        .filter(site => defaultSiteNames.includes(site.name))
        .map(site => site.id);
      setSelectedLocationsForModel(new Set(defaultSiteIds));
    }
  }, [sites, selectedLocationsForModel.size]);

  // Load preferences ONCE on mount - no dependencies
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Load collapsed divisions
    const savedDivisions = getPreference('inventory-divisions-collapsed');
    if (savedDivisions) {
      try {
        setCollapsedDivisions(new Set(JSON.parse(savedDivisions)));
      } catch {
        // Keep default empty Set
      }
    }

    // Load all collapsed state
    const savedAllCollapsed = getPreference('inventory-all-collapsed');
    if (savedAllCollapsed !== undefined) {
      setAllCollapsed(JSON.parse(savedAllCollapsed));
    }

    // Load selected locations
    const savedLocations = getPreference('inventory-selected-locations');
    if (savedLocations) {
      try {
        setSelectedLocationsForModel(new Set(JSON.parse(savedLocations)));
      } catch {
        // Keep default Set
      }
    }

    // Load thresholds
    const savedYellow = getPreference('inventory-yellow-threshold');
    if (savedYellow) {
      setYellowThreshold(Number(savedYellow));
    }

    const savedRed = getPreference('inventory-red-threshold');
    if (savedRed) {
      setRedThreshold(Number(savedRed));
    }

    // Load selected columns
    const savedColumns = getPreference('inventory-selected-columns');
    if (savedColumns) {
      try {
        setSelectedColumns(new Set(JSON.parse(savedColumns)));
      } catch {
        // Keep default Set
      }
    }

    // Mark preferences as loaded to enable saving
    setPreferencesLoaded(true);
  }, []); // ← SOLUTION: Empty array = runs once on mount only

  // Helper to get ItemType from InventoryTab
  const getItemTypeForTab = (tab: InventoryTab): ItemType => {
    switch (tab) {
      case InventoryTab.DIGITAL: return ItemType.DIGITAL;
      case InventoryTab.ARTWORKS: return ItemType.ARTWORK;
      case InventoryTab.STICKERS: return ItemType.STICKER;
      case InventoryTab.PRINTS: return ItemType.PRINT;
      case InventoryTab.MERCH: return ItemType.MERCH;
      case InventoryTab.MATERIALS: return ItemType.MATERIAL;
      case InventoryTab.EQUIPMENT: return ItemType.EQUIPMENT;
      case InventoryTab.BUNDLES: return ItemType.BUNDLE;
      default: return ItemType.STICKER;
    }
  };

  const loadItems = async () => {
    try {
      // First, load items for the active tab (fast, prioritized)
      const activeTabItemType = getItemTypeForTab(activeTab);
      const activeTabItems = await ClientAPI.getItems(activeTabItemType);
      setItems(activeTabItems); // Show active tab immediately
      
      // Then load all items in the background (for instant tab switching)
      const allItems = await ClientAPI.getItems();
      setItems(allItems); // Update with all items once loaded
    } catch (error) {
      console.error('Failed to load items:', error);
    }
  };

  // Listen for item updates to refresh the list
  useEntityUpdates('item', loadItems);

  // Progressive loading: reload items when tab changes
  useEffect(() => {
    const reloadItems = async () => {
      try {
        // First, load items for the active tab (fast, prioritized)
        const activeTabItemType = getItemTypeForTab(activeTab);
        const activeTabItems = await ClientAPI.getItems(activeTabItemType);
        setItems(activeTabItems); // Show active tab immediately
        
        // Then load all items in the background (for instant tab switching)
        const allItems = await ClientAPI.getItems();
        setItems(allItems); // Update with all items once loaded
      } catch (error) {
        console.error('Failed to load items:', error);
      }
    };
    reloadItems();
  }, [activeTab]);

  const getFilteredItems = (itemType: ItemType) => {
    return items.filter(item => item.type === itemType);
  };

  const getFilteredItemsByCategory = (category: ItemCategory) => {
    return items.filter(item => getItemCategory(item.type) === category);
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const handleAddItem = (itemType: ItemType) => {
    setDefaultItemType(itemType);
    setEditingItem(undefined);
    setShowItemModal(true);
  };

  const handleEditItem = (item: Item) => {
    setEditingItem(item);
    setDefaultItemType(item.type);
    setShowItemModal(true);
  };

  const handleSaveItem = async (item: Item) => {
    try {
      // Parent only calls DataStore - API routes handle side effects
      const finalItem = await ClientAPI.upsertItem(item);
      
      // Refresh all data (including sticker bundles)
      loadItems();
      

      
      // Close modal after successful save
      setShowItemModal(false);
    } catch (error) {
      console.error('Failed to save item:', error);
      // Don't close modal on error, let user retry
    }
  };

  // Bundle handlers - now use unified Item entities
  const handleAddBundle = (bundleType: ItemType) => {
    setDefaultItemType(bundleType);
    setEditingItem(undefined);
    setShowItemModal(true);
  };

  const handleEditBundle = (bundle: Item) => {
    setEditingItem(bundle);
    setDefaultItemType(bundle.type);
    setShowItemModal(true);
  };



  const handleBulkEdit = (itemType: ItemType) => {
    setBulkEditItemType(itemType);
    setShowBulkEditModal(true);
  };

  const handleBulkEditComplete = () => {
    loadItems();
    window.dispatchEvent(new Event('itemsUpdated'));
  };

  // Inline editing handlers
  const handleInlineEdit = (itemId: string, field: string) => {
    setEditingField({ itemId, field });
  };

  // inline save with proper field handling
  const handleInlineSave = async (itemId: string, field: string, value: any) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    let updatedItem = { ...item };
    
    // Handle different field types properly
    switch (field) {
      case 'location':
        // Update the primary stock location
        const currentQuantity = ClientAPI.getItemTotalQuantity(item.id, items);
        const newSiteId = value;
        updatedItem = await ClientAPI.updateStockAtSite(item.id, newSiteId, currentQuantity);
        break;
        
      case 'quantity':
        // Update quantity at the current location
                 const siteId = item.stock.length > 0 ? item.stock[0].siteId : 'Home';
        // value is the NEW quantity the user wants, not the current total
        updatedItem = await ClientAPI.updateStockAtSite(item.id, siteId, value);
        break;
        
      default:
        // Handle other fields normally
        updatedItem = { ...item, [field]: value };
    }
    
    // Save using smart upsert (applies business rules)
    await ClientAPI.upsertItem(updatedItem);
    
    // Check for status changes when quantity changes
    if (field === 'quantity') {
      checkQuantityZero(updatedItem, value);
    }
    
    // Refresh data (including sticker bundles)
    loadItems();
    window.dispatchEvent(new Event('itemsUpdated'));
    
    setEditingField(null);
  };

  const handleInlineCancel = () => {
    setEditingField(null);
  };

  // Collapsible divisions helpers
  const toggleDivision = (divisionKey: string) => {
    setCollapsedDivisions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(divisionKey)) {
        newSet.delete(divisionKey);
      } else {
        newSet.add(divisionKey);
      }
      
      // Save to preferences
      setPreference('inventory-divisions-collapsed', JSON.stringify(Array.from(newSet)));
      
      return newSet;
    });
  };

  const isDivisionCollapsed = (divisionKey: string) => {
    return collapsedDivisions.has(divisionKey);
  };

  // Global collapse/expand functions
  const collapseAllDivisions = () => {
    const allKeys = new Set<string>();
    // Get all division keys from current grouped items
    if (stickersViewBy === 'model') {
      const stickerItems = getFilteredItems(ItemType.STICKER);
      const filteredItems = getFilteredItemsForModel(stickerItems);
      const grouped = ClientAPI.getItemsByModel(filteredItems);
      Object.keys(grouped).forEach(key => allKeys.add(key));
    } else {
      // For other views, we'll need to get the keys dynamically
      const stickerItems = getFilteredItems(ItemType.STICKER);
      if (stickersViewBy === 'location') {
        stickerItems.forEach(item => {
          if (item.stock.length > 0) {
            allKeys.add(item.stock[0].siteId);
          }
        });
      } else if (stickersViewBy === 'subtype') {
        stickerItems.forEach(item => {
          allKeys.add(item.subItemType || 'No Subtype');
        });
      } else { // collection
        stickerItems.forEach(item => {
          allKeys.add(item.collection || 'Uncategorized');
        });
      }
    }
    
    // Update state immediately and synchronously
    setCollapsedDivisions(allKeys);
    setAllCollapsed(true);
    
    // Save to preferences
    setPreference('inventory-divisions-collapsed', JSON.stringify(Array.from(allKeys)));
    setPreference('inventory-all-collapsed', 'true');
  };

  const expandAllDivisions = () => {
    // Update state immediately and synchronously
    setCollapsedDivisions(new Set());
    setAllCollapsed(false);
    
    // Save to preferences
    setPreference('inventory-divisions-collapsed', JSON.stringify([]));
    setPreference('inventory-all-collapsed', 'false');
  };

  const calculateDivisionTotal = (items: Item[]) => {
    if (stickersViewBy === 'model') {
      // Use DataStore method for consistent model calculations
      return ClientAPI.getModelTotalQuantity(items, selectedLocationsForModel);
    }
    
    return items.reduce((sum, item) => sum + (item.stock?.reduce((s, stock) => s + stock.quantity, 0) || 0), 0);
  };

  // Helper function to check if model group is low stock (only for Model view)
  const isLowStock = (modelItems: Item[]) => {
    if (stickersViewBy !== 'model') return false;
    
    // Check if the total quantity for this model is below thresholds
    const totalQuantity = calculateDivisionTotal(modelItems);
    return totalQuantity < yellowThreshold;
  };

  // Helper function to get warning level (none, yellow, red)
  const getWarningLevel = (modelItems: Item[]) => {
    if (stickersViewBy !== 'model') return 'none';
    
    const totalQuantity = calculateDivisionTotal(modelItems);
    if (totalQuantity < redThreshold) return 'red';
    if (totalQuantity < yellowThreshold) return 'yellow';
    return 'none';
  };

  // Helper functions for location modal
  const toggleColumn = (column: string, checked: boolean) => {
    setSelectedColumns(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(column);
      } else {
        newSet.delete(column);
      }
      return newSet;
    });
    
    // Also check/uncheck all locations in that column
    const locationsInColumn = getLocationsInColumn(column);
    if (checked) {
        // Add all locations in this column
        setSelectedLocationsForModel(prev => {
          const newSet = new Set(prev);
          locationsInColumn.forEach(site => newSet.add(site));
          
          // Save to preferences
          setPreference('inventory-selected-locations', JSON.stringify(Array.from(newSet)));
          
          return newSet;
        });
    } else {
      // Remove all locations in this column
      setSelectedLocationsForModel(prev => {
        const newSet = new Set(prev);
        locationsInColumn.forEach(site => newSet.delete(site));
        
        // Save to preferences
        setPreference('inventory-selected-locations', JSON.stringify(Array.from(newSet)));
        
        return newSet;
      });
    }
  };

  const getLocationsInColumn = (column: string): string[] => {
    // Define column groupings based on business logic - these could be moved to constants if they change frequently
    const OWN_SITE_NAMES = ['Akiles', 'Home', 'Feria Box'];
    const CONSIGNMENT_SITE_NAMES = ['Smoking Lounge', 'Tagua', 'Cafe Vivo'];
    
    switch (column) {
      case 'own':
        return sites.filter(site => OWN_SITE_NAMES.includes(site.name)).map(site => site.id);
      case 'consignment':
        return sites.filter(site => CONSIGNMENT_SITE_NAMES.includes(site.name)).map(site => site.id);
      case 'other':
        return sites
          .filter(site => !OWN_SITE_NAMES.includes(site.name) && !CONSIGNMENT_SITE_NAMES.includes(site.name))
          .map(site => site.id);
      default:
        return [];
    }
  };

  const toggleLocation = (site: string, checked: boolean) => {
    setSelectedLocationsForModel(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(site);
      } else {
        newSet.delete(site);
      }
      
      // Save to preferences
      setPreference('inventory-selected-locations', JSON.stringify(Array.from(newSet)));
      
      return newSet;
    });
  };

  // Helper function to render editable field
  const renderEditableField = (item: Item, field: string, value: any, type: 'text' | 'number' | 'select' = 'text', options: { value: string; label: string }[] = [], step?: string, min?: string) => {
    const isEditing = editingField?.itemId === item.id && editingField?.field === field;
    
    if (isEditing) {
      return (
        <div className="w-full">
          <InlineEditor
            value={value}
            field={field}
            itemId={item.id}
            onSave={handleInlineSave}
            onCancel={handleInlineCancel}
            type={type}
            options={options}
            step={step}
            min={min}
          />
        </div>
      );
    }

    return (
      <div 
        className="cursor-pointer hover:bg-blue-50 px-1 py-0.5 rounded transition-colors w-full text-center"
        onClick={() => handleInlineEdit(item.id, field)}
        title={`Click to edit ${field}`}
      >
        {type === 'select' && options.length > 0 ? 
          options.find(opt => opt.value === value)?.label || value || 'None' :
          value
        }
      </div>
    );
  };



  // Helper function to get proper display names for tabs
  const getTabDisplayName = (itemType: ItemType): string => {
    switch (itemType) {
      case ItemType.DIGITAL:
        return 'Digital';
      case ItemType.ARTWORK:
        return 'Artworks';
      case ItemType.STICKER:
        return 'Stickers';
      case ItemType.PRINT:
        return 'Prints';
      case ItemType.MERCH:
        return 'Merch';
      case ItemType.MATERIAL:
        return 'Materials';
      case ItemType.EQUIPMENT:
        return 'Equipment';
      default:
        return itemType;
    }
  };

  const renderTabHeader = <T extends string>(title: string, itemType: ItemType, viewBy?: T, onViewByChange?: (value: T) => void, viewOptions?: { value: T; label: string }[]) => (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        {viewBy && onViewByChange && viewOptions && (
          <Select value={viewBy} onValueChange={onViewByChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {viewOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => handleAddItem(itemType)}>
        Add {itemType}
      </Button>
    </div>
  );

  // Helper function to filter items by selected locations for Model view
  const getFilteredItemsForModel = (items: Item[]) => {
    if (stickersViewBy !== 'model') return items;
    
    // For Model view, we want ALL items, but we'll filter totals by selected locations
    // This ensures items stay grouped by model regardless of their individual locations
    return items;
  };

  // Stickers Detailed View - Restored original 6-column layout
  const renderStickersDetailedTab = () => {
    let stickerItems = getFilteredItems(ItemType.STICKER);
    
    // Apply additional filtering for Model view
    stickerItems = getFilteredItemsForModel(stickerItems);
    
    // Group items based on selected view
    const groupedItems = stickerItems.reduce((acc, sticker) => {
      let key: string;
      switch (stickersViewBy) {
        case 'location':
          key = sticker.stock[0]?.siteId || 'Unknown Location';
          break;
        case 'subtype':
          key = sticker.subItemType || 'No Subtype';
          break;
        case 'model':
          // Use DataStore method for consistent model key generation
          key = ClientAPI.getItemModelKey(sticker);
          break;
        default: // collection
          key = sticker.collection || 'Uncategorized';
      }
      
      if (!acc[key]) acc[key] = [];
      acc[key].push(sticker);
      return acc;
    }, {} as Record<string, Item[]>);

    // Sort groups for consistent ordering
    const sortedGroupKeys = Object.keys(groupedItems).sort((a, b) => {
      if (stickersViewBy === 'model') {
        // For Model view: sort by SubItem → Collection → Name (alphabetical)
        const partsA = a.split('|');
        const partsB = b.split('|');
        
        if (partsA.length === 4 && partsB.length === 4) {
          const [, subItemA, nameA, collectionA] = partsA;
          const [, subItemB, nameB, collectionB] = partsB;
          
          // First by SubItem
          if (subItemA !== subItemB) {
            return subItemA.localeCompare(subItemB);
          }
          
          // Then by Collection
          if (collectionA !== collectionB) {
            return collectionA.localeCompare(collectionB);
          }
          
          // Finally by Name (alphabetical)
          return nameA.localeCompare(nameB);
        }
      } else if (stickersViewBy === 'subtype') {
        // For Subtype view: sort by Collection → Name
        const partsA = a.split('|');
        const partsB = b.split('|');
        
        if (partsA.length === 4 && partsB.length === 4) {
          const [, , nameA, collectionA] = partsA;
          const [, , nameB, collectionB] = partsB;
          
          // First by Collection
          if (collectionA !== collectionB) {
            return collectionA.localeCompare(collectionB);
          }
          
          // Then by Name
          return nameA.localeCompare(nameB);
        }
      }
      
      // Default alphabetical sorting for other views
      return a.localeCompare(b);
    });

    const viewOptions = [
      { value: 'location', label: 'Location' },
      { value: 'collection', label: 'Collection' },
      { value: 'subtype', label: 'Subtype' },
      { value: 'model', label: 'Model' }
    ];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold">Stickers - Detailed View</h3>
            <div className="flex items-center gap-2">
              <Select value={stickersViewBy} onValueChange={(value: 'collection' | 'subtype' | 'location' | 'model') => setStickersViewBy(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {viewOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
                             {/* Global collapse/expand toggle + threshold field */}
               <div className="flex items-center gap-2">
                 <Button
                   size="sm"
                   variant="outline"
                   onClick={() => {
                     // Check actual collapsed state directly
                     const hasCollapsedDivisions = collapsedDivisions.size > 0;
                     if (hasCollapsedDivisions) {
                       expandAllDivisions();
                     } else {
                       collapseAllDivisions();
                     }
                   }}
                   className="h-8 px-3 text-xs"
                 >
                   {collapsedDivisions.size > 0 ? 'Collapsed' : 'Expanded'}
                 </Button>
                 
                 {/* Threshold button for Model view */}
                 {stickersViewBy === 'model' && (
                   <Button
                     size="sm"
                     variant="outline"
                     onClick={() => setShowThresholdModal(true)}
                     className="h-8 px-3 text-xs"
                   >
                     Thresholds
                   </Button>
                 )}
               </div>
            </div>
            
            {/* Location selection for Model view */}
            {stickersViewBy === 'model' && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowLocationSelectionModal(true)}
                  className="h-8 px-3 text-xs"
                >
                  Select Locations ({selectedLocationsForModel.size})
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-6">
            <div className="text-sm text-muted-foreground">
              <div className="text-center">
                <div className="font-bold text-lg">
                  ${stickerItems.reduce((sum, item) => sum + (item.unitCost * (item.stock?.reduce((s, stock) => s + stock.quantity, 0) || 0)), 0).toFixed(2)}
                </div>
                <div className="text-xs">Total Cost</div>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              <div className="text-center">
                <div className="font-bold text-lg">
                  ${stickerItems.reduce((sum, item) => sum + (item.price * (item.stock?.reduce((s, stock) => s + stock.quantity, 0) || 0)), 0).toFixed(2)}
                </div>
                <div className="text-xs">Total Value</div>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              <div className="text-center">
                <div className="font-bold text-lg">
                  ${stickerItems.reduce((sum, item) => sum + ((item.price - item.unitCost) * (item.stock?.reduce((s, stock) => s + stock.quantity, 0) || 0)), 0).toFixed(2)}
                </div>
                <div className="text-xs">Total Est. Profit</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => handleAddItem(ItemType.STICKER)}>
                Add Sticker Item
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkEdit(ItemType.STICKER)}>
                Bulk Edit Stickers
              </Button>
            </div>
          </div>
        </div>
        
                {sortedGroupKeys.map((groupKey) => {
          const groupStickers = groupedItems[groupKey];
          return (
          <div key={groupKey} className="border rounded-lg">
            <div className="bg-muted/50 px-4 py-2 border-b">
              <div className="flex items-center justify-between">
                                 <h4 className="font-medium text-sm">
                   {stickersViewBy === 'location' ? (
                     <>
                       <MapPin className="w-4 h-4 inline mr-1" />
                       {groupKey}
                     </>
                   ) : stickersViewBy === 'model' ? (
                     // Format model names to be more user-friendly
                     (() => {
                       const parts = groupKey.split('|');
                       if (parts.length === 4) {
                         const [itemType, subItemType, name, collection] = parts;
                         return `${itemType} | ${subItemType} | ${collection} : ${name}`;
                       }
                       return groupKey;
                     })()
                   ) : (
                     groupKey
                   )}
                 </h4>
                                 <div className="flex items-center gap-3">
                   {/* Division Total + Low Stock Warning */}
                   <div className="flex items-center gap-2">
                     {/* Low stock warning - only in Model view */}
                     {stickersViewBy === 'model' && (() => {
                       const warningLevel = getWarningLevel(groupStickers);
                       if (warningLevel === 'none') return null;
                       
                       const isRed = warningLevel === 'red';
                       const threshold = isRed ? redThreshold : yellowThreshold;
                       const color = isRed ? 'text-red-500' : 'text-yellow-500';
                       const title = isRed 
                         ? `Critical stock: ${calculateDivisionTotal(groupStickers)} < ${redThreshold}`
                         : `Low stock: ${calculateDivisionTotal(groupStickers)} < ${yellowThreshold}`;
                       
                       return (
                         <div 
                           className="flex items-center"
                           title={title}
                         >
                           <AlertTriangle className={`w-4 h-4 ${color}`} />
                         </div>
                       );
                     })()}
                     <div className="text-sm font-bold text-muted-foreground">
                       Total: {calculateDivisionTotal(groupStickers)}
                     </div>
                   </div>
                   {/* Collapse/Expand Button */}
                   <Button
                     size="sm"
                     variant="ghost"
                     className="h-6 w-6 p-0"
                     onClick={() => toggleDivision(groupKey)}
                   >
                     {isDivisionCollapsed(groupKey) ? (
                       <ChevronRight className="w-4 h-4" />
                     ) : (
                       <ChevronDown className="w-4 h-4" />
                     )}
                   </Button>
                 </div>
              </div>
            </div>
            
            {/* Items in group - only show if not collapsed */}
            {!isDivisionCollapsed(groupKey) && (
              <div className="p-4">
                {/* Clean 1-column grid layout */}
                <div className="grid grid-cols-1 gap-4">
                  {groupStickers.map(sticker => (
                    <div key={sticker.id} className="bg-card border rounded-lg p-3 hover:bg-accent/50 transition-colors">
                      {/* Row 1: Name | Area | Station | Location | Qty | Size | Price | Status | Actions - 8 columns */}
                      <div className="flex items-center gap-4 mb-2">
                        {/* Column 1: Name */}
                        <div className="font-medium text-sm truncate flex-1 min-w-0" title={sticker.name}>
                          {sticker.name}
                        </div>
                        
                        {/* Column 2: Area */}
                        <div className="text-center flex-shrink-0 w-24">
                          <div className="text-sm font-bold">
                            {getAreaForStation(sticker.station) || 'N/A'}
                          </div>
                        </div>
                        
                        {/* Column 3: Station */}
                        <div className="text-center flex-shrink-0 w-32">
                          <div className="text-sm font-bold">
                            {sticker.station}
                          </div>
                        </div>
                        
                        {/* Column 4: Location - Hidden in Model view */}
                        <div className="text-sm flex items-center justify-center gap-1 flex-shrink-0 w-32">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            {stickersViewBy === 'model' ? (
                              // In Model view, show read-only summary of locations
                              <div className="text-xs text-muted-foreground text-center">
                                {sticker.stock
                                  .filter(sp => selectedLocationsForModel.has(sp.siteId) && sp.quantity > 0)
                                  .map(sp => {
                                    const site = sites.find(s => s.id === sp.siteId);
                                    return site ? site.name : sp.siteId;
                                  })
                                  .join(', ') || 'No stock'}
                              </div>
                            ) : (
                              // In other views, show editable location field
                                                             renderEditableField(sticker, 'location', 
                                 sticker.stock.length > 0 ? sticker.stock[0].siteId : 'Home', 
                                 'select', 
                                 sites.map(site => ({
                                   value: site.id,
                                   label: site.name
                                 }))
                               )
                            )}
                          </div>
                        </div>
                        
                        {/* Column 5: Quantity */}
                        <div className="text-center flex-shrink-0 w-20">
                          <div className="text-sm font-bold">
                            {renderEditableField(sticker, 'quantity', sticker.stock?.reduce((s, stock) => s + stock.quantity, 0) || 0, 'number', [], '1', '0')}
                          </div>
                        </div>
                        
                        {/* Column 6: Size */}
                        <div className="text-center flex-shrink-0 w-20">
                          <div className="text-sm font-bold">
                            {renderEditableField(sticker, 'size', sticker.size || '', 'text')}
                          </div>
                        </div>
                        
                        {/* Column 7: Price */}
                        <div className="text-center flex-shrink-0 w-24">
                          <div className="text-sm font-bold">
                            {renderEditableField(sticker, 'price', sticker.price, 'number')}
                          </div>
                        </div>
                        
                        {/* Column 8: Status */}
                        <div className="text-center flex-shrink-0 w-28">
                          <div className="text-sm font-bold">
                            {renderEditableField(sticker, 'status', sticker.status, 'select', 
                              Object.values(ItemStatus).map(status => ({
                                value: status,
                                label: status
                              }))
                            )}
                          </div>
                        </div>
                        
                                                 {/* Column 9: Actions */}
                         <div className="flex justify-center gap-1 flex-shrink-0 w-16">
                           <Button 
                             size="sm" 
                             variant="ghost" 
                             className="h-6 w-6 p-0"
                             onClick={() => handleEditItem(sticker)}
                           >
                             <Pencil className="w-4 h-4" />
                           </Button>
                           <Button 
                             size="sm" 
                             variant="ghost" 
                             className="h-6 w-6 p-0"
                             onClick={() => handleMoveItem(sticker)}
                             title="Move Item"
                           >
                             <Package className="w-4 h-4" />
                           </Button>
                         </div>
                      </div>
                      
                      {/* Row 2: Collection | Subtype | Area | Station | Size | Price | Status | Move - 8 columns */}
                      <div className="flex items-center gap-4">
                        {/* Column 1: Collection */}
                        <div className="text-xs text-muted-foreground truncate flex-1 min-w-0">
                          {sticker.collection || 'No Collection'}
                        </div>
                        
                        {/* Column 2: Subtype */}
                        <div className="text-xs text-muted-foreground truncate flex-shrink-0 w-32">
                          {sticker.subItemType || 'No Subtype'}
                        </div>
                        
                        {/* Column 3: Area Label */}
                        <div className="text-xs text-muted-foreground text-center flex-shrink-0 w-24">Area</div>
                        
                        {/* Column 4: Station Label */}
                        <div className="text-xs text-muted-foreground text-center flex-shrink-0 w-32">Station</div>
                        
                        {/* Column 5: Size Label */}
                        <div className="text-xs text-muted-foreground text-center flex-shrink-0 w-20">Size</div>
                        
                        {/* Column 6: Price Label */}
                        <div className="text-xs text-muted-foreground text-center flex-shrink-0 w-24">Price ($)</div>
                        
                        {/* Column 7: Status Label */}
                        <div className="text-xs text-muted-foreground text-center flex-shrink-0 w-28">Status</div>
                        
                        {/* Column 8: Empty space for alignment */}
                        <div className="flex justify-center gap-1 flex-shrink-0 w-16">
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          );
        })}
      </div>
    );
  };

  // Sticker Bundles View - Location-based mixed sticker collections
  const renderStickerBundlesTab = () => {
    const filteredBundles = getFilteredItems(ItemType.BUNDLE);

    // Group bundles by their primary location (site with highest quantity, or first if all equal)
    const groupedBundles = filteredBundles.reduce((acc, bundle) => {
      let location: string;
      if (bundle.stock.length === 0) {
        location = 'No Location';
      } else if (bundle.stock.length === 1) {
        location = bundle.stock[0].siteId;
      } else {
        // Find the site with the highest quantity
        const primaryStock = bundle.stock.reduce((max, current) => 
          current.quantity > max.quantity ? current : max
        );
        location = primaryStock.siteId;
      }
      
      if (!acc[location]) acc[location] = [];
      acc[location].push(bundle);
      return acc;
    }, {} as Record<string, Item[]>);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold">Sticker Bundles</h3>
          </div>
          <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => handleAddBundle(ItemType.BUNDLE)}>
            Add Sticker Bundle
          </Button>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Object.entries(groupedBundles).map(([location, bundles]) => (
            <div key={location} className="border rounded-lg">
              <div className="bg-muted/50 px-3 py-2 border-b">
                <h4 className="font-medium text-sm">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  {location === 'No Location' ? 'No Location' : location}
                </h4>
              </div>
              <div className="p-3">
                <div className="space-y-2">
                  {bundles.map(bundle => (
                    <div key={bundle.id} className="bg-card border rounded p-2 hover:bg-accent/50">
                      <div className="flex items-start justify-between gap-3">
                        {/* Left side - Name and editable fields */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="font-medium text-sm">
                            {editingField?.itemId === bundle.id && editingField?.field === 'name' ? (
                              <Input 
                                value={bundle.name}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                  const updated = { ...bundle, name: e.target.value };
                                  handleSaveItem(updated);
                                }}
                                onBlur={() => setEditingField(null)}
                                className="h-6 px-1 py-0"
                              />
                            ) : (
                              <div 
                                className="cursor-pointer hover:bg-blue-50 px-1 py-0.5 rounded transition-colors"
                                onClick={() => setEditingField({ itemId: bundle.id, field: 'name' })}
                                title="Click to edit name"
                              >
                                {bundle.name}
                              </div>
                            )}
                          </div>
                          
                          <div className="text-xs text-muted-foreground">
                            {getAreaForStation(bundle.station) || 'N/A'} - {bundle.station}
                          </div>
                          
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Target:</span>
                              <span className="px-1">
                                {bundle.targetAmount || 0}
                              </span>
                            </div>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Quantity:</span>
                              {editingField?.itemId === bundle.id && editingField?.field === 'quantity' ? (
                                <Input 
                                  type="number"
                                  value={bundle.stock?.reduce((s, stock) => s + stock.quantity, 0) || 0}
                                  onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
                                    const quantity = Number(e.target.value) || 0;
                                    const siteId = bundle.stock.length > 0 ? bundle.stock[0].siteId : 'Home';
                                    const updated = await ClientAPI.updateStockAtSite(bundle.id, siteId, quantity);
                                    handleSaveItem(updated);
                                  }}
                                  onBlur={() => setEditingField(null)}
                                  className="h-6 w-16 px-1 py-0 text-center"
                                  step="1"
                                  min="0"
                                />
                              ) : (
                                <span 
                                  className="cursor-pointer hover:bg-blue-50 px-1 py-0.5 rounded"
                                  onClick={() => setEditingField({ itemId: bundle.id, field: 'quantity' })}
                                  title="Click to edit quantity"
                                >
                                  {bundle.stock?.reduce((s, stock) => s + stock.quantity, 0) || 0}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Status:</span>
                              {editingField?.itemId === bundle.id && editingField?.field === 'status' ? (
                                <Select
                                  value={bundle.status}
                                  onValueChange={(value) => {
                                    const updated = { ...bundle, status: value as ItemStatus };
                                    handleSaveItem(updated);
                                    setEditingField(null);
                                  }}
                                >
                                  <SelectTrigger className="h-6 px-1 py-0 w-36">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.values(ItemStatus).map(s => (
                                      <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span 
                                  className="cursor-pointer hover:bg-blue-50 px-1 py-0.5 rounded"
                                  onClick={() => setEditingField({ itemId: bundle.id, field: 'status' })}
                                  title="Click to edit status"
                                >
                                  {bundle.status}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Right side - Stock, Price, Actions */}
                        <div className="flex flex-col items-end gap-2 text-right">
                          <div className="text-sm">
                            {editingField?.itemId === bundle.id && editingField?.field === 'price' ? (
                                                              <Input 
                                  type="number"
                                  value={bundle.price}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    const price = Number(e.target.value) || 0;
                                    const updated = { ...bundle, price, value: price * (bundle.stock?.reduce((s, stock) => s + stock.quantity, 0) || 0) };
                                    handleSaveItem(updated);
                                  }}
                                onBlur={() => setEditingField(null)}
                                className="h-6 w-24 text-right"
                              />
                            ) : (
                              <span 
                                className="cursor-pointer hover:bg-blue-50 px-1 py-0.5 rounded"
                                onClick={() => setEditingField({ itemId: bundle.id, field: 'price' })}
                                title="Click to edit price"
                              >
                                {formatCurrency(bundle.price)}
                              </span>
                            )}
                          </div>
                          
                          <div className="text-sm font-bold">
                            <span className="px-1">{bundle.stock?.reduce((s, stock) => s + stock.quantity, 0) || 0}/{bundle.targetAmount || 0}</span>
                          </div>
                          
                                                     <div className="flex gap-1">
                             <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={(e) => { e.stopPropagation(); handleEditBundle(bundle); }}>
                               Edit
                             </Button>
                           </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Print Bundles Tab - Future implementation
  const renderPrintBundlesTab = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold">Print Bundles</h3>
          </div>
          <Button size="sm" className="bg-primary hover:bg-primary/90" disabled>
            Add Print Bundle (Coming Soon)
          </Button>
        </div>
        
        <div className="text-center py-8 text-muted-foreground">
          <Package2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Print Bundles will be available soon!</p>
          <p className="text-sm">This feature is under development.</p>
        </div>
      </div>
    );
  };

  // Consolidated Stickers Tab with Subtabs
  const renderStickersTab = () => {
    return (
      <div className="space-y-4">
        {renderStickersDetailedTab()}
      </div>
    );
  };



  // Compact Equipment View - Grid with essential data
  const renderEquipmentTab = () => {
    const equipmentItems = getFilteredItems(ItemType.EQUIPMENT);
    
    return (
      <div className="space-y-4">
        {renderTabHeader(getTabDisplayName(ItemType.EQUIPMENT), ItemType.EQUIPMENT)}
        
        <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-6">
          {equipmentItems.map(item => (
            <div key={item.id} className="bg-card border rounded p-3 hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => handleEditItem(item)}>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto bg-gradient-to-br from-gray-400 to-gray-600 rounded flex items-center justify-center text-white text-xs">
                   <Settings className="w-6 h-6" />
                 </div>
                <div className="text-xs font-medium truncate">{item.name}</div>
                <div className="text-xs text-muted-foreground">{item.year}</div>
                <div className="text-xs text-muted-foreground">
                  {getAreaForStation(item.station) || 'N/A'} - {item.station}
                </div>
                <div className="text-sm font-bold">{item.stock?.reduce((s, stock) => s + stock.quantity, 0) || 0}</div>
                <div className="text-xs text-muted-foreground">{formatCurrency(item.unitCost)}</div>
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={(e) => { e.stopPropagation(); handleEditItem(item); }}>Edit</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Bundles Tab - Business Logic Items
  const renderBundlesTab = () => {
    return (
      <div className="space-y-4">
        <Tabs defaultValue="sticker-bundles" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sticker-bundles">Sticker Bundles</TabsTrigger>
            <TabsTrigger value="print-bundles">Print Bundles</TabsTrigger>
          </TabsList>
          
          <TabsContent value="sticker-bundles" className="mt-4">
            {renderStickerBundlesTab()}
          </TabsContent>
          
          <TabsContent value="print-bundles" className="mt-4">
            {renderPrintBundlesTab()}
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  // Other tabs with similar compact design
  const renderDigitalArtTab = () => {
    const digitalArtItems = getFilteredItems(ItemType.DIGITAL);
    
    return (
      <div className="space-y-4">
        {renderTabHeader(getTabDisplayName(ItemType.DIGITAL), ItemType.DIGITAL)}
        
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
          {digitalArtItems.map(item => (
            <div key={item.id} className="bg-card border rounded p-3 hover:bg-accent/50 cursor-pointer" onClick={() => handleEditItem(item)}>
              <div className="space-y-2">
                <div className="font-medium text-sm">{item.name}</div>
                <div className="text-xs text-muted-foreground">{item.collection}</div>
                <div className="text-xs text-muted-foreground">
                  {getAreaForStation(item.station) || 'N/A'} - {item.station}
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm font-bold">{item.stock?.reduce((s, stock) => s + stock.quantity, 0) || 0}</div>
                  <div className="text-sm">{formatCurrency(item.price)}</div>
                </div>
                <Button size="sm" variant="ghost" className="w-full h-8 text-xs" onClick={(e) => { e.stopPropagation(); handleEditItem(item); }}>Edit</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Compact Artworks View - Organized by view selector
  const renderArtworksTab = () => {
    const artworkItems = getFilteredItems(ItemType.ARTWORK);
    
    // Group items based on selected view
    const groupedArtworks = artworkItems.reduce((acc, artwork) => {
      let key: string;
      switch (artworksViewBy) {
        case 'location':
          key = artwork.stock[0]?.siteId || 'Unknown Location';
          break;
        case 'subtype':
          key = artwork.subItemType || 'No Subtype';
          break;
        default: // collection
          key = artwork.collection || 'Uncategorized';
      }
      
      if (!acc[key]) acc[key] = [];
      acc[key].push(artwork);
      return acc;
    }, {} as Record<string, Item[]>);
    
    const viewOptions: { value: 'collection' | 'subtype' | 'location'; label: string }[] = [
      { value: 'location', label: 'Location' },
      { value: 'collection', label: 'Collection' },
      { value: 'subtype', label: 'Subtype' }
    ];
    
    return (
      <div className="space-y-4">
        {renderTabHeader(getTabDisplayName(ItemType.ARTWORK), ItemType.ARTWORK, artworksViewBy, (value: 'collection' | 'subtype' | 'location') => setArtworksViewBy(value), viewOptions)}
        
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(groupedArtworks).map(([groupKey, groupArtworks]) => (
            <div key={groupKey} className="border rounded-lg">
              <div className="bg-muted/50 px-4 py-2 border-b">
                <h4 className="font-medium text-sm">{artworksViewBy === 'location' ? <><MapPin className="w-4 h-4 inline mr-1" />{groupKey}</> : groupKey}</h4>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {groupArtworks.map(artwork => (
                    <div key={artwork.id} className="bg-card border rounded p-3 hover:bg-accent/50 cursor-pointer" onClick={() => handleEditItem(artwork)}>
                      <div className="space-y-2">
                        <div className="font-medium text-sm">{artwork.name}</div>
                        <div className="text-xs text-muted-foreground">{artwork.collection}</div>
                        <div className="text-xs text-muted-foreground">
                          {getAreaForStation(artwork.station) || 'N/A'} - {artwork.station}
                        </div>
                        {artwork.dimensions && (
                          <div className="text-xs text-muted-foreground">
                            {artwork.dimensions.width}×{artwork.dimensions.height} cm
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <div className="text-sm font-bold">{artwork.stock?.reduce((s, stock) => s + stock.quantity, 0) || 0}</div>
                          <div className="text-sm">{formatCurrency(artwork.price)}</div>
                        </div>
                        <Button size="sm" variant="ghost" className="w-full h-8 text-xs" onClick={(e) => { e.stopPropagation(); handleEditItem(artwork); }}>Edit</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Compact Merch View - Organized by view selector
  const renderMerchTab = () => {
    const merchItems = getFilteredItems(ItemType.MERCH);
    
    // Group items based on selected view
    const groupedMerch = merchItems.reduce((acc, item) => {
      let key: string;
      switch (merchViewBy) {
        case 'location':
          key = item.stock[0]?.siteId || 'Unknown Location';
          break;
        case 'subtype':
          key = item.subItemType || 'Other';
          break;
        default: // collection
          key = item.collection || 'Uncategorized';
      }
      
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {} as Record<string, Item[]>);

    const viewOptions: { value: 'collection' | 'subtype' | 'location'; label: string }[] = [
      { value: 'location', label: 'Location' },
      { value: 'collection', label: 'Collection' },
      { value: 'subtype', label: 'Subtype' }
    ];

    return (
      <div className="space-y-4">
        {renderTabHeader(getTabDisplayName(ItemType.MERCH), ItemType.MERCH, merchViewBy, (value: 'collection' | 'subtype' | 'location') => setMerchViewBy(value), viewOptions)}
        
        {Object.entries(groupedMerch).map(([groupKey, groupItems]) => (
          <div key={groupKey} className="border rounded-lg">
            <div className="bg-muted/50 px-4 py-2 border-b">
              <h4 className="font-medium text-sm">{merchViewBy === 'location' ? <><MapPin className="w-4 h-4 inline mr-1" />{groupKey}</> : groupKey}</h4>
            </div>
            <div className="divide-y">
              {groupItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 hover:bg-accent/50 cursor-pointer">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{item.name}</div>
                    <div className="text-xs text-muted-foreground">{item.collection}</div>
                    <div className="text-xs text-muted-foreground">
                      {getAreaForStation(item.station) || 'N/A'} - {item.station}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-bold">{item.stock?.reduce((s, stock) => s + stock.quantity, 0) || 0}</div>
                      <div className="text-xs text-muted-foreground">units</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold">{formatCurrency(item.price)}</div>
                      <div className="text-xs text-muted-foreground">price</div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => handleEditItem(item)}>Edit</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Compact Prints View - Organized by view selector
  const renderPrintsTab = () => {
    const printItems = getFilteredItems(ItemType.PRINT);
    
    // Group items based on selected view
    const groupedPrints = printItems.reduce((acc, print) => {
      let key: string;
      switch (printsViewBy) {
        case 'location':
          key = print.stock[0]?.siteId || 'Unknown Location';
          break;
        case 'subtype':
          key = print.subItemType || 'No Subtype';
          break;
        default: // collection
          key = print.collection || 'Uncategorized';
      }
      
      if (!acc[key]) acc[key] = [];
      acc[key].push(print);
      return acc;
    }, {} as Record<string, Item[]>);

    const viewOptions: { value: 'collection' | 'subtype' | 'location'; label: string }[] = [
      { value: 'collection', label: 'Collection' },
      { value: 'subtype', label: 'Subtype' },
      { value: 'location', label: 'Location' }
    ];

    return (
      <div className="space-y-4">
        {renderTabHeader(getTabDisplayName(ItemType.PRINT), ItemType.PRINT, printsViewBy, (value: 'collection' | 'subtype' | 'location') => setPrintsViewBy(value), viewOptions)}
        
        {Object.entries(groupedPrints).map(([groupKey, groupPrints]) => (
          <div key={groupKey} className="border rounded-lg">
            <div className="bg-muted/50 px-4 py-2 border-b">
              <h4 className="font-medium text-sm">{printsViewBy === 'location' ? <><MapPin className="w-4 h-4 inline mr-1" />{groupKey}</> : groupKey}</h4>
            </div>
            <div className="divide-y">
              {groupPrints.map(print => (
                <div key={print.id} className="flex items-center justify-between p-3 hover:bg-accent/50 cursor-pointer">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{print.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {getAreaForStation(print.station) || 'N/A'} - {print.station}
                    </div>
                    {print.dimensions && (
                      <div className="text-xs text-muted-foreground">
                        {print.dimensions.width}×{print.dimensions.height} cm
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-bold">{print.stock?.reduce((s, stock) => s + stock.quantity, 0) || 0}</div>
                      <div className="text-xs text-muted-foreground">units</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold">{formatCurrency(print.price)}</div>
                      <div className="text-xs text-muted-foreground">price</div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => handleEditItem(print)}>Edit</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderMaterialsTab = () => {
    const materialItems = getFilteredItems(ItemType.MATERIAL);
    
    return (
      <div className="space-y-4">
        {renderTabHeader(getTabDisplayName(ItemType.MATERIAL), ItemType.MATERIAL)}
        
        <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-6">
          {materialItems.map(item => (
            <div key={item.id} className="bg-card border rounded p-3 hover:bg-accent/50 cursor-pointer" onClick={() => handleEditItem(item)}>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto bg-gradient-to-br from-yellow-400 to-yellow-600 rounded flex items-center justify-center text-white text-xs">
                  <Package2 className="w-6 h-6" />
                </div>
                <div className="text-xs font-medium truncate">{item.name}</div>
                <div className="text-xs text-muted-foreground">
                  {getAreaForStation(item.station) || 'N/A'} - {item.station}
                </div>
                <div className="text-xs text-muted-foreground">{item.year}</div>
                <div className="text-sm font-bold">{item.stock?.reduce((s, stock) => s + stock.quantity, 0) || 0}</div>
                <div className="text-xs text-muted-foreground">{formatCurrency(item.unitCost)}</div>
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={(e) => { e.stopPropagation(); handleEditItem(item); }}>Edit</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const handleMoveItem = (item: Item) => {
    setMovingItem(item);
    setShowMoveModal(true);
  };

  const handleMoveComplete = () => {
    setShowMoveModal(false);
    setMovingItem(undefined);
    loadItems();
    window.dispatchEvent(new Event('itemsUpdated'));
  };

  // Smart Status Management
  const checkAndHandleStatusChange = (item: Item, isMovingToSold: boolean) => {
    // Check if this inventory type should show the "Set to Sold" modal
    // Default behavior: show modal for all item types
    const shouldShowModal = true;
    
    if (!shouldShowModal) return;
    
    // Case 1: Moving to a sold item
    if (isMovingToSold) {
      setStatusModalConfig({
        title: 'Moving to Sold Item',
        message: `"${item.name}" is being moved to a sold item. Update status?`,
        options: [
          {
                          label: 'Set Status to Sold',
              action: async () => {
                const updatedItem = { ...item, status: ItemStatus.SOLD };
                await ClientAPI.upsertItem(updatedItem);
                
                setShowStatusModal(false);
              },
            variant: 'default'
          },
          {
            label: 'Leave as is',
            action: () => setShowStatusModal(false),
            variant: 'outline'
          }
        ]
      });
      setShowStatusModal(true);
      return;
    }
  };

  /**
   * Check quantity 0 separately
   * 
   * WARNING: This function sets modal state. NEVER call this function from within
   * modal action callbacks to avoid infinite recursion. Modal actions should only
   * call setShowStatusModal(false) to close.
   */
  const checkQuantityZero = (item: Item, newQuantity: number) => {
    // Don't show status modal during import
    if (isImporting) return;
    
    // DEFENSIVE GUARD: Prevent re-entry if modal is already showing
    if (showStatusModal) return;
    
    // Check if this inventory type should show the "Set to Sold" modal
    // Default behavior: show modal for all item types
    const shouldShowModal = true;
    
    if (!shouldShowModal) return;
    
    if (newQuantity === 0) {
      setStatusModalConfig({
        title: 'Item Quantity is 0',
        message: `"${item.name}" has no quantity left. What would you like to do?`,
        options: [
          {
            label: 'Status: Sold',
            action: () => {
              const updatedItem = { ...item, status: ItemStatus.SOLD };
              ClientAPI.upsertItem(updatedItem);
              setShowStatusModal(false);
              loadItems();
            },
            variant: 'default'
          },
          {
            label: 'Delete Item',
            action: () => {
              // Show delete confirmation
              setStatusModalConfig({
                title: 'Confirm Delete',
                message: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
                options: [
                  {
                    label: 'Yes, Delete',
                    action: () => {
                      ClientAPI.deleteItem(item.id);
                      setShowStatusModal(false);
                      loadItems();
                      window.dispatchEvent(new Event('itemsUpdated'));
                    },
                    variant: 'outline'
                  },
                  {
                    label: 'Cancel',
                    action: () => {
                      // Just close the modal - user can reopen if needed
                      setShowStatusModal(false);
                    },
                    variant: 'default'
                  }
                ]
              });
            },
            variant: 'outline'
          },
          {
            label: 'Leave as is',
            action: () => setShowStatusModal(false),
            variant: 'outline'
          }
        ]
      });
      setShowStatusModal(true);
    } else if (item.status === ItemStatus.SOLD && newQuantity > 0) {
      // When quantity goes from 0 to >0, prompt to change status back to FOR_SALE
      setStatusModalConfig({
        title: 'Item Quantity Restored',
        message: `"${item.name}" now has quantity ${newQuantity}. Update status?`,
        options: [
          {
            label: 'Status: For Sale',
            action: () => {
              const updatedItem = { ...item, status: ItemStatus.FOR_SALE };
              ClientAPI.upsertItem(updatedItem);
              setShowStatusModal(false);
              loadItems();
            },
            variant: 'default'
          },
          {
            label: 'Leave as is',
            action: () => setShowStatusModal(false),
            variant: 'outline'
          }
        ]
      });
      setShowStatusModal(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* Inventory Tabs - Main navigation at the top */}
      <Tabs value={activeTab} onValueChange={(value: string) => {
        const newTab = value as InventoryTab;
        setActiveTab(newTab);
        setPreference('inventory-active-tab', newTab);
      }} className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value={InventoryTab.DIGITAL}>Digital</TabsTrigger>
          <TabsTrigger value={InventoryTab.ARTWORKS}>Artworks</TabsTrigger>
          <TabsTrigger value={InventoryTab.STICKERS}>Stickers</TabsTrigger>
          <TabsTrigger value={InventoryTab.PRINTS}>Prints</TabsTrigger>
          <TabsTrigger value={InventoryTab.MERCH}>Merch</TabsTrigger>
          <TabsTrigger value={InventoryTab.MATERIALS}>Materials</TabsTrigger>
          <TabsTrigger value={InventoryTab.EQUIPMENT}>Equipment</TabsTrigger>
          <TabsTrigger value={InventoryTab.BUNDLES}>Bundles</TabsTrigger>
        </TabsList>
        
        <TabsContent value={InventoryTab.DIGITAL} className="mt-4">
          {renderDigitalArtTab()}
        </TabsContent>
        
        <TabsContent value={InventoryTab.ARTWORKS} className="mt-4">
          {renderArtworksTab()}
        </TabsContent>
        
        <TabsContent value={InventoryTab.STICKERS} className="mt-4">
          {renderStickersTab()}
        </TabsContent>

        <TabsContent value={InventoryTab.PRINTS} className="mt-4">
          {renderPrintsTab()}
        </TabsContent>
        
        <TabsContent value={InventoryTab.MERCH} className="mt-4">
          {renderMerchTab()}
        </TabsContent>
        
        <TabsContent value={InventoryTab.MATERIALS} className="mt-4">
          {renderMaterialsTab()}
        </TabsContent>
        
        <TabsContent value={InventoryTab.EQUIPMENT} className="mt-4">
          {renderEquipmentTab()}
        </TabsContent>
        
        <TabsContent value={InventoryTab.BUNDLES} className="mt-4">
          {renderBundlesTab()}
        </TabsContent>
      </Tabs>

      {/* Item Modal */}
      <ItemModal
        item={editingItem}
        defaultItemType={defaultItemType}
        open={showItemModal}
        onOpenChange={setShowItemModal}
        onSave={handleSaveItem}
      />


             {/* Threshold Modal for Model View */}
       {showThresholdModal && (
         <div 
           className={`fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 ${getZIndexClass('MODALS')}`}
           onKeyDown={(e) => {
             if (e.key === 'Escape') {
               setShowThresholdModal(false);
             }
           }}
           tabIndex={0}
         >
           <div className="bg-card border rounded-lg shadow-xl max-w-md w-full p-6">
             <h3 className="text-lg font-semibold mb-4 text-foreground">Stock Warning Thresholds</h3>
             <p className="text-sm mb-4 text-muted-foreground">
               Set thresholds for low stock warnings in the Model view.
             </p>
             
             <div className="space-y-4 mb-6">
               {/* Yellow Warning Threshold */}
               <div className="space-y-2">
                 <label className="text-sm font-medium text-foreground">
                   Yellow Warning (Low Stock)
                 </label>
                 <div className="flex items-center gap-2">
                   <Input
                     type="number"
                     value={yellowThreshold}
                     onChange={(e) => setYellowThreshold(Number(e.target.value) || DEFAULT_YELLOW_THRESHOLD)}
                     className="w-24"
                     min="1"
                     step="1"
                   />
                   <span className="text-sm text-muted-foreground">units</span>
                 </div>
                 <p className="text-xs text-muted-foreground">
                   Shows yellow warning when total quantity is below this value
                 </p>
               </div>
               
               {/* Red Warning Threshold */}
               <div className="space-y-2">
                 <label className="text-sm font-medium text-foreground">
                   Red Warning (Critical Stock)
                 </label>
                 <div className="flex items-center gap-2">
                   <Input
                     type="number"
                     value={redThreshold}
                     onChange={(e) => setRedThreshold(Number(e.target.value) || 5)}
                     className="w-24"
                     min="1"
                     step="1"
                   />
                   <span className="text-sm text-muted-foreground">units</span>
                 </div>
                 <p className="text-xs text-muted-foreground">
                   Shows red warning when total quantity is below this value
                 </p>
               </div>
             </div>
             
             <div className="flex justify-end gap-2">
               <Button
                 variant="outline"
                 onClick={() => setShowThresholdModal(false)}
               >
                 Close
               </Button>
             </div>
           </div>
         </div>
       )}

       {/* Location Selection Modal for Model View */}
       {showLocationSelectionModal && (
         <div 
           className={`fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 ${getZIndexClass('MODALS')}`}
           onKeyDown={(e) => {
             if (e.key === 'Escape') {
               setShowLocationSelectionModal(false);
             }
           }}
           tabIndex={0}
         >
           <div className="bg-card border rounded-lg shadow-xl max-w-4xl w-full p-6">
             <h3 className="text-lg font-semibold mb-4 text-foreground">Select Locations for Model View</h3>
             <p className="text-sm mb-4 text-muted-foreground">
               Choose which locations to include when calculating totals and showing items in the Model view.
             </p>
             
             {/* Column Selectors */}
             <div className="flex gap-4 mb-4">
               <label className="flex items-center gap-2 cursor-pointer">
                 <input
                   type="checkbox"
                   checked={selectedColumns.has('own')}
                   onChange={(e) => toggleColumn('own', e.target.checked)}
                   className="w-4 h-4"
                 />
                 <span className="text-sm font-medium">Own Locations</span>
               </label>
               <label className="flex items-center gap-2 cursor-pointer">
                 <input
                   type="checkbox"
                   checked={selectedColumns.has('consignment')}
                   onChange={(e) => toggleColumn('consignment', e.target.checked)}
                   className="w-4 h-4"
                 />
                 <span className="text-sm font-medium">Consignment Network</span>
               </label>
               <label className="flex items-center gap-2 cursor-pointer">
                 <input
                   type="checkbox"
                   checked={selectedColumns.has('other')}
                   onChange={(e) => toggleColumn('other', e.target.checked)}
                   className="w-4 h-4"
                 />
                 <span className="text-sm font-medium">Other Locations</span>
               </label>
             </div>
             
             {/* 3-Column Layout */}
             <div className="grid grid-cols-3 gap-6 mb-6">
               {/* Column 1: Own Locations */}
               <div className="space-y-2">
                 <h4 className="font-medium text-sm text-muted-foreground mb-3">Own Locations</h4>
                 {sites.filter(site => ['Akiles', 'Home', 'Feria Box'].includes(site.name)).map(site => (
                   <label key={site.id} className="flex items-center gap-3 cursor-pointer hover:bg-muted p-2 rounded">
                     <input
                       type="checkbox"
                       checked={selectedLocationsForModel.has(site.id)}
                       onChange={(e) => toggleLocation(site.id, e.target.checked)}
                       className="w-4 h-4"
                     />
                     <span className="text-sm">{site.name}</span>
                   </label>
                 ))}
               </div>
               
               {/* Column 2: Consignment Network */}
               <div className="space-y-2">
                 <h4 className="font-medium text-sm text-muted-foreground mb-3">Consignment Network</h4>
                 {sites.filter(site => ['Smoking Lounge', 'Tagua', 'Cafe Vivo'].includes(site.name)).map(site => (
                   <label key={site.id} className="flex items-center gap-3 cursor-pointer hover:bg-muted p-2 rounded">
                     <input
                       type="checkbox"
                       checked={selectedLocationsForModel.has(site.id)}
                       onChange={(e) => toggleLocation(site.id, e.target.checked)}
                       className="w-4 h-4"
                     />
                     <span className="text-sm">{site.name}</span>
                   </label>
                 ))}
               </div>
               
               {/* Column 3: Other Locations (Scrollable) */}
               <div className="space-y-2">
                 <h4 className="font-medium text-sm text-muted-foreground mb-3">Other Locations</h4>
                 <div className="max-h-32 overflow-y-auto">
                   {sites.filter(site => 
                     !['Akiles', 'Home', 'Feria Box', 'Smoking Lounge', 'Tagua', 'Cafe Vivo'].includes(site.name)
                   ).map(site => (
                     <label key={site.id} className="flex items-center gap-3 cursor-pointer hover:bg-muted p-2 rounded">
                       <input
                         type="checkbox"
                         checked={selectedLocationsForModel.has(site.id)}
                         onChange={(e) => toggleLocation(site.id, e.target.checked)}
                         className="w-4 h-4"
                       />
                       <span className="text-sm">{site.name}</span>
                     </label>
                   ))}
                 </div>
               </div>
             </div>
             
             <div className="flex justify-end gap-2">
               <Button
                 variant="outline"
                 onClick={() => setShowLocationSelectionModal(false)}
               >
                 Close
               </Button>
             </div>
           </div>
         </div>
       )}

      {/* Bulk Edit Modal */}
      <BulkEditModal
        itemType={bulkEditItemType}
        sites={sites}
        open={showBulkEditModal}
        onOpenChange={setShowBulkEditModal}
        onComplete={handleBulkEditComplete}
      />

      {/* Move Item Modal */}
      {showMoveModal && movingItem && (
        <MoveItemsModal
          open={showMoveModal}
          onOpenChange={setShowMoveModal}
          items={[movingItem]}
          sites={sites}
          onComplete={handleMoveComplete}
          onStatusCheck={checkAndHandleStatusChange}
        />
      )}

      {/* Status Modal */}
      {showStatusModal && statusModalConfig && (
        <div 
          className={`fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 ${getZIndexClass('MODALS')}`}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowStatusModal(false);
            }
          }}
          tabIndex={0}
        >
          <div className="bg-background border rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-2 text-foreground">{statusModalConfig.title}</h3>
            <p className="text-sm mb-4 text-muted-foreground">{statusModalConfig.message}</p>
            <div className="flex justify-end gap-2">
              {statusModalConfig.options.map((option, index) => (
                <Button
                  key={index}
                  variant={option.variant}
                  onClick={option.action}
                  className="min-w-[120px]"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
