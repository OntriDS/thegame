// lib/utils/searchable-select-utils.ts
// Universal utilities for SearchableSelect category grouping

import { 
  ITEM_CATEGORIES, 
  SITE_CATEGORIES, 
  STATION_CATEGORIES,
  TASK_CATEGORIES,
  SKILLS_CATEGORIES,
  ItemType,
  TaskType,
  IntelectualFunction,
  Attribute,
  Skill
} from '@/types/enums';
import { getAllSettlements } from '@/lib/utils/settlement-utils';
import { getSubTypesForItemType } from '@/lib/utils/item-utils';

/**
 * Generic function to get category for any enum value based on categories structure
 * @param value The enum value to categorize
 * @param categories The categories structure (e.g., ITEM_CATEGORIES, SITE_CATEGORIES)
 * @returns The category name or 'Other' if not found
 */
export function getCategoryForValue(
  value: string, 
  categories: Record<string, readonly string[]>
): string {
  for (const [category, types] of Object.entries(categories)) {
    if (types.includes(value)) return category;
  }
  return 'Other';
}

/**
 * Gets the category for an ItemType value (for SearchableSelect autoGroupByCategory)
 * @param itemTypeValue The ItemType value
 * @returns The category string
 */
export function getCategoryForItemType(itemTypeValue: string): string {
  return getCategoryForValue(itemTypeValue, ITEM_CATEGORIES);
}

/**
 * Gets the category for a SiteType value (for SearchableSelect autoGroupByCategory)
 * @param siteTypeValue The SiteType value (e.g., 'PHYSICAL', 'CLOUD', 'SPECIAL')
 * @returns The category string
 */
export function getCategoryForSiteType(siteTypeValue: string): string {
  return getCategoryForValue(siteTypeValue, SITE_CATEGORIES);
}

/**
 * Gets the station for a Category value (for SearchableSelect autoGroupByCategory)
 * @param categoryValue The Category value
 * @returns The station string
 */
export function getStationForCategoryValue(categoryValue: string): string {
  return getCategoryForValue(categoryValue, STATION_CATEGORIES);
}

/**
 * Gets the category for a TaskType value (for SearchableSelect autoGroupByCategory)
 * @param taskTypeValue The TaskType value
 * @returns The category string
 */
export function getCategoryForTaskType(taskTypeValue: string): string {
  return getCategoryForValue(taskTypeValue, TASK_CATEGORIES);
}

/**
 * Gets the category for a Skill value (for SearchableSelect autoGroupByCategory)
 * @param skillValue The Skill/Attribute/IntelectualFunction value
 * @returns The category string
 */
export function getCategoryForSkill(skillValue: string): string {
  return getCategoryForValue(skillValue, SKILLS_CATEGORIES);
}

/**
 * Creates options with automatic category grouping for SearchableSelect
 * @param enumValues Array of enum values or enum object
 * @param getCategoryFunction Function to get category for each value
 * @param getLabelFunction Optional function to customize labels (defaults to value)
 * @returns Array of options with category information
 */
export function createOptionsWithCategories<T extends string>(
  enumValues: T[] | Record<string, T>,
  getCategoryFunction: (value: string) => string,
  getLabelFunction?: (value: T) => string
): Array<{
  value: string;
  label: string;
  category: string;
}> {
  const values = Array.isArray(enumValues) 
    ? enumValues 
    : Object.values(enumValues);
    
  return values.map(value => ({
    value: value as string,
    label: getLabelFunction ? getLabelFunction(value) : (value as string),
    category: getCategoryFunction(value as string)
  }));
}

/**
 * Creates ItemType options with automatic category grouping for SearchableSelect
 * @returns Array of ItemType options with category information
 */
export function createItemTypeOptionsWithCategories() {
  return createOptionsWithCategories(
    Object.values(ItemType),
    getCategoryForItemType
  );
}


/**
 * Creates Station options with automatic category grouping for SearchableSelect
 * @returns Array of Station options with category information
 */
