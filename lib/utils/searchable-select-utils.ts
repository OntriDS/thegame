import {
    Item,
    Site,
    Character,
    Business,
    Task,
    Settlement
} from '@/types/entities';
import {
    ItemCategory,
    ItemType,
    TaskType,
    STATION_CATEGORIES,
    BUSINESS_STRUCTURE,
    SITE_CATEGORIES,
    TASK_CATEGORIES,
    SKILLS_CATEGORIES,
    DigitalSubType,
    ArtworkSubType,
    PrintSubType,
    StickerSubType,
    MerchSubType,
    CraftSubType,
    BundleSubType,
    MaterialSubType,
    EquipmentSubType,
    ItemStatus
} from '@/types/enums';
import type { Area, Station, SubItemType } from '@/types/type-aliases';
import { getItemTypeLabel, getSubItemTypeLabel } from '@/lib/constants/item-taxonomy-labels';
import { getAreaDisplayLabel, getStationDisplayLabel } from '@/lib/constants/business-structure-labels';
import { getCountryLabel, getRegionLabel } from '@/lib/constants/site-taxonomy-labels';

// ============================================================================
// ITEM HELPERS
// ============================================================================

export function getCategoryForItemType(type: ItemType): ItemCategory {
    switch (type) {
        case ItemType.DIGITAL:
        case ItemType.ARTWORK:
        case ItemType.PRINT:
        case ItemType.STICKER:
        case ItemType.MERCH:
        case ItemType.CRAFT:
            return ItemCategory.MODEL_ITEM;
        case ItemType.BUNDLE:
            return ItemCategory.BUNDLE_ITEM;
        case ItemType.MATERIAL:
        case ItemType.EQUIPMENT:
            return ItemCategory.RESOURCE_ITEM;
        default:
            return ItemCategory.MODEL_ITEM;
    }
}

// ============================================================================
// ITEM OPTION CREATORS
// ============================================================================

/**
 * Standard item options (Simple ID)
 * Groups by Category -> Type
 * AGGREGATES BY MODEL to prevent duplicates
 */
export function createItemOptions(
    items: Item[],
    includeNone = false,
    groupByStation = false,
    sites: Site[] = []
) {
    // 1. Group by MODEL (Name | Type | SubItemType | Collection)
    const models: Record<string, { 
        primaryId: string; 
        name: string; 
        type: ItemType; 
        station: string;
        totalQty: number;
    }> = {};

    items.forEach(item => {
        const key = `${item.name}|${item.type}|${item.subItemType || ''}|${item.collection || ''}`;
        const qty = item.stock?.reduce((sum, s) => sum + s.quantity, 0) || 0;

        if (!models[key]) {
            models[key] = {
                primaryId: item.id,
                name: item.name,
                type: item.type,
                station: item.station || 'Other',
                totalQty: qty
            };
        } else {
            models[key].totalQty += qty;
        }
    });

    // 2. Map models to options
    const options: Array<{ value: string; label: string; group: string; category: string }> = 
        Object.values(models).map(model => {
            const category = getCategoryForItemType(model.type);
            return {
                value: model.primaryId,
                label: `${model.name} (${model.totalQty})`,
                group: groupByStation ? model.station : getItemTypeLabel(model.type),
                category: category
            };
        });

    if (includeNone) {
        options.unshift({ value: 'none', label: 'None', group: 'Other', category: 'Other' });
    }

    return options;
}

function itemIdSuffix(id: string): string {
    const s = String(id || '');
    return s.length > 8 ? s.slice(-8) : s;
}

/** Sale picker: `[HQ: 12, Eco Feria: 3]`. */
function formatSalePickerStockBracket(item: Item, sites: Site[]): string {
    if (!item.stock?.length) return '';
    const parts = item.stock
        .map((s) => {
            const sn = sites.find((x) => x.id === s.siteId)?.name || s.siteId;
            return `${sn}: ${s.quantity}`;
        });
    return parts.length ? `[${parts.join(', ')}]` : '';
}

