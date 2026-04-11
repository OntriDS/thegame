/**
 * lib/utils/user-timezone.ts
 *
 * USER TIMEZONE PREFERENCE — Client-Side Only
 *
 * Manages the user's preferred display timezone.
 * This does NOT affect stored data (always UTC).
 * It only affects how dates are displayed in the UI.
 *
 * Storage: localStorage (client-side, no DB changes needed)
 *
 * Architecture:
 * - Stored UTC dates → display with user's selected timezone
 * - Default: Browser's detected timezone via Intl.DateTimeFormat
 */

const TIMEZONE_STORAGE_KEY = 'thegame:userTimezone';

/**
 * Get the list of common IANA timezones with label and UTC offset.
 * Grouped by region for a better UX.
 */
export interface TimezoneOption {
  value: string;        // IANA timezone ID (e.g., "America/New_York")
  label: string;        // Display label (e.g., "Eastern Time (US & Canada)")
  region: string;       // Region group (e.g., "Americas")
  utcOffset: string;    // UTC offset string (e.g., "+05:30") — computed at runtime
}

/** Most commonly used IANA timezones for the dropdown UI */
export const COMMON_TIMEZONES: Omit<TimezoneOption, 'utcOffset'>[] = [
  // Americas
  { value: 'America/New_York',        label: 'Eastern Time (US & Canada)',      region: 'Americas' },
  { value: 'America/Chicago',          label: 'Central Time (US & Canada)',       region: 'Americas' },
  { value: 'America/Denver',           label: 'Mountain Time (US & Canada)',      region: 'Americas' },
  { value: 'America/Los_Angeles',      label: 'Pacific Time (US & Canada)',       region: 'Americas' },
  { value: 'America/Anchorage',        label: 'Alaska Time',                      region: 'Americas' },
  { value: 'Pacific/Honolulu',         label: 'Hawaii Time',                      region: 'Americas' },
  { value: 'America/Bogota',           label: 'Bogota, Lima, Quito (COT)',         region: 'Americas' },
  { value: 'America/Caracas',          label: 'Caracas (VET)',                    region: 'Americas' },
  { value: 'America/Costa_Rica',       label: 'Costa Rica (CST)',                 region: 'Americas' },
  { value: 'America/Mexico_City',      label: 'Mexico City (CST)',                region: 'Americas' },
  { value: 'America/Sao_Paulo',        label: 'Brasilia (BRT)',                   region: 'Americas' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (ART)',         region: 'Americas' },
  { value: 'America/Santiago',         label: 'Santiago (CLT)',                   region: 'Americas' },
  { value: 'America/Guayaquil',        label: 'Guayaquil (ECT)',                  region: 'Americas' },
  { value: 'America/Havana',           label: 'Havana (CST)',                     region: 'Americas' },

  // Europe & Africa
  { value: 'Europe/London',            label: 'London, Dublin (GMT/BST)',          region: 'Europe & Africa' },
  { value: 'Europe/Paris',             label: 'Paris, Madrid, Berlin (CET)',       region: 'Europe & Africa' },
  { value: 'Europe/Moscow',            label: 'Moscow (MSK)',                      region: 'Europe & Africa' },
  { value: 'Africa/Lagos',             label: 'Lagos, Cairo (WAT/EET)',            region: 'Europe & Africa' },
  { value: 'Africa/Johannesburg',      label: 'Johannesburg (SAST)',               region: 'Europe & Africa' },

  // Asia & Oceania
  { value: 'Asia/Dubai',               label: 'Dubai (GST)',                       region: 'Asia & Oceania' },
  { value: 'Asia/Kolkata',             label: 'Mumbai, Kolkata (IST)',             region: 'Asia & Oceania' },
  { value: 'Asia/Shanghai',            label: 'Beijing, Shanghai (CST)',           region: 'Asia & Oceania' },
  { value: 'Asia/Tokyo',               label: 'Tokyo (JST)',                       region: 'Asia & Oceania' },
  { value: 'Asia/Seoul',               label: 'Seoul (KST)',                       region: 'Asia & Oceania' },
  { value: 'Asia/Singapore',           label: 'Singapore (SGT)',                   region: 'Asia & Oceania' },
  { value: 'Asia/Bangkok',             label: 'Bangkok (ICT)',                     region: 'Asia & Oceania' },
  { value: 'Australia/Sydney',         label: 'Sydney, Canberra (AEST)',           region: 'Asia & Oceania' },
  { value: 'Pacific/Auckland',         label: 'Auckland (NZST)',                   region: 'Asia & Oceania' },

  // UTC
  { value: 'UTC',                      label: 'UTC (Coordinated Universal Time)',  region: 'UTC' },
];

/**
 * Get the browser's detected IANA timezone.
 * Safe to use on both server (returns 'UTC') and client.
 */
export function getBrowserTimezone(): string {
  if (typeof window === 'undefined') return 'UTC';
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Calendar date (year, 0-based month, day) as shown in a specific IANA timezone,
 * packed for comparison (YYYYMMDD).
 */
function localDateKeyInTimezone(utcMs: number, timeZone: string): number {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = f.formatToParts(new Date(utcMs));
  const y = parseInt(parts.find(p => p.type === 'year')?.value || '0', 10);
  const m = parseInt(parts.find(p => p.type === 'month')?.value || '0', 10);
  const d = parseInt(parts.find(p => p.type === 'day')?.value || '0', 10);
  return y * 10000 + m * 100 + d;
}

/**
 * UTC instant for the first millisecond of a civil calendar day in `timeZone`
 * (local midnight at the start of that day, including DST rules).
 *
 * Use when the user picked a (year, month, day) and Display Timezone is `timeZone`.
 * Client-only (relies on Intl); on server returns UTC midnight of that calendar date.
 */
export function startOfCalendarDayInTimezone(
  year: number,
  monthIndex: number,
  day: number,
  timeZone: string
): Date {
  if (typeof window === 'undefined') {
    return new Date(Date.UTC(year, monthIndex, day, 0, 0, 0, 0));
  }

  const want = year * 10000 + (monthIndex + 1) * 100 + day;

  let lo = Date.UTC(year, monthIndex, day - 1, 0, 0, 0, 0);
  let hi = Date.UTC(year, monthIndex, day + 1, 23, 59, 59, 999);

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const key = localDateKeyInTimezone(mid, timeZone);
    if (key < want) lo = mid + 1;
    else hi = mid;
  }

  let t = lo;
  if (localDateKeyInTimezone(t, timeZone) !== want) {
    return new Date(Date.UTC(year, monthIndex, day, 0, 0, 0, 0));
  }

  for (let i = 0; i < 48 && t > 0; i++) {
    const prev = t - 1;
    if (localDateKeyInTimezone(prev, timeZone) !== want) break;
    t = prev;
  }

  return new Date(t);
}

/**
 * Get the user's preferred timezone from localStorage.
 * Falls back to browser timezone.
 */
export function getUserTimezone(): string {
  if (typeof window === 'undefined') return 'UTC';
  try {
    return localStorage.getItem(TIMEZONE_STORAGE_KEY) || getBrowserTimezone();
  } catch {
    return getBrowserTimezone();
  }
}

/**
 * Persist the user's timezone preference to localStorage.
 */
export function setUserTimezone(tz: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TIMEZONE_STORAGE_KEY, tz);
  } catch {
    // Silent fail (private browsing, storage full, etc.)
  }
}

