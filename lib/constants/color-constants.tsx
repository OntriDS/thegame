// lib/constants/color-constants.tsx
// Centralized color definitions for all status badges

import { TaskStatus, ItemStatus, SiteStatus, TaskPriority } from '@/types/enums';

// ============================================================================
// SHARED STATUS COLOR BASE (DRY PRINCIPLE)
// ============================================================================

/** Shared status color base to reduce duplication */
const STATUS_COLOR_BASE = {
  CREATED: 'border-orange-500 bg-orange-100 text-orange-800',
  ACTIVE: 'border-green-500 bg-green-100 text-green-800',
  IN_PROGRESS: 'border-blue-500 bg-blue-100 text-blue-800',
  DONE: 'border-green-500 bg-green-100 text-green-800',
  ON_HOLD: 'border-gray-500 bg-gray-100 text-gray-800',
  COLLECTED: 'border-yellow-500 bg-yellow-100 text-yellow-800',
  FAILED: 'border-red-500 bg-red-100 text-red-800',
  FINISHING: 'border-purple-500 bg-purple-100 text-purple-800',
  UPDATED: 'border-blue-500 bg-blue-100 text-blue-800',
  INACTIVE: 'border-gray-500 bg-gray-100 text-gray-800',
  FOR_SALE: 'border-blue-500 bg-blue-100 text-blue-800',
  SOLD: 'border-green-500 bg-green-100 text-green-800',
  OBSOLETE: 'border-red-500 bg-red-100 text-red-800',
  DAMAGED: 'border-red-500 bg-red-100 text-red-800',
  IDLE: 'border-gray-500 bg-gray-100 text-gray-800',
  STORED: 'border-gray-500 bg-gray-100 text-gray-800',
  TO_REPAIR: 'border-orange-500 bg-orange-100 text-orange-800',
} as const;

// ============================================================================
// STATUS COLOR DEFINITIONS
// ============================================================================

/** Task Status Colors - Light & Dark Mode with border contrast */
export const TASK_STATUS_COLORS = {
  [TaskStatus.CREATED]: { light: STATUS_COLOR_BASE.CREATED, dark: STATUS_COLOR_BASE.CREATED },
  [TaskStatus.ON_HOLD]: { light: STATUS_COLOR_BASE.ON_HOLD, dark: STATUS_COLOR_BASE.ON_HOLD },
  [TaskStatus.IN_PROGRESS]: { light: STATUS_COLOR_BASE.IN_PROGRESS, dark: STATUS_COLOR_BASE.IN_PROGRESS },
  [TaskStatus.FINISHING]: { light: STATUS_COLOR_BASE.FINISHING, dark: STATUS_COLOR_BASE.FINISHING },
  [TaskStatus.DONE]: { light: STATUS_COLOR_BASE.DONE, dark: STATUS_COLOR_BASE.DONE },
  [TaskStatus.COLLECTED]: { light: STATUS_COLOR_BASE.COLLECTED, dark: STATUS_COLOR_BASE.COLLECTED },
  [TaskStatus.FAILED]: { light: STATUS_COLOR_BASE.FAILED, dark: STATUS_COLOR_BASE.FAILED },
  [TaskStatus.NONE]: { light: STATUS_COLOR_BASE.ON_HOLD, dark: STATUS_COLOR_BASE.ON_HOLD },
} as const;

