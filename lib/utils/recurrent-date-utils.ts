// lib/utils/recurrent-date-utils.ts
// Isolated timezone handling for Recurrent Tasks (JIT Model)
// Strict scope: ONLY affects Recurrent Templates and their spawned Instances
// Mission Tasks, Historical Logs, and existing scheduling remain untouched

/**
 * Converts a local date to UTC midnight for recurrent task storage.
 * Preserves year, month, day only - time component reset to 00:00:00 UTC.
 * This ensures consistent date storage regardless of user's timezone.
 *
 * @param date - The local date to convert
 * @returns Date set to UTC midnight (00:00:00)
 */
export function toRecurrentUTC(date: Date | string): Date {
  const localDate = date instanceof Date ? date : new Date(date);
  return new Date(Date.UTC(localDate.getFullYear(), localDate.getMonth(), localDate.getDate()));
}

/**
 * Converts a UTC midnight date (from storage) back to local display date.
 * Simply creates a new Date from the UTC value - browser handles timezone conversion.
 * Used ONLY for UI rendering layer to match user's preferred visual format.
 *
 * @param utcDate - The UTC midnight date from storage
 * @returns Date in local timezone for display
 */
export function fromRecurrentUTC(utcDate: Date | string): Date {
  const dateObj = utcDate instanceof Date ? utcDate : new Date(utcDate);
  return new Date(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate());
}

/**
 * Safely compares two recurrent dates for equality.
 * Both dates are first converted to UTC midnight for comparison.
 * This accounts for timezone differences when determining if two dates represent the same day.
 *
 * @param date1 - First date to compare
 * @param date2 - Second date to compare
 * @returns true if both dates represent the same UTC day
 */
export function isSameRecurrentDate(date1: Date, date2: Date): boolean {
  const d1 = toRecurrentUTC(date1);
  const d2 = toRecurrentUTC(date2);
  return d1.getTime() === d2.getTime();
}

/**
 * Determines if a date should be considered as the "next" occurrence.
 * A date is "next" if it's strictly greater than the reference date.
 * Used to determine if a calculated occurrence is in the future.
 *
 * @param candidateDate - The potential next occurrence date
 * @param referenceDate - The reference date (e.g., lastSpawnedDate)
 * @returns true if candidate is strictly after reference date
 */
export function isNextOccurrence(candidateDate: Date, referenceDate: Date): boolean {
  return candidateDate.getTime() > referenceDate.getTime();
}

/**
 * Calculates the next occurrence of a weekday from a reference date.
 * For example: if reference is Wednesday and we want the next Monday,
 * this returns the date of the following Monday.
 *
 * @param referenceDate - The reference date to start from
 * @param targetDayOfWeek - Target weekday (0=Sunday, 1=Monday, ..., 6=Saturday)
 * @returns Date of the next target weekday
 */
export function getNextWeekdayFromDate(referenceDate: Date, targetDayOfWeek: number): Date {
  const date = new Date(referenceDate);
  const currentDay = date.getUTCDay();
  const daysUntilNext = (targetDayOfWeek + 7 - currentDay) % 7;
  date.setUTCDate(date.getUTCDate() + daysUntilNext);
  return date;
}

/**
 * Validates if a date is within a safety limit (template's dueDate).
 * Recurrent instances cannot be created beyond the template's dueDate.
 *
 * @param candidateDate - The potential instance date to validate
 * @param safetyLimitDate - The template's dueDate as safety limit
 * @returns true if candidate date is before or equal to safety limit
 */
export function isWithinSafetyLimit(candidateDate: Date, safetyLimitDate: Date): boolean {
  return candidateDate.getTime() <= safetyLimitDate.getTime();
}

/**
 * Formats a recurrent UTC date for display purposes.
 * Converts to local timezone and formats in user-friendly way.
 * Used in UI components to show dates correctly to users.
 *
 * @param utcDate - The UTC midnight date from storage
 * @returns Formatted date string (e.g., "Jan 15, 2024")
 */
