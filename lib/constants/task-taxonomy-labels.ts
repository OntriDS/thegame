import {
  TaskType,
  RecurrentFrequency,
  TaskPriority,
} from '@/types/enums';

export const TASK_TYPE_LABEL: Record<TaskType, string> = {
  [TaskType.MISSION_GROUP]: 'Mission Group',
  [TaskType.MISSION]: 'Mission',
  [TaskType.MILESTONE]: 'Milestone',
  [TaskType.GOAL]: 'Goal',
  [TaskType.ASSIGNMENT]: 'Assignment',
  [TaskType.RECURRENT_GROUP]: 'Recurrent Group',
  [TaskType.RECURRENT_TEMPLATE]: 'Recurrent Template',
  [TaskType.RECURRENT_INSTANCE]: 'Recurrent Instance',
  [TaskType.AUTOMATION]: 'Automation',
};

export const RECURRENT_FREQUENCY_LABEL: Record<RecurrentFrequency, string> = {
  [RecurrentFrequency.ONCE]: 'Once',
  [RecurrentFrequency.DAILY]: 'Daily',
  [RecurrentFrequency.WEEKLY]: 'Weekly',
  [RecurrentFrequency.MONTHLY]: 'Monthly',
  [RecurrentFrequency.CUSTOM]: 'Custom',
  [RecurrentFrequency.ALWAYS]: 'Always',
};

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  [TaskPriority.NOT_NOW]: 'Not Now',
  [TaskPriority.SLOW]: 'Slow',
  [TaskPriority.NORMAL]: 'Normal',
  [TaskPriority.IMPORTANT]: 'Important',
  [TaskPriority.URGENT]: 'Urgent',
};

export function getTaskTypeLabel(value: TaskType | string | undefined | null): string {
  if (!value) return '';
  if (value in TASK_TYPE_LABEL) return TASK_TYPE_LABEL[value as TaskType];
  return String(value);
}

export function getRecurrentFrequencyLabel(
  value: RecurrentFrequency | string | undefined | null
): string {
  if (!value) return '';
  if (value in RECURRENT_FREQUENCY_LABEL) return RECURRENT_FREQUENCY_LABEL[value as RecurrentFrequency];
  return String(value);
}

export function getTaskPriorityLabel(
  value: TaskPriority | string | undefined | null
): string {
  if (!value) return '';
  if (value in TASK_PRIORITY_LABEL) return TASK_PRIORITY_LABEL[value as TaskPriority];
  return String(value);
}
