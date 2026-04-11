// lib/utils/recurrent-date-utils.ts
/**
 * @DEPRECATED - Use utc-utils.ts, date-parsers.ts, and date-display-utils.ts instead
 * 
 * NOTE FOR RECURRENT SYSTEM:
 * Dates are absolute UTC instants (e.g. start-of-day in the user’s display TZ from the client).
 * Do not truncate with startOfDayUTC here — that shifted civil days for non-UTC-midnight instants.
 */

import { 
  addDaysUTC as coreAddDaysUTC,
  addWeeksUTC as coreAddWeeksUTC,
  addMonthsUTC as coreAddMonthsUTC,
  isSameDayUTC,
  isAfterUTC,
  toUTC,
  getDaysInMonthUTC,
  clampToValidUTC
} from './utc-utils';

/**
 * Normalizes to a Date carrying the same absolute instant (for recurrence math).
 */
export function toRecurrentUTC(date: Date | string): Date {
  return toUTC(date);
}

/**
 * Converts a UTC midnight date back to local date components.
 */
export function fromRecurrentUTC(utcDate: Date | string): Date {
  const dateObj = toUTC(utcDate);
  return new Date(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate());
}

export function isSameRecurrentDate(date1: Date, date2: Date): boolean {
  return isSameDayUTC(toUTC(date1), toUTC(date2));
}

export function isNextOccurrence(candidateDate: Date, referenceDate: Date): boolean {
  return isAfterUTC(toUTC(candidateDate), toUTC(referenceDate));
}

export function getNextWeekdayFromDate(referenceDate: Date, targetDayOfWeek: number): Date {
  const date = toUTC(referenceDate);
  const currentDay = date.getUTCDay();
  // If targetDayOfWeek is same as current day, we move to next week
  const daysUntilNext = (targetDayOfWeek + 7 - currentDay) % 7 || 7;
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + daysUntilNext);
  return result;
}

export function isWithinSafetyLimit(candidateDate: Date, safetyLimitDate: Date): boolean {
  return !isAfterUTC(toUTC(candidateDate), toUTC(safetyLimitDate));
}

export function addDaysUTC(date: Date, days: number): Date {
  return coreAddDaysUTC(toRecurrentUTC(date), days);
}

export function addWeeksUTC(date: Date, weeks: number): Date {
  return coreAddWeeksUTC(toRecurrentUTC(date), weeks);
}

/**
 * Adds months with proper day clamping.
 * e.g. Jan 31 + 1 month = Feb 28/29 (not March 2/3)
 */
export function addMonthsUTC(date: Date, months: number): Date {
  const source = toRecurrentUTC(date);
  const targetYear = source.getUTCFullYear();
  const targetMonth = source.getUTCMonth() + months;
  const targetDay = source.getUTCDate();
  
  // Create candidate
  const next = new Date(Date.UTC(targetYear, targetMonth, targetDay));
  
  // Clamp it
  return clampToValidUTC(next);
}

export function validateFrequencyConfig(frequencyConfig: any): {
  isValid: boolean;
  error?: string;
} {
  // Keeping validation logic as is for now, will be moved to recurrent-validation.ts
  if (!frequencyConfig) {
    return { isValid: true };
  }

  if (!frequencyConfig.type || !frequencyConfig.interval || !frequencyConfig.repeatMode) {
    return {
      isValid: false,
      error: 'Frequency configuration must include type, interval, and repeatMode'
    };
  }

  if (frequencyConfig.interval < 1) {
    return {
      isValid: false,
      error: 'Interval must be at least 1'
    };
  }

  const validModes = ['after_done', 'periodically'];
  if (!validModes.includes(frequencyConfig.repeatMode)) {
    return {
      isValid: false,
      error: 'Repeat mode must be either "after_done" or "periodically"'
    };
  }

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

  if (frequencyConfig.type === 'CUSTOM' && (!frequencyConfig.customDays || frequencyConfig.customDays.length === 0)) {
    return {
      isValid: false,
      error: 'Custom frequency must specify at least one date'
    };
  }

  return { isValid: true };
}