/**
 * One option per Item entity (no aggregation by name/type).
 * Use for sales and anywhere the exact inventory row must stay stable across saves.
 *
 * `forSaleLinePicker`: sale UI only — inventory options restricted to `For Sale` status (excluding `Sold`).
 * Label is `Name [Site: qty, …]` (no id tail, no extra `(total)`).
 */
export function createDistinctItemOptions(
    items: Item[],
    includeNone = false,
    sites: Site[] = [],
    forSaleLinePicker = false
): Array<{ value: string; label: string; group: string; category: string }> {
    const options: Array<{ value: string; label: string; group: string; category: string }> = [];

    for (const item of items) {
        if (forSaleLinePicker) {
            if (item.status === ItemStatus.SOLD) continue;
            if (item.status !== ItemStatus.FOR_SALE) continue;
        }

        const category = getCategoryForItemType(item.type);
        const qty = item.stock?.reduce((sum, s) => sum + s.quantity, 0) || 0;
        const siteHint =
            sites.length > 0 && item.stock?.length
                ? item.stock.map(s => {
                      const sn = sites.find(x => x.id === s.siteId)?.name || s.siteId;
                      return `${sn}:${s.quantity}`;
                  }).join(', ')
                : '';
        const tail = itemIdSuffix(item.id);

        const label = forSaleLinePicker
            ? (() => {
                  const bracket = formatSalePickerStockBracket(item, sites);
                  return bracket ? `${item.name} ${bracket}` : item.name;
              })()
            : siteHint
              ? `${item.name} · …${tail} (${qty}) [${siteHint}]`
              : `${item.name} · …${tail} (${qty})`;

        options.push({
            value: item.id,
            label,
            group: getItemTypeLabel(item.type),
            category,
        });
    }

    options.sort((a, b) => a.label.localeCompare(b.label));

    if (includeNone) {
        options.unshift({ value: 'none', label: 'None', group: 'Other', category: 'Other' });
    }

    return options;
}

/**
 * Enhanced item options with SITE SPLIT LOGIC
 * Returns composite value: "itemId:siteId"
 * Label format: "Item Name - Site Name: Quantity"
 * AGGREGATES BY MODEL PER SITE to prevent duplicates
 */
export function createItemOptionsForSite(
    items: Item[],
    selectedSiteId: string | null | undefined,
    includeNone = false,
    sites: Site[] = []
) {
    const siteMap = new Map(sites.map(s => [s.id, s.name]));
    const getSiteName = (id: string) => siteMap.get(id) || 'Unknown Site';

    // 1. Group by MODEL + SITE
    // Key: "modelKey|siteId"
    const modelSiteMap: Record<string, {
        primaryId: string;
        name: string;
        type: ItemType;
        siteId: string;
        quantity: number;
    }> = {};

    items.forEach(item => {
        const modelKey = `${item.name}|${item.type}|${item.subItemType || ''}|${item.collection || ''}`;
        
        if (item.stock && item.stock.length > 0) {
            item.stock.forEach(sp => {
                const combinedKey = `${modelKey}|${sp.siteId}`;
                if (!modelSiteMap[combinedKey]) {
                    modelSiteMap[combinedKey] = {
                        primaryId: item.id,
                        name: item.name,
                        type: item.type,
                        siteId: sp.siteId,
                        quantity: sp.quantity
                    };
                } else {
                    modelSiteMap[combinedKey].quantity += sp.quantity;
                }
            });
        }
    });

    // 2. Convert to options
    const options: Array<{ value: string; label: string; group: string; category: string }> = 
        Object.values(modelSiteMap).map(m => {
            const category = getCategoryForItemType(m.type);
            const siteName = getSiteName(m.siteId);
            return {
                value: `${m.primaryId}:${m.siteId}`,
                label: `${m.name} - ${siteName}: ${m.quantity}`,
                group: getItemTypeLabel(m.type),
                category: category
            };
        });

    // 3. Add entries for models with NO stock (at least one entry per unique model)
    const uniqueModelKeys = new Set(items.map(i => `${i.name}|${i.type}|${i.subItemType || ''}|${i.collection || ''}`));
    const modelsWithStockKeys = new Set(Object.keys(modelSiteMap).map(k => k.substring(0, k.lastIndexOf('|'))));

    uniqueModelKeys.forEach(modelKey => {
        if (!modelsWithStockKeys.has(modelKey)) {
            const item = items.find(i => `${i.name}|${i.type}|${i.subItemType || ''}|${i.collection || ''}` === modelKey)!;
            const category = getCategoryForItemType(item.type);
            options.push({
                value: `${item.id}:none`,
                label: `${item.name} (Qty: 0)`,
                group: getItemTypeLabel(item.type),
                category: category
            });
        }
    });

    if (includeNone) {
        options.unshift({ value: 'none', label: 'None', group: 'Other', category: 'Other' });
    }

    // Sort by name for better UX
    return options.sort((a, b) => a.label.localeCompare(b.label));
}

