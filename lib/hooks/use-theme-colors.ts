'use client';

import { useTheme } from '@/lib/hooks/use-theme';
import { getReadableTextColor } from '@/lib/utils/theme-utils';

export function useThemeColors() {
  const { isDark, currentTheme } = useTheme();
  
  return {
    textColor: isDark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))',
    isDarkMode: isDark,
    theme: currentTheme,
    activeBg: 'hsl(var(--primary))',
    readableTextColor: getReadableTextColor('hsl(var(--primary))')
  };
} 