/** Item Status Colors - Light & Dark Mode with border contrast */
export const ITEM_STATUS_COLORS = {
  [ItemStatus.CREATED]: { light: STATUS_COLOR_BASE.CREATED, dark: STATUS_COLOR_BASE.CREATED },
  [ItemStatus.FOR_SALE]: { light: STATUS_COLOR_BASE.FOR_SALE, dark: STATUS_COLOR_BASE.FOR_SALE },
  [ItemStatus.SOLD]: { light: STATUS_COLOR_BASE.SOLD, dark: STATUS_COLOR_BASE.SOLD },
  [ItemStatus.TO_ORDER]: { light: STATUS_COLOR_BASE.IN_PROGRESS, dark: STATUS_COLOR_BASE.IN_PROGRESS },
  [ItemStatus.TO_DO]: { light: STATUS_COLOR_BASE.IN_PROGRESS, dark: STATUS_COLOR_BASE.IN_PROGRESS },
  [ItemStatus.ON_HOLD]: { light: STATUS_COLOR_BASE.ON_HOLD, dark: STATUS_COLOR_BASE.ON_HOLD },
  [ItemStatus.GIFTED]: { light: STATUS_COLOR_BASE.STORED, dark: STATUS_COLOR_BASE.STORED },
  [ItemStatus.RESERVED]: { light: STATUS_COLOR_BASE.FINISHING, dark: STATUS_COLOR_BASE.FINISHING },
  [ItemStatus.OBSOLETE]: { light: STATUS_COLOR_BASE.OBSOLETE, dark: STATUS_COLOR_BASE.OBSOLETE },
  [ItemStatus.DAMAGED]: { light: STATUS_COLOR_BASE.DAMAGED, dark: STATUS_COLOR_BASE.DAMAGED },
  [ItemStatus.IDLE]: { light: STATUS_COLOR_BASE.IDLE, dark: STATUS_COLOR_BASE.IDLE },
  [ItemStatus.COLLECTED]: { light: STATUS_COLOR_BASE.COLLECTED, dark: STATUS_COLOR_BASE.COLLECTED },
  [ItemStatus.STORED]: { light: STATUS_COLOR_BASE.STORED, dark: STATUS_COLOR_BASE.STORED },
  [ItemStatus.TO_REPAIR]: { light: STATUS_COLOR_BASE.TO_REPAIR, dark: STATUS_COLOR_BASE.TO_REPAIR },
  [ItemStatus.CONSIGNMENT]: { light: STATUS_COLOR_BASE.FINISHING, dark: STATUS_COLOR_BASE.FINISHING },
} as const;

/** Site Status Colors - Light & Dark Mode with border contrast */
export const SITE_STATUS_COLORS = {
  [SiteStatus.ACTIVE]: { light: STATUS_COLOR_BASE.ACTIVE, dark: STATUS_COLOR_BASE.ACTIVE },
  [SiteStatus.INACTIVE]: { light: STATUS_COLOR_BASE.INACTIVE, dark: STATUS_COLOR_BASE.INACTIVE },
} as const;

/** Financial Colors - for cost, revenue, profit, margin display */
export const FINANCIAL_COLORS = {
  negative: 'text-red-600 dark:text-red-400',
  positive: 'text-green-600 dark:text-green-400',
  neutral: 'text-muted-foreground',
  activeWhite: 'text-white',
  activeBlack: 'text-black',
} as const;

/** Points Colors - for XP, RP, FP, HP, J$ display */
export const POINTS_COLORS = {
  XP: 'border-orange-800 text-orange-800 dark:text-white',
  RP: 'border-blue-800 text-blue-800 dark:text-white',
  FP: 'border-purple-800 text-purple-800 dark:text-white',
  HP: 'border-green-800 text-green-800 dark:text-white',
  J$: 'border-yellow-800 text-yellow-800 dark:text-white',
  neutral: 'text-gray-800',
  activeWhite: 'text-white',
  activeBlack: 'text-black',
} as const;

/** Task Priority Icon Colors */
export const TASK_PRIORITY_ICON_COLORS = {
  [TaskPriority.URGENT]: 'text-red-600 dark:text-red-300',
  [TaskPriority.IMPORTANT]: 'text-amber-600 dark:text-amber-300',
  [TaskPriority.NOT_NOW]: 'text-gray-200 dark:text-gray-800',
  [TaskPriority.SLOW]: 'text-purple-400 dark:text-purple-600',
} as const;

/** Task Status Icon Colors */
export const TASK_STATUS_ICON_COLORS = {
  [TaskStatus.DONE]: 'text-green-600 dark:text-green-400',
} as const;

/** Role Colors - for character role badges */
// Define colors once
const SPECIAL_ROLE_FOUNDER = 'border-purple-600 bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-500 dark:text-white dark:hover:bg-purple-600';
const SPECIAL_ROLE_PLAYER = 'border-primary bg-primary text-white hover:bg-primary/90 dark:bg-primary dark:text-white dark:hover:bg-primary/90';
const SPECIAL_ROLE_TEAM = 'border-green-600 bg-green-600 text-white hover:bg-green-700 dark:bg-green-500 dark:text-white dark:hover:bg-green-600';
const SPECIAL_ROLE_INVESTOR = 'border-yellow-500 bg-yellow-500 text-white hover:bg-yellow-900 dark:bg-yellow-800 dark:text-white dark:hover:bg-yellow-600';
const SPECIAL_ROLE_PADAWAN = 'border-teal-500 bg-teal-500 text-white hover:bg-teal-700 dark:bg-teal-800 dark:text-white dark:hover:bg-teal-600';
const SPECIAL_ROLE_FAMILY = 'border-pink-500 bg-pink-500 text-white hover:bg-pink-700 dark:bg-pink-800 dark:text-white dark:hover:bg-pink-600';
const SPECIAL_ROLE_FRIEND = 'border-stone-500 bg-stone-500 text-white hover:bg-stone-700 dark:bg-stone-800 dark:text-white dark:hover:bg-stone-600';
const REGULAR_ROLE_DEFAULT = 'border-gray-400 bg-gray-100 text-white dark:bg-gray-700 dark:text-white';

