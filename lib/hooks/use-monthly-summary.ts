'use client';

import { useCallback, useEffect, useState } from 'react';

import { ClientAPI } from '@/lib/client-api';
import { getCurrentMonthKey, sortMonthKeys } from '@/lib/utils/date-utils';
import { SummaryTotals } from '@/types/entities';

interface UseMonthlySummaryOptions {
  loadSummary?: boolean;
}

interface UseMonthlySummaryReturn {
  selectedMonthKey: string;
  availableMonths: string[];
  atomicSummary: SummaryTotals | null;
  isMonthsLoading: boolean;
  isSummaryLoading: boolean;
  setSelectedMonthKey: (monthKey: string) => void;
  refreshSummary: () => void;
}

export function useMonthlySummary({ loadSummary = true }: UseMonthlySummaryOptions = {}): UseMonthlySummaryReturn {
  const [selectedMonthKey, setSelectedMonthKeyState] = useState(getCurrentMonthKey());
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [atomicSummary, setAtomicSummary] = useState<SummaryTotals | null>(null);
  const [isMonthsLoading, setIsMonthsLoading] = useState(true);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryRefreshEpoch, setSummaryRefreshEpoch] = useState(0);

  const setSelectedMonthKey = useCallback((monthKey: string) => {
    setSelectedMonthKeyState(monthKey);
    setAvailableMonths((previousMonths) => {
      return previousMonths.includes(monthKey) ? previousMonths : sortMonthKeys([monthKey, ...previousMonths]);
    });
  }, []);

  const refreshSummary = useCallback(() => {
    setSummaryRefreshEpoch((prev) => prev + 1);
  }, []);

  const loadAvailableMonths = useCallback(async () => {
    setIsMonthsLoading(true);
    try {
      const months = await ClientAPI.getAvailableSummaryMonths();
      const normalizedMonths = sortMonthKeys(Array.from(new Set([selectedMonthKey, getCurrentMonthKey(), ...months])));
      setAvailableMonths(normalizedMonths);
    } catch (error) {
      console.error('Failed to load available summary months', error);
      setAvailableMonths(sortMonthKeys(Array.from(new Set([selectedMonthKey, getCurrentMonthKey()]))));
    } finally {
      setIsMonthsLoading(false);
    }
  }, [selectedMonthKey]);

  const loadAtomicSummary = useCallback(async () => {
    if (!loadSummary) {
      setAtomicSummary(null);
      return;
    }

    setIsSummaryLoading(true);
    try {
      const summary = await ClientAPI.getSummary(selectedMonthKey);
      setAtomicSummary(summary);
    } catch (error) {
      console.error('Failed to load monthly atomic summary', error);
      setAtomicSummary(null);
    } finally {
      setIsSummaryLoading(false);
    }
  }, [loadSummary, selectedMonthKey]);

  useEffect(() => {
    void loadAvailableMonths();
  }, [loadAvailableMonths]);

  useEffect(() => {
    if (loadSummary) {
      void loadAtomicSummary();
    }
  }, [loadAtomicSummary, loadSummary, summaryRefreshEpoch]);

  return {
    selectedMonthKey,
    availableMonths,
    atomicSummary,
    isMonthsLoading,
    isSummaryLoading,
    setSelectedMonthKey,
    refreshSummary,
  };
}

