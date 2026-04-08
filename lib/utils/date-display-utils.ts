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
import { formatInUserTimezone } from './user-timezone';
import { getUTCNow } from './utc-utils';

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
  // Use user-timezone utility which respects localStorage preference
  const formatted = formatInUserTimezone(utcDate, 'display');
  if (formatted) return formatted;
  // Fallback to standard date-fns (uses browser local)
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
  const formatted = formatInUserTimezone(utcDate, 'input');
  if (formatted) return formatted;
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
  const formatted = formatInUserTimezone(utcDate, 'long');
  if (formatted) return formatted;
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
  const formatted = formatInUserTimezone(utcDate, 'short');
  if (formatted) return formatted;
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
  const formatted = formatInUserTimezone(utcDate, 'monthKey');
  if (formatted) return formatted;
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
  return formatMonthKey(getUTCNow());
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
  const ref = referenceDate || getUTCNow();
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
