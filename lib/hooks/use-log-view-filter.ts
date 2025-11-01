'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useUserPreferences } from './use-user-preferences';
import type { LogViewFilterValue } from '@/components/logs/log-view-filter';

interface UseLogViewFilterOptions {
  entityType: string;
  defaultFilter?: LogViewFilterValue;
}

/**
 * useLogViewFilter - Hook for managing log view filter state
 * 
 * Provides:
 * - filter: Current filter value ('all', 'active', 'deleted')
 * - setFilter: Function to update filter
 * - getVisibleEntries: Function to filter entries based on current filter
 * 
 * Persists filter preference per entity type.
 */
export function useLogViewFilter({ entityType, defaultFilter = 'active' }: UseLogViewFilterOptions) {
  const { getPreference, setPreference } = useUserPreferences();
  const [filter, setFilterState] = useState<LogViewFilterValue>(defaultFilter);

  // Load saved filter preference on mount
  useEffect(() => {
    const savedFilter = getPreference(`log-view-filter:${entityType}`, defaultFilter);
    setFilterState(savedFilter as LogViewFilterValue);
  }, [entityType, getPreference, defaultFilter]);

  // Update filter and save preference
  const setFilter = useCallback(async (newFilter: LogViewFilterValue) => {
    setFilterState(newFilter);
    await setPreference(`log-view-filter:${entityType}`, newFilter);
  }, [entityType, setPreference]);

  // Filter entries based on current filter value
  const getVisibleEntries = useCallback((entries: any[]) => {
    switch (filter) {
      case 'active':
        return entries.filter(e => !e.isDeleted);
      case 'deleted':
        return entries.filter(e => e.isDeleted);
      case 'all':
        return entries;
      default:
        return entries.filter(e => !e.isDeleted);
    }
  }, [filter]);

  return {
    filter,
    setFilter,
    getVisibleEntries
  };
}

