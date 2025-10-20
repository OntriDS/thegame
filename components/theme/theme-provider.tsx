'use client';

import { useTheme } from '@/lib/hooks/use-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize the theme system
  useTheme();

  return <>{children}</>;
}