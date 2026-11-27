import type { Task } from '@/types/entities';
import { TaskType } from '@/types/enums';

export type AutomationType = 'close' | 'audit' | 'schedule';
export type RegisteredAutomationName = 'monthly-close';

export interface AutomationDefinition {
  automationType: AutomationType;
  automationName: RegisteredAutomationName;
  validateTask: (task: Task) => boolean;
}

/** Closed server-side registry. Callers select a key; they cannot provide procedure code. */
export const AUTOMATION_REGISTRY: Record<RegisteredAutomationName, AutomationDefinition> = {
  'monthly-close': {
    automationType: 'close',
    automationName: 'monthly-close',
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
};

export function getRegisteredAutomationForTask(task: Task): AutomationDefinition | null {
  return Object.values(AUTOMATION_REGISTRY).find((definition) => definition.validateTask(task)) || null;
}