export function createStationOptionsWithCategories() {
  return createOptionsWithCategories(
    Object.keys(STATION_CATEGORIES) as string[],
    (station) => station // Station names are their own categories
  );
}

/**
 * Creates TaskType options with automatic category grouping for SearchableSelect
 * @returns Array of TaskType options with category information
 */
export function createTaskTypeOptionsWithCategories() {
  return createOptionsWithCategories(
    Object.values(TaskType) as string[],
    getCategoryForTaskType
  );
}

/**
 * Creates Skills options with automatic category grouping for SearchableSelect
 * Combines all three skills enums (IntelectualFunction, Attribute, Skill)
 * @returns Array of Skills options with category information
 */
export function createSkillsOptionsWithCategories() {
  const allSkills = [
    ...Object.values(IntelectualFunction),
    ...Object.values(Attribute), 
    ...Object.values(Skill)
  ] as string[];
  
  return createOptionsWithCategories(
    allSkills,
    getCategoryForSkill
  );
}

/**
 * Creates Station+Category combined options for SearchableSelect
 * Format: "STATION:AREA" (e.g., "Strategy:ADMIN", "Direct Sales:SALES")
 * @returns Array of Station+Category options with area as category
 */
export function createStationCategoryOptions() {
  const options: Array<{
    value: string;
    label: string;
    category: string;
  }> = [];

  for (const [area, stations] of Object.entries(STATION_CATEGORIES)) {
    for (const station of stations as readonly string[]) {
      options.push({
        value: `${station}:${area}`,
        label: station,
        category: area
      });
    }
  }

  return options;
}

/**
 * Gets all available station names (not areas) for simple selection
 * @returns Array of all station names
 */
export function getAllStationNames(): string[] {
  const stations: string[] = [];
  for (const stationsInArea of Object.values(STATION_CATEGORIES)) {
    stations.push(...stationsInArea);
  }
  return stations;
}

/**
 * Extracts station from combined station:area value
 * @param combinedValue The combined "STATION:AREA" value
 * @returns The station part
 */
export function getStationFromCombined(combinedValue: string): string {
  return combinedValue.split(':')[0];
}

/**
 * Extracts area from combined station:area value
 * @param combinedValue The combined "STATION:AREA" value
 * @returns The area part
 */
export function getCategoryFromCombined(combinedValue: string): string {
  return combinedValue.split(':')[1];
}

/**
 * Creates task parent options with TASK_CATEGORIES for SearchableSelect
 * @param tasks Array of available tasks
 * @param currentTaskId Current task ID to exclude from parent options
 * @param isRecurrentModal Whether we're in recurrent task modal (affects filtering)
 * @param currentTaskType The type of the current task being edited (for hierarchy validation)
 * @returns Array of task parent options with proper TASK_CATEGORIES grouping
 */
