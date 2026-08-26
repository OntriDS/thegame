// @ts-nocheck
// lib/utils/recurrent-validation.ts
import { Task } from '@/types/entities';
import { TaskType, RecurrentFrequency } from '@/types/enums';
import { fromRecurrentUTC, getUTCCivilDayStartMs } from '@/lib/utils/utc-utils';


import { utcCalendarDayKey } from '@/lib/utils/utc-utils';

export enum SpawnErrorCode {
  INVALID_TYPE = 'INVALID_TYPE',
  NO_FREQUENCY_CONFIG = 'NO_FREQUENCY_CONFIG',
  INVALID_FREQUENCY_CONFIG = 'INVALID_FREQUENCY_CONFIG',
  ONCE_FREQUENCY = 'ONCE_FREQUENCY',
  STOP_TIMES_REACHED = 'STOP_TIMES_REACHED',
  SAFETY_LIMIT_EXCEEDED = 'SAFETY_LIMIT_EXCEEDED',
  NO_CUSTOM_DAYS = 'NO_CUSTOM_DAYS',
  NO_MORE_CUSTOM_DATES = 'NO_MORE_CUSTOM_DATES',
  CUSTOM_DATE_BEYOND_LIMIT = 'CUSTOM_DATE_BEYOND_LIMIT',
  INSTANCE_ALREADY_EXISTS = 'INSTANCE_ALREADY_EXISTS',
}

export interface ValidationResult {
  isValid: boolean;
  errorCode?: SpawnErrorCode;
  errorMessage?: string;
}

/**
 * Gets the safety limit date for a template.
 */
export function getSafetyLimitDate(template: Task): Date | null {
  const config = template.context?.recurrence?.frequencyConfig;
  if (!config) return null;

  // Priority 1: Explicit recurrenceEnd (new field)
  const recurrenceEnd = template.context?.recurrence?.recurrenceEnd;
  if (recurrenceEnd) {
    return fromRecurrentUTC(recurrenceEnd);
  }

  // Priority 2: stopsAfter.date in frequency config
  if (config.stopsAfter?.type === 'date' && config.stopsAfter.value) {
    return fromRecurrentUTC(
      config.stopsAfter.value instanceof Date
        ? config.stopsAfter.value
        : new Date(config.stopsAfter.value)
    );
  }

  // Priority 3: Template dueDate as end boundary (non-custom patterns only; custom uses recurrenceEnd)
  const dueDate = (template.type !== TaskType.RECURRENT_GROUP && (template as any).schedule?.dueDate) || (template as any).dueDate;
  if (config.type !== RecurrentFrequency.CUSTOM && dueDate) {
    return fromRecurrentUTC(dueDate);
  }

  return null;
}



export function validateFrequencyConfig(frequencyConfig: any): {
  isValid: boolean;
  error?: string;
} {
  if (!frequencyConfig) {
    return { isValid: true };
  }

  if (
    !frequencyConfig.type ||
    !Object.values(RecurrentFrequency).includes(frequencyConfig.type as RecurrentFrequency)
  ) {
    return {
      isValid: false,
      error: 'Frequency configuration must include a valid type',
    };
  }
  const type = frequencyConfig.type as RecurrentFrequency;

  if (!frequencyConfig.interval || !frequencyConfig.repeatMode) {
    return {
      isValid: false,
      error: 'Frequency configuration must include interval and repeatMode'
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

  if (type === RecurrentFrequency.CUSTOM && (!frequencyConfig.customDays || frequencyConfig.customDays.length === 0)) {
    return {
      isValid: false,
      error: 'Custom frequency must specify at least one date'
    };
  }

  if (type === RecurrentFrequency.CUSTOM && frequencyConfig.customDays?.length) {
    const dayKeys: string[] = [];
    for (const d of frequencyConfig.customDays) {
      const raw = d instanceof Date ? d : new Date(d);
      if (Number.isNaN(raw.getTime())) {
        return {
          isValid: false,
          error: 'Custom frequency contains an invalid date',
        };
      }
      try {
        dayKeys.push(utcCalendarDayKey(raw));
      } catch {
        return {
          isValid: false,
          error: 'Custom frequency contains an invalid date',
        };
      }
    }
    if (dayKeys.length !== new Set(dayKeys).size) {
      return {
        isValid: false,
        error: 'Custom dates cannot include the same calendar day more than once',
      };
    }
  }

  return { isValid: true };
}

