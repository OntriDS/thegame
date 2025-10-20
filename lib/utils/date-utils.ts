// lib/utils/date-utils.ts
// Centralized date formatting utilities using app constants
import { format, parseISO, isValid } from 'date-fns';
import { 
  DATE_FORMAT_DISPLAY, 
  DATE_FORMAT_INPUT, 
  DATE_FORMAT_LONG, 
  DATE_FORMAT_SHORT, 
  DATE_FORMAT_MONTH_YEAR 
} from '@/lib/constants/app-constants';

/**
 * Format a date using the application's standard display format (DD-MM-YYYY)
 * @param date - Date object or date string
 * @returns Formatted date string or empty string if invalid
 */
export function formatDisplayDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
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
    for (const [key, value] of Object.entries(data)) {
      if (key === 'createdAt' || key === 'updatedAt' || key === 'saleDate' || key === 'dueDate') {
        (revived as any)[key] = value ? new Date(value) : value;
      } else {
        (revived as any)[key] = reviveDates(value);
      }
    }
    return revived;
  }
  
  return data;
}