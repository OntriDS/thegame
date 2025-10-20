// lib/hooks/use-keyboard-shortcuts.ts
// Global keyboard shortcuts for modal and section navigation

import { useEffect } from 'react';

interface KeyboardShortcutsProps {
  onOpenTaskModal?: () => void;
  onOpenItemModal?: () => void;
  onOpenFinancialModal?: () => void;
  onOpenSalesModal?: () => void;
  onOpenSiteModal?: () => void;
  onOpenCharacterModal?: () => void;
  onOpenPlayerModal?: () => void;
  onNavigateToControlRoom?: () => void;
  onNavigateToInventory?: () => void;
  onNavigateToFinances?: () => void;
  onNavigateToSales?: () => void;
  onNavigateToMap?: () => void;
  onNavigateToCharacters?: () => void;
  onNavigateToSettings?: () => void;
}

export function useKeyboardShortcuts({
  onOpenTaskModal,
  onOpenItemModal,
  onOpenFinancialModal,
  onOpenSalesModal,
  onOpenSiteModal,
  onOpenCharacterModal,
  onOpenPlayerModal,
  onNavigateToControlRoom,
  onNavigateToInventory,
  onNavigateToFinances,
  onNavigateToSales,
  onNavigateToMap,
  onNavigateToCharacters,
  onNavigateToSettings,
}: KeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when not in input fields
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        (event.target as HTMLElement)?.contentEditable === 'true'
      ) {
        return;
      }

      const { ctrlKey, altKey, shiftKey, key } = event;

      // Entity Modal Shortcuts (Ctrl + Key)
      if (ctrlKey && !altKey && !shiftKey) {
        switch (key.toLowerCase()) {
          case 't':
            event.preventDefault();
            onOpenTaskModal?.();
            break;
          case 'i':
            event.preventDefault();
            onOpenItemModal?.();
            break;
          case 'f':
            event.preventDefault();
            onOpenFinancialModal?.();
            break;
          case 'm':
            event.preventDefault();
            onOpenSiteModal?.();
            break;
          case 'r':
            event.preventDefault();
            onOpenCharacterModal?.();
            break;
          case 'p':
            event.preventDefault();
            onOpenPlayerModal?.();
            break;
        }
      }

      // Sales Modal Shortcut (Shift + Ctrl + S to avoid conflict with save)
      if (shiftKey && ctrlKey && !altKey && key.toLowerCase() === 's') {
        event.preventDefault();
        onOpenSalesModal?.();
      }

      // Section Navigation Shortcuts (Alt + Key)
      if (altKey && !ctrlKey && !shiftKey) {
        switch (key.toLowerCase()) {
          case 't':
            event.preventDefault();
            onNavigateToControlRoom?.();
            break;
          case 'i':
            event.preventDefault();
            onNavigateToInventory?.();
            break;
          case 'f':
            event.preventDefault();
            onNavigateToFinances?.();
            break;
          case 's':
            event.preventDefault();
            onNavigateToSales?.();
            break;
          case 'm':
            event.preventDefault();
            onNavigateToMap?.();
            break;
          case 'r':
            event.preventDefault();
            onNavigateToCharacters?.();
            break;
          case 'e':
            event.preventDefault();
            onNavigateToSettings?.();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    onOpenTaskModal,
    onOpenItemModal,
    onOpenFinancialModal,
    onOpenSalesModal,
    onOpenSiteModal,
    onOpenCharacterModal,
    onOpenPlayerModal,
    onNavigateToControlRoom,
    onNavigateToInventory,
    onNavigateToFinances,
    onNavigateToSales,
    onNavigateToMap,
    onNavigateToCharacters,
    onNavigateToSettings,
  ]);
}

// Helper function to show keyboard shortcuts help
export function showKeyboardShortcutsHelp() {
  const shortcuts = [
    '=== ENTITY MODALS ===',
    'Ctrl + T = Tasks Modal',
    'Ctrl + I = Items Modal', 
    'Ctrl + F = Financials Modal',
    'Shift + Ctrl + S = Sales Modal',
    'Ctrl + M = Sites Modal (Map)',
    'Ctrl + R = Characters Modal (Roles)',
    'Ctrl + P = Players Modal',
    '',
    '=== SECTION NAVIGATION ===',
    'Alt + T = Control Room Section',
    'Alt + I = Inventory Section',
    'Alt + F = Finances Section',
    'Alt + S = Sales Section',
    'Alt + M = Map Section',
    'Alt + R = Characters Section (Roles)',
    'Alt + E = Settings Section',
  ];

  alert(shortcuts.join('\n'));
}
