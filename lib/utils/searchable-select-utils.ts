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
    EquipmentSubType
} from '@/types/enums';
import { SubItemType } from '@/types/type-aliases';

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
 */
export function createItemOptions(
    items: Item[],
    includeNone = false,
    groupByStation = false,
    sites: Site[] = []
) {
    const options: Array<{ value: string; label: string; group: string; category: string }> = items.map(item => {
        const category = getCategoryForItemType(item.type);
        const totalQty = item.stock?.reduce((sum, s) => sum + s.quantity, 0) || 0;

        return {
            value: item.id,
            label: `${item.name} (${totalQty})`,
            group: groupByStation ? item.station : item.type,
            category: category // Use category for high-level grouping
        };
    });

    if (includeNone) {
        options.unshift({ value: 'none', label: 'None', group: 'Other', category: 'Other' });
    }

    return options;
}

/**
 * Enhanced item options with SITE SPLIT LOGIC
 * Returns composite value: "itemId:siteId"
 * Label format: "Item Name - Site Name: Quantity"
 * strictly enforcing the "One Item = One Site" rule visually per option
 */
export function createItemOptionsForSite(
    items: Item[],
    selectedSiteId: string | null | undefined,
    includeNone = false,
    sites: Site[] = []
) {
    const options: Array<{ value: string; label: string; group: string; category: string }> = [];
    const siteMap = new Map(sites.map(s => [s.id, s.name]));

    // Helper to resolve site name
    const getSiteName = (id: string) => siteMap.get(id) || 'Unknown Site';

    items.forEach(item => {
        const category = getCategoryForItemType(item.type);
        const hasStock = item.stock && item.stock.length > 0;

        if (hasStock) {
            item.stock!.forEach(stockPoint => {
                const siteName = getSiteName(stockPoint.siteId);
                options.push({
                    value: `${item.id}:${stockPoint.siteId}`,
                    label: `${item.name} - ${siteName}: ${stockPoint.quantity}`,
                    group: item.type,
                    category: category
                });
            });
        } else {
            // Create a "No Stock" / Generic option
            options.push({
                value: `${item.id}:none`,
                label: `${item.name} (Qty: 0)`,
                group: item.type,
                category: category
            });
        }
    });

    if (includeNone) {
        options.unshift({ value: 'none', label: 'None', group: 'Other', category: 'Other' });
    }

    return options;
}

export function createItemTypeOptionsWithCategories() {
    const options: Array<{ value: string; label: string; group: string; category: string }> = [];

    Object.values(ItemType).forEach(type => {
        const category = getCategoryForItemType(type);
        options.push({
            value: type,
            label: type,
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
                label: subType,
                group: itemType
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
            label: `${char.name} (${char.roles.join(', ')})`,
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
        group: settlement.region,
        category: settlement.country
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
        stations.forEach((station: string) => {
            options.push({
                value: `${category}:${station}`,
                label: station,
                group: category // Makes 'group' the Area (e.g., SALES, ADMIN)
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