export const ROLE_COLORS = {
  // Special Roles - High contrast, vibrant colors
  FOUNDER: SPECIAL_ROLE_FOUNDER,
  PLAYER: SPECIAL_ROLE_PLAYER,
  PADAWAN: SPECIAL_ROLE_PADAWAN,
  TEAM: SPECIAL_ROLE_TEAM,
  INVESTOR: SPECIAL_ROLE_INVESTOR,
  FAMILY: SPECIAL_ROLE_FAMILY,
  FRIEND: SPECIAL_ROLE_FRIEND,
  // Regular Roles - all use the same neutral styling
  CUSTOMER: REGULAR_ROLE_DEFAULT,
  ADMIN: REGULAR_ROLE_DEFAULT,
  DESIGNER: REGULAR_ROLE_DEFAULT,
  PRODUCER: REGULAR_ROLE_DEFAULT,
  SELLER: REGULAR_ROLE_DEFAULT,
  RESEARCHER: REGULAR_ROLE_DEFAULT,
  DEVELOPER: REGULAR_ROLE_DEFAULT,
  AI_AGENT: REGULAR_ROLE_DEFAULT,
  ASSOCIATE: REGULAR_ROLE_DEFAULT,
  COLLABORATOR: REGULAR_ROLE_DEFAULT,
  STUDENT: REGULAR_ROLE_DEFAULT,
  OTHER: REGULAR_ROLE_DEFAULT,
} as const;

// ============================================================================
// BUSINESS COLOR COMMUNICATION SYSTEM (DRY PRINCIPLE)
// ============================================================================
// The business model (areas and stations) drives the color system.
// Other parts of the project (notes, schedule cards, badges) USE these colors.

/**
 * Area Colors - Maps business areas to their semantic colors
 * This is the SINGLE SOURCE OF TRUTH for area-based visual communication
 */
export const AREA_COLORS = {
  ADMIN: 'purple',      // Strategy, management, administration
  RESEARCH: 'cyan',     // Studies, classes
  DEV: 'indigo',        // Systems Development
  DESIGN: 'turquoise',  // Creative processes, design work
  PRODUCTION: 'orange', // Manufacturing, production work
  SALES: 'yellow',      // Sales, marketing, bookings
  PERSONAL: 'brown',    // Personal tasks and activities
} as const;

/**
 * Station Colors - Maps specific stations to their semantic colors
 * Inherits from parent area by default, but can have custom colors
 */
export const STATION_COLORS = {
  // Personal stations with custom colors
  'Family': 'pink',       // Family activities
  'Health': 'green',      // Health and wellness
  'Earnings': 'gold',     // Personal earnings
  'Rewards': 'gold',      // Personal rewards

  // Admin stations with custom colors
  'Projects': 'royalblue', // Project management

  // All other stations inherit from their parent area
} as const;

/**
 * Note-Specific Colors - Colors used ONLY in the notes system
 * Not tied to business areas/stations
 */
export const NOTE_SPECIFIC_COLORS = {
  IDEAS: 'gray',        // Ideas, creativity, brainstorming
  URGENT: 'red',        // Challenges, problems, urgent items
  NEUTRAL: 'white',     // General, neutral, default
} as const;

/**
 * Color Classes - Theme-aware Tailwind classes for all colors
 * Used by notes, schedule cards, badges, and any visual element needing area/station colors
 */
