// lib/hooks/use-theme.ts
'use client';

import { useEffect, useState } from 'react';
import { THEMES, ThemeName, DEFAULT_THEME } from '@/lib/constants/theme-constants';
import { useUserPreferences } from './use-user-preferences';

export function useTheme() {
  const { getPreference, setPreference, isLoading } = useUserPreferences();
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme-color') as ThemeName;
      if (saved && THEMES[saved]) return saved;
    }
    return DEFAULT_THEME;
  });
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme-mode') === 'dark';
    }
    return false;
  });
  const [isInitialized, setIsInitialized] = useState(() => typeof window !== 'undefined');

  // Load theme from preferences on mount (KV DB sync)
  useEffect(() => {
    if (isLoading) return;

    const savedColorTheme = getPreference('theme-color') as ThemeName;
    const dbModePrefs = getPreference('theme-mode');
    const savedMode = dbModePrefs === 'dark';

    // Only update and override if KV database differs from local storage
    if (savedColorTheme && THEMES[savedColorTheme] && savedColorTheme !== currentTheme) {
      setCurrentTheme(savedColorTheme);
    }
    if (dbModePrefs !== undefined && savedMode !== isDark) {
      setIsDark(savedMode);
    }

    if (!isInitialized) setIsInitialized(true);
  }, [isLoading, getPreference]);

  // Apply theme + dark mode to CSS variables
  useEffect(() => {
    if (!isInitialized || typeof window === 'undefined') return;

    const theme = THEMES[currentTheme];
    const mode = isDark ? 'dark' : 'light';
    const colors = theme[mode];

    // Apply CSS variables to root
    const root = document.documentElement;
    Object.entries(colors).forEach(([key, value]) => {
      const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.setProperty(cssVar, value);
    });

    // Apply dark mode class to html element
    root.classList.toggle('dark', isDark);

    // Sync to localStorage for instant hydration (prevents flash on page load)
    localStorage.setItem('theme-mode', isDark ? 'dark' : 'light');
    localStorage.setItem('theme-color', currentTheme);
  }, [currentTheme, isDark, isInitialized]);

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
    isInitialized
  };
}