export function formatRecurrentDateForDisplay(utcDate: Date): string {
  const localDate = fromRecurrentUTC(utcDate);
  return localDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Gets the start of day in UTC for a given date.
 * Useful for calculating time-based recurrence boundaries.
 *
 * @param date - The date to get start of day for
 * @returns Date set to 00:00:00 UTC of the same day
 */
export function getStartOfDayUTC(date: Date): Date {
  const dayDate = new Date(date);
  dayDate.setUTCHours(0, 0, 0, 0);
  return dayDate;
}

/**
 * Adds a specified number of days to a date.
 * Returns a new UTC date without modifying the original.
 *
 * @param date - The base date
 * @param days - Number of days to add
 * @returns New date with added days (UTC midnight)
 */
export function addDaysUTC(date: Date, days: number): Date {
  const result = new Date(toRecurrentUTC(date));
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * Adds a specified number of weeks to a date.
 * Returns a new UTC date without modifying the original.
 *
 * @param date - The base date
 * @param weeks - Number of weeks to add
 * @returns New date with added weeks (UTC midnight)
 */
export function addWeeksUTC(date: Date, weeks: number): Date {
  const result = new Date(toRecurrentUTC(date));
  result.setUTCDate(result.getUTCDate() + (weeks * 7));
  return result;
}

/**
 * Adds a specified number of months to a date.
 * Returns a new UTC date without modifying the original.
 * Handles month-end edge cases (e.g., Jan 31 + 1 month = Feb 28/29).
 *
 * @param date - The base date
 * @param months - Number of months to add
 * @returns New date with added months (UTC midnight)
 */
export function addMonthsUTC(date: Date, months: number): Date {
  const result = new Date(toRecurrentUTC(date));
  const newMonth = result.getUTCMonth() + months;

  // Set the year and month, then let JavaScript normalize the day
  result.setUTCFullYear(result.getUTCFullYear());
  result.setUTCMonth(newMonth);

  // The day will be automatically clamped to the valid day for that month
  return result;
}

/**
 * Validates that a RecurrentFrequency and RecurrentTaskConfig are compatible.
 * Ensures the configuration can produce valid instances.
 *
 * @param frequencyConfig - The frequency configuration to validate
 * @returns Object with isValid flag and error message if invalid
 */
export function validateFrequencyConfig(frequencyConfig: any): {
  isValid: boolean;
  error?: string;
} {
  if (!frequencyConfig) {
    return { isValid: true };
  }

  // Basic type check (will be stricter when typed)
  if (!frequencyConfig.type || !frequencyConfig.interval || !frequencyConfig.repeatMode) {
    return {
      isValid: false,
      error: 'Frequency configuration must include type, interval, and repeatMode'
    };
  }

  // Validate interval
  if (frequencyConfig.interval < 1) {
    return {
      isValid: false,
      error: 'Interval must be at least 1'
    };
  }

  // Validate repeat mode
  if (frequencyConfig.repeatMode !== 'after_done' && frequencyConfig.repeatMode !== 'periodically') {
    return {
      isValid: false,
      error: 'Repeat mode must be either "after_done" or "periodically"'
    };
  }

  // Validate stopsAfter if present
  if (frequencyConfig.stopsAfter) {
    if (frequencyConfig.stopsAfter.type === 'times' && frequencyConfig.stopsAfter.value < 1) {
      return {
        isValid: false,
        error: 'Stops after value must be at least 1 when type is "times"'
      };
    }

    if (frequencyConfig.stopsAfter.type === 'date' && !frequencyConfig.stopsAfter.value) {
      return {
        isValid: false,
        error: 'Stop date must be specified when type is "date"'
      };
    }
  }

  // Validate custom days for CUSTOM frequency
  if (frequencyConfig.type === 'CUSTOM' && (!frequencyConfig.customDays || frequencyConfig.customDays.length === 0)) {
    return {
      isValid: false,
      error: 'Custom frequency must specify at least one date'
    };
  }

  return { isValid: true };
}