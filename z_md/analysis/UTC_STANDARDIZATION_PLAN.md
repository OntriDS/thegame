# UTC Standardization Plan

## Executive Summary

This plan establishes a single, consistent date handling architecture for the entire system. The core principle: **The system internally works exclusively in UTC**, with translations occurring only at system boundaries (UI, API routes, external integrations).

**UTC Standard Format:** `YYYY-MM-DDTHH:MM:SSZ`

**Estimated Total Effort:** 20-30 hours
**Priority:** CRITICAL - Must be completed before Recurrent Template Implementation

---

## Core Principles

### 1. Internal Storage (UTC Only)
- ALL dates stored in database: UTC timestamps
- ALL internal calculations: UTC timestamps
- ALL comparisons: UTC timestamps
- NO timezone awareness in core business logic

### 2. Boundary Translations
**UI Layer (Display Only):**
- Convert UTC → User's local timezone for display
- Convert User's local input → UTC for storage

**API Layer (Request/Response):**
- Accept dates in multiple formats, convert to UTC internally
- Return UTC dates (client handles display timezone)

**External Integrations:**
- Convert external date formats → UTC on entry
- Convert UTC → external formats on exit

### 3. Single Source of Truth
- ONE centralized date utility file: `lib/utils/utc-utils.ts`
- ALL date operations go through this file
- NO direct `new Date()` usage without utility functions
- NO timezone manipulation outside this file

---

## Current State Analysis

### Existing Date Files (To Be Consolidated)

| File | Purpose | Issues |
|------|---------|--------|
| `lib/utils/date-utils.ts` | Main date utilities using date-fns | Mixes local/UTC, too many responsibilities |
| `lib/utils/recurrent-date-utils.ts` | UTC for recurrent tasks | Scoped only to recurrent, inconsistent naming |
| `lib/constants/date-constants.ts` | Basic date constants | Minimal, duplicates formatting logic |

### Current Problems

1. **Inconsistent timezone handling**: Some functions use local time, some UTC
2. **Multiple parsing paths**: `parseFlexibleDate` tries 4 different formats
3. **No clear separation**: Display, storage, and calculation logic mixed
4. **Direct Date usage**: Code directly uses `new Date()` everywhere
5. **Duplicate functionality**: Multiple date formatting functions across files

---

## Architecture

### New File Structure

```
lib/utils/
├── utc-utils.ts          # CORE: All UTC operations (NEW)
├── date-display-utils.ts # UI: Display formatting only (NEW)
└── date-parsers.ts       # PARSING: Input parsing only (NEW)

# DEPRECATED (to be removed after migration)
├── date-utils.ts
├── recurrent-date-utils.ts
└── constants/date-constants.ts
```

### Data Flow

```
User Input (Local Time)
    ↓
[date-parsers.ts] parseInputToUTC()
    ↓
Internal Operations (UTC Only)
    ↓
UTC Storage (Database/API)
    ↓
Internal Operations (UTC Only)
    ↓
[date-display-utils.ts] formatForDisplay()
    ↓
User Display (Local Time)
```

---

## Phase 1: Create Core UTC Utilities

### File: `lib/utils/utc-utils.ts`

