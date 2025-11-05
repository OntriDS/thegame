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
  onMoveSelectionUp?: (options: { alt: boolean }) => void;
  onMoveSelectionDown?: (options: { alt: boolean }) => void;
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
  onMoveSelectionUp,
  onMoveSelectionDown,
}: KeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { ctrlKey, altKey, shiftKey, key } = event;

      // Alt+D: Insert bullet character (•) in input fields
      if (altKey && !ctrlKey && !shiftKey && key.toLowerCase() === 'd') {
        const target = event.target as HTMLElement;
        
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
          event.preventDefault();
          const start = target.selectionStart || 0;
          const end = target.selectionEnd || 0;
          const value = target.value;
          const newValue = value.substring(0, start) + '•' + value.substring(end);
          target.value = newValue;
          target.setSelectionRange(start + 1, start + 1);
          target.dispatchEvent(new Event('input', { bubbles: true }));
          return;
        }
        
        if (target.contentEditable === 'true') {
          event.preventDefault();
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            const textNode = document.createTextNode('•');
            range.insertNode(textNode);
            range.setStartAfter(textNode);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
          }
          return;
        }
      }

      // Only handle other shortcuts when not in input fields
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        (event.target as HTMLElement)?.contentEditable === 'true'
      ) {
        return;
      }

      // Arrow Key Navigation (ArrowUp/ArrowDown for task reordering)
      if (key === 'ArrowUp' || key === 'ArrowDown') {
        if (onMoveSelectionUp || onMoveSelectionDown) {
          event.preventDefault();
          if (key === 'ArrowUp') {
            onMoveSelectionUp?.({ alt: altKey });
          } else {
            onMoveSelectionDown?.({ alt: altKey });
          }
          return;
        }
      }

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
    onMoveSelectionUp,
    onMoveSelectionDown,
  ]);
}

// Helper function to show keyboard shortcuts help
export function showKeyboardShortcutsHelp() {
  const shortcuts = [
    '=== ENTITY MODALS ===',
    'Ctrl + T = Tasks Modal',
    'Ctrl + I = Items Modal', 
    'Ctrl + F = Financials Modal',
    'Ctrl + S = Sales Modal',
    'Ctrl + M = Sites Modal',
    'Ctrl + R = Characters Modal',
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
    '',
    '=== TEXT INPUT ===',
    'Alt + D = Insert bullet character (•)',
    '',
    '=== TASK REORDERING ===',
    '↑ / ↓ = Move selected task up/down (within siblings)',
    'Alt + ↑ / Alt + ↓ = Reparent task to previous/next parent',
  ];

  alert(shortcuts.join('\n'));
}
