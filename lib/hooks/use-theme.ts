// lib/hooks/use-theme.ts
'use client';

import { useEffect, useState } from 'react';
import { THEMES, ThemeName, DEFAULT_THEME } from '@/lib/constants/theme-constants';

export function useTheme() {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(DEFAULT_THEME);
  const [isDark, setIsDark] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const savedColorTheme = localStorage.getItem('color-theme') as ThemeName;
    const savedMode = localStorage.getItem('theme') === 'dark';
    
    if (savedColorTheme && THEMES[savedColorTheme]) {
      setCurrentTheme(savedColorTheme);
    }
    setIsDark(savedMode);
    setIsInitialized(true);
  }, []);

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
  }, [currentTheme, isDark, isInitialized]);

  const setTheme = (theme: ThemeName) => {
    setCurrentTheme(theme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('color-theme', theme);
    }
  };

  const toggleDarkMode = () => {
    const newMode = !isDark;
    setIsDark(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newMode ? 'dark' : 'light');
    }
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