```typescript
/**
 * lib/utils/utc-utils.ts
 *
 * CORE DATE UTILITY - SINGLE SOURCE OF TRUTH
 *
 * PRINCIPLE: System internally works exclusively in UTC
 * - All storage: UTC
 * - All calculations: UTC
 * - All comparisons: UTC
 *
 * Format: YYYY-MM-DDTHH:MM:SSZ (ISO 8601 with Z suffix)
 *
 * @see date-display-utils.ts for UI formatting
 * @see date-parsers.ts for input parsing
 */

import { isDate, isValid } from 'date-fns';

// ============================================================================
// CORE UTC CONVERSIONS
// ============================================================================

/**
 * Convert any date representation to UTC Date object.
 * This is the ONLY way to create dates for internal use.
 *
 * @param input - Date, string (ISO/ISO8601), or number (timestamp)
 * @returns Date object in UTC
 * @throws Error if input is invalid
 */
export function toUTC(input: Date | string | number): Date {
  let date: Date;

  if (typeof input === 'number') {
    // Timestamp - create in UTC
    date = new Date(input);
  } else if (typeof input === 'string') {
    // String - parse as ISO (UTC)
    // Ensure string ends with Z for UTC
    const normalized = input.endsWith('Z') ? input : `${input}Z`;
    date = new Date(normalized);
  } else if (isDate(input)) {
    // Date object - treat as UTC (caller responsibility)
    date = new Date(input.getTime());
  } else {
    throw new Error(`Invalid date input: ${input}`);
  }

  if (!isValid(date)) {
    throw new Error(`Invalid date: ${input}`);
  }

  return date;
}

/**
 * Convert local user input (from UI) to UTC.
 * Use this when parsing user-submitted dates.
 *
 * @param localDate - Date in user's local timezone
 * @returns Date object in UTC
 */
export function fromLocalToUTC(localDate: Date | string): Date {
  const date = toUTC(localDate);

  // Convert to UTC by using the local date components
  // Example: User inputs "2024-01-15" (midnight local)
  // We store as "2024-01-15T00:00:00Z"
  const utcDate = new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds()
  ));

  return utcDate;
}

/**
 * Get current UTC timestamp.
 * Always use this for "now" in internal logic.
 *
 * @returns Current UTC Date
 */
export function getUTCNow(): Date {
  return new Date();
}

/**
 * Format Date as UTC ISO string with Z suffix.
 * Standard format: YYYY-MM-DDTHH:MM:SSZ
 *
 * @param date - UTC Date object
 * @returns ISO string with Z suffix
 */
export function toUTCISOString(date: Date): string {
  return date.toISOString();
}

/**
 * Parse UTC ISO string to Date object.
 * Ensures strict UTC parsing.
 *
 * @param isoString - ISO string (with or without Z)
 * @returns Date object in UTC
 */
export function fromUTCISOString(isoString: string): Date {
  // Ensure Z suffix for strict UTC parsing
  const normalized = isoString.endsWith('Z') ? isoString : `${isoString}Z`;
  return toUTC(normalized);
}

// ============================================================================
// UTC CALCULATIONS (All return UTC dates)
// ============================================================================

/**
 * Add days to a UTC date.
 *
 * @param date - Base UTC date
 * @param days - Days to add (can be negative)
 * @returns New UTC date
 */
export function addDaysUTC(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * Add weeks to a UTC date.
 *
 * @param date - Base UTC date
 * @param weeks - Weeks to add (can be negative)
 * @returns New UTC date
 */
export function addWeeksUTC(date: Date, weeks: number): Date {
  return addDaysUTC(date, weeks * 7);
}

/**
 * Add months to a UTC date.
 * Handles month-end edge cases.
 *
 * @param date - Base UTC date
 * @param months - Months to add (can be negative)
 * @returns New UTC date
 */
export function addMonthsUTC(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

/**
 * Add years to a UTC date.
 *
 * @param date - Base UTC date
 * @param years - Years to add (can be negative)
 * @returns New UTC date
 */
export function addYearsUTC(date: Date, years: number): Date {
  const result = new Date(date.getTime());
  result.setUTCFullYear(result.getUTCFullYear() + years);
  return result;
}

/**
 * Get start of day in UTC (00:00:00).
 *
 * @param date - Base UTC date
 * @returns New UTC date at midnight
 */
export function startOfDayUTC(date: Date): Date {
  const result = new Date(date.getTime());
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

/**
 * Get end of day in UTC (23:59:59.999).
 *
 * @param date - Base UTC date
 * @returns New UTC date at end of day
 */
export function endOfDayUTC(date: Date): Date {
  const result = new Date(date.getTime());
  result.setUTCHours(23, 59, 59, 999);
  return result;
}

/**
 * Get start of month in UTC (1st at 00:00:00).
 *
 * @param date - Base UTC date
 * @returns New UTC date at start of month
 */
export function startOfMonthUTC(date: Date): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(1);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

/**
 * Get end of month in UTC (last day at 23:59:59.999).
 *
 * @param date - Base UTC date
 * @returns New UTC date at end of month
 */
export function endOfMonthUTC(date: Date): Date {
  const result = new Date(date.getTime());
  result.setUTCMonth(result.getUTCMonth() + 1, 0);
  result.setUTCHours(23, 59, 59, 999);
  return result;
}

/**
 * Get start of week in UTC (Sunday at 00:00:00).
 *
 * @param date - Base UTC date
 * @returns New UTC date at start of week
 */
export function startOfWeekUTC(date: Date): Date {
  const result = new Date(date.getTime());
  const dayOfWeek = result.getUTCDay();
  result.setUTCDate(result.getUTCDate() - dayOfWeek);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

/**
 * Get end of week in UTC (Saturday at 23:59:59.999).
 *
 * @param date - Base UTC date
 * @returns New UTC date at end of week
 */
export function endOfWeekUTC(date: Date): Date {
  const result = new Date(date.getTime());
  const dayOfWeek = result.getUTCDay();
  result.setUTCDate(result.getUTCDate() + (6 - dayOfWeek));
  result.setUTCHours(23, 59, 59, 999);
  return result;
}

/**
 * Get number of days in a month (UTC).
 *
 * @param date - UTC date
 * @returns Number of days in the month
 */
export function getDaysInMonthUTC(date: Date): number {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    0
  )).getUTCDate();
}

/**
 * Get next occurrence of a specific weekday (UTC).
 *
 * @param date - Base UTC date
 * @param dayOfWeek - Target day (0=Sunday, 1=Monday, ..., 6=Saturday)
 * @returns Next UTC date matching the weekday
 */
export function getNextWeekdayUTC(date: Date, dayOfWeek: number): Date {
  const result = new Date(date.getTime());
  const currentDay = result.getUTCDay();
  const daysUntilNext = (dayOfWeek + 7 - currentDay) % 7 || 7; // At least 1 day ahead
  result.setUTCDate(result.getUTCDate() + daysUntilNext);
  return result;
}

// ============================================================================
// UTC COMPARISONS
// ============================================================================

/**
 * Check if two UTC dates are the same day.
 *
 * @param date1 - First UTC date
 * @param date2 - Second UTC date
 * @returns True if same day (ignores time)
 */
export function isSameDayUTC(date1: Date, date2: Date): boolean {
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate()
  );
}

/**
 * Check if date1 is before date2 (UTC).
 *
 * @param date1 - First UTC date
 * @param date2 - Second UTC date
 * @returns True if date1 < date2
 */
export function isBeforeUTC(date1: Date, date2: Date): boolean {
  return date1.getTime() < date2.getTime();
}

/**
 * Check if date1 is after date2 (UTC).
 *
 * @param date1 - First UTC date
 * @param date2 - Second UTC date
 * @returns True if date1 > date2
 */
export function isAfterUTC(date1: Date, date2: Date): boolean {
  return date1.getTime() > date2.getTime();
}

/**
 * Check if date is between two dates (inclusive) in UTC.
 *
 * @param date - Date to check
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (inclusive)
 * @returns True if date is between start and end
 */
export function isBetweenUTC(date: Date, startDate: Date, endDate: Date): boolean {
  return !isBeforeUTC(date, startDate) && !isAfterUTC(date, endDate);
}

/**
 * Check if date is in the past (UTC).
 *
 * @param date - Date to check
 * @param referenceDate - Reference date (defaults to now)
 * @returns True if date is before reference
 */
export function isPastUTC(date: Date, referenceDate?: Date): boolean {
  const now = referenceDate || getUTCNow();
  return isBeforeUTC(date, now);
}

/**
 * Check if date is in the future (UTC).
 *
 * @param date - Date to check
 * @param referenceDate - Reference date (defaults to now)
 * @returns True if date is after reference
 */
export function isFutureUTC(date: Date, referenceDate?: Date): boolean {
  const now = referenceDate || getUTCNow();
  return isAfterUTC(date, now);
}

/**
 * Calculate difference in days between two UTC dates.
 *
 * @param date1 - First UTC date
 * @param date2 - Second UTC date
 * @returns Number of days (can be negative)
 */
export function diffDaysUTC(date1: Date, date2: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((date1.getTime() - date2.getTime()) / msPerDay);
}

/**
 * Calculate difference in hours between two UTC dates.
 *
 * @param date1 - First UTC date
 * @param date2 - Second UTC date
 * @returns Number of hours (can be negative)
 */
export function diffHoursUTC(date1: Date, date2: Date): number {
  const msPerHour = 1000 * 60 * 60;
  return Math.floor((date1.getTime() - date2.getTime()) / msPerHour);
}

// ============================================================================
// UTC VALIDATION
// ============================================================================

/**
 * Check if a date is valid.
 *
 * @param input - Date, string, or number
 * @returns True if valid
 */
export function isValidUTC(input: Date | string | number): boolean {
  try {
    const date = toUTC(input);
    return isValid(date);
  } catch {
    return false;
  }
}

/**
 * Clamp date to valid range (UTC).
 * Handles edge cases like Feb 31 → Feb 28/29.
 *
 * @param date - Date to clamp
 * @returns Clamped UTC date
 */
export function clampToValidUTC(date: Date): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const daysInMonth = getDaysInMonthUTC(date);
  const clampedDay = Math.min(day, daysInMonth);

  return new Date(Date.UTC(year, month, clampedDay));
}
```

