// lib/constants/status-colors.ts
// Status color constants for UI components

import { DevSprintStatus, FinancialStatus } from '@/types/enums';

/** Dev Sprint Status Colors - Light & Dark Mode */
export const DEV_SPRINT_STATUS_COLORS = {
  [DevSprintStatus.NOT_STARTED]: {
    light: 'bg-gray-100 text-gray-800',
    dark: 'bg-gray-800 text-gray-200'
  },
  [DevSprintStatus.IN_PROGRESS]: {
    light: 'bg-blue-100 text-blue-800',
    dark: 'bg-blue-900 text-blue-200'
  },
  [DevSprintStatus.DONE]: {
    light: 'bg-green-100 text-green-800',
    dark: 'bg-green-900 text-green-200'
  },
} as const;

/** Financial Status Colors - Light & Dark Mode */
export const FINANCIAL_STATUS_COLORS = {
  [FinancialStatus.DONE]: {
    light: 'bg-green-100 text-green-800',
    dark: 'bg-green-900 text-green-200'
  },
  [FinancialStatus.COLLECTED]: {
    light: 'bg-yellow-100 text-yellow-800',
    dark: 'bg-yellow-900 text-yellow-200'
  },
} as const;
