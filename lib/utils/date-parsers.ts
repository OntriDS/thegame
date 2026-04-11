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

/** ISO string already anchored to UTC or a fixed offset (do not recompose via local getters). */
function hasExplicitUtcOrOffset(str: string): boolean {
  const t = str.trim();
  return (
    /Z$/i.test(t) ||
    /[+-]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/i.test(t) ||
    /[+-]\d{4}$/.test(t)
  );
}

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

  // Date object: internal value is already an absolute UTC instant
  if (input instanceof Date) {
    return new Date(input.getTime());
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
  const trimmed = str.trim();

  const plainYmd = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (plainYmd) {
    const y = parseInt(plainYmd[1], 10);
    const mo = parseInt(plainYmd[2], 10);
    const d = parseInt(plainYmd[3], 10);
    const utc = new Date(Date.UTC(y, mo - 1, d, 0, 0, 0, 0));
    if (isValid(utc)) return utc;
  }

  const isoDate = parseISO(trimmed);
  if (isValid(isoDate) && hasExplicitUtcOrOffset(trimmed)) {
    return new Date(isoDate.getTime());
  }

  if (isValid(isoDate)) {
    return fromLocalToUTC(isoDate);
  }

  const htmlDate = parse(trimmed, 'yyyy-MM-dd', new Date());
  if (isValid(htmlDate)) {
    return fromLocalToUTC(htmlDate);
  }

  const displayDate = parse(trimmed, 'dd-MM-yyyy', new Date());
  if (isValid(displayDate)) {
    return fromLocalToUTC(displayDate);
  }

  const shortDate = parse(trimmed, 'dd/MM/yy', new Date());
  if (isValid(shortDate)) {
    return fromLocalToUTC(shortDate);
  }

  const native = new Date(trimmed);
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
