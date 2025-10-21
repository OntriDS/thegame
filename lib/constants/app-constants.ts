// lib/constants/app-constants.ts
// Application constants used throughout the system
import { Currency, TaskType } from '@/types/enums';
import { Target, Award, CheckSquare, Flag } from 'lucide-react';

export const ORDER_INCREMENT = 1000; // Used for task ordering
export const DRAG_Z_INDEX = 1000; // Z-index for dragging elements
export const CM_TO_M2_CONVERSION = 10000; // Convert cm² to m²
export const DAY_IN_MS = 24 * 60 * 60 * 1000; // Milliseconds in a day
export const SIDEBAR_MIN_WIDTH = 240; // Minimum sidebar width in pixels
export const SIDEBAR_MAX_WIDTH = 500; // Maximum sidebar width in pixels
export const SIDEBAR_DEFAULT_WIDTH = 320; // Default sidebar width in pixels
export const DRAG_ACTIVATION_DISTANCE = 5; // Pixels to move before drag starts

// Time-related constants for UI operations
export const STATUS_DISPLAY_SHORT = 3; // 3 seconds for short status messages
export const STATUS_DISPLAY_LONG = 5; // 5 seconds for long status messages
export const PAGE_RELOAD_DELAY = 1; // 1 second delay before page reload

// Progress-related constants
export const PROGRESS_MAX = 100; // Maximum progress percentage
export const PROGRESS_STEP = 25; // Progress increment step
export const PROGRESS_INTERVALS = [0, 25, 50, 75, 100]; // Progress interval markers

// Input and form constants
export const PRICE_STEP = 1; // Step increment for price inputs
export const DECIMAL_STEP = "any"; // Step for decimal inputs (allows any decimal)
export const QUANTITY_STEP = 1; // Step increment for quantity inputs
export const DEFAULT_MIN_VALUE = 0; // Default minimum value for number inputs
export const MODAL_MAX_HEIGHT = '90vh'; // Maximum height for modals
export const MODAL_MAX_WIDTH = '4xl'; // Maximum width for modals

// Date and time constants
export const YEAR_MIN = 2000; // Minimum year for date inputs
export const YEAR_MAX = 2050; // Maximum year for date inputs

// Date format system - DD-MM-YYYY (day-month-year) - logical progression from smallest to largest
export const DATE_FORMAT_DISPLAY = 'dd-MM-yyyy'; // Display format: 25-12-2024
export const DATE_FORMAT_INPUT = 'yyyy-MM-dd'; // Input format: 2024-12-25 (HTML date input)
export const DATE_FORMAT_LONG = 'dd MMMM yyyy'; // Long format: 25 December 2024
export const DATE_FORMAT_SHORT = 'dd/MM/yy'; // Short format: 25/12/24
export const DATE_FORMAT_MONTH_YEAR = 'MMMM yyyy'; // Month year: December 2024

// Currency and financial constants
export const J$_TO_USD_RATE = 10; // 1 Jungle Dollar = $10 USD
export const PRIMARY_CURRENCY = Currency.USD; // USD is the primary business currency
export const REWARD_CURRENCY = Currency.JUNGLE_COINS; // J$ are reward tokens that convert to USD
export const USD_CURRENCY = Currency.USD; // USD currency reference
export const BTC_CURRENCY = Currency.BTC; // Bitcoin currency
export const CRC_CURRENCY = Currency.CRC; // Costa Rica Colon currency

// Task Type Icon Mapping - Centralized icon definitions for task types
export const TASK_TYPE_ICONS: Record<TaskType, React.ElementType> = {
  [TaskType.MISSION]: Award,
  [TaskType.MILESTONE]: Flag,
  [TaskType.GOAL]: Target,
  [TaskType.ASSIGNMENT]: CheckSquare,
  [TaskType.RECURRENT_PARENT]: Award,
  [TaskType.RECURRENT_TEMPLATE]: Flag,
  [TaskType.RECURRENT_INSTANCE]: Target,
};

// Z-Index Layer System - Systematic approach to prevent conflicts
export const Z_INDEX_LAYERS = {
  
  BASE: 0, // Layer 0 (z-0): Base content, sections, background
  SUBTABS: 50, // Layer 1 (z-50): Subtabs and navigation
  MODALS: 100, // Layer 2 (z-100): First level modals (task-modal, record-modal)
  MODAL_TABS: 150, // Layer 2.5 (z-150): Tabs in modals
  INNER_MODALS: 200, // Layer 3 (z-200): Inner modals (calendar, dropdowns, popovers)
  SUB_MODALS: 300, // Layer 4 (z-300): Inner sub-modals and nested dropdowns
  DROPDOWNS: 500, // Layer 5 (z-500): Dropdowns and popovers
  TOOLTIPS: 750, // Layer 6 (z-750): Tooltips and small overlays
  NOTIFICATIONS: 900, // Layer 7 (z-900): Notifications and alerts
  CRITICAL: 1000, // Layer 8 (z-1000): Highest priority modals (delete confirmations, critical alerts)
  DRAG: 1500, // Special cases: For dragging elements
  MAX: 9999, // Maximum z-index for emergency cases
} as const;

// UI and interaction constants
export const DEFAULT_YELLOW_THRESHOLD = 15; // Default low stock warning threshold
export const MIN_WIDTH_150 = 150; // Minimum width for dropdown menus
export const TRANSITION_DURATION_150 = 150; // Transition duration in milliseconds
export const TRANSITION_DURATION_15 = 15; // Short transition duration in milliseconds

// Shoe size conversion constants (US to EU)
export const SHOE_SIZE_CONVERSION: Record<string, string> = {
  '7.5': '38.5',
  '8': '39',
  '10': '44'
};
