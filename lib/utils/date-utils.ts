// lib/utils/date-utils.ts
// Centralized date formatting utilities using app constants
import { format, parseISO, isValid, parse } from 'date-fns';
import type { Task, Sale, FinancialRecord, Item } from '@/types/entities';
import { SaleStatus } from '@/types/enums';
import {
  DATE_FORMAT_DISPLAY,
  DATE_FORMAT_INPUT,
  DATE_FORMAT_LONG,
  DATE_FORMAT_SHORT,
  DATE_FORMAT_MONTH_YEAR,
  DATE_FORMAT_MONTH_KEY
} from '@/lib/constants/app-constants';

/**
 * Robustly parse a date from various possible formats.
 * Handles: ISO, DD-MM-YYYY (Display), YYYY-MM-DD (Input), and Date objects.
 */
export function parseFlexibleDate(date: Date | string | null | undefined): Date {
  if (!date) return new Date();
  if (date instanceof Date) return isValid(date) ? date : new Date();
  
  // 1. Try ISO (YYYY-MM-DD...)
  const iso = parseISO(date);
  if (isValid(iso)) return iso;

  // 2. Try DD-MM-YYYY (App Display Format)
  const display = parse(date, DATE_FORMAT_DISPLAY, new Date());
  if (isValid(display)) return display;
  
  // 3. Try YYYY-MM-DD (HTML Input Format)
  const input = parse(date, DATE_FORMAT_INPUT, new Date());
  if (isValid(input)) return input;
  
  // 4. Try DD/MM/YY (App Short Format)
  const short = parse(date, DATE_FORMAT_SHORT, new Date());
  if (isValid(short)) return short;
  
  const native = new Date(date);
  return isValid(native) ? native : new Date();
}

/**
 * Format a date using the application's standard display format (DD-MM-YYYY)
 * @param date - Date object or date string
 * @returns Formatted date string or empty string if invalid
 */
export function formatDisplayDate(date: Date | string | null | undefined): string {
  if (!date) return '';

  try {
    const dateObj = parseFlexibleDate(date);
    if (!isValid(dateObj)) return '';

    return format(dateObj, DATE_FORMAT_DISPLAY);
  } catch {
    return '';
  }
}

/**
 * Format a date for HTML input elements (YYYY-MM-DD)
 * @param date - Date object or date string
 * @returns Formatted date string for HTML input or empty string if invalid
 */
export function formatInputDate(date: Date | string | null | undefined): string {
  if (!date) return '';

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';

    return format(dateObj, DATE_FORMAT_INPUT);
  } catch {
    return '';
  }
}

/**
 * Format a date using the long format (DD MMMM YYYY)
 * @param date - Date object or date string
 * @returns Formatted date string or empty string if invalid
 */
export function formatLongDate(date: Date | string | null | undefined): string {
  if (!date) return '';

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';

    return format(dateObj, DATE_FORMAT_LONG);
  } catch {
    return '';
  }
}

/**
 * Format a date using the short format (DD/MM/YY)
 * @param date - Date object or date string
 * @returns Formatted date string or empty string if invalid
 */
export function formatShortDate(date: Date | string | null | undefined): string {
  if (!date) return '';

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';

    return format(dateObj, DATE_FORMAT_SHORT);
  } catch {
    return '';
  }
}

/**
 * Format a date using the month-year format (MMMM YYYY)
 * @param date - Date object or date string
 * @returns Formatted date string or empty string if invalid
 */
export function formatMonthYear(date: Date | string | null | undefined): string {
  if (!date) return '';

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';

    return format(dateObj, DATE_FORMAT_MONTH_YEAR);
  } catch {
    return '';
  }
}

/**
 * Format a date into the archive month key (MM-YY)
 * @param date - Date object or date string
 * @returns Formatted month key (e.g., 06-25)
 */
export function formatMonthKey(date: Date | string | null | undefined): string {
  try {
    const dateObj = parseFlexibleDate(date);

    return isValid(dateObj)
      ? format(dateObj, DATE_FORMAT_MONTH_KEY)
      : format(new Date(), DATE_FORMAT_MONTH_KEY);
  } catch {
    return format(new Date(), DATE_FORMAT_MONTH_KEY);
  }
}

/**
 * Get the current month key (MM-YY) for archive buckets
 */
export function getCurrentMonthKey(): string {
  return format(new Date(), DATE_FORMAT_MONTH_KEY);
}

/**
 * Sort month keys (MM-YY) in descending order (newest first).
 * Handles year boundaries correctly.
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

/**
 * Parse a date string from HTML input format (YYYY-MM-DD) to Date object
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object or null if invalid
 */
export function parseInputDate(dateString: string): Date | null {
  if (!dateString) return null;

  try {
    const date = parseISO(dateString);
    return isValid(date) ? date : null;
  } catch {
    return null;
  }
}

/**
 * Get the current date formatted for display
 * @returns Current date in DD-MM-YYYY format
 */
export function getCurrentDisplayDate(): string {
  return formatDisplayDate(new Date());
}

/**
 * Get the current date formatted for HTML input
 * @returns Current date in YYYY-MM-DD format
 */
export function getCurrentInputDate(): string {
  return formatInputDate(new Date());
}

/**
 * Calculate the closing date for an entity based on its reference date.
 * Returns the LAST DAY of the reference date's month at 12:00 PM (Noon)
 * to avoid timezone rollover issues.
 *
 * Usage: "Snap-to-Month" logic for Monthly Close.
 *
 * @param referenceDate - The date the event occurred (doneAt, saleDate, etc.)
 * @returns Date object set to the end of that month
 */
