'use client';

import { useState, useEffect, useCallback } from 'react';

interface UserPreferences {
  [key: string]: any;
}

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences from both localStorage and KV
  const loadPreferences = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load from localStorage first (for immediate UI updates)
      const localPrefs: UserPreferences = {};
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('inventory-') || 
              key.startsWith('control-room-') || 
              key.startsWith('data-center-') || 
              key.startsWith('research-')) {
            try {
              localPrefs[key] = localStorage.getItem(key);
            } catch (e) {
              console.warn(`Failed to load ${key} from localStorage:`, e);
            }
          }
        });
      }

      // Load from KV (for cross-device sync)
      try {
        const response = await fetch('/api/user-preferences');
        if (response.ok) {
          const kvPrefs = await response.json();
          // Merge KV preferences with local ones (KV takes precedence for cross-device sync)
          Object.assign(localPrefs, kvPrefs);
        }
      } catch (error) {
        console.warn('Failed to load preferences from KV:', error);
      }

      setPreferences(localPrefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save preference to both localStorage and KV
  const setPreference = useCallback(async (key: string, value: any) => {
    try {
      // Update local state immediately
      setPreferences(prev => ({ ...prev, [key]: value }));

      // Save to localStorage for immediate persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, value);
      }

      // Save to KV for cross-device sync
      try {
        await fetch('/api/user-preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value })
        });
      } catch (error) {
        console.warn('Failed to save preference to KV:', error);
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