export function createItemTypeOptionsWithCategories() {
    const options: Array<{ value: string; label: string; group: string; category: string }> = [];

    Object.values(ItemType).forEach(type => {
        const category = getCategoryForItemType(type);
        options.push({
            value: type,
            label: getItemTypeLabel(type),
            group: category, // Group by high-level category
            category: category
        });
    });

    return options;
}

export function createItemTypeSubTypeOptions() {
    const options: Array<{ value: string; label: string; group: string }> = [];

    // Helper to add subtypes
    const addSubTypes = (itemType: ItemType, subTypes: Record<string, string>) => {
        Object.values(subTypes).forEach(subType => {
            options.push({
                value: `${itemType}:${subType}`,
                label: getSubItemTypeLabel(subType),
                group: getItemTypeLabel(itemType)
            });
        });
    };

    addSubTypes(ItemType.DIGITAL, DigitalSubType);
    addSubTypes(ItemType.ARTWORK, ArtworkSubType);
    addSubTypes(ItemType.PRINT, PrintSubType);
    addSubTypes(ItemType.STICKER, StickerSubType);
    addSubTypes(ItemType.MERCH, MerchSubType);
    addSubTypes(ItemType.CRAFT, CraftSubType);
    addSubTypes(ItemType.BUNDLE, BundleSubType);
    addSubTypes(ItemType.MATERIAL, MaterialSubType);
    addSubTypes(ItemType.EQUIPMENT, EquipmentSubType);

    return options;
}

export function getItemTypeFromCombined(combinedValue: string): string {
    if (!combinedValue) return '';
    return combinedValue.split(':')[0];
}

export function getSubTypeFromCombined(combinedValue: string): string {
    if (!combinedValue || !combinedValue.includes(':')) return '';
    return combinedValue.split(':')[1];
}

// ============================================================================
// CHARACTER & BUSINESS OPTION CREATORS
// ============================================================================

export function createCharacterOptions(characters: Character[], includeNone = false) {
    const options: Array<{ value: string; label: string; group: string; category: string }> = characters.map(char => {
        // Determine primary role for grouping
        const primaryRole = char.roles && char.roles.length > 0 ? char.roles[0] : 'Other';

        return {
            value: char.id,
            label: char.name,
            group: primaryRole.charAt(0).toUpperCase() + primaryRole.slice(1),
            category: 'Persons'
        };
    });

    if (includeNone) {
        options.unshift({ value: 'none', label: 'None', group: 'Other', category: 'Other' });
    }

    return options;
}