export function createTaskParentOptions(tasks: any[], currentTaskId?: string, isRecurrentModal: boolean = false, currentTaskType?: string) {
  const options: Array<{
    value: string;
    label: string;
    category: string;
  }> = [];
  
  // Handle case where tasks array is not provided or empty
  if (!tasks || tasks.length === 0) {
    // Return empty array - SearchableSelect will auto-add "None" option
    return [];
  }
  
  // Filter out current task and add remaining tasks with their proper category
  let availableTasks = tasks.filter(task => task && task.id && task.id !== currentTaskId);

  // Filter by tree type (Mission vs Recurrent)
  if (isRecurrentModal) {
    // In recurrent modal, only show recurrent tasks
    availableTasks = availableTasks.filter(task =>
      task.type === 'Recurrent Group' ||
      task.type === 'Recurrent Template' ||
      task.type === 'Recurrent Instance'
    );
  } else {
    // In mission modal, only show mission tree tasks
    availableTasks = availableTasks.filter(task =>
      task.type === 'Mission' ||
      task.type === 'Milestone' ||
      task.type === 'Goal' ||
      task.type === 'Assignment'
    );
  }

  // Apply hierarchy rules based on current task type
  if (currentTaskType) {
    availableTasks = availableTasks.filter(task => {
      // Helper function to check if task can be a parent of current task type
      const canBeParent = (parentType: string, childType: string): boolean => {
        if (isRecurrentModal) {
          // Recurrent hierarchy rules
          switch (childType) {
            case 'Recurrent Group':
              return parentType === 'Recurrent Group'; // Groups can have other groups as parents
            case 'Recurrent Template':
              return parentType === 'Recurrent Group'; // Templates can only have groups as parents
            case 'Recurrent Instance':
              return parentType === 'Recurrent Group' || parentType === 'Recurrent Template'; // Instances can have both
            default:
              return false;
          }
        } else {
          // Mission hierarchy rules
          switch (childType) {
            case 'Mission':
              return false; // Missions can't have parents
            case 'Milestone':
              return parentType === 'Mission'; // Milestones can only have missions as parents
            case 'Goal':
              return parentType === 'Mission' || parentType === 'Milestone'; // Goals can have missions or milestones
            case 'Assignment':
              return parentType === 'Mission' || parentType === 'Milestone' || parentType === 'Goal'; // Assignments can have any level except themselves
            default:
              return false;
          }
        }
      };

      return canBeParent(task.type, currentTaskType);
    });
  }
  
  // Group tasks by their specific type (not broader categories)
  const groupedTasks: Record<string, any[]> = {};

  for (const task of availableTasks) {
    const taskType = task.type || 'Assignment';
    if (!groupedTasks[taskType]) {
      groupedTasks[taskType] = [];
    }
    groupedTasks[taskType].push(task);
  }
  
  // Add tasks in specific order: Mission types first, then Recurrent types
  const taskTypeOrder = ['Mission', 'Milestone', 'Goal', 'Assignment', 'Recurrent Group', 'Recurrent Template', 'Recurrent Instance'];
  const addedTaskIds = new Set<string>(); // Track added tasks to prevent duplicates

  for (const taskType of taskTypeOrder) {
    if (groupedTasks[taskType]) {
      // Sort tasks within type by name for consistency
      const sortedTasks = groupedTasks[taskType].sort((a, b) =>
        (a.name || '').localeCompare(b.name || '')
      );

      sortedTasks.forEach(task => {
        // Only add task if not already added
        if (!addedTaskIds.has(task.id)) {
          options.push({
            value: task.id,
            label: task.name || 'Unnamed Task',
            category: taskType
          });
          addedTaskIds.add(task.id);
        }
      });
    }
  }
  
  // SearchableSelect will automatically add "None" option at the bottom
  return options;
}

/**
 * Creates character options with role categories for SearchableSelect
 * @param characters Array of available characters
 * @returns Array of character options with role categories
 */
export function createCharacterOptions(characters: any[]) {
  const options: Array<{
    value: string;
    label: string;
    category: string;
  }> = [];
  
  for (const character of characters) {
    const primaryRole = character.roles?.[0] || 'OTHER';
    options.push({
      value: character.id,
      label: character.name,
      category: primaryRole.toUpperCase()
    });
  }
  
  return options;
}

/**
 * Gets the category for a character role value
 * @param roleValue The character role value
 * @returns The category string (REGULAR or SPECIAL)
 */
export function getCategoryForCharacterRole(roleValue: string): string {
  const role = roleValue.toLowerCase();
  
  // Check if it's a special role
  if (['founder', 'player', 'padawan', 'team', 'family', 'friend', 'investor'].includes(role)) {
    return 'SPECIAL';
  }
  
  // Default to regular role
  return 'REGULAR';
}


/**
 * Creates ItemType+SubType combined options for SearchableSelect
 * Format: "ITEMTYPE:SUBTYPE" (e.g., "DIGITAL:Digital Art", "ARTWORK:Acrylic on Canvas")
 * @returns Array of ItemType+SubType options with ItemType as category
 */
