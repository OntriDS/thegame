// Human-readable labels for canonical status slugs (storage uses kebab-case enums).

import {
  SiteStatus,
  TaskStatus,
  ItemStatus,
  FinancialStatus,
  SaleStatus,
  ContractStatus,
  DevSprintStatus,
} from '@/types/enums';

export const SITE_STATUS_LABEL: Record<SiteStatus, string> = {
  [SiteStatus.ACTIVE]: 'Active',
  [SiteStatus.INACTIVE]: 'Inactive',
};

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  [TaskStatus.CREATED]: 'Created',
  [TaskStatus.ON_HOLD]: 'On Hold',
  [TaskStatus.IN_PROGRESS]: 'In Progress',
  [TaskStatus.FINISHING]: 'Finishing',
  [TaskStatus.DONE]: 'Done',
  [TaskStatus.COLLECTED]: 'Collected',
  [TaskStatus.FAILED]: 'Failed',
  [TaskStatus.NONE]: 'None',
};

export const ITEM_STATUS_LABEL: Record<ItemStatus, string> = {
  [ItemStatus.CREATED]: 'Created',
  [ItemStatus.FOR_SALE]: 'For Sale',
  [ItemStatus.SOLD]: 'Sold',
  [ItemStatus.TO_ORDER]: 'To Order',
  [ItemStatus.TO_DO]: 'To Do',
  [ItemStatus.GIFTED]: 'Gifted',
  [ItemStatus.RESERVED]: 'Reserved',
  [ItemStatus.CONSIGNMENT]: 'Consignment',
  [ItemStatus.OBSOLETE]: 'Obsolete',
  [ItemStatus.DAMAGED]: 'Damaged',
  [ItemStatus.IDLE]: 'Idle',
};

export const FINANCIAL_STATUS_LABEL: Record<FinancialStatus, string> = {
  [FinancialStatus.PENDING]: 'Pending',
  [FinancialStatus.DONE]: 'Done',
};

export const SALE_STATUS_LABEL: Record<SaleStatus, string> = {
  [SaleStatus.PENDING]: 'Pending',
  [SaleStatus.ON_HOLD]: 'On Hold',
  [SaleStatus.CHARGED]: 'Charged',
  [SaleStatus.COLLECTED]: 'Collected',
  [SaleStatus.CANCELLED]: 'Cancelled',
};

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  [ContractStatus.DRAFT]: 'Draft',
  [ContractStatus.ACTIVE]: 'Active',
  [ContractStatus.PAUSED]: 'Paused',
  [ContractStatus.TERMINATED]: 'Terminated',
};

export const DEV_SPRINT_STATUS_LABEL: Record<DevSprintStatus, string> = {
  [DevSprintStatus.NOT_STARTED]: 'Not Started',
  [DevSprintStatus.IN_PROGRESS]: 'In Progress',
  [DevSprintStatus.DONE]: 'Done',
};

export function getSiteStatusLabel(status: SiteStatus | string | undefined | null): string {
  if (!status) return '';
  if (status in SITE_STATUS_LABEL) return SITE_STATUS_LABEL[status as SiteStatus];
  return String(status);
}

export function getTaskStatusLabel(status: TaskStatus | string | undefined | null): string {
  if (!status) return '';
  if (status in TASK_STATUS_LABEL) return TASK_STATUS_LABEL[status as TaskStatus];
  return String(status);
}

export function getItemStatusLabel(status: ItemStatus | string | undefined | null): string {
  if (!status) return '';
  if (status in ITEM_STATUS_LABEL) return ITEM_STATUS_LABEL[status as ItemStatus];
  return String(status);
}

export function getFinancialStatusLabel(status: FinancialStatus | string | undefined | null): string {
  if (!status) return '';
  if (status in FINANCIAL_STATUS_LABEL) return FINANCIAL_STATUS_LABEL[status as FinancialStatus];
  return String(status);
}

export function getSaleStatusLabel(status: SaleStatus | string | undefined | null): string {
  if (!status) return '';
  if (status in SALE_STATUS_LABEL) return SALE_STATUS_LABEL[status as SaleStatus];
  return String(status);
}

export function getContractStatusLabel(status: ContractStatus | string | undefined | null): string {
  if (!status) return '';
  if (status in CONTRACT_STATUS_LABEL) return CONTRACT_STATUS_LABEL[status as ContractStatus];
  return String(status);
}

export function getDevSprintStatusLabel(status: DevSprintStatus | string | undefined | null): string {
  if (!status) return '';
  if (status in DEV_SPRINT_STATUS_LABEL) return DEV_SPRINT_STATUS_LABEL[status as DevSprintStatus];
  return String(status);
}
