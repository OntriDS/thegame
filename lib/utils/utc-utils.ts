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

/** Date, epoch ms, or ISO string — KV/JSON often revives dates as strings */
export type UTCalendarInput = Date | string | number;

function normalizeCalendarBase(input: UTCalendarInput): Date {
  if (input instanceof Date) {
    if (!Number.isFinite(input.getTime())) {
      throw new Error('Invalid Date object');
    }
    return new Date(input.getTime());
  }
  if (typeof input === 'number') {
    const d = new Date(input);
    if (!Number.isFinite(d.getTime())) {
      throw new Error(`Invalid timestamp: ${input}`);
    }
    return d;
  }
  const d = new Date(String(input).trim());
  if (!Number.isFinite(d.getTime())) {
    throw new Error(`Invalid date string: ${input}`);
  }
  return d;
}

/**
 * Get start of day in UTC (00:00:00).
 *
 * @param date - Base UTC date (or ISO string / ms from storage)
 * @returns New UTC date at midnight
 */
export function startOfDayUTC(date: UTCalendarInput): Date {
  const result = normalizeCalendarBase(date);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

/**
 * Get end of day in UTC (23:59:59.999).
 *
 * @param date - Base UTC date (or ISO string / ms from storage)
 * @returns New UTC date at end of day
 */
export function endOfDayUTC(date: UTCalendarInput): Date {
  const result = normalizeCalendarBase(date);
  result.setUTCHours(23, 59, 59, 999);
  return result;
}

/**
 * Get start of month in UTC (1st at 00:00:00).
 *
 * @param date - Base UTC date (or ISO string / ms from storage)
 * @returns New UTC date at start of month
 */
export function startOfMonthUTC(date: UTCalendarInput): Date {
  const result = normalizeCalendarBase(date);
  result.setUTCDate(1);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

/**
 * Get end of month in UTC (last day at 23:59:59.999).
 *
 * @param date - Base UTC date (or ISO string / ms from storage)
 * @returns New UTC date at end of month
 */
export function endOfMonthUTC(date: UTCalendarInput): Date {
  const result = normalizeCalendarBase(date);
  result.setUTCMonth(result.getUTCMonth() + 1, 0);
  result.setUTCHours(23, 59, 59, 999);
  return result;
}

/**
 * Get start of week in UTC (Sunday at 00:00:00).
 *
 * @param date - Base UTC date (or ISO string / ms from storage)
 * @returns New UTC date at start of week
 */
export function startOfWeekUTC(date: UTCalendarInput): Date {
  const result = normalizeCalendarBase(date);
  const dayOfWeek = result.getUTCDay();
  result.setUTCDate(result.getUTCDate() - dayOfWeek);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

/**
 * Get end of week in UTC (Saturday at 23:59:59.999).
 *
 * @param date - Base UTC date (or ISO string / ms from storage)
 * @returns New UTC date at end of week
 */
export function endOfWeekUTC(date: UTCalendarInput): Date {
  const result = normalizeCalendarBase(date);
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
