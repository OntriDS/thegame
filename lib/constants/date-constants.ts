// lib/constants/date-constants.ts
// Date-related constants for the application

export const BASE_YEAR = 2024; // Base year for date calculations
export const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export const getYearRange = (currentYear: number, range: number = 3) => {
  return Array.from({ length: range }, (_, i) => currentYear + i);
};

export const getMonthName = (month: number) => {
  return new Date(BASE_YEAR, month - 1).toLocaleDateString('en-US', { month: 'long' });
};

// UTILITY: Date formatting functions to avoid duplication
export const formatDateDDMMYYYY = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

export const getCurrentMonth = (): number => {
  return new Date().getMonth() + 1;
};

export const getCurrentYear = (): number => {
  return new Date().getFullYear();
};
