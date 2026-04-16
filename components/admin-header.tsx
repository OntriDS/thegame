"use client"

import Link from 'next/link'
import { ModeToggle } from '@/components/ui/mode-toggle'
import { useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { showKeyboardShortcutsHelp } from '@/lib/hooks/use-keyboard-shortcuts'
import { Button } from '@/components/ui/button'
import { Keyboard, CircleUserRound } from 'lucide-react'
import { ADMIN_SECTIONS } from '@/lib/constants/sections'
import { useAuth } from '@/lib/hooks/use-auth'

export function AdminHeader() {
  const router = useRouter();
  const path = usePathname();
  const { permissions, logout } = useAuth();

  const sectionsToDisplay = useMemo(() => {
    if (!permissions) return ADMIN_SECTIONS;
    return ADMIN_SECTIONS.filter((section) => {
      if (!section.permissionResource) {
        return true;
      }
      return permissions.can(section.permissionResource, 'enter');
    });
  }, [permissions]);

  return (
    <header className="flex items-center justify-between px-6 border-b h-14">
      {/* left-side nav / logo */}
      <div className="flex items-center min-w-fit pr-6">
        <h2 className="text-lg font-medium">TheGame</h2>
      </div>

      {/* Center: Navigation */}
      <nav className="flex-1 flex h-full items-center justify-center overflow-x-auto no-scrollbar">
        {sectionsToDisplay.map(({ slug, label }) => {
          const isActive = path.startsWith(`/admin/${slug}`);

          return (
            <Link
              key={slug}
              href={`/admin/${slug}`}
              className={`px-4 h-full flex items-center text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                ${isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-2 min-w-fit pl-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={showKeyboardShortcutsHelp}
          className="px-2 py-1"
          title="Keyboard Shortcuts"
        >
          <Keyboard className="h-4 w-4" />
        </Button>
        <button
          type="button"
          title="Logout"
          onClick={async () => {
            try {
              await logout();
            } finally {
              router.push('/');
            }
          }}
          className="p-2 flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <CircleUserRound className="h-5 w-5" />
        </button>
        <ModeToggle />
      </div>
    </header>
  )
} 