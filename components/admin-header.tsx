"use client"

import Link from 'next/link'
import { ModeToggle } from '@/components/ui/mode-toggle'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { showKeyboardShortcutsHelp } from '@/lib/hooks/use-keyboard-shortcuts'
import { Button } from '@/components/ui/button'
import { Keyboard } from 'lucide-react'
import { ClientAPI } from '@/lib/client-api'

export function AdminHeader() {
  const router = useRouter();

  return (
    <header className="flex items-center justify-between px-10 py-2 border-b">
      {/* left-side nav / logo */}
      <div className="flex items-center space-x-4">
      <h2 className="text-lg font-medium">TheGame</h2>
      </div>
      
      {/* Center: Month/Year Selector */}
      <div className="flex items-center">
      <p> Adventure Starts Here</p>
      </div>
      
      {/* Right side */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={showKeyboardShortcutsHelp}
          className="px-2 py-1"
          title="Keyboard Shortcuts"
        >
          <Keyboard className="h-4 w-4" />
        </Button>
        <Link 
          href="/" 
          className="px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          Home
        </Link>
        <button
          type="button"
          onClick={async () => {
            try {
              await ClientAPI.logout();
            } finally {
              router.push('/');
            }
          }}
          className="px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          Logout
        </button>
        <ModeToggle />
      </div>
    </header>
  )
} 