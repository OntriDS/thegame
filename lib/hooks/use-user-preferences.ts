'use client';

import { useState, useEffect, useCallback } from 'react';

interface UserPreferences {
  [key: string]: any;
}

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>({});
  const [isLoading, setIsLoading] = useState(true);

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

  // Save preference to KV with optimistic updates
  const setPreference = useCallback(async (key: string, value: any) => {
    try {
      // Update local state immediately (optimistic update)
      setPreferences(prev => ({ ...prev, [key]: value }));

      // Save to KV in background
      try {
        await fetch('/api/user-preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value })
        });
      } catch (error) {
        console.warn('Failed to save preference to KV:', error);
        // Note: We don't revert the optimistic update - user sees immediate feedback
        // The preference will be corrected on next page load if KV is still failing
      }
    } catch (error) {
      console.error('Error saving preference:', error);
    }
  }, []);

  // Get a specific preference value
  const getPreference = useCallback((key: string, defaultValue?: any) => {
    return preferences[key] ?? defaultValue;
  }, [preferences]);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    preferences,
    isLoading,
    setPreference,
    getPreference,
    loadPreferences
  };
}
