'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/lib/hooks/use-theme';

export function ModeToggle() {
  const { isDark, toggleDarkMode } = useTheme();
  const router = useRouter();

  const swap = () => {
    toggleDarkMode();
    // persist for SSR flash-prevention
    document.cookie = `theme=${!isDark ? 'dark' : 'light'}; path=/; max-age=31536000`;
    router.refresh(); // optional – only if you want pages to re-eval on server
  };

  return (
    <Button variant="outline" size="icon" onClick={swap}>
      {isDark ? (
        <span className="h-4 w-4 flex items-center justify-center font-mono">◐</span>
      ) : (
        <span className="h-4 w-4 flex items-center justify-center font-mono">◑</span>
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
} 