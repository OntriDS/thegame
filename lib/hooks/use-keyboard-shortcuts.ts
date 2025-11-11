// lib/hooks/use-keyboard-shortcuts.ts
// Compatibility layer for keyboard shortcuts - registers with unified provider

import { useRegisterShortcut, GLOBAL_SCOPE } from '@/lib/shortcuts/keyboard-shortcuts-provider';

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
  scope?: string; // Optional scope override (defaults to GLOBAL_SCOPE)
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
  scope = GLOBAL_SCOPE,
}: KeyboardShortcutsProps) {
  // Alt+D: Insert bullet character (•) in input fields
  useRegisterShortcut({
    scope,
    combo: 'alt+d',
    allowInInputs: true,
    priority: 100,
    handler: (event) => {
      const target = event.target as HTMLElement;

      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        const start = target.selectionStart || 0;
        const end = target.selectionEnd || 0;
        const value = target.value;
        const insertion = '• ';
        const newValue = value.substring(0, start) + insertion + value.substring(end);
        target.value = newValue;
        target.setSelectionRange(start + insertion.length, start + insertion.length);
        return;
      }

      if (target.contentEditable === 'true') {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          const textNode = document.createTextNode('• ');
          range.insertNode(textNode);
          range.setStartAfter(textNode);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    },
  });

  // Alt+Y: Insert check mark (✅) in input fields
  useRegisterShortcut({
    scope,
    combo: 'alt+y',
    allowInInputs: true,
    priority: 100,
    handler: (event) => {
      const target = event.target as HTMLElement;

      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        const start = target.selectionStart || 0;
        const end = target.selectionEnd || 0;
        const value = target.value;
        const insertion = '✅ ';
        const newValue = value.substring(0, start) + insertion + value.substring(end);
        target.value = newValue;
        target.setSelectionRange(start + insertion.length, start + insertion.length);
        return;
      }

      if (target.contentEditable === 'true') {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          const textNode = document.createTextNode('✅ ');
          range.insertNode(textNode);
          range.setStartAfter(textNode);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    },
  });

  // Alt+N: Insert cross mark (❌) in input fields
  useRegisterShortcut({
    scope,
    combo: 'alt+n',
    allowInInputs: true,
    priority: 100,
    handler: (event) => {
      const target = event.target as HTMLElement;

      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        const start = target.selectionStart || 0;
        const end = target.selectionEnd || 0;
        const value = target.value;
        const insertion = '❌ ';
        const newValue = value.substring(0, start) + insertion + value.substring(end);
        target.value = newValue;
        target.setSelectionRange(start + insertion.length, start + insertion.length);
        return;
      }

      if (target.contentEditable === 'true') {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          const textNode = document.createTextNode('❌ ');
          range.insertNode(textNode);
          range.setStartAfter(textNode);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    },
  });

  // Arrow Key Navigation (ArrowUp/ArrowDown for task reordering)
  // Register handlers that check for Alt key in the event
  useRegisterShortcut({
    scope,
    match: (event) => {
      const key = event.key.toLowerCase();
      return (key === 'arrowup' || key === 'arrowdown') && !event.ctrlKey && !event.shiftKey && !event.metaKey;
    },
    allowInInputs: false,
    priority: 50,
    throttleMs: 200, // Throttle arrow keys to prevent rapid-fire
    handler: (event) => {
      const key = event.key.toLowerCase();
      if (key === 'arrowup' && onMoveSelectionUp) {
        onMoveSelectionUp({ alt: event.altKey });
      } else if (key === 'arrowdown' && onMoveSelectionDown) {
        onMoveSelectionDown({ alt: event.altKey });
      }
    },
  });

  // Entity Modal Shortcuts (Ctrl + Key) - only when not in inputs
  useRegisterShortcut({
    scope,
    combo: 'ctrl+t',
    allowInInputs: false,
    priority: 30,
    handler: () => {
      if (onOpenTaskModal) onOpenTaskModal();
    },
  });

  useRegisterShortcut({
    scope,
    combo: 'ctrl+i',
    allowInInputs: false,
    priority: 30,
    handler: () => {
      if (onOpenItemModal) onOpenItemModal();
    },
  });

  useRegisterShortcut({
    scope,
    combo: 'ctrl+f',
    allowInInputs: false,
    priority: 30,
    handler: () => {
      if (onOpenFinancialModal) onOpenFinancialModal();
    },
  });

  useRegisterShortcut({
    scope,
    combo: 'ctrl+m',
    allowInInputs: false,
    priority: 30,
    handler: () => {
      if (onOpenSiteModal) onOpenSiteModal();
    },
  });

  useRegisterShortcut({
    scope,
    combo: 'ctrl+r',
    allowInInputs: false,
    priority: 30,
    handler: () => {
      if (onOpenCharacterModal) onOpenCharacterModal();
    },
  });

  useRegisterShortcut({
    scope,
    combo: 'ctrl+p',
    allowInInputs: false,
    priority: 30,
    handler: () => {
      if (onOpenPlayerModal) onOpenPlayerModal();
    },
  });

  // Sales Modal Shortcut (Shift + Ctrl + S)
  useRegisterShortcut({
    scope,
    combo: 'ctrl+shift+s',
    allowInInputs: false,
    priority: 30,
    handler: () => {
      if (onOpenSalesModal) onOpenSalesModal();
    },
  });

  // Section Navigation Shortcuts (Alt + Key) - global scope only
  useRegisterShortcut({
    scope: GLOBAL_SCOPE,
    combo: 'alt+t',
    allowInInputs: false,
    priority: 20,
    handler: () => {
      if (onNavigateToControlRoom) onNavigateToControlRoom();
    },
  });

  useRegisterShortcut({
    scope: GLOBAL_SCOPE,
    combo: 'alt+i',
    allowInInputs: false,
    priority: 20,
    handler: () => {
      if (onNavigateToInventory) onNavigateToInventory();
    },
  });

  useRegisterShortcut({
    scope: GLOBAL_SCOPE,
    combo: 'alt+f',
    allowInInputs: false,
    priority: 20,
    handler: () => {
      if (onNavigateToFinances) onNavigateToFinances();
    },
  });

  useRegisterShortcut({
    scope: GLOBAL_SCOPE,
    combo: 'alt+s',
    allowInInputs: false,
    priority: 20,
    handler: () => {
      if (onNavigateToSales) onNavigateToSales();
    },
  });

  useRegisterShortcut({
    scope: GLOBAL_SCOPE,
    combo: 'alt+m',
    allowInInputs: false,
    priority: 20,
    handler: () => {
      if (onNavigateToMap) onNavigateToMap();
    },
  });

  useRegisterShortcut({
    scope: GLOBAL_SCOPE,
    combo: 'alt+r',
    allowInInputs: false,
    priority: 20,
    handler: () => {
      if (onNavigateToCharacters) onNavigateToCharacters();
    },
  });

  useRegisterShortcut({
    scope: GLOBAL_SCOPE,
    combo: 'alt+e',
    allowInInputs: false,
    priority: 20,
    handler: () => {
      if (onNavigateToSettings) onNavigateToSettings();
    },
  });
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
    'Alt + Y = Insert check mark (✅)',
    'Alt + N = Insert cross mark (❌)',
    '',
    '=== TASK REORDERING ===',
    '↑ / ↓ = Move selected task up/down (within siblings)',
    'Alt + ↑ / Alt + ↓ = Reparent task to previous/next parent',
  ];

  alert(shortcuts.join('\n'));
}
