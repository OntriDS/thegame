'use client';

import { useState, useEffect } from 'react';
import { THEMES, ThemeName, DEFAULT_THEME } from '@/lib/constants/theme-constants';
import { useUserPreferences } from './use-user-preferences';

export function useTheme() {
  const { getPreference, setPreference, isLoading: kvLoading } = useUserPreferences();

  // ✅ MOUNT TRACKING (NEW!)
  const [isMounted, setIsMounted] = useState(false);

  // ✅ READ FROM WINDOW OBJECT FIRST (NEW!)
  // This eliminates double initialization and hydration mismatches
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(() => {
    if (typeof window !== 'undefined' && (window as any).__THEME_STATE__?.color) {
      return (window as any).__THEME_STATE__.color;
    }
    return DEFAULT_THEME;
  });

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined' && (window as any).__THEME_STATE__?.mode) {
      return (window as any).__THEME_STATE__.mode === 'dark';
    }
    return false;
  });

  // ✅ BACKUP: READ FROM LOCALSTORAGE (if window state not set)
  useEffect(() => {
    setIsMounted(true);

    // Only update if window state wasn't available
    if (!(window as any).__THEME_STATE__) {
      const savedColor = localStorage.getItem('theme-color') as ThemeName;
      const savedMode = localStorage.getItem('theme-mode') === 'dark';

      if (savedColor && THEMES[savedColor]) {
        setCurrentTheme(savedColor);
      }
      setIsDark(savedMode);
    }
  }, []);

  // ✅ SYNC WITH KV PREFERENCES (KV TAKES PRECEDENCE)
  useEffect(() => {
    if (!isMounted || kvLoading) return;

    const savedColorTheme = getPreference('theme-color') as ThemeName;
    const dbModePrefs = getPreference('theme-mode');
    const savedMode = dbModePrefs === 'dark';

    // KV sync doesn't cause re-renders if already matching
    if (savedColorTheme && THEMES[savedColorTheme] && savedColorTheme !== currentTheme) {
      setCurrentTheme(savedColorTheme);
      // Update localStorage immediately for consistency
      localStorage.setItem('theme-color', savedColorTheme);
    }
    if (dbModePrefs !== undefined && savedMode !== isDark) {
      setIsDark(savedMode);
      localStorage.setItem('theme-mode', savedMode ? 'dark' : 'light');
    }
  }, [isMounted, kvLoading, getPreference, currentTheme, isDark]);

  // ✅ APPLY THEME (only when different from initial)
  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') return;

    const theme = THEMES[currentTheme];
    const mode = isDark ? 'dark' : 'light';
    const colors = theme[mode];

    const root = document.documentElement;
    Object.entries(colors).forEach(([key, value]) => {
      const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.setProperty(cssVar, value);
    });

    root.classList.toggle('dark', isDark);

    // Sync to localStorage (maintains consistency)
    localStorage.setItem('theme-mode', isDark ? 'dark' : 'light');
    localStorage.setItem('theme-color', currentTheme);
  }, [currentTheme, isDark, isMounted]);

  const setTheme = (theme: ThemeName) => {
    setCurrentTheme(theme);
    setPreference('theme-color', theme);
  };

  const toggleDarkMode = () => {
    const newMode = !isDark;
    setIsDark(newMode);
    setPreference('theme-mode', newMode ? 'dark' : 'light');
  };

  return {
    currentTheme,
    setTheme,
    isDark,
    toggleDarkMode,
    availableThemes: Object.values(THEMES),
    isMounted
  };
}
