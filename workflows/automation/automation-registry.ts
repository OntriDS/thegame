import type { Task } from '@/types/entities';
import { TaskType } from '@/types/enums';

export type AutomationType = 'close' | 'audit' | 'schedule';
export type RegisteredAutomationName = 'monthly-close' | 'thegame-entities-period-audit';

/** A small code-owned Run form, never a schema persisted on a Task. */
export type AutomationInputDescriptor =
  | { kind: 'utc-period'; label: string; supportsMode: true }
  | { kind: 'year-months'; label: string; supportsMode: false };

export interface AutomationDefinition {
  automationType: AutomationType;
  automationName: RegisteredAutomationName;
  defaultTaskName: string;
  input: AutomationInputDescriptor;
  validateTask: (task: Task) => boolean;
}

/** Closed server-side registry. Callers select a key; they cannot provide procedure code. */
export const AUTOMATION_REGISTRY: Record<RegisteredAutomationName, AutomationDefinition> = {
  'monthly-close': {
    automationType: 'close',
    automationName: 'monthly-close',
    defaultTaskName: 'monthly-close',
    input: {
      kind: 'utc-period',
      label: 'UTC period',
      supportsMode: true,
    },
    validateTask: (task) => (
      task.type === TaskType.AUTOMATION
      && (
        // Read compatibility for the one stored pilot definition. It is
        // removed only after the record migration is verified in production.
        (task.context?.automation as any)?.automationType === 'monthly-close'
        || (
          task.context?.automation?.automationType === 'close'
          && task.context?.automation?.automationName === 'monthly-close'
        )
      )
    ),
  },
  'thegame-entities-period-audit': {
    automationType: 'audit',
    automationName: 'thegame-entities-period-audit',
    defaultTaskName: 'thegame-entities-period-audit',
    input: {
      kind: 'year-months',
      label: 'Audit year and months',
      supportsMode: false,
    },
    validateTask: (task) => (
      task.type === TaskType.AUTOMATION
      && task.context?.automation?.automationType === 'audit'
      && task.context?.automation?.automationName === 'thegame-entities-period-audit'
    ),
  },
};

export function getRegisteredAutomationForTask(task: Task): AutomationDefinition | null {
  return Object.values(AUTOMATION_REGISTRY).find((definition) => definition.validateTask(task)) || null;
}

export function getRegisteredAutomation(
  automationType: unknown,
  automationName: unknown,
): AutomationDefinition | null {
  if (typeof automationType !== 'string' || typeof automationName !== 'string') return null;
  const definition = AUTOMATION_REGISTRY[automationName as RegisteredAutomationName];
  return definition?.automationType === automationType ? definition : null;
}

/** Safe for the Control Room: contains labels and closed input kinds only. */
export const AUTOMATION_DEFINITION_OPTIONS = Object.values(AUTOMATION_REGISTRY).map((definition) => ({
  automationType: definition.automationType,
  automationName: definition.automationName,
  defaultTaskName: definition.defaultTaskName,
}));
