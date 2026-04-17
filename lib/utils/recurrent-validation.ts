// lib/utils/recurrent-validation.ts
import { Task } from '@/types/entities';
import { TaskType, RecurrentFrequency } from '@/types/enums';
import { 
  fromRecurrentUTC, 
  validateFrequencyConfig,
  getUTCCivilDayStartMs,
} from './recurrent-date-utils';
import { getTasksByParentId } from '@/data-store/datastore';

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
  const config = template.frequencyConfig;
  if (!config) return null;

  // Priority 1: Explicit recurrenceEnd (new field)
  if (template.recurrenceEnd) {
    return fromRecurrentUTC(template.recurrenceEnd);
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
  if (config.type !== RecurrentFrequency.CUSTOM && template.dueDate) {
    return fromRecurrentUTC(template.dueDate);
  }

  return null;
}

/**
 * Comprehensive validation for recurrent template spawn operations.
 */
export async function validateSpawnOperation(template: Task): Promise<ValidationResult> {
  // 1. Check template type
  if (template.type !== TaskType.RECURRENT_TEMPLATE) {
    return {
      isValid: false,
      errorCode: SpawnErrorCode.INVALID_TYPE,
      errorMessage: 'Not a RECURRENT_TEMPLATE'
    };
  }

  // 1.5. Check template name
  if (!template.name || !template.name.trim()) {
    return {
      isValid: false,
      errorCode: 'NO_NAME' as SpawnErrorCode,
      errorMessage: 'Template must have a name to spawn instances'
    };
  }

  // 2. Check frequency configuration
  if (!template.frequencyConfig) {
    return {
      isValid: false,
      errorCode: SpawnErrorCode.NO_FREQUENCY_CONFIG,
      errorMessage: 'Template has no repeat configuration'
    };
  }

  // 3. Validate frequency config structure
  const freqValidation = validateFrequencyConfig(template.frequencyConfig);
  if (!freqValidation.isValid) {
    return {
      isValid: false,
      errorCode: SpawnErrorCode.INVALID_FREQUENCY_CONFIG,
      errorMessage: freqValidation.error
    };
  }

  const config = template.frequencyConfig;

  // 4. Check stop conditions
  if (config.type === RecurrentFrequency.ONCE) {
    return {
      isValid: false,
      errorCode: SpawnErrorCode.ONCE_FREQUENCY,
      errorMessage: 'Cannot spawn from ONCE frequency'
    };
  }

  // Check stopsAfter times
  if (config.stopsAfter?.type === 'times') {
    const existingInstances = await getTasksByParentId(template.id);
    const instanceCount = existingInstances.filter(t => t.type === TaskType.RECURRENT_INSTANCE).length;
    if (instanceCount >= (config.stopsAfter.value as number)) {
      return {
        isValid: false,
        errorCode: SpawnErrorCode.STOP_TIMES_REACHED,
        errorMessage: `Maximum ${config.stopsAfter.value} instances reached`
      };
    }
  }

  // Check safety limit
  const safetyLimit = getSafetyLimitDate(template);
  if (safetyLimit) {
    const lastSpawnedDay = template.lastSpawnedDate
      ? getUTCCivilDayStartMs(template.lastSpawnedDate)
      : null;
    const safetyLimitDay = getUTCCivilDayStartMs(safetyLimit);

    if (lastSpawnedDay !== null && lastSpawnedDay > safetyLimitDay) {
      return {
        isValid: false,
        errorCode: SpawnErrorCode.SAFETY_LIMIT_EXCEEDED,
        errorMessage: 'Beyond safety limit date'
      };
    }
  }

  // For CUSTOM, check remaining dates
  if (config.type === RecurrentFrequency.CUSTOM) {
    if (!config.customDays || config.customDays.length === 0) {
      return {
        isValid: false,
        errorCode: SpawnErrorCode.NO_CUSTOM_DAYS,
        errorMessage: 'No custom dates configured'
      };
    }

    const referenceSource =
      template.lastSpawnedDate ??
      template.recurrenceStart ??
      template.dueDate ??
      new Date();
    const refDayMs = getUTCCivilDayStartMs(
      referenceSource instanceof Date ? referenceSource : new Date(referenceSource)
    );
    const hasLastSpawn = Boolean(template.lastSpawnedDate);

    const customDates = config.customDays
      .map((d: any) => (d instanceof Date ? d : new Date(d)))
      .filter((d: Date) => !isNaN(d.getTime()))
      .sort((a: Date, b: Date) => getUTCCivilDayStartMs(a) - getUTCCivilDayStartMs(b));

    const nextDate = customDates.find((d: Date) => {
      const dayMs = getUTCCivilDayStartMs(d);
      return hasLastSpawn ? dayMs > refDayMs : dayMs >= refDayMs;
    });
    if (!nextDate) {
      return {
        isValid: false,
        errorCode: SpawnErrorCode.NO_MORE_CUSTOM_DATES,
        errorMessage: 'All custom dates used'
      };
    }

    if (
      safetyLimit &&
      getUTCCivilDayStartMs(nextDate) > getUTCCivilDayStartMs(safetyLimit)
    ) {
      return {
        isValid: false,
        errorCode: SpawnErrorCode.CUSTOM_DATE_BEYOND_LIMIT,
        errorMessage: 'Next custom date exceeds safety limit'
      };
    }
  }

  return { isValid: true };
}
