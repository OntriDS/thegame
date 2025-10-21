// lib/utils/status-utils.ts
// Status mapping and utility functions for all entity types

import { TaskStatus, FinancialStatus, DevSprintStatus, ItemStatus, EntityType } from '@/types/enums';

/** Task status key mappings */
export const taskStatusKeyMap: Record<TaskStatus, string> = {
  [TaskStatus.CREATED]: 'created',
  [TaskStatus.ON_HOLD]: 'onHold',
  [TaskStatus.IN_PROGRESS]: 'inProgress',
  [TaskStatus.FINISHING]: 'finishing',
  [TaskStatus.DONE]: 'done',
  [TaskStatus.COLLECTED]: 'collected',
  [TaskStatus.FAILED]: 'failed',
  [TaskStatus.NONE]: 'none',
};

/** Financial status key mappings */
export const financialStatusKeyMap: Record<FinancialStatus, string> = {
  [FinancialStatus.DONE]: 'done',
  [FinancialStatus.COLLECTED]: 'collected',
};

/** @deprecated Use financialStatusKeyMap instead */
export const recordStatusKeyMap = financialStatusKeyMap;

/** Dev Sprint status key mappings */
export const devSprintStatusKeyMap: Record<DevSprintStatus, string> = {
  [DevSprintStatus.NOT_STARTED]: 'notStarted',
  [DevSprintStatus.IN_PROGRESS]: 'inProgress',
  [DevSprintStatus.DONE]: 'done',
};

/** Item status key mappings */
export const itemStatusKeyMap: Record<ItemStatus, string> = {
  [ItemStatus.CREATED]: 'created',
  [ItemStatus.FOR_SALE]: 'forSale',
  [ItemStatus.SOLD]: 'sold',
  [ItemStatus.TO_ORDER]: 'toOrder',
  [ItemStatus.TO_DO]: 'toDo',
  [ItemStatus.GIFTED]: 'gifted',
  [ItemStatus.RESERVED]: 'reserved',
  [ItemStatus.OBSOLETE]: 'obsolete',
  [ItemStatus.DAMAGED]: 'damaged',
  [ItemStatus.IDLE]: 'idle',
  [ItemStatus.COLLECTED]: 'collected',
  [ItemStatus.ON_HOLD]: 'onHold',
  [ItemStatus.STORED]: 'stored',
  [ItemStatus.TO_REPAIR]: 'toRepair',
};

/** Legacy export for backward compatibility - use specific maps above */
export const statusKeyMap = taskStatusKeyMap;

/** Utility functions for status handling */

/** Get status key for any entity type */
export const getStatusKey = (status: string, entityType: EntityType | 'record' | 'devSprint'): string => {
  switch (entityType) {
    case EntityType.TASK:
      const taskStatus = Object.values(TaskStatus).find(ts => ts === status);
      return taskStatus ? taskStatusKeyMap[taskStatus] : 'unknown';
    case 'record':
    case EntityType.FINANCIAL:
      const financialStatus = Object.values(FinancialStatus).find(fs => fs === status);
      return financialStatus ? financialStatusKeyMap[financialStatus] : 'unknown';
    case 'devSprint':
      const devSprintStatus = Object.values(DevSprintStatus).find(ds => ds === status);
      return devSprintStatus ? devSprintStatusKeyMap[devSprintStatus] : 'unknown';
    case EntityType.ITEM:
      const itemStatus = Object.values(ItemStatus).find(is => is === status);
      return itemStatus ? itemStatusKeyMap[itemStatus] : 'unknown';
    default:
      return 'unknown';
  }
};

/** Check if a status is valid for an entity type */
export const isValidStatus = (status: string, entityType: EntityType | 'record' | 'devSprint'): boolean => {
  switch (entityType) {
    case EntityType.TASK:
      return Object.values(TaskStatus).includes(status as TaskStatus);
    case 'record':
    case EntityType.FINANCIAL:
      return Object.values(FinancialStatus).includes(status as FinancialStatus);
    case 'devSprint':
      return Object.values(DevSprintStatus).includes(status as DevSprintStatus);
    case EntityType.ITEM:
      return Object.values(ItemStatus).includes(status as ItemStatus);
    default:
      return false;
  }
};