### File: `lib/utils/date-parsers.ts`

```typescript
/**
 * lib/utils/date-parsers.ts
 *
 * INPUT PARSING - Convert various input formats to UTC
 *
 * This is the ONLY place that handles multiple date formats.
 * All outputs are UTC dates for internal use.
 *
 * Supported input formats:
 * - ISO 8601: "2024-01-15T10:30:00Z"
 * - HTML input: "2024-01-15"
 * - Display format: "15-01-2024"
 * - Short format: "15/01/24"
 * - Timestamp: number
 *
 * @see utc-utils.ts for core UTC operations
 * @see date-display-utils.ts for output formatting
 */

import { parseISO, parse, isValid } from 'date-fns';
import { toUTC, fromLocalToUTC } from './utc-utils';

// ============================================================================
// CORE PARSING
// ============================================================================

/**
 * Parse any date input to UTC.
 * Attempts multiple formats in order of preference.
 *
 * @param input - Date, string, or number
 * @returns UTC Date object
 * @throws Error if input is invalid
 */
export function parseDateToUTC(input: Date | string | number | null | undefined): Date {
  // Null/undefined - use current UTC time
  if (input === null || input === undefined) {
    return new Date();
  }

  // Already a Date object - convert to UTC
  if (input instanceof Date) {
    return fromLocalToUTC(input);
  }

  // Number (timestamp) - create UTC date
  if (typeof input === 'number') {
    return toUTC(input);
  }

  // String - try multiple formats
  return parseStringToUTC(input);
}

/**
 * Parse string input to UTC.
 * Tries multiple formats in order.
 *
 * @param str - Date string
 * @returns UTC Date object
 * @throws Error if string is invalid
 */
function parseStringToUTC(str: string): Date {
  // 1. Try ISO format first (most reliable)
  const isoDate = parseISO(str);
  if (isValid(isoDate)) {
    return fromLocalToUTC(isoDate);
  }

  // 2. Try YYYY-MM-DD (HTML input format)
  const htmlDate = parse(str, 'yyyy-MM-dd', new Date());
  if (isValid(htmlDate)) {
    return fromLocalToUTC(htmlDate);
  }

  // 3. Try DD-MM-YYYY (Display format)
  const displayDate = parse(str, 'dd-MM-yyyy', new Date());
  if (isValid(displayDate)) {
    return fromLocalToUTC(displayDate);
  }

  // 4. Try DD/MM/YY (Short format)
  const shortDate = parse(str, 'dd/MM/yy', new Date());
  if (isValid(shortDate)) {
    return fromLocalToUTC(shortDate);
  }

  // 5. Try native parsing (last resort)
  const native = new Date(str);
  if (isValid(native)) {
    return fromLocalToUTC(native);
  }

  throw new Error(`Unable to parse date: ${str}`);
}

/**
 * Parse HTML input date (YYYY-MM-DD) to UTC.
 * Use this for date picker inputs.
 *
 * @param str - Date string in YYYY-MM-DD format
 * @returns UTC Date object (at midnight)
 */
export function parseHTMLInputToUTC(str: string): Date {
  if (!str) return new Date();

  const parsed = parse(str, 'yyyy-MM-dd', new Date());
  if (!isValid(parsed)) {
    throw new Error(`Invalid HTML input date: ${str}`);
  }

  // Convert to UTC at midnight
  return new Date(Date.UTC(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate()
  ));
}

/**
 * Parse display date (DD-MM-YYYY) to UTC.
 *
 * @param str - Date string in DD-MM-YYYY format
 * @returns UTC Date object (at midnight)
 */
export function parseDisplayDateToUTC(str: string): Date {
  if (!str) return new Date();

  const parsed = parse(str, 'dd-MM-yyyy', new Date());
  if (!isValid(parsed)) {
    throw new Error(`Invalid display date: ${str}`);
  }

  // Convert to UTC at midnight
  return new Date(Date.UTC(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate()
  ));
}

/**
 * Parse ISO string to UTC.
 * Ensures strict UTC parsing.
 *
 * @param str - ISO string (with or without Z)
 * @returns UTC Date object
 */
export function parseISOToUTC(str: string): Date {
  if (!str) return new Date();

  // Ensure Z suffix
  const normalized = str.endsWith('Z') ? str : `${str}Z`;
  const parsed = parseISO(normalized);

  if (!isValid(parsed)) {
    throw new Error(`Invalid ISO date: ${str}`);
  }

  return parsed;
}

/**
 * Safe parse that returns null on failure.
 *
 * @param input - Date input
 * @returns UTC Date object or null
 */
export function tryParseToUTC(input: Date | string | number | null | undefined): Date | null {
  try {
    return parseDateToUTC(input);
  } catch {
    return null;
  }
}
```

