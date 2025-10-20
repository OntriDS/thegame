'use client';

import { useState, useEffect } from 'react';
import { getMonthName } from '@/lib/constants/date-constants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Month constants
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const getYearRange = (currentYear: number): number[] => {
  const years = [];
  for (let year = currentYear - 2; year <= currentYear + 2; year++) {
    years.push(year);
  }
  return years;
};

interface MonthYearSelectorProps {
  currentMonth: number;
  currentYear: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  className?: string;
}

export function MonthYearSelector({ 
  currentMonth, 
  currentYear, 
  onMonthChange, 
  onYearChange,
  className = ""
}: MonthYearSelectorProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Select value={currentMonth.toString()} onValueChange={(v) => onMonthChange(parseInt(v))}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map(month => (
            <SelectItem key={month} value={month.toString()}>
              {getMonthName(month)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select value={currentYear.toString()} onValueChange={(v) => onYearChange(parseInt(v))}>
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {getYearRange(new Date().getFullYear()).map(year => (
            <SelectItem key={year} value={year.toString()}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