export function calculateClosingDate(referenceDate: Date | string): Date {
  const validDate = parseFlexibleDate(referenceDate);

  // Get last day of the month (month + 1, day 0)
  const endOfMonth = new Date(validDate.getFullYear(), validDate.getMonth() + 1, 0);

  // Set to Noon to avoid timezone rollover issues (e.g. becoming first day of prev month in UTC-6)
  endOfMonth.setHours(12, 0, 0, 0);

  return endOfMonth;
}

/**
 * Business timestamp for sold-item rows and item SOLD logs from a sale.
 * - Collected sale: prefer collectedAt (month close / books).
 * - Otherwise (charged): doneAt, then saleDate, then now.
 */
export function saleReferenceDateForItemSoldAndLog(
  sale: Pick<Sale, 'status' | 'isCollected' | 'collectedAt' | 'doneAt' | 'saleDate'>
): Date {
  const isCollected = sale.status === SaleStatus.COLLECTED || !!sale.isCollected;

  const toValid = (v: unknown): Date | null => {
    if (v == null || v === '') return null;
    const d = v instanceof Date ? v : new Date(v as string);
    return Number.isFinite(d.getTime()) ? d : null;
  };

  if (isCollected) {
    const c = toValid(sale.collectedAt);
    if (c) return c;
  }
  const done = toValid(sale.doneAt);
  if (done) return done;
  const sd = toValid(sale.saleDate);
  if (sd) return sd;
  return new Date();
}

// ============================================================================
// Active vs Archive: Canonical month field helpers
// ============================================================================

/**
 * Get the month (1-12) for a given entity based on canonical month fields.
 * - FinancialRecord: entity.month
 * - Sale: saleDate (fallback createdAt)
 * - Task: collectedAt → doneAt → createdAt
 * - Item: createdAt (active inventory context)
 */
export function getEntityMonth(entity: Task | Sale | FinancialRecord | Item): number {
  if ((entity as FinancialRecord).year !== undefined && (entity as FinancialRecord).month !== undefined) {
    return (entity as FinancialRecord).month;
  }
  if ((entity as Sale).saleDate !== undefined) {
    const date = (entity as Sale).saleDate || (entity as any).createdAt;
    return date ? (new Date(date)).getMonth() + 1 : (new Date().getMonth() + 1);
  }
  if ((entity as any).collectedAt !== undefined || (entity as any).doneAt !== undefined || (entity as any).createdAt !== undefined) {
    const anyEntity = entity as any;
    const date: Date | string | null =
      anyEntity.collectedAt || anyEntity.doneAt || anyEntity.createdAt || null;
    return date ? (new Date(date)).getMonth() + 1 : (new Date().getMonth() + 1);
  }
  return new Date().getMonth() + 1;
}

/**
 * Get the year (YYYY) for a given entity based on canonical month fields.
 * - FinancialRecord: entity.year
 * - Sale: saleDate (fallback createdAt)
 * - Task: collectedAt → doneAt → createdAt
 * - Item: createdAt (active inventory context)
 */
export function getEntityYear(entity: Task | Sale | FinancialRecord | Item): number {
  if ((entity as FinancialRecord).year !== undefined && (entity as FinancialRecord).month !== undefined) {
    return (entity as FinancialRecord).year;
  }
  if ((entity as Sale).saleDate !== undefined) {
    const date = (entity as Sale).saleDate || (entity as any).createdAt;
    return date ? (new Date(date)).getFullYear() : (new Date().getFullYear());
  }
  if ((entity as any).collectedAt !== undefined || (entity as any).doneAt !== undefined || (entity as any).createdAt !== undefined) {
    const anyEntity = entity as any;
    const date: Date | string | null =
      anyEntity.collectedAt || anyEntity.doneAt || anyEntity.createdAt || null;
    return date ? (new Date(date)).getFullYear() : (new Date().getFullYear());
  }
  return new Date().getFullYear();
}

/**
 * Determine if an entity should be considered archived relative to a given (month, year).
 * Tasks/sales/financials: historically keyed on isCollected. Items: sold state + month drift.
 */
export function isEntityArchived(
  entity: Task | Sale | FinancialRecord | Item,
  currentMonth: number,
  currentYear: number
): boolean {
  const e = entity as any;
  if (Array.isArray(e.stock) && e.type && !e.totals) {
    const st = String(e.status ?? '').toLowerCase();
    if (!st.includes('sold') && st !== 'collected') return false;
    const m = getEntityMonth(entity);
    const y = getEntityYear(entity);
    return m !== currentMonth || y !== currentYear;
  }
  if (!e.isCollected) return false;
  const m = getEntityMonth(entity);
  const y = getEntityYear(entity);
  return m !== currentMonth || y !== currentYear;
}

/**
 * Revive date strings in API responses to Date objects
 * Recursively processes objects and arrays to convert date strings to Date objects
 * @param data - Data from API that may contain date strings
 * @returns Data with date strings converted to Date objects
 */
export function reviveDates<T>(data: T): T {
  if (data === null || data === undefined) return data;

  if (Array.isArray(data)) {
    return data.map(reviveDates) as T;
  }

  if (typeof data === 'object') {
    const revived = {} as T;
    const dateFields = [
      'createdAt', 'updatedAt', 'saleDate', 'dueDate', 
      'collectedAt', 'doneAt', 'soldAt', 'lastRestockDate'
    ];

    for (const [key, value] of Object.entries(data)) {
      if (dateFields.includes(key)) {
        (revived as any)[key] = value ? parseFlexibleDate(value as string) : value;
      } else {
        (revived as any)[key] = reviveDates(value);
      }
    }
    return revived;
  }

  return data;
}