export const COLOR_CLASSES = {
  // Original colors
  white: 'bg-card border-border hover:bg-muted/50',
  gray: 'bg-muted/30 border-border hover:bg-muted/50',
  red: 'bg-red-50/50 border-red-200 hover:bg-red-100/50 dark:bg-red-950/20 dark:border-red-800/50 dark:hover:bg-red-900/30',

  // Area colors
  purple: 'bg-purple-50/50 border-purple-200 hover:bg-purple-100/50 dark:bg-purple-950/20 dark:border-purple-800/50 dark:hover:bg-purple-900/30',
  cyan: 'bg-cyan-50/50 border-cyan-200 hover:bg-cyan-100/50 dark:bg-cyan-950/20 dark:border-cyan-800/50 dark:hover:bg-cyan-900/30',
  indigo: 'bg-indigo-50/50 border-indigo-200 hover:bg-indigo-100/50 dark:bg-indigo-950/20 dark:border-indigo-800/50 dark:hover:bg-indigo-900/30',
  turquoise: 'bg-teal-50/50 border-teal-200 hover:bg-teal-100/50 dark:bg-teal-950/20 dark:border-teal-800/50 dark:hover:bg-teal-900/30',
  orange: 'bg-orange-50/50 border-orange-200 hover:bg-orange-100/50 dark:bg-orange-950/20 dark:border-orange-800/50 dark:hover:bg-orange-900/30',
  yellow: 'bg-yellow-50/50 border-yellow-200 hover:bg-yellow-100/50 dark:bg-yellow-950/20 dark:border-yellow-800/50 dark:hover:bg-yellow-900/30',
  brown: 'bg-amber-50/50 border-amber-200 hover:bg-amber-100/50 dark:bg-amber-950/20 dark:border-amber-800/50 dark:hover:bg-amber-900/30',

  // Station-specific colors
  pink: 'bg-pink-50/50 border-pink-200 hover:bg-pink-100/50 dark:bg-pink-950/20 dark:border-pink-800/50 dark:hover:bg-pink-900/30',
  green: 'bg-green-50/50 border-green-200 hover:bg-green-100/50 dark:bg-green-950/20 dark:border-green-800/50 dark:hover:bg-green-900/30',
  gold: 'bg-amber-50/50 border-amber-300 hover:bg-amber-100/50 dark:bg-amber-950/20 dark:border-amber-700/50 dark:hover:bg-amber-900/30',
  royalblue: 'bg-blue-50/50 border-blue-300 hover:bg-blue-100/50 dark:bg-blue-950/20 dark:border-blue-700/50 dark:hover:bg-blue-900/30',
} as const;

/** 
 * Legacy export for backward compatibility with notes system 
 * @deprecated Use COLOR_CLASSES instead
 */
export const NOTE_COLOR_CLASSES = COLOR_CLASSES;

/**
 * Get color for a business area
 */
export function getAreaColor(area: keyof typeof AREA_COLORS): string {
  return AREA_COLORS[area];
}

/**
 * Get color for a station (with fallback to parent area)
 */
export function getStationColor(station: string, fallbackArea?: keyof typeof AREA_COLORS): string {
  // Check if station has custom color
  if (station in STATION_COLORS) {
    return STATION_COLORS[station as keyof typeof STATION_COLORS];
  }
  // Fallback to area color if provided
  if (fallbackArea) {
    return AREA_COLORS[fallbackArea];
  }
  // Default fallback
  return 'gray';
}

/**
 * Get color classes for any color name
 */
export function getColorClasses(color: string): string {
  return COLOR_CLASSES[color as keyof typeof COLOR_CLASSES] || COLOR_CLASSES.white;
}

/**
 * Get color classes for a business area
 */
export function getAreaColorClasses(area: keyof typeof AREA_COLORS): string {
  const color = AREA_COLORS[area];
  return getColorClasses(color);
}

/**
 * Get color classes for a station (with fallback to parent area)
 */
export function getStationColorClasses(station: string, fallbackArea?: keyof typeof AREA_COLORS): string {
  const color = getStationColor(station, fallbackArea);
  return getColorClasses(color);
}

/**
 * Get note color classes (backward compatibility)
 * @deprecated Use getColorClasses instead
 */
export function getNoteColorClasses(color: string): string {
  return getColorClasses(color);
}

/**
 * Get color label for display
 */
export function getColorLabel(color: string): string {
  const colorLabels: Record<string, string> = {
    white: 'White',
    gray: 'Gray',
    red: 'Red',
    purple: 'Purple',
    cyan: 'Cyan',
    indigo: 'Indigo',
    turquoise: 'Turquoise',
    orange: 'Orange',
    yellow: 'Yellow',
    brown: 'Brown',
    pink: 'Pink',
    green: 'Green',
    gold: 'Gold',
    royalblue: 'Royal Blue',
  };
  return colorLabels[color] || 'White';
}