/**
 * Clear the user's timezone preference (reverts to browser default).
 */
export function clearUserTimezone(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(TIMEZONE_STORAGE_KEY);
  } catch {
    // Silent fail
  }
}

/**
 * Compute the current UTC offset string for a given IANA timezone.
 * Returns a string like "+05:30" or "-08:00".
 *
 * Uses the Intl API (no external deps needed).
 */
export function getUTCOffsetForTimezone(tz: string, now?: Date): string {
  try {
    const date = now || new Date();
    // Get the UTC offset in minutes via Intl.DateTimeFormat
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(date);
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    if (tzPart) {
      // Returns "GMT+5:30" → extract "+5:30" → normalize to "+05:30"
      const raw = tzPart.value.replace('GMT', '').trim();
      if (!raw || raw === '+0' || raw === '0') return '+00:00';

      // Normalize to ±HH:MM
      const isNeg = raw.startsWith('-');
      const clean = raw.replace(/^[+-]/, '');
      const [hStr, mStr = '0'] = clean.split(':');
      const h = String(parseInt(hStr)).padStart(2, '0');
      const m = String(parseInt(mStr)).padStart(2, '0');
      return `${isNeg ? '-' : '+'}${h}:${m}`;
    }
    return '+00:00';
  } catch {
    return '+00:00';
  }
}