export function createItemTypeSubTypeOptions() {
  const options: Array<{
    value: string;
    label: string;
    category: string;
  }> = [];
  
  
  for (const itemType of Object.values(ItemType) as string[]) {
    const subtypes = getSubTypesForItemType(itemType as ItemType);
    
    if (subtypes.length > 0) {
      // Add each subtype as an option with ItemType as category
      for (const subtype of subtypes) {
        options.push({
          value: `${itemType}:${subtype}`,
          label: subtype,
          category: itemType
        });
      }
    } else {
      // If no subtypes, add the ItemType itself
      options.push({
        value: `${itemType}:`,
        label: itemType,
        category: itemType
      });
    }
  }
  
  return options;
}

/**
 * Extracts ItemType from combined itemtype:subtype value
 * @param combinedValue The combined "ITEMTYPE:SUBTYPE" value
 * @returns The ItemType part
 */
export function getItemTypeFromCombined(combinedValue: string): string {
  return combinedValue.split(':')[0];
}

/**
 * Extracts SubType from combined itemtype:subtype value
 * @param combinedValue The combined "ITEMTYPE:SUBTYPE" value
 * @returns The SubType part (empty string if no subtype)
 */
export function getSubTypeFromCombined(combinedValue: string): string {
  return combinedValue.split(':')[1] || '';
}

/**
 * Creates SiteType options with automatic category grouping for SearchableSelect
 * @returns Array of SiteType options with category information
 */
export function createSiteTypeOptionsWithCategories() {
  return createOptionsWithCategories(
    Object.keys(SITE_CATEGORIES) as string[],
    (siteType) => siteType // Site type names are their own categories
  );
}

/**
 * Creates item options with automatic category grouping for SearchableSelect
 * Uses ITEM_CATEGORIES for proper categorization
 * @param items Array of available items
 * @param showPrice Optional flag to include price in label (default: true)
 * @param showQuantity Optional flag to include total quantity in label (default: true)
 * @returns Array of item options with proper ITEM_CATEGORIES grouping
 */
export function createItemOptions(
  items: any[], 
  showPrice: boolean = true, 
  showQuantity: boolean = true
) {
  const options: Array<{
    value: string;
    label: string;
    category: string;
  }> = [];
  
  for (const item of items) {
    let label = item.name;
    
    if (showPrice && item.price !== undefined) {
      label += ` - $${item.price}`;
    }
    
    if (showQuantity) {
      const ClientAPI = require('@/lib/client-api').ClientAPI;
      const qty = ClientAPI.getItemTotalQuantity(item.id, items);
      label += ` (Qty: ${qty})`;
    }
    
    options.push({
      value: item.id,
      label: label,
      category: getCategoryForItemType(item.type)
    });
  }
  
  return options;
}

/**
 * Creates item options for a specific site with quantity at that site
 * @param items Array of available items
 * @param siteId The site ID to show quantities for
 * @param showPrice Optional flag to include price in label (default: true)
 * @returns Array of item options with site-specific quantities
 */
export function createItemOptionsForSite(
  items: any[], 
  siteId: string,
  showPrice: boolean = true
) {
  const options: Array<{
    value: string;
    label: string;
    category: string;
  }> = [];
  
  const ClientAPI = require('@/lib/client-api').ClientAPI;
  
  for (const item of items) {
    const qtyAtSite = siteId ? ClientAPI.getQuantityAtSite(item, siteId) : 0;
    
    let label = item.name;
    
    if (showPrice && item.price !== undefined) {
      label += ` - $${item.price}`;
    }
    
    label += ` (Qty: ${qtyAtSite})`;
    
    options.push({
      value: item.id,
      label: label,
      category: getCategoryForItemType(item.type)
    });
  }
  
  return options;
}

/**
 * Creates Settlement options with automatic category grouping for SearchableSelect
 * @returns Array of Settlement options with country categories
 */
export async function createSettlementOptions() {
  const settlements = await getAllSettlements();
  return settlements.map(settlement => ({
    value: settlement.id,
    label: settlement.name,
    category: settlement.country
  }));
}