### File: `lib/utils/date-display-utils.ts`

```typescript
/**
 * lib/utils/date-display-utils.ts
 *
 * DISPLAY FORMATTING - Convert UTC dates to user-friendly formats
 *
 * These functions are ONLY for UI display.
 * All inputs must be UTC dates (from utc-utils.ts).
 *
 * @see utc-utils.ts for core UTC operations
 * @see date-parsers.ts for input parsing
 */

import { format } from 'date-fns';

// ============================================================================
// DISPLAY FORMATS
// ============================================================================

/** Standard display format: DD-MM-YYYY */
export const FORMAT_DISPLAY = 'dd-MM-yyyy';

/** HTML input format: YYYY-MM-DD */
export const FORMAT_INPUT = 'yyyy-MM-dd';

/** Long format: DD MMMM YYYY */
export const FORMAT_LONG = 'dd MMMM yyyy';

/** Short format: DD/MM/YY */
export const FORMAT_SHORT = 'dd/MM/yy';

/** Day-month format: DD-MM */
export const FORMAT_DAY_MONTH = 'dd-MM';

/** Day-month-year format: DD-MM-YY */
export const FORMAT_DAY_MONTH_YEAR = 'dd-MM-yy';

/** Month-year format: MMMM YYYY */
export const FORMAT_MONTH_YEAR = 'MMMM yyyy';

/** Month key format: MM-YY */
export const FORMAT_MONTH_KEY = 'MM-yy';

/** ISO format: YYYY-MM-DDTHH:MM:SSZ */
export const FORMAT_ISO = "yyyy-MM-dd'T'HH:mm:ss'Z'";

// ============================================================================
// DISPLAY FORMATTING FUNCTIONS
// ============================================================================

/**
 * Format UTC date for display (DD-MM-YYYY).
 * This converts UTC to user's local timezone for display.
 *
 * @param utcDate - UTC Date object
 * @returns Formatted string in user's local timezone
 */
export function formatForDisplay(utcDate: Date): string {
  if (!utcDate) return '';
  return format(utcDate, FORMAT_DISPLAY);
}

/**
 * Format UTC date for HTML input (YYYY-MM-DD).
 *
 * @param utcDate - UTC Date object
 * @returns Formatted string for HTML input
 */
export function formatForInput(utcDate: Date): string {
  if (!utcDate) return '';
  return format(utcDate, FORMAT_INPUT);
}

/**
 * Format UTC date in long format (DD MMMM YYYY).
 *
 * @param utcDate - UTC Date object
 * @returns Formatted string
 */
export function formatLong(utcDate: Date): string {
  if (!utcDate) return '';
  return format(utcDate, FORMAT_LONG);
}

/**
 * Format UTC date in short format (DD/MM/YY).
 *
 * @param utcDate - UTC Date object
 * @returns Formatted string
 */
export function formatShort(utcDate: Date): string {
  if (!utcDate) return '';
  return format(utcDate, FORMAT_SHORT);
}

/**
 * Format UTC date as day-month (DD-MM).
 *
 * @param utcDate - UTC Date object
 * @returns Formatted string
 */
export function formatDayMonth(utcDate: Date): string {
  if (!utcDate) return '';
  return format(utcDate, FORMAT_DAY_MONTH);
}

/**
 * Format UTC date as day-month-year (DD-MM-YY).
 *
 * @param utcDate - UTC Date object
 * @returns Formatted string
 */
export function formatDayMonthYear(utcDate: Date): string {
  if (!utcDate) return '';
  return format(utcDate, FORMAT_DAY_MONTH_YEAR);
}

/**
 * Format UTC date as month-year (MMMM YYYY).
 *
 * @param utcDate - UTC Date object
 * @returns Formatted string
 */
export function formatMonthYear(utcDate: Date): string {
  if (!utcDate) return '';
  return format(utcDate, FORMAT_MONTH_YEAR);
}

/**
 * Format UTC date as month key (MM-YY).
 *
 * @param utcDate - UTC Date object
 * @returns Formatted string
 */
export function formatMonthKey(utcDate: Date): string {
  if (!utcDate) return '';
  return format(utcDate, FORMAT_MONTH_KEY);
}

/**
 * Format UTC date as ISO string with Z suffix.
 *
 * @param utcDate - UTC Date object
 * @returns ISO string
 */
export function formatISO(utcDate: Date): string {
  if (!utcDate) return '';
  return utcDate.toISOString();
}

/**
 * Get current month key (MM-YY) in UTC.
 *
 * @returns Current month key
 */
export function getCurrentMonthKey(): string {
  return formatMonthKey(new Date());
}

/**
 * Sort month keys (MM-YY) in descending order.
 *
 * @param keys - Array of month keys
 * @returns Sorted array (newest first)
 */
export function sortMonthKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const [amStr, ayStr] = a.split('-');
    const [bmStr, byStr] = b.split('-');

    const ay = parseInt(`20${ayStr}`, 10);
    const by = parseInt(`20${byStr}`, 10);

    if (ay !== by) return by - ay; // Year desc
    return parseInt(bmStr, 10) - parseInt(amStr, 10); // Month desc
  });
}

// ============================================================================
// RELATIVE FORMATTING
// ============================================================================

/**
 * Format date as relative time (e.g., "2 days ago").
 *
 * @param utcDate - UTC Date object
 * @param referenceDate - Reference date (defaults to now)
 * @returns Relative time string
 */
export function formatRelative(utcDate: Date, referenceDate?: Date): string {
  const ref = referenceDate || new Date();
  const diffMs = ref.getTime() - utcDate.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatForDisplay(utcDate);
}
```

