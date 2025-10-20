'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import AdminTabs from '@/components/admin-tabs';
import { AdminHeader } from '@/components/admin-header';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();

  // Keyboard shortcuts for section navigation
  useKeyboardShortcuts({
    onNavigateToControlRoom: () => router.push('/admin/control-room'),
    onNavigateToInventory: () => router.push('/admin/inventories'),
    onNavigateToFinances: () => router.push('/admin/finances'),
    onNavigateToSales: () => router.push('/admin/sales'),
    onNavigateToMap: () => router.push('/admin/map'),
    onNavigateToCharacters: () => router.push('/admin/character'),
    onNavigateToSettings: () => router.push('/admin/settings'),
  });

  return (
    <ThemeProvider>
      <div className="flex flex-col h-screen">
        <AdminHeader />
        <AdminTabs />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>
    </ThemeProvider>
  );
}