export function createBusinessOptions(businesses: Business[], includeNone = false) {
    const options: Array<{ value: string; label: string; group: string; category: string }> = businesses.map(biz => ({
        value: biz.id,
        label: biz.name,
        group: biz.type,
        category: 'Businesses'
    }));

    if (includeNone) {
        options.unshift({ value: 'none', label: 'None', group: 'Other', category: 'Other' });
    }

    return options;
}

// ============================================================================
// LOCATION & SETTLEMENT OPTION CREATORS
// ============================================================================

export function createSettlementOptions(settlements: Settlement[]) {
    // Group by Country -> Region -> Settlement
    // SearchableSelect supports 'group' and 'category'.
    // We'll use Country as Category, Region as Group.
    return settlements.map(settlement => ({
        value: settlement.id,
        label: settlement.name,
        group: getRegionLabel(settlement.region),
        category: getCountryLabel(settlement.country),
    })).sort((a, b) => a.category.localeCompare(b.category) || a.group.localeCompare(b.group));
}

// ============================================================================
// STATION & TASK HELPERS
// ============================================================================

export function getCategoryForTaskType(type: TaskType): string {
    if (TASK_CATEGORIES.MISSION.includes(type as any)) return 'Strategic';
    if (TASK_CATEGORIES.RECURRENT.includes(type as any)) return 'Recurring';
    if (TASK_CATEGORIES.AUTOMATION.includes(type as any)) return 'System';
    return 'Other';
}

export function getCategoryFromCombined(combinedValue: string): string {
    if (!combinedValue) return '';
    return combinedValue.split(':')[0];
}

export function getStationFromCombined(combinedValue: string): string {
    if (!combinedValue || !combinedValue.includes(':')) return '';
    return combinedValue.split(':')[1];
}

export function createStationCategoryOptions() {
    const options: Array<{ value: string; label: string; group: string }> = [];

    Object.entries(STATION_CATEGORIES).forEach(([category, stations]) => {
        const area = category as Area;
        stations.forEach((station: string) => {
            const st = station as Station;
            options.push({
                value: `${category}:${station}`,
                label: getStationDisplayLabel(st),
                group: getAreaDisplayLabel(area),
            });
        });
    });

    return options;
}

export function getAllStationNames(): string[] {
    return Object.values(BUSINESS_STRUCTURE).flat();
}

/**
 * Generate parent task options with intelligent filtering
 * @param tasks All available tasks
 * @param excludeTaskId ID of task to exclude (usually self)
 * @param isRecurrentContext Whether we are in a recurrent task context
 * @param currentTaskType Type of the task being edited
 */
export function createTaskParentOptions(
    tasks: Task[],
    excludeTaskId?: string,
    isRecurrentContext = false,
    currentTaskType?: TaskType
) {
    let filteredTasks = tasks;

    // 1. Exclude self and any that match excludeTaskId
    if (excludeTaskId) {
        filteredTasks = filteredTasks.filter(t => t.id !== excludeTaskId);
    }

    // 2. Filter by Context
    if (isRecurrentContext) {
        // If we are in recurrent context, mostly show Recurrent Groups as parents
        // or Recurrent Templates (if we are an instance, though typically instances point to templates via separate field)
        // For Recurrent Template, parent is Recurrent Group.
        filteredTasks = filteredTasks.filter(t =>
            t.type === TaskType.RECURRENT_GROUP ||
            t.type === TaskType.MISSION // Can always parent to a Mission
        );
    } else {
        // Standard context
        // Hide Recurrent Templates and Instances (they shouldn't be parents of normal tasks usually)
        // Recurrent Groups CAN be parents (grouping container)
        filteredTasks = filteredTasks.filter(t =>
            t.type !== TaskType.RECURRENT_TEMPLATE &&
            t.type !== TaskType.RECURRENT_INSTANCE
        );
    }

    const options: Array<{ value: string; label: string; group: string; category: string }> = filteredTasks.map(task => ({
        value: task.id,
        label: task.name,
        group: task.type,
        category: getCategoryForTaskType(task.type)
    }));

    return options;
}
