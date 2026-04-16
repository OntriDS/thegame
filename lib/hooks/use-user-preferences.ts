'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UserPreferences {
  [key: string]: any;
}

const PREFERENCE_CACHE_KEY = 'thegame:user-preferences:cache';
const PREFERENCE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let sharedPreferenceCache: Record<string, any> | null = null;
let sharedPreferenceTimestamp = 0;
let sharedPreferenceFetchPromise: Promise<Record<string, any>> | null = null;
const preferenceCacheSubscribers = new Set<() => void>();

function notifyPreferenceCacheSubscribers() {
  preferenceCacheSubscribers.forEach(listener => {
    try {
      listener();
    } catch (error) {
      console.error('[UserPreferences] Cache listener failed:', error);
    }
  });
}

function updatePreferenceCache(value: Record<string, any>) {
  sharedPreferenceCache = { ...value };
  sharedPreferenceTimestamp = Date.now();

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(PREFERENCE_CACHE_KEY, JSON.stringify(sharedPreferenceCache));
    } catch (error) {
      console.error('[UserPreferences] Failed to persist cache to localStorage:', error);
    }
  }

  notifyPreferenceCacheSubscribers();
}

function subscribeToPreferenceCache(listener: () => void) {
  preferenceCacheSubscribers.add(listener);
  return () => {
    preferenceCacheSubscribers.delete(listener);
  };
}

function readPreferencesFromStorage(): Record<string, any> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PREFERENCE_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.error('[UserPreferences] Failed to parse cached preferences:', error);
    return null;
  }
}

function isPreferenceCacheFresh(): boolean {
  if (!sharedPreferenceCache) return false;
  return Date.now() - sharedPreferenceTimestamp < PREFERENCE_CACHE_TTL_MS;
}

async function fetchPreferencesFromServer(): Promise<Record<string, any>> {
  const response = await fetch('/api/user-preferences');
  if (!response.ok) {
    throw new Error('Failed to load user preferences');
  }
  const data = await response.json();
  const normalized = data ?? {};
  updatePreferenceCache(normalized);
  return normalized;
}

async function ensurePreferenceCache(): Promise<Record<string, any>> {
  if (isPreferenceCacheFresh() && sharedPreferenceCache) {
    return sharedPreferenceCache;
  }

  if (sharedPreferenceFetchPromise) {
    return sharedPreferenceFetchPromise;
  }

  const promise = (async () => {
    try {
      return await fetchPreferencesFromServer();
    } catch (error) {
      console.warn('[UserPreferences] Failed to refresh cache:', error);
      return sharedPreferenceCache ?? {};
    } finally {
      sharedPreferenceFetchPromise = null;
    }
  })();

  sharedPreferenceFetchPromise = promise;
  return promise;
}

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(() => sharedPreferenceCache ?? {});
  const [isLoading, setIsLoading] = useState(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSavesRef = useRef<Map<string, any>>(new Map());
  const preferencesRef = useRef<UserPreferences>(sharedPreferenceCache ?? {});

  const loadPreferences = useCallback(async () => {
    try {
      setIsLoading(true);

      const storedPreferences =
        sharedPreferenceCache ?? readPreferencesFromStorage();

      if (storedPreferences) {
        setPreferences(storedPreferences);
        preferencesRef.current = storedPreferences;
        sharedPreferenceCache = storedPreferences;
        sharedPreferenceTimestamp = 0;
      }

      const freshPreferences = await ensurePreferenceCache();
      setPreferences(freshPreferences);
      preferencesRef.current = freshPreferences;
    } catch (error) {
      console.error('Error loading preferences:', error);
      const fallback = sharedPreferenceCache ?? {};
      setPreferences(fallback);
      preferencesRef.current = fallback;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const debouncedSave = useCallback(async () => {
    if (pendingSavesRef.current.size === 0) return;

    const preferencesToSave = Array.from(pendingSavesRef.current.entries());
    pendingSavesRef.current.clear();

    try {
      await fetch('/api/user-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: Object.fromEntries(preferencesToSave) })
      });
    } catch (error) {
      console.warn('Failed to save preferences to KV:', error);
    }
  }, []);

  const setPreference = useCallback(async (key: string, value: any) => {
    try {
      setPreferences(prev => {
        const updated = { ...prev, [key]: value };
        preferencesRef.current = updated;
        updatePreferenceCache(updated);
        return updated;
      });

      pendingSavesRef.current.set(key, value);

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        debouncedSave();
      }, 500);
    } catch (error) {
      console.error('Error setting preference:', error);
    }
  }, [debouncedSave]);

  const getPreference = useCallback((key: string, defaultValue?: any) => {
    return preferencesRef.current[key] ?? defaultValue;
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  useEffect(() => {
    const handleCacheUpdate = () => {
      if (!sharedPreferenceCache) return;
      setPreferences(sharedPreferenceCache);
      preferencesRef.current = sharedPreferenceCache;
    };

    const unsubscribe = subscribeToPreferenceCache(handleCacheUpdate);
    return unsubscribe;
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      void debouncedSave();
    };
  }, [debouncedSave]);

  return {
    preferences,
    isLoading,
    setPreference,
    getPreference,
    loadPreferences
  };
}
