'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UserPreferences {
  [key: string]: any;
}

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>({});
  const [isLoading, setIsLoading] = useState(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSavesRef = useRef<Map<string, any>>(new Map());

  // Load preferences from KV
  const loadPreferences = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load from KV
      try {
        const response = await fetch('/api/user-preferences');
        if (response.ok) {
          const kvPrefs = await response.json();
          setPreferences(kvPrefs);
        } else {
          // If KV fails, start with empty preferences
          setPreferences({});
        }
      } catch (error) {
        console.warn('Failed to load preferences from KV:', error);
        // Graceful degradation - start with empty preferences
        setPreferences({});
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      setPreferences({});
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced save function - batches multiple preference changes
  const debouncedSave = useCallback(async () => {
    if (pendingSavesRef.current.size === 0) return;

    const preferencesToSave = Array.from(pendingSavesRef.current.entries());
    pendingSavesRef.current.clear();

    try {
      // Save all pending preferences in a single request
      await fetch('/api/user-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: Object.fromEntries(preferencesToSave) })
      });
    } catch (error) {
      console.warn('Failed to save preferences to KV:', error);
      // Note: We don't revert the optimistic update - user sees immediate feedback
      // The preferences will be corrected on next page load if KV is still failing
    }
  }, []);

  // Save preference to KV with optimistic updates and debouncing
  const setPreference = useCallback(async (key: string, value: any) => {
    try {
      // Update local state immediately (optimistic update)
      setPreferences(prev => ({ ...prev, [key]: value }));

      // Add to pending saves
      pendingSavesRef.current.set(key, value);

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set new timeout for debounced save (500ms delay)
      saveTimeoutRef.current = setTimeout(() => {
        debouncedSave();
      }, 500);

    } catch (error) {
      console.error('Error setting preference:', error);
    }
  }, [debouncedSave]);

  // Get a specific preference value
  const getPreference = useCallback((key: string, defaultValue?: any) => {
    return preferences[key] ?? defaultValue;
  }, [preferences]);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    preferences,
    isLoading,
    setPreference,
    getPreference,
    loadPreferences
  };
}
