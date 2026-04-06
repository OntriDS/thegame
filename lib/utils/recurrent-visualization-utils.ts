import { addDays, addWeeks, addMonths } from 'date-fns';
import { Task } from '@/types/entities';
import { RecurrentFrequency, TaskType } from '@/types/enums';
import { FrequencyConfig } from '@/components/ui/frequency-calendar';
import { fromRecurrentUTC, toRecurrentUTC, addDaysUTC, addWeeksUTC, addMonthsUTC } from './recurrent-date-utils';

export interface TaskOccurrence {
  task: Task;
  start: Date;
  end: Date;
  occurrenceKey: string;
}

function normalizeDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : fromRecurrentUTC(d);
}

function getBaseStart(task: Task): Date | null {
  const scheduledStart = task.scheduledStart ? fromRecurrentUTC(new Date(task.scheduledStart)) : null;
  return scheduledStart || (task.dueDate ? fromRecurrentUTC(new Date(task.dueDate)) : null);
}

function getDurationMs(task: Task): number {
  const scheduledStart = normalizeDate(task.scheduledStart as any);
  const scheduledEnd = normalizeDate(task.scheduledEnd as any);
  if (scheduledStart && scheduledEnd) {
    const duration = scheduledEnd.getTime() - scheduledStart.getTime();
    if (duration > 0) return duration;
  }
  return 0;
}

function getStopDate(task: Task, config?: FrequencyConfig): Date | null {
  if (config?.stopsAfter?.type === 'date' && config.stopsAfter.value) {
    return fromRecurrentUTC(new Date(config.stopsAfter.value));
  }
  const dueDate = task.dueDate ? fromRecurrentUTC(new Date(task.dueDate)) : null;
  return dueDate;
}

function applyDayOfMonth(date: Date, dayOfMonth?: number): Date {
  if (!dayOfMonth) return date;
  const next = new Date(date);
  const daysInMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(dayOfMonth, daysInMonth));
  return next;
}

function isWithinRange(date: Date, rangeStart: Date, rangeEnd: Date): boolean {
  return date.getTime() >= rangeStart.getTime() && date.getTime() <= rangeEnd.getTime();
}

function normalizeCustomDays(customDays?: Date[]): Date[] {
  if (!customDays || customDays.length === 0) return [];
  return customDays
    .map(d => d instanceof Date ? fromRecurrentUTC(d) : fromRecurrentUTC(new Date(d)))
    .filter((d): d is Date => !!d)
    .sort((a, b) => a.getTime() - b.getTime());
}

export function getOccurrencesForRange(task: Task, rangeStart: Date, rangeEnd: Date): TaskOccurrence[] {
  const baseStart = getBaseStart(task);
  if (!baseStart) return [];

  const durationMs = getDurationMs(task);
  if (!durationMs) return [];
  const isRecurrentType =
    task.type === TaskType.RECURRENT_GROUP ||
    task.type === TaskType.RECURRENT_TEMPLATE ||
    task.type === TaskType.RECURRENT_INSTANCE;
  const frequency = isRecurrentType ? (task.frequencyConfig as FrequencyConfig | undefined) : undefined;
  const stopDate = getStopDate(task, frequency);
  const maxOccurrences =
    frequency?.stopsAfter?.type === 'times' && typeof frequency.stopsAfter.value === 'number'
      ? Math.max(1, Math.floor(frequency.stopsAfter.value))
      : null;

  const occurrences: TaskOccurrence[] = [];

  const pushOccurrence = (start: Date, index: number) => {
    if (stopDate && start.getTime() > stopDate.getTime()) return;
    if (!isWithinRange(start, rangeStart, rangeEnd)) return;
    const end = new Date(start.getTime() + durationMs);
    occurrences.push({
      task,
      start,
      end,
      occurrenceKey: `${task.id}::${start.toISOString()}::${index}`,
    });
  };

  if (!frequency) {
    pushOccurrence(baseStart, 1);
    return occurrences;
  }

  const type = frequency.type;
  const interval = Math.max(1, Number(frequency.interval || 1));

  if (type === RecurrentFrequency.CUSTOM) {
    const customDays = normalizeCustomDays(frequency.customDays);
    if (customDays.length === 0) return occurrences;
    let count = 0;
    for (const day of customDays) {
      const start = new Date(day);
      if (task.scheduledStart) {
        const scheduledStartLocal = fromRecurrentUTC(new Date(task.scheduledStart));
        start.setHours(scheduledStartLocal.getHours(), scheduledStartLocal.getMinutes(), scheduledStartLocal.getSeconds(), 0);
      }
      if (start.getTime() < baseStart.getTime()) continue;
      count += 1;
      if (maxOccurrences && count > maxOccurrences) break;
      pushOccurrence(start, count);
    }
    return occurrences;
  }

  let current = new Date(baseStart);
  let count = 0;
  while (current.getTime() <= rangeEnd.getTime()) {
    count += 1;
    if (maxOccurrences && count > maxOccurrences) break;
    pushOccurrence(new Date(current), count);

    if (type === RecurrentFrequency.ONCE) break;
    if (type === RecurrentFrequency.DAILY) {
      current = fromRecurrentUTC(addDaysUTC(toRecurrentUTC(current), interval));
      continue;
    }
    if (type === RecurrentFrequency.WEEKLY) {
      current = fromRecurrentUTC(addWeeksUTC(toRecurrentUTC(current), interval));
      continue;
    }
    if (type === RecurrentFrequency.MONTHLY) {
      current = applyDayOfMonth(fromRecurrentUTC(addMonthsUTC(toRecurrentUTC(current), interval)), frequency.dayOfMonth);
      continue;
    }
    if (type === RecurrentFrequency.ALWAYS) {
      current = fromRecurrentUTC(addDaysUTC(toRecurrentUTC(current), interval));
      continue;
    }

    // Unknown type: stop
    break;
  }

  return occurrences;
}
