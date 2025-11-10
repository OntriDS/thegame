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
  [TaskPriority.URGENT]: 'text-red-600 dark:text-red-400',
  [TaskPriority.IMPORTANT]: 'text-purple-600 dark:text-purple-300',
  [TaskPriority.NOT_NOW]: 'text-gray-900 dark:text-gray-200',
  [TaskPriority.SLOW]: 'text-amber-900 dark:text-amber-400',
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