/**
 * Format a UTC date in the user's preferred timezone using Intl API.
 * This is the display-boundary function — UTC in, localized string out.
 *
 * @param utcDate - UTC date (from storage)
 * @param formatStr - One of: 'display' | 'input' | 'short' | 'long' | 'monthKey'
 * @param tz - IANA timezone (defaults to getUserTimezone())
 */
export function formatInUserTimezone(
  utcDate: Date | string | null | undefined,
  formatStr: 'display' | 'input' | 'short' | 'long' | 'monthKey' = 'display',
  tz?: string
): string {
  if (!utcDate) return '';

  try {
    const date = utcDate instanceof Date ? utcDate : new Date(utcDate as string);
    if (isNaN(date.getTime())) return '';

    const timezone = tz || getUserTimezone();

    const buildFormatter = (opts: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat('en-GB', { timeZone: timezone, ...opts });

    switch (formatStr) {
      case 'display': {
        // DD-MM-YYYY
        const f = buildFormatter({ day: '2-digit', month: '2-digit', year: 'numeric' });
        return f.format(date).replace(/\//g, '-');
      }
      case 'input': {
        // YYYY-MM-DD
        const f = buildFormatter({ day: '2-digit', month: '2-digit', year: 'numeric' });
        const parts = f.formatToParts(date);
        const d = parts.find(p => p.type === 'day')?.value || '01';
        const mo = parts.find(p => p.type === 'month')?.value || '01';
        const y = parts.find(p => p.type === 'year')?.value || '2024';
        return `${y}-${mo}-${d}`;
      }
      case 'short': {
        // DD/MM/YY
        const f = buildFormatter({ day: '2-digit', month: '2-digit', year: '2-digit' });
        return f.format(date);
      }
      case 'long': {
        // DD MMMM YYYY
        const f = buildFormatter({ day: '2-digit', month: 'long', year: 'numeric' });
        return f.format(date);
      }
      case 'monthKey': {
        // MM-YY
        const f = buildFormatter({ month: '2-digit', year: '2-digit' });
        const parts = f.formatToParts(date);
        const mo = parts.find(p => p.type === 'month')?.value || '01';
        const y = parts.find(p => p.type === 'year')?.value || '24';
        return `${mo}-${y}`;
      }
      default:
        return date.toLocaleDateString();
    }
  } catch {
    return '';
  }
}

/**
 * Get the user's timezone option with current UTC offset included.
 */
export function getUserTimezoneOption(): TimezoneOption | null {
  const tz = getUserTimezone();
  const found = COMMON_TIMEZONES.find(t => t.value === tz);
  if (found) {
    return { ...found, utcOffset: getUTCOffsetForTimezone(tz) };
  }
  // Custom timezone not in the list
  return {
    value: tz,
    label: tz,
    region: 'Custom',
    utcOffset: getUTCOffsetForTimezone(tz)
  };
}