---

## Phase 2: Migration Strategy

### Step 1: Update Type Definitions

**File: `types/entities.ts`**

```typescript
// All date fields are UTC ISO strings in storage
// TypeScript types remain Date for internal use

export interface Task {
  // ... other fields ...

  // UTC dates (stored as ISO strings, used as Date objects internally)
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  collectedAt?: Date;
  doneAt?: Date;
  lastSpawnedDate?: Date; // For recurrent templates
}

export interface Sale {
  // ... other fields ...

  // UTC dates
  saleDate: Date;
  collectedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Step 2: Update Database Operations

**Before:**
```typescript
// lib/datastore.ts
export async function upsertTask(task: Task): Promise<Task> {
  const taskData = {
    ...task,
    createdAt: task.createdAt.toISOString(), // Uncontrolled UTC
    dueDate: task.dueDate?.toISOString(), // Uncontrolled UTC
  };
  // ...
}
```

**After:**
```typescript
// lib/datastore.ts
import { toUTCISOString } from './utils/utc-utils';

export async function upsertTask(task: Task): Promise<Task> {
  const taskData = {
    ...task,
    createdAt: toUTCISOString(task.createdAt), // Controlled UTC with Z
    dueDate: task.dueDate ? toUTCISOString(task.dueDate) : undefined,
  };
  // ...
}
```

### Step 3: Update API Routes

**Before:**
```typescript
// app/api/tasks/route.ts
export async function POST(req: NextRequest) {
  const body = await req.json();

  const task = {
    ...body,
    dueDate: body.dueDate ? new Date(body.dueDate) : undefined, // Uncontrolled
  };
  // ...
}
```

**After:**
```typescript
// app/api/tasks/route.ts
import { parseDateToUTC, toUTCISOString } from '@/lib/utils/date-parsers';

