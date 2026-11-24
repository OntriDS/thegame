import type { Task } from '@/types/entities';
import { TaskType } from '@/types/enums';

export type RegisteredAutomationType = 'monthly-close';

export interface AutomationDefinition {
  automationType: RegisteredAutomationType;
  validateTask: (task: Task) => boolean;
}

/** Closed server-side registry. Callers select a key; they cannot provide procedure code. */
export const AUTOMATION_REGISTRY: Record<RegisteredAutomationType, AutomationDefinition> = {
  'monthly-close': {
    automationType: 'monthly-close',
    validateTask: (task) => (
      task.type === TaskType.AUTOMATION
      && task.context?.automation?.automationType === 'monthly-close'
    ),
  },
};

export function getRegisteredAutomation(automationType: string): AutomationDefinition | null {
  return AUTOMATION_REGISTRY[automationType as RegisteredAutomationType] || null;
}
