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
