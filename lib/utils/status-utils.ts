// lib/utils/status-utils.ts
// Status mapping and utility functions for all entity types

import { TaskStatus, FinancialStatus, DevSprintStatus, ItemStatus, EntityType } from '@/types/enums';

/** Task status keys (aligned with stored slug / enum value). */
export const taskStatusKeyMap: Record<TaskStatus, string> = {
  [TaskStatus.CREATED]: TaskStatus.CREATED,
  [TaskStatus.ON_HOLD]: TaskStatus.ON_HOLD,
  [TaskStatus.IN_PROGRESS]: TaskStatus.IN_PROGRESS,
  [TaskStatus.FINISHING]: TaskStatus.FINISHING,
  [TaskStatus.DONE]: TaskStatus.DONE,
  [TaskStatus.COLLECTED]: TaskStatus.COLLECTED,
  [TaskStatus.FAILED]: TaskStatus.FAILED,
  [TaskStatus.NONE]: TaskStatus.NONE,
};

/** Financial status keys (aligned with stored slug / enum value). */
export const financialStatusKeyMap: Record<FinancialStatus, string> = {
  [FinancialStatus.PENDING]: FinancialStatus.PENDING,
  [FinancialStatus.DONE]: FinancialStatus.DONE,
};

/** Dev sprint status keys (aligned with stored slug / enum value). */
export const devSprintStatusKeyMap: Record<DevSprintStatus, string> = {
  [DevSprintStatus.NOT_STARTED]: DevSprintStatus.NOT_STARTED,
  [DevSprintStatus.IN_PROGRESS]: DevSprintStatus.IN_PROGRESS,
  [DevSprintStatus.DONE]: DevSprintStatus.DONE,
};

/** Item status keys (aligned with stored slug / enum value). */
export const itemStatusKeyMap: Record<ItemStatus, string> = {
  [ItemStatus.CREATED]: ItemStatus.CREATED,
  [ItemStatus.FOR_SALE]: ItemStatus.FOR_SALE,
  [ItemStatus.SOLD]: ItemStatus.SOLD,
  [ItemStatus.TO_ORDER]: ItemStatus.TO_ORDER,
  [ItemStatus.TO_DO]: ItemStatus.TO_DO,
  [ItemStatus.GIFTED]: ItemStatus.GIFTED,
  [ItemStatus.RESERVED]: ItemStatus.RESERVED,
  [ItemStatus.OBSOLETE]: ItemStatus.OBSOLETE,
  [ItemStatus.DAMAGED]: ItemStatus.DAMAGED,
  [ItemStatus.IDLE]: ItemStatus.IDLE,
  [ItemStatus.CONSIGNMENT]: ItemStatus.CONSIGNMENT,
  [ItemStatus.LEGACY]: ItemStatus.LEGACY,
};


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
/** Check if an item status represents a SOLD state */
export const isSoldStatus = (status: any): boolean => {
  if (!status) return false;
  const s = status.toString().toLowerCase();
  return s === ItemStatus.SOLD;
};

/** Check if an entity status represents a COLLECTED state */
export const isCollectedStatus = (status: any): boolean => {
  if (!status) return false;
  const s = status.toString().toLowerCase();
  return s === TaskStatus.COLLECTED;
};