export async function POST(req: NextRequest) {
  const body = await req.json();

  const task = {
    ...body,
    dueDate: body.dueDate ? parseDateToUTC(body.dueDate) : undefined, // Controlled
  };

  // Storage uses UTC ISO strings
  const taskData = {
    ...task,
    dueDate: task.dueDate ? toUTCISOString(task.dueDate) : undefined,
  };
  // ...
}
```

### Step 4: Update UI Components

**Before:**
```typescript
// components/ui/date-input.tsx
const handleChange = (value: string) => {
  const date = new Date(value); // Local time
  onChange(date);
};

const displayValue = formatDisplayDate(value); // Mixes UTC/local
```

**After:**
```typescript
// components/ui/date-input.tsx
import { parseHTMLInputToUTC } from '@/lib/utils/date-parsers';
import { formatForDisplay } from '@/lib/utils/date-display-utils';

const handleChange = (value: string) => {
  const utcDate = parseHTMLInputToUTC(value); // Always UTC
  onChange(utcDate);
};

const displayValue = formatForDisplay(value); // UTC → Local display
```

### Step 5: Update Workflows

**Before:**
```typescript
// workflows/entities-workflows/task.workflow.ts
const now = new Date(); // Local time
const closingDate = new Date(referenceDate);
closingDate.setMonth(closingDate.getMonth() + 1, 0); // Local time
```

**After:**
```typescript
// workflows/entities-workflows/task.workflow.ts
import { getUTCNow, endOfMonthUTC } from '@/lib/utils/utc-utils';

const now = getUTCNow(); // UTC
const closingDate = endOfMonthUTC(referenceDate); // UTC
```

---

## Phase 3: Deprecation & Removal

### Mark Old Files as Deprecated

**File: `lib/utils/date-utils.ts`**

```typescript
/**
 * @DEPRECATED - Use utc-utils.ts, date-parsers.ts, and date-display-utils.ts instead
 *
 * This file is maintained for backward compatibility only.
 * All new code should use the new UTC utilities.
 *
 * Migration guide:
 * - formatDisplayDate() → formatForDisplay()
 * - parseFlexibleDate() → parseDateToUTC()
 * - new Date() → getUTCNow()
 */

import { parseDateToUTC } from './date-parsers';
import { formatForDisplay } from './date-display-utils';

// Export new utilities for backward compatibility
export const parseFlexibleDate = parseDateToUTC;
export const formatDisplayDate = formatForDisplay;

// ... rest of existing code with @deprecated comments
```

### Remove Old Files (After Migration Complete)

1. **Verify no imports:**
   ```bash
   grep -r "from '@/lib/utils/date-utils'" thegame/
   grep -r "from '@/lib/utils/recurrent-date-utils'" thegame/
   grep -r "from '@/lib/constants/date-constants'" thegame/
   ```

2. **Delete files:**
   - `lib/utils/date-utils.ts`
   - `lib/utils/recurrent-date-utils.ts`
   - `lib/constants/date-constants.ts`

---

## Phase 4: Testing Strategy

### Unit Tests

```typescript
// __tests__/utc-utils.test.ts
import {
  toUTC,
  getUTCNow,
  addDaysUTC,
  isSameDayUTC,
  // ... other imports
} from '@/lib/utils/utc-utils';

describe('UTC Utils', () => {
  describe('toUTC', () => {
    it('should convert ISO string to UTC', () => {
      const date = toUTC('2024-01-15T10:30:00Z');
      expect(date.toISOString()).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should convert Date object to UTC', () => {
      const local = new Date(2024, 0, 15); // Jan 15, 2024 (local)
      const utc = toUTC(local);
      expect(utc.getUTCFullYear()).toBe(2024);
      expect(utc.getUTCMonth()).toBe(0);
      expect(utc.getUTCDate()).toBe(15);
    });

    it('should throw on invalid input', () => {
      expect(() => toUTC('invalid')).toThrow();
    });
  });

  describe('addDaysUTC', () => {
    it('should add days correctly', () => {
      const date = toUTC('2024-01-15T00:00:00Z');
      const result = addDaysUTC(date, 5);
      expect(result.toISOString()).toBe('2024-01-20T00:00:00.000Z');
    });

    it('should handle month boundaries', () => {
      const date = toUTC('2024-01-30T00:00:00Z');
      const result = addDaysUTC(date, 5);
      expect(result.toISOString()).toBe('2024-02-04T00:00:00.000Z');
    });
  });

  describe('isSameDayUTC', () => {
    it('should identify same day (different times)', () => {
      const date1 = toUTC('2024-01-15T00:00:00Z');
      const date2 = toUTC('2024-01-15T23:59:59Z');
      expect(isSameDayUTC(date1, date2)).toBe(true);
    });

    it('should identify different days', () => {
      const date1 = toUTC('2024-01-15T00:00:00Z');
      const date2 = toUTC('2024-01-16T00:00:00Z');
      expect(isSameDayUTC(date1, date2)).toBe(false);
    });
  });
});
```

### Integration Tests

Test end-to-end flows:
1. User input → UTC storage → User display
2. Date calculations → UTC comparisons
3. API request → UTC processing → API response

### Manual Testing Checklist

- [ ] Date picker input stores correct UTC date
- [ ] Displayed dates match user's timezone
- [ ] Date comparisons work across timezone boundaries
- [ ] Recurrent task spawning works with UTC dates
- [ ] Monthly close calculations use UTC
- [ ] Archive month keys are consistent

---

## Rollback Plan

### Rollback Triggers

1. Data corruption from UTC conversion
2. Display dates incorrect for users
3. Recurrent tasks spawning on wrong dates

### Rollback Steps

1. Revert to previous `date-utils.ts`
2. Restore database from backup
3. Revert API route changes
4. Investigate root cause

### Safety Measures

1. All changes in feature branch
2. Database backup before migration
3. Staging environment testing
4. Gradual rollout (canary deployment)

---

## Success Criteria

### Technical Criteria

- [ ] All dates stored as UTC ISO strings with Z suffix
- [ ] All internal calculations use UTC utilities
- [ ] No direct `new Date()` usage without utilities
- [ ] All old date files removed or deprecated

### Functional Criteria

- [ ] Dates display correctly in user's timezone
- [ ] Date comparisons work consistently
- [ ] Recurrent tasks spawn on correct dates
- [ ] No regression in existing functionality

### Maintainability Criteria

- [ ] Single source of truth for date operations
- [ ] Clear separation of concerns (UTC/display/parsing)
- [ ] Comprehensive documentation
- [ ] Test coverage for all date operations

---

## Next Steps

1. **Review and Approve:** Get stakeholder approval for this plan
2. **Create Feature Branch:** `feature/utc-standardization`
3. **Implement Core Utilities:** Create `utc-utils.ts`, `date-parsers.ts`, `date-display-utils.ts`
4. **Write Tests:** Unit tests for all utilities
5. **Migrate Gradually:** Update one module at a time, test thoroughly
6. **Deprecate Old Files:** Add deprecation warnings
7. **Remove Old Files:** After full migration
8. **Proceed with Recurrent Template Plan:** Only after UTC standardization complete

---

**Document Version:** 1.0
**Created:** 2026-04-07
**Priority:** CRITICAL - Prerequisite for Recurrent Template Implementation
